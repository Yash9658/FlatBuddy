# Deployment

This document describes the intended production deployment for FlatBuddy.

## Recommended Hosting Split

- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Neon Postgres
- **OAuth**: Google Cloud Console
- **Billing**: Stripe
- **Media**: Cloudinary

## 1. Pre-Deployment Requirements

You need real values for:

- database connection
- JWT secrets
- Google OAuth credentials
- Stripe keys and price IDs
- Stripe webhook secret
- Cloudinary credentials
- email provider credentials if email delivery is required

## 2. Frontend Deployment (Vercel)

The frontend is a Vite SPA in `client/`.

### Important config

`client/vercel.json` rewrites all routes to `index.html`, which is required for SPA deep links.

### Required frontend env vars

At minimum:

- `VITE_API_URL`

Example:

```text
VITE_API_URL=https://your-backend-domain/api
```

### Build settings

- root directory: `client`
- install command: default or `npm install`
- build command: `npm run build`
- output directory: `dist`

### After changing env vars

Redeploy the frontend so Vite rebuilds with the new values.

## 3. Backend Deployment (Render)

The backend lives in `server/`.

### Build/runtime expectation

- build command: compile TypeScript
- start command: run `server/dist/index.js`

Typical setup:

- root directory: repo root or `server`, depending on service setup
- install dependencies
- run migrations
- build
- start app

### Required backend env vars

Minimum production set:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT`
- `DATABASE_URL`
- `CLIENT_URL`
- `CORS_ORIGINS`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_TTL`
- `REFRESH_TOKEN_TTL`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none`
- `PUBLIC_SERVER_URL`

### Google OAuth vars

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

### Stripe vars

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_TENANT_PRO`
- `STRIPE_PRICE_LANDLORD_PRO`
- `STRIPE_BILLING_SUCCESS_URL`
- `STRIPE_BILLING_CANCEL_URL`
- `STRIPE_PORTAL_RETURN_URL`

### Cloudinary vars

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Optional email vars

- Brevo API key, or
- SMTP configuration

## 4. Database Deployment (Neon)

Create a PostgreSQL project and copy the connection string into:

```text
DATABASE_URL
```

The Prisma datasource reads from this variable.

## 5. Prisma Migrations in Production

Use deployed migrations, not `prisma migrate dev`.

Recommended production command:

```bash
npm exec prisma migrate deploy --workspace server
```

After migrations, generate the Prisma client if your build does not already handle it.

## 6. Seeding Strategy

For production, keep:

- `SEED_DEMO_DATA=false`
- `SEED_PREVIEW_ACTIVITY=false`

Demo or preview data should not be enabled in production.

## 7. Google OAuth Configuration

In Google Cloud Console:

### Authorized JavaScript origins

Add the frontend origin, for example:

```text
https://your-frontend-domain
```

### Authorized redirect URI

Add the backend callback, for example:

```text
https://your-backend-domain/api/auth/google/callback
```

Your backend `GOOGLE_CALLBACK_URL` must match this exactly.

## 8. Stripe Configuration

### Product setup

Create two recurring prices:

- Tenant Pro
- Landlord Pro

Put their IDs into:

- `STRIPE_PRICE_TENANT_PRO`
- `STRIPE_PRICE_LANDLORD_PRO`

### Webhook endpoint

Create Stripe webhook destination:

```text
https://your-backend-domain/api/billing/webhook
```

Subscribe to at least:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Then copy the signing secret into:

```text
STRIPE_WEBHOOK_SECRET
```

## 9. Cross-Origin and Cookie Setup

This is the area most likely to break login in production.

### Backend must know frontend origin

- `CLIENT_URL` should be your frontend origin
- `CORS_ORIGINS` should include the frontend origin

### Cookies for cross-site frontend/backend hosting

Set:

- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none`

If cookie settings are wrong, refresh-token login will fail even if access tokens look correct.

## 10. Custom Domain Notes

If a Vercel domain alias breaks:

- check which deployment owns the alias
- ensure the primary production domain points to the latest deployment
- redeploy after env changes if needed

For the SPA, domain changes do not require code changes unless:

- frontend origin changes
- backend CORS must be updated
- Google OAuth origin/callback must be updated
- Stripe success/cancel/portal URLs must be updated

## 11. Production Verification Checklist

After deployment, verify:

1. frontend opens on the intended production domain
2. `GET /api/health` works from backend
3. register/login works
4. refresh session works after page reload
5. Google OAuth button is enabled
6. role selection and setup routing work
7. property discovery loads
8. chat and notifications load
9. landlord listing creation works
10. Stripe checkout redirects correctly
11. Stripe webhook updates subscription state

## 12. Known Failure Patterns

### Frontend says `Failed to fetch`

Usually caused by:

- wrong `VITE_API_URL`
- backend CORS mismatch
- backend not reachable

### Google OAuth unavailable

Usually caused by missing:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

### Stripe portal unavailable

Usually caused by:

- manual/non-Stripe subscription record
- missing Stripe portal env vars

### Cookies do not persist

Usually caused by:

- bad `COOKIE_SAME_SITE`
- bad `COOKIE_SECURE`
- wrong frontend/backend origins
