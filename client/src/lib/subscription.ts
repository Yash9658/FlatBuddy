import type { AuthUser, SubscriptionPlan, SubscriptionStatus } from "@/lib/types";

const entitledStatuses: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE", "PAUSED"];

export const FREE_TENANT_PENDING_REQUEST_LIMIT = 3;
export const FREE_LANDLORD_ACTIVE_LISTING_LIMIT = 2;

export function hasActivePlan(user: AuthUser | null, plan?: SubscriptionPlan) {
  const subscription = user?.subscription;

  if (!subscription || !entitledStatuses.includes(subscription.status)) {
    return false;
  }

  return plan ? subscription.plan === plan : true;
}
