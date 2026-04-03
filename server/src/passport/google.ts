import { AuthProvider, OccupationType, UserRole } from "@prisma/client";
import passport from "passport";
import type { Request } from "express";
import type { Profile as GoogleProfile, VerifyCallback } from "passport-google-oauth20";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export function configureGooglePassport() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (
        req: Request,
        _accessToken: string,
        _refreshToken: string,
        profile: GoogleProfile,
        done: VerifyCallback,
      ) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error("Google account did not provide an email address."));
          }

          const requestedRole = parseGoogleRole(req.query.state);
          const existingUser =
            (await prisma.user.findUnique({ where: { googleId: profile.id } })) ??
            (await prisma.user.findUnique({ where: { email: email.toLowerCase() } }));

          if (existingUser) {
            const updatedUser = await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                googleId: profile.id,
                authProvider:
                  existingUser.authProvider === AuthProvider.LOCAL
                    ? AuthProvider.LOCAL
                    : AuthProvider.GOOGLE,
                isEmailVerified: true,
              },
            });

            return done(null, {
              id: updatedUser.id,
              email: updatedUser.email,
              role: updatedUser.role,
            });
          }

          const newUser = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              authProvider: AuthProvider.GOOGLE,
              googleId: profile.id,
              isEmailVerified: true,
              role: requestedRole,
              profile: {
                create: {
                  fullName: profile.displayName,
                  occupation: OccupationType.WORKING_PROFESSIONAL,
                  avatarUrl: profile.photos?.[0]?.value,
                },
              },
              preference: {
                create: {
                  interests: [],
                  languagePreferences: [],
                },
              },
            },
          });

          return done(null, {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
          });
        } catch (error) {
          return done(error as Error);
        }
      },
    ),
  );
}

function parseGoogleRole(state: unknown) {
  if (typeof state !== "string") {
    return UserRole.TENANT;
  }

  return state === UserRole.LANDLORD ? UserRole.LANDLORD : UserRole.TENANT;
}
