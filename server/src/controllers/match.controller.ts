import { OccupationType } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getSubscriptionAccess } from "../lib/subscriptions.js";
import { buildMatchInsights, calculateCompatibilityScore } from "../utils/compatibility.js";

const matchFilterSchema = z.object({
  minCompatibility: z.coerce.number().int().min(0).max(100).optional(),
  occupation: z.nativeEnum(OccupationType).optional(),
  interest: z.string().trim().min(1).max(40).optional(),
});

export async function listPotentialMatches(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const filters = matchFilterSchema.parse(req.query);
  const hasPremiumFilters = Boolean(filters.minCompatibility || filters.occupation || filters.interest);

  const [currentUser, subscriptionAccess] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: {
        profile: true,
        preference: true,
      },
    }),
    getSubscriptionAccess(req.auth.userId),
  ]);

  if (!currentUser?.profile?.targetCityId) {
    return res.status(400).json({ message: "Choose a target city to discover tenant partners." });
  }

  if (hasPremiumFilters && !subscriptionAccess.hasTenantPro && req.auth.role !== "ADMIN") {
    return res.status(403).json({
      message: "Advanced match filters are available on Tenant Pro.",
    });
  }

  const candidates = await prisma.user.findMany({
    where: {
      id: { not: currentUser.id },
      role: "TENANT",
      profile: {
        is: {
          targetCityId: currentUser.profile.targetCityId,
          occupation: filters.occupation,
        },
      },
    },
    include: {
      profile: true,
      preference: true,
    },
    take: 24,
  });

  const rankedMatches = candidates
    .map((candidate) => ({
      user: candidate,
      compatibilityScore: calculateCompatibilityScore(currentUser, candidate),
      insights: subscriptionAccess.hasTenantPro
        ? buildMatchInsights(currentUser, candidate)
        : [],
    }))
    .filter((candidate) => {
      if (
        filters.interest &&
        !candidate.user.preference?.interests.some((interest) =>
          interest.toLowerCase().includes(filters.interest!.toLowerCase()),
        )
      ) {
        return false;
      }

      if (filters.minCompatibility && candidate.compatibilityScore < filters.minCompatibility) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return res.json(rankedMatches);
}
