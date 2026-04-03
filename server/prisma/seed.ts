import bcrypt from "bcryptjs";
import {
  AuthProvider,
  FoodPreference,
  ListingStatus,
  OccupationType,
  PrismaClient,
  PropertyType,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import { citySeeds } from "../src/data/cities.js";
import { seedPreviewMarketplaceActivity } from "./preview-seed.js";

const prisma = new PrismaClient();

const demoPassword = "FlatBuddy123!";
const shouldSeedDemoData = process.env.SEED_DEMO_DATA === "true";
const shouldSeedPreviewActivity = process.env.SEED_PREVIEW_ACTIVITY === "true";

const demoUsers = [
  {
    email: "tenant@flatbuddy.dev",
    role: UserRole.TENANT,
    fullName: "Aarav Menon",
    occupation: OccupationType.WORKING_PROFESSIONAL,
    currentCity: "Chennai",
    targetCitySlug: "bengaluru",
    preferredArea: "HSR Layout",
    budgetMin: 12000,
    budgetMax: 16000,
    moveInDate: new Date("2026-04-15"),
    bio: "Backend engineer looking for a clean and calm shared flat close to office commute.",
    interests: ["Cricket", "Startup podcasts", "Weekend cafes"],
    foodPreference: FoodPreference.VEGETARIAN,
    smokingPreference: "NO" as const,
    drinkingPreference: "OCCASIONAL" as const,
    cleanlinessLevel: 4,
    sleepSchedule: "Early riser",
    languagePreferences: ["English", "Hindi", "Tamil"],
  },
  {
    email: "riya@flatbuddy.dev",
    role: UserRole.TENANT,
    fullName: "Riya Sharma",
    occupation: OccupationType.STUDENT,
    currentCity: "Jaipur",
    targetCitySlug: "pune",
    preferredArea: "Kothrud",
    budgetMin: 9000,
    budgetMax: 13000,
    moveInDate: new Date("2026-04-20"),
    bio: "MBA student hoping to find a reliable female flatmate and a budget-safe setup.",
    interests: ["Reading", "Gym", "Movie nights"],
    foodPreference: FoodPreference.FLEXIBLE,
    smokingPreference: "NO" as const,
    drinkingPreference: "NO" as const,
    cleanlinessLevel: 5,
    sleepSchedule: "Balanced",
    languagePreferences: ["English", "Hindi"],
  },
  {
    email: "harshit@flatbuddy.dev",
    role: UserRole.TENANT,
    fullName: "Harshit Gupta",
    occupation: OccupationType.WORKING_PROFESSIONAL,
    currentCity: "Lucknow",
    targetCitySlug: "delhi",
    preferredArea: "Dwarka",
    budgetMin: 11000,
    budgetMax: 14500,
    moveInDate: new Date("2026-04-12"),
    bio: "Data analyst open to a social but respectful home near metro connectivity.",
    interests: ["Music", "Football", "Street food"],
    foodPreference: FoodPreference.NON_VEGETARIAN,
    smokingPreference: "NO" as const,
    drinkingPreference: "OCCASIONAL" as const,
    cleanlinessLevel: 3,
    sleepSchedule: "Night owl",
    languagePreferences: ["English", "Hindi"],
  },
  {
    email: "landlord@flatbuddy.dev",
    role: UserRole.LANDLORD,
    fullName: "Neha Bhatia",
    occupation: OccupationType.OTHER,
    currentCity: "Bengaluru",
    targetCitySlug: "bengaluru",
    preferredArea: "Koramangala",
    budgetMin: 0,
    budgetMax: 0,
    moveInDate: new Date("2026-04-01"),
    bio: "Independent owner listing professionally managed co-living friendly apartments.",
    interests: ["Real estate", "Design", "Host management"],
    foodPreference: FoodPreference.FLEXIBLE,
    smokingPreference: "FLEXIBLE" as const,
    drinkingPreference: "FLEXIBLE" as const,
    cleanlinessLevel: 4,
    sleepSchedule: "Flexible",
    languagePreferences: ["English", "Hindi"],
  },
  {
    email: "admin@flatbuddy.dev",
    role: UserRole.ADMIN,
    fullName: "FlatBuddy Admin",
    occupation: OccupationType.OTHER,
    currentCity: "Remote",
    targetCitySlug: "bengaluru",
    preferredArea: "Koramangala",
    budgetMin: 0,
    budgetMax: 0,
    moveInDate: new Date("2026-04-01"),
    bio: "Platform moderation and trust operations owner.",
    interests: ["Safety", "Operations", "Analytics"],
    foodPreference: FoodPreference.FLEXIBLE,
    smokingPreference: "FLEXIBLE" as const,
    drinkingPreference: "FLEXIBLE" as const,
    cleanlinessLevel: 4,
    sleepSchedule: "Flexible",
    languagePreferences: ["English"],
  },
];

async function seedCities() {
  for (const city of citySeeds) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        state: city.state,
        description: city.description,
        imageUrl: city.imageUrl,
        isFeatured: city.isFeatured,
      },
      create: {
        name: city.name,
        slug: city.slug,
        state: city.state,
        description: city.description,
        imageUrl: city.imageUrl,
        isFeatured: city.isFeatured,
      },
    });

    const createdCity = await prisma.city.findUnique({
      where: { slug: city.slug },
      select: { id: true },
    });

    if (!createdCity) {
      continue;
    }

    for (const area of city.areas) {
      await prisma.area.upsert({
        where: {
          cityId_name: {
            cityId: createdCity.id,
            name: area.name,
          },
        },
        update: {
          averageRent: area.averageRent,
          description: area.description,
        },
        create: {
          cityId: createdCity.id,
          name: area.name,
          averageRent: area.averageRent,
          description: area.description,
        },
      });
    }
  }
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  for (const demoUser of demoUsers) {
    const targetCity = await prisma.city.findUnique({
      where: { slug: demoUser.targetCitySlug },
      select: { id: true },
    });

    if (!targetCity) {
      continue;
    }

    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        passwordHash,
        role: demoUser.role,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        isProfileComplete: true,
        profile: {
          upsert: {
            update: {
              fullName: demoUser.fullName,
              occupation: demoUser.occupation,
              currentCity: demoUser.currentCity,
              targetCityId: targetCity.id,
              preferredArea: demoUser.preferredArea,
              budgetMin: demoUser.budgetMin,
              budgetMax: demoUser.budgetMax,
              moveInDate: demoUser.moveInDate,
              bio: demoUser.bio,
            },
            create: {
              fullName: demoUser.fullName,
              occupation: demoUser.occupation,
              currentCity: demoUser.currentCity,
              targetCityId: targetCity.id,
              preferredArea: demoUser.preferredArea,
              budgetMin: demoUser.budgetMin,
              budgetMax: demoUser.budgetMax,
              moveInDate: demoUser.moveInDate,
              bio: demoUser.bio,
            },
          },
        },
        preference: {
          upsert: {
            update: {
              foodPreference: demoUser.foodPreference,
              smokingPreference: demoUser.smokingPreference,
              drinkingPreference: demoUser.drinkingPreference,
              cleanlinessLevel: demoUser.cleanlinessLevel,
              sleepSchedule: demoUser.sleepSchedule,
              interests: demoUser.interests,
              languagePreferences: demoUser.languagePreferences,
            },
            create: {
              foodPreference: demoUser.foodPreference,
              smokingPreference: demoUser.smokingPreference,
              drinkingPreference: demoUser.drinkingPreference,
              cleanlinessLevel: demoUser.cleanlinessLevel,
              sleepSchedule: demoUser.sleepSchedule,
              interests: demoUser.interests,
              languagePreferences: demoUser.languagePreferences,
            },
          },
        },
      },
      create: {
        email: demoUser.email,
        passwordHash,
        role: demoUser.role,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        isProfileComplete: true,
        profile: {
          create: {
            fullName: demoUser.fullName,
            occupation: demoUser.occupation,
            currentCity: demoUser.currentCity,
            targetCityId: targetCity.id,
            preferredArea: demoUser.preferredArea,
            budgetMin: demoUser.budgetMin,
            budgetMax: demoUser.budgetMax,
            moveInDate: demoUser.moveInDate,
            bio: demoUser.bio,
          },
        },
        preference: {
          create: {
            foodPreference: demoUser.foodPreference,
            smokingPreference: demoUser.smokingPreference,
            drinkingPreference: demoUser.drinkingPreference,
            cleanlinessLevel: demoUser.cleanlinessLevel,
            sleepSchedule: demoUser.sleepSchedule,
            interests: demoUser.interests,
            languagePreferences: demoUser.languagePreferences,
          },
        },
      },
    });
  }
}

