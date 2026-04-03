import Stripe from "stripe";
import { env } from "../config/env.js";

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }

  if (!stripe) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });
  }

  return stripe;
}
