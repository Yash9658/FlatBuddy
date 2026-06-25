import { ListingStatus, PropertyType, UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { publicPropertyOwnerSelect } from "../lib/public-selects.js";
import {
  FREE_LANDLORD_ACTIVE_LISTING_LIMIT,
  getSubscriptionAccess,
  hasPlanAccess,
} from "../lib/subscriptions.js";

const httpUrlSchema = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "Image URLs must use HTTP or HTTPS.");

const propertyInputSchema = z.object({
  cityId: z.string().min(1),
  title: z.string().min(5),
  description: z.string().min(20),
  propertyType: z.nativeEnum(PropertyType),
  addressLine: z.string().min(5),
  areaName: z.string().min(2),
  monthlyRent: z.coerce.number().positive(),
  securityDeposit: z.coerce.number().nonnegative(),
  availableFrom: z.coerce.date(),
  availableBeds: z.coerce.number().int().positive(),
  totalBeds: z.coerce.number().int().positive(),
  furnished: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  houseRules: z.array(z.string()).default([]),
  preferredTenants: z.array(z.string()).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  images: z.array(httpUrlSchema).max(12).default([]),
});

const propertyFilterSchema = z.object({
  city: z.string().optional(),
  minRent: z.coerce.number().optional(),
  maxRent: z.coerce.number().optional(),
  type: z.nativeEnum(PropertyType).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatTimelineLabel(date: Date) {
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildTimeline(days: number) {
  const today = startOfDay(new Date());

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - index - 1));

    return {
      dateKey: date.toISOString().slice(0, 10),
      date,
      label: formatTimelineLabel(date),
      saves: 0,
      visitRequests: 0,
      approvedVisits: 0,
    };
  });
}

export async function listProperties(req: Request, res: Response) {
  const filters = propertyFilterSchema.parse(req.query);

  const properties = await prisma.property.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      owner: {
        isSuspended: false,
      },
      city: filters.city ? { slug: filters.city } : undefined,
      monthlyRent: {
        gte: filters.minRent,
        lte: filters.maxRent,
      },
      propertyType: filters.type,
    },
    include: {
      city: true,
      images: {
        orderBy: { sortOrder: "asc" },
      },
      owner: {
        select: publicPropertyOwnerSelect,
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit,
  });

  const sortedProperties = properties
    .map((property) => ({
      ...property,
      isFeatured: hasPlanAccess(property.owner?.subscription, "LANDLORD_PRO"),
    }))
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));

  return res.json(sortedProperties);
}

export async function createProperty(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.auth.role !== UserRole.LANDLORD && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only landlords can create listings." });
  }

  if (req.auth.role === UserRole.LANDLORD) {
    const [landlord, subscriptionAccess, liveListingCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.auth.userId },
        select: { landlordVerificationStatus: true },
      }),
      getSubscriptionAccess(req.auth.userId),
      prisma.property.count({
        where: {
          ownerId: req.auth.userId,
          status: {
            in: [ListingStatus.ACTIVE, ListingStatus.PAUSED],
          },
        },
      }),
    ]);

    if (landlord?.landlordVerificationStatus !== "APPROVED") {
      return res.status(403).json({
        message: "Landlord verification must be approved before publishing a property.",
      });
    }

    if (
      !subscriptionAccess.hasLandlordPro &&
      liveListingCount >= FREE_LANDLORD_ACTIVE_LISTING_LIMIT
    ) {
      return res.status(403).json({
        message: `Free landlord accounts can keep up to ${FREE_LANDLORD_ACTIVE_LISTING_LIMIT} live listings. Upgrade to Landlord Pro for more inventory.`,
      });
    }
  }

  const payload = propertyInputSchema.parse(req.body);

  if (payload.availableBeds > payload.totalBeds) {
    return res.status(400).json({ message: "Available beds cannot exceed total beds." });
  }

  if (payload.availableFrom < startOfDay(new Date())) {
    return res.status(400).json({ message: "Availability date cannot be before today." });
  }

  const city = await prisma.city.findUnique({
    where: { id: payload.cityId },
    select: { id: true },
  });

  if (!city) {
    return res.status(400).json({ message: "Selected city is not valid." });
  }

  const property = await prisma.property.create({
    data: {
      ownerId: req.auth.userId,
      cityId: payload.cityId,
      title: payload.title,
      description: payload.description,
      propertyType: payload.propertyType,
      addressLine: payload.addressLine,
      areaName: payload.areaName,
      monthlyRent: payload.monthlyRent,
      securityDeposit: payload.securityDeposit,
      availableFrom: payload.availableFrom,
      availableBeds: payload.availableBeds,
      totalBeds: payload.totalBeds,
      furnished: payload.furnished,
      amenities: payload.amenities,
      houseRules: payload.houseRules,
      preferredTenants: payload.preferredTenants,
      latitude: payload.latitude,
      longitude: payload.longitude,
      images: {
        create: payload.images.map((url, index) => ({
          url,
          sortOrder: index,
        })),
      },
    },
    include: {
      city: true,
      images: true,
    },
  });

  return res.status(201).json(property);
}

