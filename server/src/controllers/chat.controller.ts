import { UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getChatRoom, getIo, getUserRoom } from "../lib/socket.js";

const messageSchema = z.object({
  body: z.string().min(1).max(1000),
});

export async function listChats(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const chats = await prisma.chat.findMany({
    where: {
      participants: {
        some: {
          userId: req.auth.userId,
        },
      },
    },
    include: {
      participants: {
        include: {
          user: {
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
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const chatsWithUnread = await Promise.all(
    chats.map(async (chat) => {
      const currentParticipant = chat.participants.find((participant) => participant.userId === req.auth?.userId);

      const unreadCount = await prisma.message.count({
        where: {
          chatId: chat.id,
          senderId: {
            not: req.auth?.userId,
          },
          createdAt: currentParticipant?.lastReadAt
            ? {
                gt: currentParticipant.lastReadAt,
              }
            : undefined,
        },
      });

      return {
        ...chat,
        unreadCount: currentParticipant?.lastReadAt ? unreadCount : Math.max(unreadCount - 1, 0),
      };
    }),
  );

  return res.json(chatsWithUnread);
}

export async function listMessages(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      participants: {
        include: {
          user: {
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
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              role: true,
              profile: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!chat) {
    return res.status(404).json({ message: "Chat not found." });
  }

  const isParticipant = chat.participants.some((participant) => participant.userId === req.auth?.userId);

  if (!isParticipant && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "You are not part of this chat." });
  }

  await prisma.chatParticipant.updateMany({
    where: {
      chatId: chat.id,
      userId: req.auth.userId,
    },
    data: {
      lastReadAt: new Date(),
    },
  });

  return res.json(chat);
}

export async function createMessage(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = messageSchema.parse(req.body);
  const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      participants: true,
    },
  });

  if (!chat) {
    return res.status(404).json({ message: "Chat not found." });
  }

  const isParticipant = chat.participants.some((participant) => participant.userId === req.auth?.userId);

  if (!isParticipant && req.auth.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "You are not part of this chat." });
  }

  const message = await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId: req.auth.userId,
      senderType: "USER",
      body: payload.body,
    },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
        },
      },
    },
  });

  await prisma.chat.update({
    where: { id: chat.id },
    data: {
      updatedAt: new Date(),
    },
  });

  await prisma.chatParticipant.updateMany({
    where: {
      chatId: chat.id,
      userId: req.auth.userId,
    },
    data: {
      lastReadAt: new Date(),
    },
  });

  const io = getIo();
  io.to(getChatRoom(chat.id)).emit("chat:message", {
    chatId: chat.id,
    message,
  });

  chat.participants.forEach((participant) => {
    io.to(getUserRoom(participant.userId)).emit("chat:list:update");
  });

  return res.status(201).json(message);
}
