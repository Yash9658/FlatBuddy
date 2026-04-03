import { SubscriptionPlan, SubscriptionStatus, UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { getStripeClient } from "../lib/stripe.js";

const checkoutSchema = z.object({
  plan: z.enum(["TENANT_PRO", "LANDLORD_PRO"]),
});

const plans = [
  {
    id: "TENANT_PRO",
    name: "Tenant Pro",
    audience: "Tenants",
    priceLabel: "Rs. 299/mo",
    description: "Priority discovery, unlimited partner requests, and premium city filters.",
  },
  {
    id: "LANDLORD_PRO",
    name: "Landlord Pro",
    audience: "Landlords",
    priceLabel: "Rs. 999/mo",
    description: "Featured listings, faster lead handling, and future analytics access.",
  },
] as const;

export function listPlans(_req: Request, res: Response) {
  return res.json(plans);
}

export async function createCheckoutSession(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = checkoutSchema.parse(req.body);
  const stripe = getStripeClient();
  const priceId =
    payload.plan === "TENANT_PRO" ? env.STRIPE_PRICE_TENANT_PRO : env.STRIPE_PRICE_LANDLORD_PRO;

  if (!priceId || !env.STRIPE_BILLING_SUCCESS_URL || !env.STRIPE_BILLING_CANCEL_URL) {
    return res.status(503).json({ message: "Stripe billing is not fully configured." });
  }

  if (!isPlanAllowedForRole(payload.plan, req.auth.role)) {
    return res.status(403).json({
      message: getIncompatiblePlanMessage(req.auth.role, payload.plan),
    });
  }

  const [user, existingSubscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { email: true },
    }),
    prisma.subscription.findUnique({
      where: { userId: req.auth.userId },
      select: {
        plan: true,
        status: true,
        stripeCustomerId: true,
      },
    }),
  ]);

  if (existingSubscription && !isSubscriptionCheckoutAllowed(existingSubscription.status)) {
    const existingPlanLabel = existingSubscription.plan === SubscriptionPlan.TENANT_PRO ? "Tenant Pro" : "Landlord Pro";

    return res.status(409).json({
      message:
        existingSubscription.plan === payload.plan
          ? `This account already has ${existingPlanLabel}. Manage it from billing instead of starting another checkout.`
          : `This account already has an existing subscription. Manage or cancel it before switching to ${payload.plan === SubscriptionPlan.TENANT_PRO ? "Tenant Pro" : "Landlord Pro"}.`,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: env.STRIPE_BILLING_SUCCESS_URL,
    cancel_url: env.STRIPE_BILLING_CANCEL_URL,
    allow_promotion_codes: true,
    customer: existingSubscription?.stripeCustomerId ?? undefined,
    customer_email: existingSubscription?.stripeCustomerId ? undefined : user?.email,
    client_reference_id: req.auth.userId,
    metadata: {
      plan: payload.plan,
      userId: req.auth.userId,
      role: req.auth.role,
    },
    subscription_data: {
      metadata: {
        plan: payload.plan,
        userId: req.auth.userId,
        role: req.auth.role,
      },
    },
  });

  return res.status(201).json({
    url: session.url,
  });
}

function isPlanAllowedForRole(plan: SubscriptionPlan, role: UserRole) {
  if (role === UserRole.ADMIN) {
    return false;
  }

  if (role === UserRole.TENANT) {
    return plan === SubscriptionPlan.TENANT_PRO;
  }

  if (role === UserRole.LANDLORD) {
    return plan === SubscriptionPlan.LANDLORD_PRO;
  }

  return false;
}

function getIncompatiblePlanMessage(role: UserRole, plan: SubscriptionPlan) {
  if (role === UserRole.ADMIN) {
    return "Admin accounts do not need a paid subscription.";
  }

  if (plan === SubscriptionPlan.TENANT_PRO) {
    return "Tenant Pro is only for tenant accounts.";
  }

  return "Landlord Pro is only for landlord accounts.";
}

function isSubscriptionCheckoutAllowed(status: SubscriptionStatus) {
  return status === SubscriptionStatus.CANCELED;
}

function isStripeManagedSubscription(subscription: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  return Boolean(
    subscription.stripeCustomerId &&
      subscription.stripeSubscriptionId &&
      subscription.stripeCustomerId.startsWith("cus_") &&
      subscription.stripeSubscriptionId.startsWith("sub_"),
  );
}