export async function listMyProperties(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.auth.role !== UserRole.LANDLORD && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only landlords can view this resource." });
  }

  const properties = await prisma.property.findMany({
    where: {
      ownerId: req.auth.userId,
    },
    include: {
      city: true,
      images: {
        orderBy: { sortOrder: "asc" },
      },
      owner: {
        select: {
          id: true,
          role: true,
          profile: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return res.json(
    properties.map((property) => ({
      ...property,
      isFeatured: hasPlanAccess(property.owner?.subscription, "LANDLORD_PRO"),
    })),
  );
}

export async function getPropertyById(req: Request, res: Response) {
  const propertyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const viewer = await resolvePropertyViewer(req);

  const property = await prisma.property.findUnique({
    where: {
      id: propertyId,
    },
    include: {
      city: true,
      images: {
        orderBy: { sortOrder: "asc" },
      },
      owner: {
          select: publicPropertyOwnerSelect,
      },
      _count: {
        select: {
          savedBy: true,
          visitRequests: true,
          reports: true,
        },
      },
    },
  });

  if (!property) {
    return res.status(404).json({ message: "Property not found." });
  }

  const canViewNonPublicListing =
    property.ownerId === viewer?.userId || viewer?.role === UserRole.ADMIN;

  if (property.status !== ListingStatus.ACTIVE && !canViewNonPublicListing) {
    return res.status(404).json({ message: "Property not found." });
  }

  const relatedProperties = await prisma.property.findMany({
    where: {
      id: {
        not: property.id,
      },
      cityId: property.cityId,
      status: ListingStatus.ACTIVE,
      OR: [
        {
          areaName: property.areaName,
        },
        {
          propertyType: property.propertyType,
        },
      ],
    },
    include: {
      city: true,
      images: {
        orderBy: { sortOrder: "asc" },
      },
      owner: {
          select: publicPropertyOwnerSelect,
      },
    },
    take: 3,
    orderBy: [{ createdAt: "desc" }],
  });

  return res.json({
    property: {
      ...property,
      isFeatured: hasPlanAccess(property.owner?.subscription, "LANDLORD_PRO"),
    },
    relatedProperties: relatedProperties.map((item) => ({
      ...item,
      isFeatured: hasPlanAccess(item.owner?.subscription, "LANDLORD_PRO"),
    })),
  });
}

async function resolvePropertyViewer(req: Request) {
  if (req.auth) {
    return req.auth;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const payload = verifyAccessToken(authHeader.slice("Bearer ".length));
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isSuspended: true,
      },
    });

    if (!user || user.isSuspended) {
      return null;
    }

    return {
      userId: user.id,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export async function getLandlordAnalytics(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.auth.role !== UserRole.LANDLORD && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only landlords can view listing analytics." });
  }

  if (req.auth.role === UserRole.LANDLORD) {
    const subscriptionAccess = await getSubscriptionAccess(req.auth.userId);

    if (!subscriptionAccess.hasLandlordPro) {
      return res.status(403).json({ message: "Listing analytics are available on Landlord Pro." });
    }
  }

  const timelineWindow = buildTimeline(7);
  const timelineStart = timelineWindow[0]?.date ?? startOfDay(new Date());
  const [properties, recentSaves, recentVisits] = await Promise.all([
    prisma.property.findMany({
      where: {
        ownerId: req.auth.userId,
      },
      select: {
        id: true,
        title: true,
        areaName: true,
        monthlyRent: true,
        status: true,
        city: {
          select: {
            name: true,
          },
        },
        images: {
          select: {
            url: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
        },
        _count: {
          select: {
            savedBy: true,
            visitRequests: true,
            reports: true,
          },
        },
        visitRequests: {
          select: {
            status: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.savedProperty.findMany({
      where: {
        property: {
          ownerId: req.auth.userId,
        },
        createdAt: {
          gte: timelineStart,
        },
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.visitRequest.findMany({
      where: {
        property: {
          ownerId: req.auth.userId,
        },
        OR: [
          {
            createdAt: {
              gte: timelineStart,
            },
          },
          {
            updatedAt: {
              gte: timelineStart,
            },
          },
        ],
      },
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const propertyMetrics = properties.map((property) => {
    const pendingVisits = property.visitRequests.filter((visit) => visit.status === "PENDING").length;
    const approvedVisits = property.visitRequests.filter((visit) => visit.status === "APPROVED").length;

    return {
      id: property.id,
      title: property.title,
      cityName: property.city.name,
      areaName: property.areaName,
      monthlyRent: property.monthlyRent,
      status: property.status,
      coverImageUrl: property.images[0]?.url ?? null,
      saves: property._count.savedBy,
      visits: property._count.visitRequests,
      pendingVisits,
      approvedVisits,
      openReports: property._count.reports,
    };
  });

  const summary = {
    totalListings: propertyMetrics.length,
    activeListings: propertyMetrics.filter((property) => property.status === "ACTIVE").length,
    pausedListings: propertyMetrics.filter((property) => property.status === "PAUSED").length,
    rentedListings: propertyMetrics.filter((property) => property.status === "RENTED").length,
    totalSaves: propertyMetrics.reduce((total, property) => total + property.saves, 0),
    totalVisits: propertyMetrics.reduce((total, property) => total + property.visits, 0),
    pendingVisits: propertyMetrics.reduce((total, property) => total + property.pendingVisits, 0),
    approvedVisits: propertyMetrics.reduce((total, property) => total + property.approvedVisits, 0),
    openReports: propertyMetrics.reduce((total, property) => total + property.openReports, 0),
    averageRent:
      propertyMetrics.length > 0
        ? Math.round(
            propertyMetrics.reduce((total, property) => total + property.monthlyRent, 0) / propertyMetrics.length,
          )
        : 0,
  };

  const timelineMap = new Map(
    timelineWindow.map((point) => [
      point.dateKey,
      {
        date: point.date.toISOString(),
        label: point.label,
        saves: point.saves,
        visitRequests: point.visitRequests,
        approvedVisits: point.approvedVisits,
      },
    ]),
  );

  recentSaves.forEach((save) => {
    const dateKey = startOfDay(save.createdAt).toISOString().slice(0, 10);
    const point = timelineMap.get(dateKey);

    if (point) {
      point.saves += 1;
    }
  });

  recentVisits.forEach((visit) => {
    const createdKey = startOfDay(visit.createdAt).toISOString().slice(0, 10);
    const createdPoint = timelineMap.get(createdKey);

    if (createdPoint) {
      createdPoint.visitRequests += 1;
    }

    if (visit.status === "APPROVED") {
      const approvedKey = startOfDay(visit.updatedAt).toISOString().slice(0, 10);
      const approvedPoint = timelineMap.get(approvedKey);

      if (approvedPoint) {
        approvedPoint.approvedVisits += 1;
      }
    }
  });

  return res.json({
    summary,
    timeline: [...timelineMap.values()],
    properties: propertyMetrics,
  });
}
