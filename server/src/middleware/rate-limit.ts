import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
};

const requestStore = new Map<string, { count: number; resetAt: number }>();

export function createRateLimit({ windowMs, maxRequests, keyPrefix }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const entry = requestStore.get(key);

    if (!entry || entry.resetAt <= now) {
      requestStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      return res.status(429).json({
        message: "Too many requests. Please slow down and try again shortly.",
      });
    }

    entry.count += 1;
    requestStore.set(key, entry);
    return next();
  };
}
