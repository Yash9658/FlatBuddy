import { UserRole, VisitRequestStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createVisitSchema = z.object({
  propertyId: z.string().min(1),
  requestedDate: z.coerce.date(),
  note: z.string().max(240).optional(),
});

const updateVisitSchema = z.object({
  status: z.enum([VisitRequestStatus.APPROVED, VisitRequestStatus.DECLINED]),
  landlordMessage: z.string().max(240).optional(),
});

const visitListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function listVisits(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const { limit } = visitListSchema.parse(req.query);
  const visits = await prisma.visitRequest.findMany({
    where:
      req.auth.role === UserRole.LANDLORD
        ? {
            property: {
              ownerId: req.auth.userId,
            },
          }
        : {
            requesterId: req.auth.userId,
          },
    include: {
      property: {
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
            },
          },
        },
      },
      requester: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: {
            include: {
              targetCity: true,
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { requestedDate: "asc" }],
    take: limit,
  });

  return res.json(visits);
}

export async function createVisitRequest(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.auth.role !== UserRole.TENANT && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only tenants can request visits." });
  }

  const payload = createVisitSchema.parse(req.body);

  if (payload.requestedDate <= new Date()) {
    return res.status(400).json({ message: "Visit date must be in the future." });
  }

  const property = await prisma.property.findUnique({
    where: { id: payload.propertyId },
    select: { id: true, ownerId: true, status: true },
  });

  if (!property) {
    return res.status(404).json({ message: "Property not found." });
  }

  if (property.status !== "ACTIVE") {
    return res.status(409).json({ message: "Visits can only be requested for active properties." });
  }

  if (property.ownerId === req.auth.userId) {
    return res.status(400).json({ message: "You cannot request a visit for your own property." });
  }

  const existing = await prisma.visitRequest.findFirst({
    where: {
      propertyId: payload.propertyId,
      requesterId: req.auth.userId,
      status: VisitRequestStatus.PENDING,
    },
  });

  if (existing) {
    return res.status(409).json({ message: "You already have a pending visit request for this property." });
  }

  const visit = await prisma.visitRequest.create({
    data: {
      propertyId: payload.propertyId,
      requesterId: req.auth.userId,
      requestedDate: payload.requestedDate,
      note: payload.note,
    },
    include: {
      property: {
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
            },
          },
        },
      },
      requester: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: {
            include: {
              targetCity: true,
            },
          },
        },
      },
    },
  });

  return res.status(201).json(visit);
}

export async function updateVisitRequest(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.auth.role !== UserRole.LANDLORD && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only landlords can update visit requests." });
  }

  const payload = updateVisitSchema.parse(req.body);
  const visitId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const visit = await prisma.visitRequest.findUnique({
    where: { id: visitId },
    include: {
      property: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!visit) {
    return res.status(404).json({ message: "Visit request not found." });
  }

  if (visit.property.ownerId !== req.auth.userId && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only the property owner can update this visit request." });
  }

  if (visit.status !== VisitRequestStatus.PENDING) {
    return res.status(409).json({ message: "This visit request has already been handled." });
  }

  const updated = await prisma.visitRequest.update({
    where: { id: visitId },
    data: {
      status: payload.status,
      landlordMessage: payload.landlordMessage,
    },
    include: {
      property: {
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
            },
          },
        },
      },
      requester: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: {
            include: {
              targetCity: true,
            },
          },
        },
      },
    },
  });

  return res.json(updated);
}
