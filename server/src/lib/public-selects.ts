export const publicProfileSelect = {
  fullName: true,
  age: true,
  bio: true,
  gender: true,
  occupation: true,
  collegeOrCompany: true,
  targetCityId: true,
  preferredArea: true,
  budgetMin: true,
  budgetMax: true,
  moveInDate: true,
  avatarUrl: true,
  targetCity: true,
} as const;

export const publicTenantSelect = {
  id: true,
  role: true,
  profile: {
    select: publicProfileSelect,
  },
  preference: true,
  createdAt: true,
} as const;

export const publicPropertyOwnerSelect = {
  id: true,
  role: true,
  profile: {
    select: {
      fullName: true,
      avatarUrl: true,
      bio: true,
    },
  },
  subscription: {
    select: {
      plan: true,
      status: true,
    },
  },
} as const;