async function seedSubscriptions() {
  const [tenant, landlord] = await Promise.all([
    prisma.user.findUnique({ where: { email: "tenant@flatbuddy.dev" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "landlord@flatbuddy.dev" }, select: { id: true } }),
  ]);

  if (!tenant || !landlord) {
    return;
  }

  await prisma.subscription.upsert({
    where: { userId: tenant.id },
    update: {
      plan: SubscriptionPlan.TENANT_PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: null,
      stripeSubscriptionId: "manual_demo_tenant_flatbuddy",
      stripePriceId: null,
      currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
    create: {
      userId: tenant.id,
      plan: SubscriptionPlan.TENANT_PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: null,
      stripeSubscriptionId: "manual_demo_tenant_flatbuddy",
      stripePriceId: null,
      currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: landlord.id },
    update: {
      plan: SubscriptionPlan.LANDLORD_PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: null,
      stripeSubscriptionId: "manual_demo_landlord_flatbuddy",
      stripePriceId: null,
      currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
    create: {
      userId: landlord.id,
      plan: SubscriptionPlan.LANDLORD_PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: null,
      stripeSubscriptionId: "manual_demo_landlord_flatbuddy",
      stripePriceId: null,
      currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
    },
  });
}

async function seedVerificationRequests() {
  const landlord = await prisma.user.findUnique({
    where: { email: "landlord@flatbuddy.dev" },
    select: { id: true },
  });

  if (!landlord) {
    return;
  }

  await prisma.user.update({
    where: { id: landlord.id },
    data: {
      landlordVerificationStatus: VerificationStatus.PENDING,
      landlordVerificationRequestedAt: new Date("2026-04-01T10:00:00.000Z"),
      landlordVerifiedAt: null,
      landlordVerificationNotes: "Ownership proof and utility bill uploaded for review.",
      landlordVerificationDocumentUrl: "https://example.com/flatbuddy-demo-verification.pdf",
    },
  });
}

async function seedProperties() {
  const landlord = await prisma.user.findUnique({
    where: { email: "landlord@flatbuddy.dev" },
    select: { id: true },
  });

  if (!landlord) {
    return;
  }

  const [bengaluru, pune, delhi] = await Promise.all([
    prisma.city.findUnique({ where: { slug: "bengaluru" }, select: { id: true } }),
    prisma.city.findUnique({ where: { slug: "pune" }, select: { id: true } }),
    prisma.city.findUnique({ where: { slug: "delhi" }, select: { id: true } }),
  ]);

  const listings = [
    {
      cityId: bengaluru?.id,
      title: "Sunny 2BHK Near Metro",
      description: "Two open rooms in a bright 2BHK with strong Wi-Fi, balcony light, and easy office access.",
      propertyType: PropertyType.FULL_FLAT,
      addressLine: "15th Main Road, HSR Layout",
      areaName: "HSR Layout",
      monthlyRent: 28000,
      securityDeposit: 56000,
      availableFrom: new Date("2026-04-10"),
      availableBeds: 2,
      totalBeds: 2,
      furnished: true,
      amenities: ["Wi-Fi ready", "Fridge", "Washing machine"],
      houseRules: ["No smoking indoors", "Shared cleaning rotation"],
      preferredTenants: ["Working professionals", "Tenant groups"],
      imageUrl:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    },
    {
      cityId: pune?.id,
      title: "Shared Room for Students",
      description: "Low-deposit shared room close to coaching hubs and food stalls, ideal for students.",
      propertyType: PropertyType.SHARED_ROOM,
      addressLine: "Karve Road, Kothrud",
      areaName: "Kothrud",
      monthlyRent: 9500,
      securityDeposit: 12000,
      availableFrom: new Date("2026-04-05"),
      availableBeds: 2,
      totalBeds: 3,
      furnished: true,
      amenities: ["Study desk", "Water purifier", "Mess nearby"],
      houseRules: ["Quiet after 11 PM", "Guests only in common area"],
      preferredTenants: ["Students", "Female tenants preferred"],
      imageUrl:
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    },
    {
      cityId: delhi?.id,
      title: "Compact Studio for Two",
      description: "Metro-friendly studio apartment for two tenants with gated security and compact furniture setup.",
      propertyType: PropertyType.STUDIO,
      addressLine: "Sector 10, Dwarka",
      areaName: "Dwarka",
      monthlyRent: 18000,
      securityDeposit: 18000,
      availableFrom: new Date("2026-04-18"),
      availableBeds: 2,
      totalBeds: 2,
      furnished: true,
      amenities: ["Gated society", "Metro nearby", "Power backup"],
      houseRules: ["No parties", "Electricity billed separately"],
      preferredTenants: ["Working professionals", "Non-smokers"],
      imageUrl:
        "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  for (const listing of listings) {
    if (!listing.cityId) {
      continue;
    }

    await prisma.property.upsert({
      where: {
        ownerId_title: {
          ownerId: landlord.id,
          title: listing.title,
        },
      },
      update: {
        cityId: listing.cityId,
        description: listing.description,
        propertyType: listing.propertyType,
        addressLine: listing.addressLine,
        areaName: listing.areaName,
        monthlyRent: listing.monthlyRent,
        securityDeposit: listing.securityDeposit,
        availableFrom: listing.availableFrom,
        availableBeds: listing.availableBeds,
        totalBeds: listing.totalBeds,
        furnished: listing.furnished,
        amenities: listing.amenities,
        houseRules: listing.houseRules,
        preferredTenants: listing.preferredTenants,
        status: ListingStatus.ACTIVE,
      },
      create: {
        ownerId: landlord.id,
        cityId: listing.cityId,
        title: listing.title,
        description: listing.description,
        propertyType: listing.propertyType,
        addressLine: listing.addressLine,
        areaName: listing.areaName,
        monthlyRent: listing.monthlyRent,
        securityDeposit: listing.securityDeposit,
        availableFrom: listing.availableFrom,
        availableBeds: listing.availableBeds,
        totalBeds: listing.totalBeds,
        furnished: listing.furnished,
        amenities: listing.amenities,
        houseRules: listing.houseRules,
        preferredTenants: listing.preferredTenants,
        status: ListingStatus.ACTIVE,
      },
    });

    const property = await prisma.property.findFirst({
      where: {
        ownerId: landlord.id,
        title: listing.title,
      },
      select: { id: true },
    });

    if (!property) {
      continue;
    }

    await prisma.propertyImage.upsert({
      where: {
        propertyId_sortOrder: {
          propertyId: property.id,
          sortOrder: 0,
        },
      },
      update: {
        url: listing.imageUrl,
        altText: listing.title,
      },
      create: {
        propertyId: property.id,
        url: listing.imageUrl,
        altText: listing.title,
        sortOrder: 0,
      },
    });
  }
}

async function seedReports() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@flatbuddy.dev" },
    select: { id: true },
  });
  const tenant = await prisma.user.findUnique({
    where: { email: "tenant@flatbuddy.dev" },
    select: { id: true },
  });
  const harshit = await prisma.user.findUnique({
    where: { email: "harshit@flatbuddy.dev" },
    select: { id: true },
  });
  const puneProperty = await prisma.property.findFirst({
    where: { title: "Shared Room for Students" },
    select: { id: true },
  });

  if (!admin || !tenant || !harshit || !puneProperty) {
    return;
  }

  const reports = [
    {
      reporterId: admin.id,
      reportedUserId: harshit.id,
      propertyId: null,
      reason: "Spam connection requests",
      details: "User sent repeated low-context requests to several seekers in one day.",
      resolved: false,
    },
    {
      reporterId: tenant.id,
      reportedUserId: null,
      propertyId: puneProperty.id,
      reason: "Photos do not match listing",
      details: "Interior quality described in the listing looks very different from shared photos.",
      resolved: false,
    },
  ];

  for (const report of reports) {
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: report.reporterId,
        reportedUserId: report.reportedUserId,
        propertyId: report.propertyId,
        reason: report.reason,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.report.update({
        where: { id: existing.id },
        data: {
          details: report.details,
          resolved: report.resolved,
        },
      });
      continue;
    }

    await prisma.report.create({
      data: report,
    });
  }
}

