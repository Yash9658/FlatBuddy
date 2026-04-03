import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

const entitledStatuses: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.PAUSED,
];

export const FREE_TENANT_PENDING_REQUEST_LIMIT = 3;
export const FREE_LANDLORD_ACTIVE_LISTING_LIMIT = 2;

export async function getSubscriptionAccess(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
    },
  });

  const isEntitled = Boolean(subscription && entitledStatuses.includes(subscription.status));

  return {
    subscription,
    isEntitled,
    hasTenantPro: hasPlanAccess(subscription, SubscriptionPlan.TENANT_PRO),
    hasLandlordPro: hasPlanAccess(subscription, SubscriptionPlan.LANDLORD_PRO),
  };
}

export function isSubscriptionEntitled(
  subscription: { status: SubscriptionStatus } | null | undefined,
) {
  return Boolean(subscription && entitledStatuses.includes(subscription.status));
}

export function hasPlanAccess(
  subscription: { status: SubscriptionStatus; plan: SubscriptionPlan } | null | undefined,
  plan: SubscriptionPlan,
) {
  return Boolean(subscription && isSubscriptionEntitled(subscription) && subscription.plan === plan);
}
