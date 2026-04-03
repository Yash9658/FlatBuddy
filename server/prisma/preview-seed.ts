import bcrypt from "bcryptjs";
import {
  AuthProvider,
  FoodPreference,
  OccupationType,
  PrismaClient,
} from "@prisma/client";

const previewUsersByCity = {
  pune: [
    {
      email: "preview-pune-kavya@flatbuddy.app",
      fullName: "Kavya Kulkarni",
      preferredArea: "Viman Nagar",
      budgetMin: 11000,
      budgetMax: 14500,
      moveInDate: new Date("2026-04-18T00:00:00.000Z"),
      occupation: OccupationType.WORKING_PROFESSIONAL,
      bio: "Product designer looking for a calm, tidy shared apartment near work and cafes.",
      interests: ["Design", "Pilates", "Coffee walks"],
      foodPreference: FoodPreference.FLEXIBLE,
      sleepSchedule: "Balanced",
    },
    {
      email: "preview-pune-arjun@flatbuddy.app",
      fullName: "Arjun Patil",
      preferredArea: "Hinjewadi",
      budgetMin: 9000,
      budgetMax: 13000,
      moveInDate: new Date("2026-04-12T00:00:00.000Z"),
      occupation: OccupationType.WORKING_PROFESSIONAL,
      bio: "Software engineer open to teaming up for a budget-friendly flat close to the tech corridor.",
      interests: ["Badminton", "Coding", "Street food"],
      foodPreference: FoodPreference.NON_VEGETARIAN,
      sleepSchedule: "Night owl",
    },
    {
      email: "preview-pune-isha@flatbuddy.app",
      fullName: "Isha Mehta",
      preferredArea: "Kothrud",
      budgetMin: 10000,
      budgetMax: 12500,
      moveInDate: new Date("2026-04-22T00:00:00.000Z"),
      occupation: OccupationType.STUDENT,
      bio: "MBA student hoping to form a small, reliable flatmate circle before finalizing a place.",
      interests: ["Reading", "Yoga", "Movie nights"],
      foodPreference: FoodPreference.VEGETARIAN,
      sleepSchedule: "Early riser",
    },
  ],
  delhi: [
    {
      email: "preview-delhi-naina@flatbuddy.app",
      fullName: "Naina Verma",
      preferredArea: "Dwarka",
      budgetMin: 9000,
      budgetMax: 12000,
      moveInDate: new Date("2026-04-16T00:00:00.000Z"),
      occupation: OccupationType.STUDENT,
      bio: "UPSC aspirant searching for a quiet, respectful setup near metro connectivity.",
      interests: ["Reading", "Morning walks", "Podcasts"],
      foodPreference: FoodPreference.VEGETARIAN,
      sleepSchedule: "Early riser",
    },
    {
      email: "preview-delhi-rohan@flatbuddy.app",
      fullName: "Rohan Sethi",
      preferredArea: "Mukherjee Nagar",
      budgetMin: 8000,
      budgetMax: 11500,
      moveInDate: new Date("2026-04-10T00:00:00.000Z"),
      occupation: OccupationType.WORKING_PROFESSIONAL,
      bio: "Analyst looking for one or two dependable flatmates and a place with easy commute options.",
      interests: ["Football", "Finance", "Cooking"],
      foodPreference: FoodPreference.FLEXIBLE,
      sleepSchedule: "Balanced",
    },
    {
      email: "preview-delhi-zoya@flatbuddy.app",
      fullName: "Zoya Khan",
      preferredArea: "Saket",
      budgetMin: 12000,
      budgetMax: 15500,
      moveInDate: new Date("2026-04-21T00:00:00.000Z"),
      occupation: OccupationType.WORKING_PROFESSIONAL,
      bio: "Marketing associate interested in a clean, social apartment and quick landlord coordination.",
      interests: ["Music", "Gym", "Cafes"],
      foodPreference: FoodPreference.NON_VEGETARIAN,
      sleepSchedule: "Balanced",
    },
  ],
} as const;

type PreviewUserSeed = (typeof previewUsersByCity)[keyof typeof previewUsersByCity][number];

