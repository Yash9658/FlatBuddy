import { AuthProvider, OccupationType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { Request, RequestHandler, Response } from "express";
import passport from "passport";
import { z } from "zod";
import { env } from "../config/env.js";
import { getRefreshCookieOptions, refreshCookieName } from "../lib/cookies.js";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([UserRole.TENANT, UserRole.LANDLORD]).default(UserRole.TENANT),
  occupation: z.nativeEnum(OccupationType).optional(),
  targetCityId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function getRefreshExpiryDate() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
}

async function persistRefreshToken(userId: string, token: string) {
  return prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: getRefreshExpiryDate(),
    },
  });
}

const authUserSelect = {
  id: true,
  email: true,
  role: true,
  authProvider: true,
  isProfileComplete: true,
  isSuspended: true,
  suspendedAt: true,
  suspensionReason: true,
  landlordVerificationStatus: true,
  landlordVerificationRequestedAt: true,
  landlordVerifiedAt: true,
  landlordVerificationNotes: true,
  landlordVerificationDocumentUrl: true,
  profile: {
    include: {
      targetCity: true,
    },
  },
  preference: true,
  subscription: true,
} as const;

function buildAuthResponse(user: { id: string; role: UserRole; email: string }) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
  });
  const refreshToken = signRefreshToken({
    sub: user.id,
    role: user.role,
  });

  return { accessToken, refreshToken };
}

function buildSuspendedMessage(reason?: string | null) {
  return reason
    ? `This account is suspended. Reason: ${reason}`
    : "This account is suspended. Please contact support or an admin.";
}

export async function register(req: Request, res: Response) {
  const payload = registerSchema.parse(req.body);
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() },
  });

  if (existingUser) {
    return res.status(409).json({ message: "An account already exists for this email." });
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);

  const user = await prisma.user.create({
    data: {
      email: payload.email.toLowerCase(),
      passwordHash,
      role: payload.role,
      authProvider: AuthProvider.LOCAL,
      profile: {
        create: {
          fullName: payload.fullName,
          occupation: payload.occupation ?? OccupationType.WORKING_PROFESSIONAL,
          targetCityId: payload.targetCityId,
        },
      },
      preference: {
        create: {
          interests: [],
          languagePreferences: [],
        },
      },
    },
    select: {
      id: true,
      role: true,
      email: true,
    },
  });

  const { accessToken, refreshToken } = buildAuthResponse(user);
  await persistRefreshToken(user.id, refreshToken);
  res.cookie(refreshCookieName, refreshToken, getRefreshCookieOptions());

  return res.status(201).json({
    message: "Account created successfully.",
    accessToken,
    user,
  });
}

export async function login(req: Request, res: Response) {
  const payload = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() },
  });

  if (!user?.passwordHash) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  if (user.isSuspended) {
    return res.status(403).json({ message: buildSuspendedMessage(user.suspensionReason) });
  }

  const isValid = await bcrypt.compare(payload.password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const { accessToken, refreshToken } = buildAuthResponse(user);
  await persistRefreshToken(user.id, refreshToken);
  res.cookie(refreshCookieName, refreshToken, getRefreshCookieOptions());

  return res.json({
    message: "Logged in successfully.",
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}

export async function refreshSession(req: Request, res: Response) {
  const token = req.cookies[refreshCookieName];

  if (!token) {
    return res.status(401).json({ message: "Refresh token missing." });
  }

  try {
    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: hashToken(token),
        revokedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: "Refresh token is no longer valid." });
    }

    if (stored.user.isSuspended) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      res.clearCookie(refreshCookieName, getRefreshCookieOptions());
      return res.status(403).json({ message: buildSuspendedMessage(stored.user.suspensionReason) });
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { accessToken, refreshToken } = buildAuthResponse(stored.user);
    const currentUser = await prisma.user.findUnique({
      where: { id: stored.user.id },
      select: authUserSelect,
    });

    await persistRefreshToken(stored.user.id, refreshToken);
    res.cookie(refreshCookieName, refreshToken, getRefreshCookieOptions());

    return res.json({
      accessToken,
      user: currentUser,
    });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token." });
  }
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies[refreshCookieName];

  if (token) {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  res.clearCookie(refreshCookieName, getRefreshCookieOptions());
  return res.status(204).send();
}

export async function getMe(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: authUserSelect,
  });

  if (!user) {
    return res.status(404).json({ message: "User account was not found." });
  }

  if (user.isSuspended) {
    return res.status(403).json({ message: buildSuspendedMessage(user.suspensionReason) });
  }

  return res.json(user);
}

const googleOAuthConfigured =
  Boolean(env.GOOGLE_CLIENT_ID) && Boolean(env.GOOGLE_CLIENT_SECRET) && Boolean(env.GOOGLE_CALLBACK_URL);

const googleUnavailable: RequestHandler = (_req, res) => {
  res.status(503).json({
    message: "Google OAuth is not configured yet.",
  });
};

export const googleAuth: RequestHandler = googleOAuthConfigured
  ? (req, res, next) => {
      const requestedRole = req.query.role;
      const role = requestedRole === UserRole.LANDLORD ? UserRole.LANDLORD : UserRole.TENANT;

      passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false,
        state: role,
      })(req, res, next);
    }
  : googleUnavailable;

export const googleCallback: RequestHandler[] = googleOAuthConfigured
  ? [
      passport.authenticate("google", {
        session: false,
        failureRedirect: `${env.CLIENT_URL}/login?error=google_auth_failed`,
      }),
      async (req: Request, res: Response) => {
        const passportUser = req.user as { id: string; role: UserRole; email: string };
        const { accessToken, refreshToken } = buildAuthResponse(passportUser);
        await persistRefreshToken(passportUser.id, refreshToken);
        res.cookie(refreshCookieName, refreshToken, getRefreshCookieOptions());

        const redirectParams = new URLSearchParams({
          token: accessToken,
        });

        return res.redirect(`${env.CLIENT_URL}/auth/callback?${redirectParams.toString()}`);
      },
    ]
  : [googleUnavailable];

export async function getAuthConfig(_req: Request, res: Response) {
  return res.json({
    googleOAuthEnabled: googleOAuthConfigured,
  });
}
