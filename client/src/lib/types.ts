export type UserRole = "TENANT" | "LANDLORD" | "ADMIN";
export type SubscriptionPlan = "TENANT_PRO" | "LANDLORD_PRO";
export type SubscriptionStatus =
  | "INCOMPLETE"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "PAUSED";

export type VerificationStatus = "NOT_REQUESTED" | "PENDING" | "APPROVED" | "REJECTED";

export type OccupationType = "STUDENT" | "WORKING_PROFESSIONAL" | "FREELANCER" | "OTHER";
export type PropertyType = "PRIVATE_ROOM" | "SHARED_ROOM" | "STUDIO" | "FULL_FLAT" | "PG";
export type ListingStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "RENTED";
export type FoodPreference = "VEGETARIAN" | "NON_VEGETARIAN" | "EGGETARIAN" | "FLEXIBLE";
export type SmokingPreference = "NO" | "OCCASIONAL" | "YES" | "FLEXIBLE";
export type DrinkingPreference = "NO" | "OCCASIONAL" | "YES" | "FLEXIBLE";

export type City = {
  id?: string;
  name: string;
  slug: string;
  state?: string;
  description?: string;
  imageUrl?: string;
  isFeatured?: boolean;
  areas?: {
    name: string;
    averageRent?: number;
    description?: string;
  }[];
  _count?: {
    profiles: number;
    properties: number;
    groups?: number;
  };
};

export type Profile = {
  fullName?: string;
  age?: number | null;
  bio?: string | null;
  gender?: string | null;
  occupation?: OccupationType;
  collegeOrCompany?: string | null;
  targetCityId?: string | null;
  currentCity?: string | null;
  preferredArea?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  moveInDate?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  targetCity?: City | null;
};

export type Preference = {
  foodPreference?: FoodPreference;
  smokingPreference?: SmokingPreference;
  drinkingPreference?: DrinkingPreference;
  cleanlinessLevel?: number;
  sleepSchedule?: string | null;
  petsFriendly?: boolean;
  genderPreference?: string | null;
  languagePreferences?: string[];
  interests?: string[];
  occupationPreference?: OccupationType | null;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  authProvider?: string;
  isEmailVerified?: boolean;
  isProfileComplete?: boolean;
  isSuspended?: boolean;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  landlordVerificationStatus?: VerificationStatus;
  landlordVerificationRequestedAt?: string | null;
  landlordVerifiedAt?: string | null;
  landlordVerificationNotes?: string | null;
  landlordVerificationDocumentUrl?: string | null;
  profile?: Profile | null;
  preference?: Preference | null;
  subscription?: {
    id: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId: string;
    stripePriceId?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type ConnectionStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export type ConnectionItem = {
  id: string;
  city?: City | null;
  message?: string | null;
  status: ConnectionStatus;
  createdAt: string;
  sender: AuthUser;
  receiver: AuthUser;
  chatId?: string | null;
};

export type ChatParticipant = {
  id?: string;
  userId?: string;
  user: AuthUser;
};

export type ChatMessage = {
  id: string;
  body: string;
  senderId?: string | null;
  senderType: "USER" | "LANDLORD" | "SYSTEM";
  createdAt: string;
  sender?: AuthUser | null;
};

export type ChatThread = {
  id: string;
  title?: string | null;
  cityId?: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  unreadCount?: number;
};

export type SavedUserItem = {
  id: string;
  createdAt: string;
  target: AuthUser;
};

export type SavedPropertyItem = {
  id: string;
  createdAt: string;
  property: PropertyItem;
};

export type GroupItem = {
  id: string;
  name: string;
  description?: string | null;
  planningNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  city?: City | null;
  owner: AuthUser;
  members: Array<{
    id: string;
    isLeader: boolean;
    joinedAt: string;
    user: AuthUser;
  }>;
  shortlists: Array<{
    id: string;
    note?: string | null;
    createdAt: string;
    addedBy: AuthUser;
    property: PropertyItem;
  }>;
  invitations?: Array<{
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED";
    createdAt: string;
    respondedAt?: string | null;
    inviter: AuthUser;
    invitee: AuthUser;
  }>;
};

export type GroupInvitationItem = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  respondedAt?: string | null;
  group: {
    id: string;
    name: string;
    city?: City | null;
  };
  inviter?: AuthUser;
  invitee?: AuthUser;
};

export type GroupInvitationFeed = {
  incoming: GroupInvitationItem[];
  outgoing: GroupInvitationItem[];
};

export type VisitRequestStatus = "PENDING" | "APPROVED" | "DECLINED";

export type VisitRequestItem = {
  id: string;
  requestedDate: string;
  note?: string | null;
  status: VisitRequestStatus;
  landlordMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  property: PropertyItem;
  requester: AuthUser;
};

export type PropertyItem = {
  id: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  addressLine: string;
  areaName: string;
  monthlyRent: number;
  securityDeposit: number;
  availableFrom: string;
  availableBeds: number;
  totalBeds: number;
  furnished: boolean;
  amenities: string[];
  houseRules: string[];
  preferredTenants: string[];
  status: ListingStatus;
  city: City;
  images: Array<{
    id?: string;
    url: string;
    altText?: string | null;
    sortOrder?: number;
  }>;
  owner?: {
    id: string;
    role: UserRole;
    email?: string;
    profile?: Profile | null;
  };
  isFeatured?: boolean;
};

export type PropertyDetail = {
  property: PropertyItem & {
    _count?: {
      savedBy: number;
      visitRequests: number;
      reports: number;
    };
  };
  relatedProperties: PropertyItem[];
};

export type MatchItem = {
  compatibilityScore: number;
  insights?: string[];
  user: AuthUser;
};

export type TenantProfileDetail = {
  user: AuthUser;
  compatibilityScore: number;
  sharedInterests: string[];
  insights: string[];
  moveInGapDays: number | null;
  sharedGroups: Array<{
    id: string;
    name: string;
  }>;
  connection: {
    id: string;
    status: ConnectionStatus;
    createdAt: string;
    isIncoming: boolean;
  } | null;
};

export type CityOverview = City & {
  seekers: AuthUser[];
  properties: PropertyItem[];
};

export type AdminOverview = {
  users: number;
  landlords: number;
  activeListings: number;
  openReports: number;
  trackedCities: number;
  suspendedUsers: number;
  pendingVerificationRequests: number;
};

export type AdminUser = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  isSuspended: boolean;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  landlordVerificationStatus?: VerificationStatus;
  landlordVerificationRequestedAt?: string | null;
  landlordVerifiedAt?: string | null;
  landlordVerificationNotes?: string | null;
  landlordVerificationDocumentUrl?: string | null;
  profile?: Profile | null;
  subscription?: AuthUser["subscription"];
  _count: {
    sentConnections: number;
    ownedProperties: number;
    reportsAgainst: number;
  };
};

