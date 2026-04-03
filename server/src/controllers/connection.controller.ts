import { ConnectionStatus, UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getIo, getUserRoom } from "../lib/socket.js";
import { FREE_TENANT_PENDING_REQUEST_LIMIT, getSubscriptionAccess } from "../lib/subscriptions.js";

const createConnectionSchema = z.object({
  receiverId: z.string().min(1),
  cityId: z.string().optional(),
  message: z.string().max(240).optional(),
});

const updateConnectionSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
});

export async function listConnections(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const connections = await prisma.connectionRequest.findMany({
    where: {
      OR: [{ senderId: req.auth.userId }, { receiverId: req.auth.userId }],
    },
    include: {
      city: true,
      sender: {
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
      receiver: {
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
    orderBy: { createdAt: "desc" },
  });

  return res.json(connections);
}

export async function createConnection(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.auth.role !== UserRole.TENANT && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only tenant accounts can send partner requests." });
  }

  const payload = createConnectionSchema.parse(req.body);

  if (req.auth.role === UserRole.TENANT) {
    const [subscriptionAccess, pendingConnections] = await Promise.all([
      getSubscriptionAccess(req.auth.userId),
      prisma.connectionRequest.count({
        where: {
          senderId: req.auth.userId,
          status: ConnectionStatus.PENDING,
        },
      }),
    ]);

    if (
      !subscriptionAccess.hasTenantPro &&
      pendingConnections >= FREE_TENANT_PENDING_REQUEST_LIMIT
    ) {
      return res.status(403).json({
        message: `Free tenant accounts can keep up to ${FREE_TENANT_PENDING_REQUEST_LIMIT} pending partner requests. Upgrade to Tenant Pro for unlimited requests.`,
      });
    }
  }

  if (payload.receiverId === req.auth.userId) {
    return res.status(400).json({ message: "You cannot connect with yourself." });
  }

  const receiver = await prisma.user.findUnique({
    where: { id: payload.receiverId },
    select: { id: true, role: true },
  });

  if (!receiver || receiver.role !== UserRole.TENANT) {
    return res.status(404).json({ message: "Tenant partner not found." });
  }

  const existing = await prisma.connectionRequest.findFirst({
    where: {
      OR: [
        { senderId: req.auth.userId, receiverId: payload.receiverId },
        { senderId: payload.receiverId, receiverId: req.auth.userId },
      ],
    },
  });

  if (existing) {
    return res.status(409).json({ message: "A connection thread already exists between these users." });
  }

  const connection = await prisma.connectionRequest.create({
    data: {
      senderId: req.auth.userId,
      receiverId: payload.receiverId,
      cityId: payload.cityId,
      message: payload.message,
      status: ConnectionStatus.PENDING,
    },
    include: {
      city: true,
      sender: {
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
      receiver: {
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

  const io = getIo();
  io.to(getUserRoom(connection.sender.id)).emit("connection:update", connection);
  io.to(getUserRoom(connection.receiver.id)).emit("connection:update", connection);

  return res.status(201).json(connection);
}

export async function updateConnection(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = updateConnectionSchema.parse(req.body);
  const connectionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const connection = await prisma.connectionRequest.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    return res.status(404).json({ message: "Connection request not found." });
  }

  if (connection.receiverId !== req.auth.userId && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Only the receiver can update this request." });
  }

  const updated = await prisma.connectionRequest.update({
    where: { id: connection.id },
    data: {
      status: payload.status,
    },
    include: {
      city: true,
      sender: {
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
      receiver: {
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

  let chatId: string | null = null;

  if (payload.status === "ACCEPTED") {
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          {
            participants: {
              some: {
                userId: connection.senderId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: connection.receiverId,
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (existingChat) {
      chatId = existingChat.id;
    } else {
      const chat = await prisma.chat.create({
        data: {
          title: null,
          isGroup: false,
          cityId: connection.cityId,
          participants: {
            create: [{ userId: connection.senderId }, { userId: connection.receiverId }],
          },
          messages: {
            create: {
              senderType: "SYSTEM",
              body: "Connection accepted. You can now coordinate your rental search here.",
            },
          },
        },
      });
      chatId = chat.id;
    }
  }

  const io = getIo();
  const enrichedUpdate = {
    ...updated,
    chatId,
  };
  io.to(getUserRoom(updated.sender.id)).emit("connection:update", enrichedUpdate);
  io.to(getUserRoom(updated.receiver.id)).emit("connection:update", enrichedUpdate);
  io.to(getUserRoom(updated.sender.id)).emit("chat:list:update");
  io.to(getUserRoom(updated.receiver.id)).emit("chat:list:update");

  return res.json(enrichedUpdate);
}
