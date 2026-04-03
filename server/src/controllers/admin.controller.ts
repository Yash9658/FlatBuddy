import type { Request, Response } from "express";
import { ListingStatus, VerificationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const reportUpdateSchema = z.object({
  resolved: z.boolean(),
});

const listingUpdateSchema = z.object({
  status: z.nativeEnum(ListingStatus),
});

const userStatusSchema = z.object({
  isSuspended: z.boolean(),
  suspensionReason: z.string().trim().max(280).optional(),
});

const verificationStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().trim().max(400).optional(),
});

export async function getAdminOverview(_req: Request, res: Response) {
  const [userCount, landlordCount, listingCount, reportCount, cityCount, suspendedUserCount, pendingVerificationCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "LANDLORD" } }),
    prisma.property.count(),
    prisma.report.count({ where: { resolved: false } }),
    prisma.city.count(),
    prisma.user.count({ where: { isSuspended: true } }),
    prisma.user.count({
      where: {
        role: "LANDLORD",
        landlordVerificationStatus: VerificationStatus.PENDING,
      },
    }),
  ]);

  return res.json({
    users: userCount,
    landlords: landlordCount,
    activeListings: listingCount,
    openReports: reportCount,
    trackedCities: cityCount,
    suspendedUsers: suspendedUserCount,
    pendingVerificationRequests: pendingVerificationCount,
  });
}

export async function getAdminReports(_req: Request, res: Response) {
  const reports = await prisma.report.findMany({
    include: {
      reporter: {
        select: {
          id: true,
          email: true,
          profile: true,
        },
      },
      reportedUser: {
        select: {
          id: true,
          email: true,
          profile: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          city: true,
          areaName: true,
        },
      },
    },
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    take: 10,
  });

  return res.json(reports);
}

export async function getAdminListings(_req: Request, res: Response) {
  const listings = await prisma.property.findMany({
    include: {
      city: true,
      images: {
        orderBy: { sortOrder: "asc" },
      },
      owner: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  return res.json(listings);
}

export async function getAdminUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      isSuspended: true,
      suspendedAt: true,
      suspensionReason: true,
      landlordVerificationStatus: true,
      landlordVerificationRequestedAt: true,
      landlordVerifiedAt: true,
      landlordVerificationNotes: true,
      landlordVerificationDocumentUrl: true,
      profile: true,
      subscription: true,
      _count: {
        select: {
          sentConnections: true,
          ownedProperties: true,
          reportsAgainst: true,
        },
      },
    },
    orderBy: [{ isSuspended: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  return res.json(users);
}

export async function updateAdminReport(req: Request, res: Response) {
  const payload = reportUpdateSchema.parse(req.body);
  const reportId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      resolved: payload.resolved,
    },
    include: {
      reporter: {
        select: {
          id: true,
          email: true,
          profile: true,
        },
      },
      reportedUser: {
        select: {
          id: true,
          email: true,
          profile: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          city: true,
          areaName: true,
        },
      },
    },
  });

  return res.json(report);
}

export async function updateAdminListing(req: Request, res: Response) {
  const payload = listingUpdateSchema.parse(req.body);
  const propertyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const property = await prisma.property.update({
    where: { id: propertyId },
    data: {
      status: payload.status,
    },
    include: {
      city: true,
      images: {
        orderBy: { sortOrder: "asc" },
      },
      owner: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
        },
      },
    },
  });

  return res.json(property);
}

export async function updateAdminUserStatus(req: Request, res: Response) {
  const payload = userStatusSchema.parse(req.body);
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetUser) {
    return res.status(404).json({ message: "User was not found." });
  }

  if (targetUser.role === "ADMIN") {
    return res.status(400).json({ message: "Admin accounts cannot be suspended from this panel." });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isSuspended: payload.isSuspended,
      suspendedAt: payload.isSuspended ? new Date() : null,
      suspensionReason: payload.isSuspended ? payload.suspensionReason ?? "Suspended by admin review." : null,
      refreshTokens: payload.isSuspended
        ? {
            updateMany: {
              where: {
                revokedAt: null,
              },
              data: {
                revokedAt: new Date(),
              },
            },
          }
        : undefined,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      isSuspended: true,
      suspendedAt: true,
      suspensionReason: true,
      landlordVerificationStatus: true,
      landlordVerificationRequestedAt: true,
      landlordVerifiedAt: true,
      landlordVerificationNotes: true,
      landlordVerificationDocumentUrl: true,
      profile: true,
      subscription: true,
      _count: {
        select: {
          sentConnections: true,
          ownedProperties: true,
          reportsAgainst: true,
        },
      },
    },
  });

  return res.json(user);
}

export async function updateAdminVerification(req: Request, res: Response) {
  const payload = verificationStatusSchema.parse(req.body);
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      landlordVerificationStatus: true,
    },
  });

  if (!targetUser) {
    return res.status(404).json({ message: "User was not found." });
  }

  if (targetUser.role !== "LANDLORD") {
    return res.status(400).json({ message: "Only landlord accounts have verification requests." });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      landlordVerificationStatus:
        payload.status === "APPROVED" ? VerificationStatus.APPROVED : VerificationStatus.REJECTED,
      landlordVerifiedAt: payload.status === "APPROVED" ? new Date() : null,
      landlordVerificationNotes: payload.notes ?? null,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      isSuspended: true,
      suspendedAt: true,
      suspensionReason: true,
      landlordVerificationStatus: true,
      landlordVerificationRequestedAt: true,
      landlordVerifiedAt: true,
      landlordVerificationNotes: true,
      landlordVerificationDocumentUrl: true,
      profile: true,
      subscription: true,
      _count: {
        select: {
          sentConnections: true,
          ownedProperties: true,
          reportsAgainst: true,
        },
      },
    },
  });

  return res.json(user);
}