export async function seedPreviewMarketplaceActivity(prisma: PrismaClient, previewPassword: string) {
  const passwordHash = await bcrypt.hash(previewPassword, 12);

  const cities = await prisma.city.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  const cityMap = new Map(cities.map((city) => [city.slug, city]));
  const propertyMap = new Map(
    (
      await prisma.property.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          title: true,
          city: {
            select: {
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    ).map((property) => [property.city.slug, property]),
  );

  const tenantUsers = await prisma.user.findMany({
    where: {
      role: "TENANT",
      email: {
        not: {
          contains: "@flatbuddy.app",
        },
      },
    },
    include: {
      profile: true,
      preference: true,
    },
  });

  for (const user of tenantUsers) {
    let targetCitySlug = "pune";

    if (user.profile?.targetCityId) {
      const city = cities.find((item) => item.id === user.profile?.targetCityId);
      if (city?.slug === "delhi" || city?.slug === "pune") {
        targetCitySlug = city.slug;
      }
    }

    const targetCity = cityMap.get(targetCitySlug);
    if (!targetCity) {
      continue;
    }

    await prisma.profile.updateMany({
      where: { userId: user.id },
      data: {
        targetCityId: user.profile?.targetCityId ?? targetCity.id,
        currentCity: user.profile?.currentCity || (targetCitySlug === "delhi" ? "Jaipur" : "Nagpur"),
        preferredArea:
          user.profile?.preferredArea || previewUsersByCity[targetCitySlug][0].preferredArea,
        budgetMin: user.profile?.budgetMin ?? 9000,
        budgetMax: user.profile?.budgetMax ?? 14000,
        moveInDate: user.profile?.moveInDate ?? new Date("2026-04-20T00:00:00.000Z"),
        bio:
          user.profile?.bio || "Looking for a dependable flatmate and a budget-safe rental setup.",
        occupation: user.profile?.occupation ?? OccupationType.WORKING_PROFESSIONAL,
      },
    });

    await prisma.preference.upsert({
      where: { userId: user.id },
      update: {
        interests:
          user.preference?.interests?.length ? user.preference.interests : ["Movies", "Travel", "Fitness"],
        languagePreferences:
          user.preference?.languagePreferences?.length
            ? user.preference.languagePreferences
            : ["English", "Hindi"],
        sleepSchedule: user.preference?.sleepSchedule || "Balanced",
        cleanlinessLevel: user.preference?.cleanlinessLevel ?? 4,
      },
      create: {
        userId: user.id,
        foodPreference: FoodPreference.FLEXIBLE,
        smokingPreference: "NO",
        drinkingPreference: "OCCASIONAL",
        cleanlinessLevel: 4,
        sleepSchedule: "Balanced",
        interests: ["Movies", "Travel", "Fitness"],
        languagePreferences: ["English", "Hindi"],
      },
    });

    const previewUsers = await Promise.all(
      previewUsersByCity[targetCitySlug].map((previewUser) =>
        ensurePreviewUser(prisma, cityMap, passwordHash, targetCitySlug, previewUser),
      ),
    );

    const [pendingUser, acceptedUserOne, acceptedUserTwo] = previewUsers;

    await ensureConnection(prisma, {
      senderId: pendingUser.id,
      receiverId: user.id,
      cityId: targetCity.id,
      message: `Hey, I am searching around ${previewUsersByCity[targetCitySlug][0].preferredArea}. Want to compare options together?`,
      status: "PENDING",
    });

    await ensureConnection(prisma, {
      senderId: acceptedUserOne.id,
      receiverId: user.id,
      cityId: targetCity.id,
      message: "Our budgets look close. Happy to coordinate shortlists and landlord outreach.",
      status: "ACCEPTED",
    });

    await ensureConnection(prisma, {
      senderId: acceptedUserTwo.id,
      receiverId: user.id,
      cityId: targetCity.id,
      message: "I am open to teaming up if we agree on area and rent split.",
      status: "ACCEPTED",
    });

    const chatOneId = await ensureDirectChat(prisma, user.id, acceptedUserOne.id);
    const chatTwoId = await ensureDirectChat(prisma, user.id, acceptedUserTwo.id);

    await ensureMessage(prisma, chatOneId, acceptedUserOne.id, "I shortlisted two places already. Want me to send them here?");
    await ensureMessage(prisma, chatOneId, acceptedUserOne.id, "I can also do the first landlord call if you like.");
    await ensureMessage(prisma, chatTwoId, acceptedUserTwo.id, "I am free this weekend for property visits.");

    await prisma.chat.updateMany({
      where: { id: { in: [chatOneId, chatTwoId] } },
      data: { updatedAt: new Date() },
    });
    await prisma.chatParticipant.updateMany({
      where: { chatId: { in: [chatOneId, chatTwoId] }, userId: user.id },
      data: { lastReadAt: null },
    });
    await prisma.chatParticipant.updateMany({
      where: { chatId: chatOneId, userId: acceptedUserOne.id },
      data: { lastReadAt: new Date() },
    });
    await prisma.chatParticipant.updateMany({
      where: { chatId: chatTwoId, userId: acceptedUserTwo.id },
      data: { lastReadAt: new Date() },
    });

    await prisma.savedUser.upsert({
      where: {
        ownerUserId_targetUserId: {
          ownerUserId: user.id,
          targetUserId: acceptedUserOne.id,
        },
      },
      update: {},
      create: {
        ownerUserId: user.id,
        targetUserId: acceptedUserOne.id,
      },
    });

    const property = propertyMap.get(targetCitySlug) ?? [...propertyMap.values()][0];
    if (!property) {
      continue;
    }

    await prisma.savedProperty.upsert({
      where: {
        userId_propertyId: {
          userId: user.id,
          propertyId: property.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        propertyId: property.id,
      },
    });

    const existingVisit = await prisma.visitRequest.findFirst({
      where: {
        requesterId: user.id,
        propertyId: property.id,
      },
      select: { id: true },
    });

    if (existingVisit) {
      await prisma.visitRequest.update({
        where: { id: existingVisit.id },
        data: {
          requestedDate: new Date("2026-04-12T10:00:00.000Z"),
          note: "Can we schedule a quick walkthrough this weekend?",
          status: "APPROVED",
          landlordMessage: "Confirmed for Saturday morning. Please carry an ID proof.",
        },
      });
    } else {
      await prisma.visitRequest.create({
        data: {
          requesterId: user.id,
          propertyId: property.id,
          requestedDate: new Date("2026-04-12T10:00:00.000Z"),
          note: "Can we schedule a quick walkthrough this weekend?",
          status: "APPROVED",
          landlordMessage: "Confirmed for Saturday morning. Please carry an ID proof.",
        },
      });
    }

    const groupName = `Preview Search Team - ${user.email.split("@")[0]}`;
    let group = await prisma.group.findFirst({
      where: {
        ownerUserId: user.id,
        name: groupName,
      },
      select: { id: true },
    });

    if (!group) {
      group = await prisma.group.create({
        data: {
          ownerUserId: user.id,
          cityId: targetCity.id,
          name: groupName,
          description: "Small search squad created for demo-ready shortlist planning.",
          planningNotes:
            "Goal: compare 2-3 listings, align on rent split, and book one landlord visit this week.",
          members: {
            create: [
              { userId: user.id, isLeader: true },
              { userId: acceptedUserOne.id, isLeader: false },
              { userId: acceptedUserTwo.id, isLeader: false },
            ],
          },
        },
        select: { id: true },
      });
    }

    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: acceptedUserOne.id,
        },
      },
      update: {},
      create: {
        groupId: group.id,
        userId: acceptedUserOne.id,
        isLeader: false,
      },
    });
    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: acceptedUserTwo.id,
        },
      },
      update: {},
      create: {
        groupId: group.id,
        userId: acceptedUserTwo.id,
        isLeader: false,
      },
    });
    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
      update: { isLeader: true },
      create: {
        groupId: group.id,
        userId: user.id,
        isLeader: true,
      },
    });

    await prisma.groupShortlistedProperty.upsert({
      where: {
        groupId_propertyId: {
          groupId: group.id,
          propertyId: property.id,
        },
      },
      update: {
        note: "Good fit for preview shortlist: budget-safe and ready for a visit.",
      },
      create: {
        groupId: group.id,
        propertyId: property.id,
        addedByUserId: user.id,
        note: "Good fit for preview shortlist: budget-safe and ready for a visit.",
      },
    });
  }
}

