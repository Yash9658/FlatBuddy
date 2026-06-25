import type { Request, Response } from "express";
import { citySeeds } from "../data/cities.js";
import { prisma } from "../lib/prisma.js";
import { publicPropertyOwnerSelect, publicTenantSelect } from "../lib/public-selects.js";
import { hasPlanAccess } from "../lib/subscriptions.js";

export async function listCities(_req: Request, res: Response) {
  const dbCities = await prisma.city.findMany({
    include: {
      areas: true,
      _count: {
        select: {
          profiles: true,
          properties: true,
        },
      },
    },
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });

  if (dbCities.length > 0) {
    return res.json(dbCities);
  }

  return res.json(citySeeds);
}

export async function getCityOverview(req: Request, res: Response) {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const city = await prisma.city.findUnique({
    where: { slug },
    include: {
      areas: true,
      _count: {
        select: {
          profiles: true,
          properties: true,
          groups: true,
        },
      },
    },
  });

  if (!city) {
    const fallbackCity = citySeeds.find((item) => item.slug === slug);

    if (!fallbackCity) {
      return res.status(404).json({ message: "City not found." });
    }

    return res.json({
      ...fallbackCity,
      _count: {
        profiles: 0,
        properties: 0,
        groups: 0,
      },
      seekers: [],
      properties: [],
    });
  }

  const [seekers, properties] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "TENANT",
        isEmailVerified: true,
        isSuspended: false,
        profile: {
          is: {
            targetCityId: city.id,
          },
        },
      },
      select: publicTenantSelect,
      take: 6,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.property.findMany({
      take: 6,
      where: {
        cityId: city.id,
        status: "ACTIVE",
        owner: {
          isSuspended: false,
        },
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
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  return res.json({
    ...city,
    seekers,
    properties: properties
      .map((property) => ({
        ...property,
        isFeatured: hasPlanAccess(property.owner?.subscription, "LANDLORD_PRO"),
      }))
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)),
  });
}
