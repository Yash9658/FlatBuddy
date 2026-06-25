import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import path from "node:path";
import { env } from "./config/env.js";
import { handleStripeWebhook } from "./controllers/billing.controller.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { configureGooglePassport } from "./passport/google.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import cityRoutes from "./routes/city.routes.js";
import connectionRoutes from "./routes/connection.routes.js";
import groupRoutes from "./routes/group.routes.js";
import matchRoutes from "./routes/match.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import savedRoutes from "./routes/saved.routes.js";
import { uploadsRoot } from "./lib/uploads.js";
import uploadRoutes from "./routes/upload.routes.js";
import visitRoutes from "./routes/visit.routes.js";

configureGooglePassport();

export const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
});

app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  }),
);
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use("/uploads", express.static(uploadsRoot));

app.get("/api/health", (_req, res) => {
  res.json({
    name: "FlatBuddy API",
    status: "ok",
    auth: "access-token + refresh-token + google-oauth",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