async function ensurePreviewUser(
  prisma: PrismaClient,
  cityMap: Map<string, { id: string; slug: string; name: string }>,
  passwordHash: string,
  citySlug: keyof typeof previewUsersByCity,
  previewUser: PreviewUserSeed,
) {
  const city = cityMap.get(citySlug);
  if (!city) {
    throw new Error(`Missing preview city: ${citySlug}`);
  }

  return prisma.user.upsert({
    where: { email: previewUser.email },
    update: {
      passwordHash,
      role: "TENANT",
      authProvider: AuthProvider.LOCAL,
      isEmailVerified: true,
      isProfileComplete: true,
      profile: {
        upsert: {
          update: {
            fullName: previewUser.fullName,
            occupation: previewUser.occupation,
            currentCity: city.name,
            targetCityId: city.id,
            preferredArea: previewUser.preferredArea,
            budgetMin: previewUser.budgetMin,
            budgetMax: previewUser.budgetMax,
            moveInDate: previewUser.moveInDate,
            bio: previewUser.bio,
          },
          create: {
            fullName: previewUser.fullName,
            occupation: previewUser.occupation,
            currentCity: city.name,
            targetCityId: city.id,
            preferredArea: previewUser.preferredArea,
            budgetMin: previewUser.budgetMin,
            budgetMax: previewUser.budgetMax,
            moveInDate: previewUser.moveInDate,
            bio: previewUser.bio,
          },
        },
      },
      preference: {
        upsert: {
          update: {
            foodPreference: previewUser.foodPreference,
            smokingPreference: "NO",
            drinkingPreference: "OCCASIONAL",
            cleanlinessLevel: 4,
            sleepSchedule: previewUser.sleepSchedule,
            interests: previewUser.interests,
            languagePreferences: ["English", "Hindi"],
          },
          create: {
            foodPreference: previewUser.foodPreference,
            smokingPreference: "NO",
            drinkingPreference: "OCCASIONAL",
            cleanlinessLevel: 4,
            sleepSchedule: previewUser.sleepSchedule,
            interests: previewUser.interests,
            languagePreferences: ["English", "Hindi"],
          },
        },
      },
    },
    create: {
      email: previewUser.email,
      passwordHash,
      role: "TENANT",
      authProvider: AuthProvider.LOCAL,
      isEmailVerified: true,
      isProfileComplete: true,
      profile: {
        create: {
          fullName: previewUser.fullName,
          occupation: previewUser.occupation,
          currentCity: city.name,
          targetCityId: city.id,
          preferredArea: previewUser.preferredArea,
          budgetMin: previewUser.budgetMin,
          budgetMax: previewUser.budgetMax,
          moveInDate: previewUser.moveInDate,
          bio: previewUser.bio,
        },
      },
      preference: {
        create: {
          foodPreference: previewUser.foodPreference,
          smokingPreference: "NO",
          drinkingPreference: "OCCASIONAL",
          cleanlinessLevel: 4,
          sleepSchedule: previewUser.sleepSchedule,
          interests: previewUser.interests,
          languagePreferences: ["English", "Hindi"],
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  });
}

async function ensureConnection(
  prisma: PrismaClient,
  input: {
    senderId: string;
    receiverId: string;
    cityId: string;
    message: string;
    status: "PENDING" | "ACCEPTED";
  },
) {
  const existing = await prisma.connectionRequest.findFirst({
    where: {
      senderId: input.senderId,
      receiverId: input.receiverId,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.connectionRequest.update({
      where: { id: existing.id },
      data: input,
      select: { id: true },
    });
  }

  return prisma.connectionRequest.create({
    data: input,
    select: { id: true },
  });
}

async function ensureDirectChat(prisma: PrismaClient, userA: string, userB: string) {
  const existing = await prisma.chat.findFirst({
    where: {
      isGroup: false,
      AND: [
        {
          participants: {
            some: {
              userId: userA,
            },
          },
        },
        {
          participants: {
            some: {
              userId: userB,
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const chat = await prisma.chat.create({
    data: {
      isGroup: false,
      participants: {
        create: [{ userId: userA }, { userId: userB }],
      },
      messages: {
        create: {
          senderType: "SYSTEM",
          body: "Connection accepted. You can now coordinate your rental search here.",
        },
      },
    },
    select: { id: true },
  });

  return chat.id;
}

async function ensureMessage(prisma: PrismaClient, chatId: string, senderId: string, body: string) {
  const existing = await prisma.message.findFirst({
    where: {
      chatId,
      senderId,
      body,
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId,
      senderType: "USER",
      body,
    },
    select: { id: true },
  });

  return message.id;
}
