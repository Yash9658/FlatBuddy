# FlatBuddy

FlatBuddy is a full-stack rental discovery platform that combines four workflows in one product:

- city discovery
- tenant compatibility matching
- landlord property listings
- group planning, chat, visits, and notifications

It is built as a marketplace-style application rather than a basic CRUD demo. Tenants can discover cities, compare listings, connect with compatible renters, form groups, shortlist properties, and coordinate visits. Landlords can verify themselves, publish listings, manage visit requests, and upgrade for premium visibility. Admins can moderate reports, review landlord verification requests, and manage platform safety.

## Core Product Areas

- **Tenant flow**: register, verify email, choose tenant role, complete renter profile, save preferences, view matches, connect with renters, chat, save listings, create groups, and request visits.
- **Landlord flow**: choose landlord role, complete landlord profile, request verification, create listings, upload images, review analytics, and manage visit approvals.
- **Admin flow**: review reports, moderate listings, suspend users, and approve or reject landlord verification requests.
- **Billing flow**: Stripe Checkout and Billing Portal support Tenant Pro and Landlord Pro subscriptions.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: local email/password, refresh-token sessions, Google OAuth
- **Realtime**: Socket.IO
- **Payments**: Stripe subscriptions
- **Media**: Cloudinary uploads
- **Deployment**: Vercel frontend, Render backend, Neon Postgres

## Repository Structure

```text
client/   React frontend
server/   Express API, Prisma schema, seeds, business logic
```

Detailed breakdowns:

- [Architecture](./architecture.md)
- [API Spec](./api-spec.md)
- [Database Schema](./database-schema.md)
- [Deployment](./deployment.md)
- [Operations](./operations.md)
- [Sitemap](./sitemap.md)

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment files

Create:

- `client/.env`
- `server/.env`

Use the examples in:

- `client/.env.example`
- `server/.env.example`

### 3. Run database migrations

```bash
npm run db:migrate
```

This runs Prisma migrations against the database configured in `server/.env`.

### 4. Seed the database

```bash
npm run db:seed
```

Demo data is only created if `SEED_DEMO_DATA=true`.

### 5. Start both apps

```bash
npm run dev
```

Typical local URLs:

- frontend: `http://localhost:5173`
- backend: `http://localhost:4000`

## Main Backend Endpoints

Examples:

- `/api/auth/*`
- `/api/cities`
- `/api/properties`
- `/api/matches`
- `/api/connections`
- `/api/chats`
- `/api/groups`
- `/api/visits`
- `/api/notifications`
- `/api/billing`
- `/api/admin`

Full endpoint list: [api-spec.md](./api-spec.md)

## Authentication Model

FlatBuddy uses:

- access token in frontend memory
- refresh token in secure HTTP-only cookie
- optional Google OAuth sign-in
- role-based access control for tenant, landlord, and admin flows

After login, routing depends on:

- selected role
- profile completion state
- admin status

## Business Rules Implemented

- tenants and landlords have separate setup flows
- landlord listing creation requires approved verification
- free tenants have a pending connection limit
- free landlords have a live listing limit
- plan purchase is restricted by account role
- tenant and landlord profile completion are recalculated on the backend
- move-in dates cannot be in the past
- tenant budgets must satisfy `min <= max`
- group invitations are distinct from actual group membership

## Realtime Behavior

Socket.IO is used for:

- new chat messages
- connection status changes
- chat list refresh
- notification-related refresh behavior

## Stripe Billing

Supported plans:

- `TENANT_PRO`
- `LANDLORD_PRO`

Billing includes:

- checkout session creation
- customer portal session creation
- webhook-based subscription sync
- cancellation at period end

## File Uploads

Landlord listing images are uploaded through the backend and stored in Cloudinary. The upload endpoint validates:

- file presence
- image MIME/magic bytes
- size limits

## Production Notes

- frontend is configured as an SPA with Vercel rewrite support
- backend expects correct `CLIENT_URL`, `CORS_ORIGINS`, cookie, Google OAuth, and Stripe env configuration
- production refresh cookies require secure cross-site settings

See [deployment.md](./deployment.md) for the full deployment checklist.

## Recommended Reading Order

If you want to understand the project fully:

1. [architecture.md](./architecture.md)
2. [database-schema.md](./database-schema.md)
3. [api-spec.md](./api-spec.md)
4. [sitemap.md](./sitemap.md)
5. [deployment.md](./deployment.md)
6. [operations.md](./operations.md)