export async function createPortalSession(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (!env.STRIPE_PORTAL_RETURN_URL) {
    return res.status(503).json({ message: "Stripe portal is not fully configured." });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.auth.userId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!subscription || !isStripeManagedSubscription(subscription)) {
    return res.status(409).json({ message: "This subscription was not created through Stripe Checkout." });
  }

  const stripe = getStripeClient();
  const customerId = subscription.stripeCustomerId as string;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: env.STRIPE_PORTAL_RETURN_URL,
  });

  return res.status(201).json({
    url: session.url,
  });
}

export async function updateSubscriptionCancellation(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = z
    .object({
      cancelAtPeriodEnd: z.boolean(),
    })
    .parse(req.body);

  const currentSubscription = await prisma.subscription.findUnique({
    where: { userId: req.auth.userId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      status: true,
    },
  });

  if (!currentSubscription?.stripeSubscriptionId) {
    return res.status(404).json({ message: "No active subscription was found for this account." });
  }

  if (!isStripeManagedSubscription(currentSubscription)) {
    return res.status(409).json({ message: "This subscription was not created through Stripe Checkout." });
  }

  if (currentSubscription.status === SubscriptionStatus.CANCELED) {
    return res.status(409).json({ message: "Canceled subscriptions cannot be modified from here." });
  }

  const stripe = getStripeClient();
  const updated = await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
    cancel_at_period_end: payload.cancelAtPeriodEnd,
  });

  await syncSubscriptionRecord(updated, {
    fallbackUserId: req.auth.userId,
  });

  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.auth.userId },
  });

  return res.json(subscription);
}

export async function handleStripeWebhook(req: Request, res: Response) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ message: "Stripe webhook is not configured." });
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({ message: "Missing Stripe signature." });
  }

  const stripe = getStripeClient();
  const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Invalid webhook signature.",
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription" && typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncSubscriptionRecord(subscription, {
          fallbackPlan: parsePlan(session.metadata?.plan),
          fallbackUserId: session.client_reference_id ?? session.metadata?.userId ?? undefined,
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionRecord(subscription);
      break;
    }
    default:
      break;
  }

  return res.json({ received: true });
}

async function syncSubscriptionRecord(
  subscription: Stripe.Subscription,
  options: {
    fallbackUserId?: string;
    fallbackPlan?: SubscriptionPlan | null;
  } = {},
) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
  const existing = await prisma.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        ...(customerId ? [{ stripeCustomerId: customerId }] : []),
      ],
    },
    select: {
      userId: true,
      plan: true,
    },
  });

  const resolvedUserId = subscription.metadata.userId || existing?.userId || options.fallbackUserId;
  if (!resolvedUserId) {
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;
  const resolvedPlan =
    parsePlan(subscription.metadata.plan) || mapPlanFromPriceId(priceId) || existing?.plan || options.fallbackPlan;

  if (!resolvedPlan) {
    return;
  }

  await prisma.subscription.upsert({
    where: { userId: resolvedUserId },
    update: {
      plan: resolvedPlan,
      status: mapSubscriptionStatus(subscription.status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodEnd: toDate(currentPeriodEnd),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: toDate(subscription.canceled_at),
    },
    create: {
      userId: resolvedUserId,
      plan: resolvedPlan,
      status: mapSubscriptionStatus(subscription.status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodEnd: toDate(currentPeriodEnd),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: toDate(subscription.canceled_at),
    },
  });
}

function parsePlan(value: string | null | undefined): SubscriptionPlan | null {
  if (value === SubscriptionPlan.TENANT_PRO || value === SubscriptionPlan.LANDLORD_PRO) {
    return value;
  }

  return null;
}

function mapPlanFromPriceId(priceId: string | null) {
  if (!priceId) {
    return null;
  }

  if (priceId === env.STRIPE_PRICE_TENANT_PRO) {
    return SubscriptionPlan.TENANT_PRO;
  }

  if (priceId === env.STRIPE_PRICE_LANDLORD_PRO) {
    return SubscriptionPlan.LANDLORD_PRO;
  }

  return null;
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    case "paused":
      return SubscriptionStatus.PAUSED;
    case "canceled":
    case "incomplete_expired":
      return SubscriptionStatus.CANCELED;
    case "incomplete":
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

function toDate(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000) : null;
}
