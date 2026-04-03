import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isSuspended: true,
        suspensionReason: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "User account was not found." });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        message: user.suspensionReason
          ? `This account is suspended. Reason: ${user.suspensionReason}`
          : "This account is suspended. Please contact support or an admin.",
      });
    }

    req.auth = {
      userId: user.id,
      role: user.role as UserRole,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token." });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "You do not have access to this resource." });
    }

    return next();
  };
}
