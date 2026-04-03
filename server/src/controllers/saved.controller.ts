import { UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const savedUserSchema = z.object({
  targetUserId: z.string().min(1),
});

const savedPropertySchema = z.object({
  propertyId: z.string().min(1),
});

export async function listSavedUsers(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const savedUsers = await prisma.savedUser.findMany({
    where: { ownerUserId: req.auth.userId },
    include: {
      target: {
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(savedUsers);
}

export async function saveUser(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = savedUserSchema.parse(req.body);

  if (payload.targetUserId === req.auth.userId) {
    return res.status(400).json({ message: "You cannot save yourself." });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: payload.targetUserId },
    select: { id: true, role: true },
  });

  if (!targetUser || targetUser.role !== UserRole.TENANT) {
    return res.status(404).json({ message: "User not found." });
  }

  const savedUser = await prisma.savedUser.upsert({
    where: {
      ownerUserId_targetUserId: {
        ownerUserId: req.auth.userId,
        targetUserId: payload.targetUserId,
      },
    },
    update: {},
    create: {
      ownerUserId: req.auth.userId,
      targetUserId: payload.targetUserId,
    },
    include: {
      target: {
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
        },
      },
    },
  });

  return res.status(201).json(savedUser);
}

export async function removeSavedUser(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const targetUserId = Array.isArray(req.params.targetUserId) ? req.params.targetUserId[0] : req.params.targetUserId;

  await prisma.savedUser.deleteMany({
    where: {
      ownerUserId: req.auth.userId,
      targetUserId,
    },
  });

  return res.status(204).send();
}

export async function listSavedProperties(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const savedProperties = await prisma.savedProperty.findMany({
    where: { userId: req.auth.userId },
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
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(savedProperties);
}

export async function saveProperty(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = savedPropertySchema.parse(req.body);

  const property = await prisma.property.findUnique({
    where: { id: payload.propertyId },
    select: { id: true },
  });

  if (!property) {
    return res.status(404).json({ message: "Property not found." });
  }

  const savedProperty = await prisma.savedProperty.upsert({
    where: {
      userId_propertyId: {
        userId: req.auth.userId,
        propertyId: payload.propertyId,
      },
    },
    update: {},
    create: {
      userId: req.auth.userId,
      propertyId: payload.propertyId,
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
    },
  });

  return res.status(201).json(savedProperty);
}

export async function removeSavedProperty(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const propertyId = Array.isArray(req.params.propertyId) ? req.params.propertyId[0] : req.params.propertyId;

  await prisma.savedProperty.deleteMany({
    where: {
      userId: req.auth.userId,
      propertyId,
    },
  });

  return res.status(204).send();
}
