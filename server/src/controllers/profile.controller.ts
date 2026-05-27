import { OccupationType, UserRole, VerificationStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { computeProfileCompletion } from "../lib/profile-completion.js";
import { prisma } from "../lib/prisma.js";
import { buildMatchInsights, calculateCompatibilityScore, getSharedInterests } from "../utils/compatibility.js";

const profileSchema = z.object({
  fullName: z.string().min(2),
  age: z.coerce.number().int().min(18).max(99).optional(),
  bio: z.string().max(400).optional(),
  gender: z.string().optional(),
  occupation: z.nativeEnum(OccupationType),
  collegeOrCompany: z.string().optional(),
  targetCityId: z.string().optional(),
  currentCity: z.string().optional(),
  preferredArea: z.string().optional(),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  moveInDate: z.coerce.date().optional(),
  avatarUrl: z.string().url().optional(),
  phone: z.string().optional(),
});

const preferenceSchema = z.object({
  foodPreference: z.enum(["VEGETARIAN", "NON_VEGETARIAN", "EGGETARIAN", "FLEXIBLE"]),
  smokingPreference: z.enum(["NO", "OCCASIONAL", "YES", "FLEXIBLE"]),
  drinkingPreference: z.enum(["NO", "OCCASIONAL", "YES", "FLEXIBLE"]),
  cleanlinessLevel: z.coerce.number().int().min(1).max(5),
  sleepSchedule: z.string().optional(),
  petsFriendly: z.boolean().default(false),
  genderPreference: z.string().optional(),
  languagePreferences: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  occupationPreference: z.nativeEnum(OccupationType).optional(),
});

const verificationRequestSchema = z.object({
  documentUrl: z.string().url(),
  notes: z.string().trim().max(400).optional(),
});

const roleSelectionSchema = z.object({
  role: z.enum([UserRole.TENANT, UserRole.LANDLORD]),
});

export async function updateProfile(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = profileSchema.parse(req.body);

  if (payload.targetCityId) {
    const targetCity = await prisma.city.findUnique({
      where: { id: payload.targetCityId },
      select: { id: true },
    });

    if (!targetCity) {
      return res.status(400).json({ message: "Selected target city is not valid anymore." });
    }
  }

  if (req.auth.role === UserRole.TENANT && payload.budgetMin && payload.budgetMax && payload.budgetMin > payload.budgetMax) {
    return res.status(400).json({ message: "Minimum budget cannot be greater than maximum budget." });
  }

  const profile = await prisma.profile.upsert({
    where: { userId: req.auth.userId },
    update: payload,
    create: {
      ...payload,
      userId: req.auth.userId,
    },
  });

  const currentPreference =
    req.auth.role === UserRole.TENANT ? await prisma.preference.findUnique({ where: { userId: req.auth.userId } }) : null;

  await prisma.user.update({
    where: { id: req.auth.userId },
    data: {
      isProfileComplete: computeProfileCompletion(req.auth.role, payload, currentPreference),
    },
  });

  return res.json(profile);
}

export async function updatePreference(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = preferenceSchema.parse(req.body);

  const preference = await prisma.preference.upsert({
    where: { userId: req.auth.userId },
    update: payload,
    create: {
      ...payload,
      userId: req.auth.userId,
    },
  });

  if (req.auth.role === UserRole.TENANT) {
    const currentProfile = await prisma.profile.findUnique({ where: { userId: req.auth.userId } });

    await prisma.user.update({
      where: { id: req.auth.userId },
      data: {
        isProfileComplete: computeProfileCompletion(req.auth.role, currentProfile, preference),
      },
    });
  }

  return res.json(preference);
}

export async function updateRoleSelection(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = roleSelectionSchema.parse(req.body);

  const [currentProfile, currentPreference] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: req.auth.userId } }),
    prisma.preference.findUnique({ where: { userId: req.auth.userId } }),
  ]);

  const updatedUser = await prisma.user.update({
    where: { id: req.auth.userId },
    data: {
      role: payload.role,
      isProfileComplete: computeProfileCompletion(payload.role, currentProfile, currentPreference),
      landlordVerificationStatus: payload.role === UserRole.LANDLORD ? undefined : VerificationStatus.NOT_REQUESTED,
      landlordVerificationRequestedAt: payload.role === UserRole.LANDLORD ? undefined : null,
      landlordVerifiedAt: payload.role === UserRole.LANDLORD ? undefined : null,
      landlordVerificationNotes: payload.role === UserRole.LANDLORD ? undefined : null,
      landlordVerificationDocumentUrl: payload.role === UserRole.LANDLORD ? undefined : null,
    },
    select: {
      id: true,
      email: true,
      role: true,
      authProvider: true,
      isProfileComplete: true,
      isSuspended: true,
      suspendedAt: true,
      suspensionReason: true,
      landlordVerificationStatus: true,
      landlordVerificationRequestedAt: true,
      landlordVerifiedAt: true,
      landlordVerificationNotes: true,
      landlordVerificationDocumentUrl: true,
      profile: {
        include: {
          targetCity: true,
        },
      },
      preference: true,
      subscription: true,
    },
  });

  return res.json(updatedUser);
}

export async function getUserProfileDetail(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [viewer, targetUser, existingConnection, sharedGroups] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: {
        profile: {
          include: {
            targetCity: true,
          },
        },
        preference: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        profile: {
          include: {
            targetCity: true,
          },
        },
        preference: true,
        createdAt: true,
      },
    }),
    prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { senderId: req.auth.userId, receiverId: userId },
          { senderId: userId, receiverId: req.auth.userId },
        ],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        senderId: true,
        receiverId: true,
      },
    }),
    prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: req.auth.userId,
          },
        },
        AND: [
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
      },
      take: 5,
    }),
  ]);

  if (!viewer) {
    return res.status(404).json({ message: "Your account was not found." });
  }

  if (!targetUser || targetUser.role !== "TENANT") {
    return res.status(404).json({ message: "Tenant profile not found." });
  }

  const compatibilityScore = calculateCompatibilityScore(viewer, targetUser);
  const sharedInterests = getSharedInterests(viewer, targetUser);
  const insights = buildMatchInsights(viewer, targetUser);
  const moveInGapDays =
    viewer.profile?.moveInDate && targetUser.profile?.moveInDate
      ? Math.round(
          Math.abs(viewer.profile.moveInDate.getTime() - targetUser.profile.moveInDate.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  return res.json({
    user: targetUser,
    compatibilityScore,
    sharedInterests,
    insights,
    sharedGroups,
    moveInGapDays,
    connection: existingConnection
      ? {
          id: existingConnection.id,
          status: existingConnection.status,
          createdAt: existingConnection.createdAt,
          isIncoming: existingConnection.receiverId === req.auth.userId,
        }
      : null,
  });
}

export async function requestLandlordVerification(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.auth.role !== UserRole.LANDLORD && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only landlord accounts can request verification." });
  }

  const payload = verificationRequestSchema.parse(req.body);

  const updatedUser = await prisma.user.update({
    where: { id: req.auth.userId },
    data: {
      landlordVerificationStatus: VerificationStatus.PENDING,
      landlordVerificationRequestedAt: new Date(),
      landlordVerificationNotes: payload.notes ?? null,
      landlordVerificationDocumentUrl: payload.documentUrl,
      landlordVerifiedAt: null,
    },
    select: {
      id: true,
      landlordVerificationStatus: true,
      landlordVerificationRequestedAt: true,
      landlordVerifiedAt: true,
      landlordVerificationNotes: true,
      landlordVerificationDocumentUrl: true,
    },
  });

  return res.json(updatedUser);
}
