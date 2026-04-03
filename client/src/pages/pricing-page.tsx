import { Check, CreditCard, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { apiFetch } from "@/lib/api";
import {
  FREE_LANDLORD_ACTIVE_LISTING_LIMIT,
  FREE_TENANT_PENDING_REQUEST_LIMIT,
  hasActivePlan,
} from "@/lib/subscription";
import type { BillingPlan } from "@/lib/types";

const planHighlights: Record<BillingPlan["id"], string[]> = {
  TENANT_PRO: [
    "Unlimited partner connection requests",
    "Premium filters for budget, lifestyle, and move-in timing",
    "Priority visibility inside city discovery pages",
  ],
  LANDLORD_PRO: [
    "Featured listing placement in property discovery",
    "Priority lead handling for visits and chats",
    "Better visibility when tenant groups shortlist homes",
  ],
};

function isStripeManagedSubscription(subscription: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
} | null) {
  return Boolean(
    subscription?.stripeCustomerId &&
      subscription?.stripeSubscriptionId &&
      subscription.stripeCustomerId.startsWith("cus_") &&
      subscription.stripeSubscriptionId.startsWith("sub_"),
  );
}

export function PricingPage() {
  const { accessToken, user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const currentSubscription = user?.subscription ?? null;
  const canManageInStripe = isStripeManagedSubscription(currentSubscription);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<BillingPlan["id"] | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadPlans() {
      try {
        const response = await apiFetch<BillingPlan[]>("/billing/plans", {
          method: "GET",
        });

        if (!ignore) {
          setPlans(response);
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error instanceof Error ? error.message : "Unable to load plans.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadPlans();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleCheckout(planId: BillingPlan["id"]) {
    if (!accessToken) {
      setMessage("Login to start a subscription.");
      showToast({ title: "Login required", description: "Sign in before starting a subscription.", variant: "error" });
      return;
    }

    setActivePlanId(planId);
    setMessage(null);

    try {
      const response = await apiFetch<{ url: string }>("/billing/checkout-session", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ plan: planId }),
      });

      window.location.href = response.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      showToast({
        title: "Checkout unavailable",
        description: error instanceof Error ? error.message : "Unable to start checkout.",
        variant: "error",
      });
      setActivePlanId(null);
    }
  }

  async function handlePortalSession() {
    if (!accessToken) {
      setMessage("Login to manage billing.");
      showToast({ title: "Login required", description: "Sign in before managing billing.", variant: "error" });
      return;
    }

    setIsOpeningPortal(true);
    setMessage(null);

    try {
      const response = await apiFetch<{ url: string }>("/billing/portal-session", {
        method: "POST",
        token: accessToken,
      });

      window.location.href = response.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open customer portal.");
      showToast({
        title: "Portal unavailable",
        description: error instanceof Error ? error.message : "Unable to open customer portal.",
        variant: "error",
      });
      setIsOpeningPortal(false);
    }
  }

  async function handleSubscriptionToggle(cancelAtPeriodEnd: boolean) {
    if (!accessToken) {
      setMessage("Login to manage billing.");
      showToast({ title: "Login required", description: "Sign in before managing billing.", variant: "error" });
      return;
    }

    setIsUpdatingSubscription(true);
    setMessage(null);

    try {
      await apiFetch("/billing/subscription", {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ cancelAtPeriodEnd }),
      });
      await refreshUser();
      setMessage(
        cancelAtPeriodEnd
          ? "Your subscription will cancel at the end of the current billing period."
          : "Your subscription will continue renewing automatically.",
      );
      showToast({
        title: cancelAtPeriodEnd ? "Cancellation scheduled" : "Subscription restored",
        description: cancelAtPeriodEnd
          ? "Your plan will stay active until the current billing period ends."
          : "Your plan will keep renewing automatically.",
        variant: "success",
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update subscription.");
      showToast({
        title: "Subscription update failed",
        description: error instanceof Error ? error.message : "Unable to update subscription.",
        variant: "error",
      });
    } finally {
      setIsUpdatingSubscription(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Monetization</span>
        <h1 className="text-3xl font-semibold tracking-tight">Subscriptions for tenants and landlords</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          FlatBuddy now supports Stripe Checkout subscription entry points, so the app can grow beyond a portfolio demo
          into a revenue-ready product.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="size-4" />
              Revenue model
            </p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Tenants can pay for faster discovery and better matching tools. Landlords can pay to promote listings
              and convert more qualified renter groups.
            </p>
          </div>
          {user ? (
            <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
              Logged in as <span className="font-semibold text-foreground">{user.role.toLowerCase()}</span>
            </div>
          ) : (
            <Link className={buttonVariants()} to="/login">
              Login to subscribe
            </Link>
          )}
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading subscription plans...</p> : null}

      {currentSubscription ? (
        <Card>
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
            <CardDescription>
              Stripe webhook sync is now connected, so this status reflects the saved backend record.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Plan: <span className="font-semibold text-foreground">{formatPlanLabel(currentSubscription.plan)}</span>
            </p>
            <p>
              Status:{" "}
              <span className="font-semibold text-foreground">{formatPlanLabel(currentSubscription.status)}</span>
            </p>
            {currentSubscription.currentPeriodEnd ? (
              <p>
                Current period ends on{" "}
                <span className="font-semibold text-foreground">
                  {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString("en-IN")}
                </span>
              </p>
            ) : null}
            <p>
              Renewal:{" "}
              <span className="font-semibold text-foreground">
                {currentSubscription.cancelAtPeriodEnd ? "Scheduled to cancel" : "Auto-renewing"}
              </span>
            </p>
            {!canManageInStripe ? (
              <p className="text-xs leading-6 text-muted-foreground">
                This plan was granted outside Stripe Checkout, so Stripe portal and cancellation controls are unavailable.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                disabled={isOpeningPortal || !canManageInStripe}
                onClick={() => void handlePortalSession()}
                variant="outline"
              >
                {isOpeningPortal ? "Opening portal..." : "Manage in Stripe"}
              </Button>
              <Button
                disabled={isUpdatingSubscription || currentSubscription.status === "CANCELED" || !canManageInStripe}
                onClick={() => void handleSubscriptionToggle(!currentSubscription.cancelAtPeriodEnd)}
              >
                {isUpdatingSubscription
                  ? "Saving..."
                  : currentSubscription.cancelAtPeriodEnd
                    ? "Keep subscription"
                    : "Cancel at period end"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {plans.map((plan) => {
          const subscription = user?.subscription;
          const planUnlocked = hasActivePlan(user, plan.id);
          const roleAllowsPlan =
            !user ||
            (user.role === "TENANT" && plan.id === "TENANT_PRO") ||
            (user.role === "LANDLORD" && plan.id === "LANDLORD_PRO");
          const isAdminAccount = user?.role === "ADMIN";
          const isRecommended =
            (plan.id === "TENANT_PRO" && user?.role !== "LANDLORD") ||
            (plan.id === "LANDLORD_PRO" && user?.role === "LANDLORD");
          const alreadySubscribed =
            subscription?.plan === plan.id &&
            Boolean(subscription && ["ACTIVE", "TRIALING", "PAST_DUE", "PAUSED"].includes(subscription.status));
          const isDisabled = activePlanId === plan.id || alreadySubscribed || isAdminAccount || !roleAllowsPlan;

          return (
            <Card key={plan.id} className={isRecommended ? "border-primary/40 shadow-soft" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.audience}</CardDescription>
                  </div>
                  {isRecommended ? (
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      Best fit
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div>
                  <p className="text-3xl font-semibold tracking-tight">{plan.priceLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                </div>
                <div className="grid gap-3">
                  {planHighlights[plan.id].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                  <div className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    {plan.id === "TENANT_PRO"
                      ? `Free tenant accounts can keep ${FREE_TENANT_PENDING_REQUEST_LIMIT} pending partner requests.`
                      : `Free landlord accounts can keep ${FREE_LANDLORD_ACTIVE_LISTING_LIMIT} live listings.`}
                  </div>
                </div>
                <Button
                  disabled={isDisabled}
                  onClick={() => void handleCheckout(plan.id)}
                >
                  <CreditCard className="size-4" />
                  {alreadySubscribed
                    ? "Current plan"
                    : isAdminAccount
                      ? "Included for admins"
                      : !roleAllowsPlan
                        ? "Wrong account type"
                        : activePlanId === plan.id
                          ? "Redirecting..."
                          : `Choose ${plan.name}`}
                </Button>
                {planUnlocked ? (
                  <p className="text-sm text-emerald-700">This plan is currently unlocking premium access in the app.</p>
                ) : null}
                {!roleAllowsPlan && user ? (
                  <p className="text-sm text-muted-foreground">
                    {plan.id === "TENANT_PRO"
                      ? "Tenant Pro can only be purchased by tenant accounts."
                      : "Landlord Pro can only be purchased by landlord accounts."}
                  </p>
                ) : null}
                {isAdminAccount ? (
                  <p className="text-sm text-muted-foreground">
                    Admin accounts already bypass premium gates and do not need a paid plan.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatPlanLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