export type NotificationItem = {
  id: string;
  kind: "CONNECTION" | "CHAT" | "VISIT" | "ADMIN" | "BILLING" | "VERIFICATION" | "GROUP";
  title: string;
  description: string;
  createdAt: string;
  href: string;
  isUnread: boolean;
};

export type NotificationFeed = {
  notifications: NotificationItem[];
  unreadCount: number;
};

export type BillingPlan = {
  id: SubscriptionPlan;
  name: string;
  audience: string;
  priceLabel: string;
  description: string;
};

export type LandlordAnalytics = {
  summary: {
    totalListings: number;
    activeListings: number;
    pausedListings: number;
    rentedListings: number;
    totalSaves: number;
    totalVisits: number;
    pendingVisits: number;
    approvedVisits: number;
    openReports: number;
    averageRent: number;
  };
  timeline: Array<{
    date: string;
    label: string;
    saves: number;
    visitRequests: number;
    approvedVisits: number;
  }>;
  properties: Array<{
    id: string;
    title: string;
    cityName: string;
    areaName: string;
    monthlyRent: number;
    status: ListingStatus;
    coverImageUrl?: string | null;
    saves: number;
    visits: number;
    pendingVisits: number;
    approvedVisits: number;
    openReports: number;
  }>;
};

export type AdminReport = {
  id: string;
  reason: string;
  details?: string | null;
  resolved: boolean;
  createdAt: string;
  reporter: {
    email: string;
    profile?: Profile | null;
  };
  reportedUser?: {
    email: string;
    profile?: Profile | null;
  } | null;
  property?: {
    id?: string;
    title: string;
    areaName: string;
    city: City;
  } | null;
};

export type UploadResponse = {
  url: string;
  filename: string;
  originalName: string;
  size: number;
};

export type MatchProfile = {
  name: string;
  role: string;
  city: string;
  budget: string;
  moveIn: string;
  lifestyle: string[];
  interests: string[];
  compatibility: number;
};

export type PropertyCardItem = {
  title: string;
  city: string;
  area: string;
  rent: string;
  type: string;
  availability: string;
  highlights: string[];
};
