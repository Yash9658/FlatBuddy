import { UserRole } from "@prisma/client";

type TenantProfileShape = {
  fullName?: string | null;
  targetCityId?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
};

type TenantPreferenceShape = {
  sleepSchedule?: string | null;
  interests?: string[] | null;
};

type LandlordProfileShape = {
  fullName?: string | null;
  targetCityId?: string | null;
  preferredArea?: string | null;
  phone?: string | null;
};

export function isLandlordProfileComplete(profile?: LandlordProfileShape | null) {
  return Boolean(
    profile?.fullName?.trim() &&
      profile.targetCityId &&
      profile.preferredArea?.trim() &&
      profile.phone?.trim(),
  );
}

export function isTenantProfileComplete(
  profile?: TenantProfileShape | null,
  preference?: TenantPreferenceShape | null,
) {
  return Boolean(
    profile?.fullName?.trim() &&
      profile.targetCityId &&
      profile.budgetMin &&
      profile.budgetMax &&
      preference?.sleepSchedule?.trim() &&
      (preference?.interests?.length ?? 0) > 0,
  );
}

export function computeProfileCompletion(
  role: UserRole,
  profile?: (TenantProfileShape & LandlordProfileShape) | null,
  preference?: TenantPreferenceShape | null,
) {
  if (role === UserRole.LANDLORD) {
    return isLandlordProfileComplete(profile);
  }

  if (role === UserRole.ADMIN) {
    return true;
  }

  return isTenantProfileComplete(profile, preference);
}