async function seedConnectionsAndChats() {
  const [aarav, riya, harshit] = await Promise.all([
    prisma.user.findUnique({ where: { email: "tenant@flatbuddy.dev" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "riya@flatbuddy.dev" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "harshit@flatbuddy.dev" }, select: { id: true } }),
  ]);
  const bengaluru = await prisma.city.findUnique({
    where: { slug: "bengaluru" },
    select: { id: true },
  });

  if (!aarav || !riya || !harshit || !bengaluru) {
    return;
  }

  const acceptedConnection =
    (await prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { senderId: aarav.id, receiverId: harshit.id },
          { senderId: harshit.id, receiverId: aarav.id },
        ],
      },
      select: { id: true },
    })) ??
    (await prisma.connectionRequest.create({
      data: {
        senderId: aarav.id,
        receiverId: harshit.id,
        cityId: bengaluru.id,
        message: "We have a similar budget and commute preference. Want to shortlist places together?",
        status: "ACCEPTED",
      },
      select: { id: true },
    }));

  const pendingConnection = await prisma.connectionRequest.findFirst({
    where: {
      OR: [
        { senderId: riya.id, receiverId: aarav.id },
        { senderId: aarav.id, receiverId: riya.id },
      ],
    },
    select: { id: true },
  });

  if (!pendingConnection) {
    await prisma.connectionRequest.create({
      data: {
        senderId: riya.id,
        receiverId: aarav.id,
        cityId: bengaluru.id,
        message: "I am exploring a shared place and liked your profile. Interested in talking?",
        status: "PENDING",
      },
    });
  }

  let chat = await prisma.chat.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId: aarav.id } } },
        { participants: { some: { userId: harshit.id } } },
      ],
    },
    select: { id: true },
  });

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        isGroup: false,
        cityId: bengaluru.id,
        participants: {
          create: [{ userId: aarav.id, lastReadAt: new Date() }, { userId: harshit.id }],
        },
      },
      select: { id: true },
    });
  }

  const existingMessages = await prisma.message.count({
    where: {
      chatId: chat.id,
    },
  });

  if (existingMessages === 0) {
    await prisma.message.createMany({
      data: [
        {
          chatId: chat.id,
          senderType: "SYSTEM",
          body: "Connection accepted. You can now coordinate your rental search here.",
        },
        {
          chatId: chat.id,
          senderId: aarav.id,
          senderType: "USER",
          body: "Hey, I am mainly looking around HSR and Marathahalli. What areas are you considering?",
        },
        {
          chatId: chat.id,
          senderId: harshit.id,
          senderType: "USER",
          body: "HSR works for me too. I can shortlist a couple of 2BHK options this evening.",
        },
      ],
    });
  }

  await prisma.chatParticipant.updateMany({
    where: {
      chatId: chat.id,
      userId: aarav.id,
    },
    data: {
      lastReadAt: new Date("2026-04-01T08:00:00.000Z"),
    },
  });
}

