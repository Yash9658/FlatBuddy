# FlatBuddy

FlatBuddy is a full-stack tenant partner finder for students and working professionals moving to a new city. The platform helps people choose a city, discover compatible flatmates, browse properties, connect with landlords, coordinate visits, and form rental groups together.

## Stack

- `client`: React + Vite + TypeScript + Tailwind CSS
- `server`: Express + TypeScript + Prisma + PostgreSQL
- Auth: access token + refresh token + Google OAuth
- Realtime: Socket.io
- Billing: Stripe subscriptions

## Core Product Areas

- City-first discovery
- Tenant partner matching by budget, lifestyle, and interests
- Property listings and landlord onboarding
- Realtime chat, requests, and notifications
- Admin moderation and landlord verification
- Premium tenant and landlord plans

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create env files:

- `server/.env`
- `client/.env`

3. Generate Prisma client and run database setup:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

4. Start both apps in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

## Important Env Values

### Server

- `DATABASE_URL`
- `CLIENT_URL`
- `CORS_ORIGINS`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `PUBLIC_SERVER_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_TENANT_PRO`
- `STRIPE_PRICE_LANDLORD_PRO`
- `STRIPE_BILLING_SUCCESS_URL`
- `STRIPE_BILLING_CANCEL_URL`
- `STRIPE_PORTAL_RETURN_URL`

### Client

- `VITE_API_URL`
- `VITE_GOOGLE_MAPS_EMBED_KEY`

## Demo Data

Demo users are only seeded when:

```env
SEED_DEMO_DATA=true
```

If `SEED_DEMO_DATA=false`, city data still seeds, but sample accounts are skipped.

Preview marketplace activity is separate and optional:

```env
SEED_PREVIEW_ACTIVITY=true
```

That mode enriches existing tenant accounts with:

- sample partner matches
- inbox requests and unread chats
- saved users and properties
- groups and shortlisted homes
- visit activity and notifications

This is useful for local demos and staging, and should usually stay `false` in production.

## Admin Access

Admin signup is intentionally blocked.

Use one of these:

- promote an existing user to `ADMIN` in Prisma Studio
- enable demo data and reseed the sample admin account

Open Prisma Studio with:

```bash
cd server
npx prisma studio
```

## Pre-Deployment Notes

- Set production cookie settings correctly:
  - `COOKIE_SECURE=true`
  - `COOKIE_SAME_SITE=none` when frontend and backend are on different domains
- Configure Cloudinary so uploaded listing images persist across backend restarts and deployments
- Update `GOOGLE_CALLBACK_URL` to your deployed backend URL
- Update Stripe success, cancel, and portal return URLs for production
- Run Prisma migrations against the hosted database before first launch
- Configure the Stripe webhook endpoint on the deployed backend

## Frontend Deployment

The client includes `client/vercel.json` so SPA routes rewrite back to `index.html` on Vercel.

If you use a different host, make sure deep links such as:

- `/discover/pune`
- `/properties/:id`
- `/groups/:id`
- `/partners/:id`

all rewrite to the frontend entry file.

## Suggested Hosting Split

- Frontend: Vercel or Netlify
- Backend: Render or Railway
- Database: Neon, Supabase Postgres, or Railway Postgres

## Verification Before Shipping

Run:

```bash
npm run lint
npm run build
```

Then manually verify:

- email signup and login
- Google OAuth login
- refresh-token session restore
- partner requests and inbox
- landlord listing creation
- notifications
- Stripe pricing flow
- admin access and moderation
