# Operations

This document covers routine operational tasks for FlatBuddy.

## 1. Starting the Project Locally

From repo root:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## 2. Useful Commands

### Install dependencies

```bash
npm install
```

### Run both apps in development

```bash
npm run dev
```

### Build frontend

```bash
npm run build --workspace client
```

### Build backend

```bash
npm run build --workspace server
```

### Apply migrations locally

```bash
npm run db:migrate
```

### Apply migrations in production

```bash
npm exec prisma migrate deploy --workspace server
```

### Seed demo data

```bash
npm run db:seed
```

### Open Prisma Studio

```bash
npm exec prisma studio --workspace server
```

## 3. Demo Data Behavior

Demo data is controlled by env flags.

### `SEED_DEMO_DATA`

- `true`: creates demo users, listings, chats, groups, subscriptions, and visits
- `false`: only baseline reference data is seeded

### `SEED_PREVIEW_ACTIVITY`

- enriches preview/demo marketplace activity

Production should keep both disabled.

## 4. Common Admin Tasks

## Approve landlord verification

Use the admin UI or update the user record through the admin API.

The listing creation flow expects landlord verification to be approved before normal landlords can publish.

## Suspend or reactivate a user

Use:

- admin dashboard, or
- `PATCH /api/admin/users/:id`

## Review reports

Use:

- admin dashboard, or
- `PATCH /api/admin/reports/:id`

## 5. Data Cleanup Tasks

## Delete a profile permanently

In Prisma Studio:

1. locate the user
2. inspect related records
3. delete dependent records if required
4. delete the user if the relation chain allows it

Because the schema is relational, deleting only one table row may not remove all linked state you care about.

## Delete a user completely

You must account for related records such as:

- profile
- preference
- refresh tokens
- saves
- chats / chat participants
- groups / memberships / invitations
- connections
- visits
- subscription

If deletion seems incomplete, it usually means related records still exist or the session/browser still has stale auth state.

## 6. Session and Auth Operations

## If a deleted user still appears active

Check:

- browser still has refresh cookie
- frontend still has access token in memory
- account was recreated through Google OAuth
- you deleted only one row but left related identity data

Practical fix:

1. log out
2. clear site cookies
3. confirm user absence in Prisma Studio
4. try login again

## Google OAuth availability check

Frontend disables Google login if `/api/auth/config` reports OAuth unavailable.

That usually means the backend env is missing one or more of:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

## 7. Billing Operations

## Give subscription access manually

Simplest path:

- insert or update the user's `Subscription` row
- set a valid plan
- set a status like `ACTIVE`

But note:

- Stripe Portal only works for Stripe-managed subscriptions
- manually granted subscriptions will unlock features, but not full Stripe self-management

## Cancel or restore a Stripe subscription

Use:

- pricing page, or
- `PATCH /api/billing/subscription`

## 8. Notification Operations

The notification feed is mixed-source.

Some alerts come from live queries and some from stored notification rows.

If a notification seems missing, inspect:

- underlying business record
- `UserNotification`
- `NotificationRead`

## 9. Group Operations

## Member leaving a group

Supported via:

```text
DELETE /api/groups/:id/members/me
```

Rules:

- non-leader members can leave
- group leader cannot leave directly
- leader typically deletes the group instead

## 10. Troubleshooting

## `Failed to fetch` on frontend

Check:

- `VITE_API_URL`
- backend deployment status
- backend CORS config
- browser network tab

## `Something went wrong on the server`

Check backend logs for:

- validation errors
- missing env values
- Prisma query errors
- third-party failures

## Prisma/Postgres restart error

Example:

```text
terminating connection due to administrator command
```

Meaning:

- hosted Postgres interrupted a live connection
- usually happens during provider maintenance or restart

Project note:

- the codebase includes retry logic for transient Prisma/Postgres disconnects

## Vercel site opens wrong deployment or 404s

Check:

- production domain assignment
- which deployment owns the alias
- latest production deployment status

## Google login button disabled

Check backend env and Google Console OAuth settings.

## Stripe portal says customer not found or unavailable

Check:

- subscription was created through Stripe Checkout
- Stripe customer and subscription IDs are real Stripe IDs
- portal return URL is set

## 11. Safe Production Posture

For production:

- disable demo seed flags
- use strong JWT secrets
- use HTTPS-only cookie settings
- use exact frontend/backend origins
- protect admin role assignment operationally
- verify Stripe webhook signatures
- verify Google OAuth callback exactness

## 12. Recommended Operational Checks Before Release

1. run migrations on production database
2. verify backend health endpoint
3. verify frontend can refresh session after reload
4. verify tenant setup and landlord setup both complete correctly
5. verify chat and notifications work
6. verify landlord listing creation works
7. verify admin dashboard loads
8. verify Stripe checkout and webhook sync