async function seedSavedItemsAndGroups() {
  const [aarav, harshit, riya] = await Promise.all([
    prisma.user.findUnique({ where: { email: "tenant@flatbuddy.dev" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "harshit@flatbuddy.dev" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "riya@flatbuddy.dev" }, select: { id: true } }),
  ]);
  const bengaluru = await prisma.city.findUnique({
    where: { slug: "bengaluru" },
    select: { id: true },
  });
  const hsrProperty = await prisma.property.findFirst({
    where: { title: "Sunny 2BHK Near Metro" },
    select: { id: true },
  });
  const puneProperty = await prisma.property.findFirst({
    where: { title: "Shared Room for Students" },
    select: { id: true },
  });
  const delhiProperty = await prisma.property.findFirst({
    where: { title: "Compact Studio for Two" },
    select: { id: true },
  });

  if (!aarav || !harshit || !riya || !bengaluru || !hsrProperty) {
    return;
  }

  await prisma.savedUser.upsert({
    where: {
      ownerUserId_targetUserId: {
        ownerUserId: aarav.id,
        targetUserId: harshit.id,
      },
    },
    update: {},
    create: {
      ownerUserId: aarav.id,
      targetUserId: harshit.id,
    },
  });

  await prisma.savedProperty.upsert({
    where: {
      userId_propertyId: {
        userId: aarav.id,
        propertyId: hsrProperty.id,
      },
    },
    update: {},
    create: {
      userId: aarav.id,
      propertyId: hsrProperty.id,
    },
  });

  if (puneProperty) {
    await prisma.savedProperty.upsert({
      where: {
        userId_propertyId: {
          userId: riya.id,
          propertyId: puneProperty.id,
        },
      },
      update: {},
      create: {
        userId: riya.id,
        propertyId: puneProperty.id,
      },
    });
  }

  if (delhiProperty) {
    await prisma.savedProperty.upsert({
      where: {
        userId_propertyId: {
          userId: harshit.id,
          propertyId: delhiProperty.id,
        },
      },
      update: {},
      create: {
        userId: harshit.id,
        propertyId: delhiProperty.id,
      },
    });
  }

  const existingGroup = await prisma.group.findFirst({
    where: {
      ownerUserId: aarav.id,
      name: "HSR Search Squad",
    },
    select: { id: true },
  });

  if (!existingGroup) {
    await prisma.group.create({
      data: {
        ownerUserId: aarav.id,
        cityId: bengaluru.id,
        name: "HSR Search Squad",
        description: "Shortlisting 2BHK options in HSR and nearby tech corridors.",
        planningNotes:
          "Need strong commute access, good natural light, and a landlord open to two-person move-in by mid April.",
        members: {
          create: [
            { userId: aarav.id, isLeader: true },
            { userId: harshit.id, isLeader: false },
            { userId: riya.id, isLeader: false },
          ],
        },
      },
    });
  } else {
    await prisma.group.update({
      where: { id: existingGroup.id },
      data: {
        description: "Shortlisting 2BHK options in HSR and nearby tech corridors.",
        planningNotes:
          "Need strong commute access, good natural light, and a landlord open to two-person move-in by mid April.",
      },
    });
  }

  const savedEntries = await prisma.savedProperty.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const savedTimelineDates = [
    "2026-03-27T09:15:00.000Z",
    "2026-03-30T18:10:00.000Z",
    "2026-04-01T11:25:00.000Z",
  ];

  for (const [index, savedEntry] of savedEntries.entries()) {
    const createdAt = savedTimelineDates[index];

    if (!createdAt) {
      continue;
    }

    await prisma.savedProperty.update({
      where: { id: savedEntry.id },
      data: {
        createdAt: new Date(createdAt),
      },
    });
  }

  const group = await prisma.group.findFirst({
    where: {
      ownerUserId: aarav.id,
      name: "HSR Search Squad",
    },
    select: { id: true },
  });

  if (group) {
    await prisma.groupShortlistedProperty.upsert({
      where: {
        groupId_propertyId: {
          groupId: group.id,
          propertyId: hsrProperty.id,
        },
      },
      update: {
        note: "Best commute fit so far and already saved by Aarav.",
        addedByUserId: aarav.id,
      },
      create: {
        groupId: group.id,
        propertyId: hsrProperty.id,
        note: "Best commute fit so far and already saved by Aarav.",
        addedByUserId: aarav.id,
      },
    });
  }
}

