import { createServer, type Server as HttpServer } from "node:http";
import type { Express } from "express";
import { Server } from "socket.io";
import type { Socket } from "socket.io";
import { env } from "../config/env.js";
import { verifyAccessToken } from "./jwt.js";
import { prisma } from "./prisma.js";

type AuthenticatedSocket = Socket & {
  data: {
    userId?: string;
    role?: string;
  };
};

let io: Server | null = null;

export function createHttpServer(app: Express) {
  return createServer(app);
}

export function setupSocketServer(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (typeof token !== "string" || !token) {
      next(new Error("Authentication token missing."));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, isSuspended: true },
      });

      if (!user || user.isSuspended) {
        next(new Error("Socket account is unavailable."));
        return;
      }

      const typedSocket = socket as AuthenticatedSocket;
      typedSocket.data.userId = payload.sub;
      typedSocket.data.role = user.role;
      next();
    } catch {
      next(new Error("Invalid socket token."));
    }
  });

  io.on("connection", (socket) => {
    const typedSocket = socket as AuthenticatedSocket;
    const userId = typedSocket.data.userId;

    if (userId) {
      typedSocket.join(getUserRoom(userId));
    }

    typedSocket.on("chat:join", async (chatId: string) => {
      if (typeof chatId !== "string" || !chatId || !userId) {
        return;
      }

      const membership = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId,
            userId,
          },
        },
        select: { id: true },
      });

      if (membership || typedSocket.data.role === "ADMIN") {
        await typedSocket.join(getChatRoom(chatId));
      }
    });

    typedSocket.on("chat:leave", (chatId: string) => {
      if (typeof chatId === "string" && chatId) {
        typedSocket.leave(getChatRoom(chatId));
      }
    });
  });

  return io;
}

export function getIo() {
  if (!io) {
    throw new Error("Socket.io server has not been initialized.");
  }

  return io;
}

export function getUserRoom(userId: string) {
  return `user:${userId}`;
}

export function getChatRoom(chatId: string) {
  return `chat:${chatId}`;
}