async function seedVisitRequests() {
  const [aarav, riya, harshit] = await Promise.all([
    prisma.user.findUnique({ where: { email: "tenant@flatbuddy.dev" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "riya@flatbuddy.dev" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "harshit@flatbuddy.dev" }, select: { id: true } }),
  ]);
  const [hsrProperty, puneProperty, delhiProperty] = await Promise.all([
    prisma.property.findFirst({ where: { title: "Sunny 2BHK Near Metro" }, select: { id: true } }),
    prisma.property.findFirst({ where: { title: "Shared Room for Students" }, select: { id: true } }),
    prisma.property.findFirst({ where: { title: "Compact Studio for Two" }, select: { id: true } }),
  ]);

  if (!aarav || !riya || !harshit || !hsrProperty || !puneProperty || !delhiProperty) {
    return;
  }

  const demoVisits = [
    {
      propertyId: hsrProperty.id,
      requesterId: aarav.id,
      requestedDate: new Date("2026-04-06T12:00:00.000Z"),
      note: "Would love to see the room after office hours if possible.",
      status: "PENDING" as const,
      landlordMessage: null,
    },
    {
      propertyId: puneProperty.id,
      requesterId: riya.id,
      requestedDate: new Date("2026-04-04T10:30:00.000Z"),
      note: "Looking to check study space and safety around the building.",
      status: "APPROVED" as const,
      landlordMessage: "Approved. Please carry an ID and arrive 10 minutes early.",
    },
    {
      propertyId: delhiProperty.id,
      requesterId: harshit.id,
      requestedDate: new Date("2026-04-02T18:00:00.000Z"),
      note: "Need a quick evening visit after work to check commute options.",
      status: "APPROVED" as const,
      landlordMessage: "Approved. The building guard has your name at the gate.",
    },
  ];

  for (const demoVisit of demoVisits) {
    const existing = await prisma.visitRequest.findFirst({
      where: {
        propertyId: demoVisit.propertyId,
        requesterId: demoVisit.requesterId,
        requestedDate: demoVisit.requestedDate,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.visitRequest.update({
        where: { id: existing.id },
        data: {
          note: demoVisit.note,
          status: demoVisit.status,
          landlordMessage: demoVisit.landlordMessage,
        },
      });
      continue;
    }

    await prisma.visitRequest.create({
      data: demoVisit,
    });
  }

  const visitEntries = await prisma.visitRequest.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const visitTimelineDates = [
    { createdAt: "2026-03-28T12:00:00.000Z", updatedAt: "2026-03-28T12:00:00.000Z" },
    { createdAt: "2026-03-30T10:30:00.000Z", updatedAt: "2026-03-31T08:15:00.000Z" },
    { createdAt: "2026-04-01T18:00:00.000Z", updatedAt: "2026-04-02T07:45:00.000Z" },
  ];

  for (const [index, visitEntry] of visitEntries.entries()) {
    const timeline = visitTimelineDates[index];

    if (!timeline) {
      continue;
    }

    await prisma.visitRequest.update({
      where: { id: visitEntry.id },
      data: {
        createdAt: new Date(timeline.createdAt),
        updatedAt: new Date(timeline.updatedAt),
      },
    });
  }
}

async function main() {
  await seedCities();

  if (shouldSeedDemoData) {
    await seedUsers();
    await seedSubscriptions();
    await seedVerificationRequests();
    await seedProperties();
    await seedReports();
    await seedConnectionsAndChats();
    await seedSavedItemsAndGroups();
    await seedVisitRequests();
  }

  if (shouldSeedPreviewActivity) {
    await seedPreviewMarketplaceActivity(prisma, demoPassword);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("FlatBuddy seed completed.");
    if (shouldSeedDemoData) {
      console.log(`Demo password for seeded accounts: ${demoPassword}`);
    } else {
      console.log("Demo user seeding skipped. Set SEED_DEMO_DATA=true if you want the sample accounts back.");
    }
    if (shouldSeedPreviewActivity) {
      console.log("Preview marketplace activity seeded for existing tenant accounts.");
    } else {
      console.log("Preview marketplace activity skipped. Set SEED_PREVIEW_ACTIVITY=true if you want richer demo activity.");
    }
  })
  .catch(async (error) => {
    console.error("FlatBuddy seed failed.", error);
    await prisma.$disconnect();
    process.exit(1);
  });
