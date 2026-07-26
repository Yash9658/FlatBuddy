# Sitemap

This sitemap reflects the current client route structure in `client/src/App.tsx`.

## Public Routes

### `/`

Landing page with product positioning, featured city discovery, and entry into the app.

### `/login`

Email login and optional Google OAuth login.

### `/register`

Local account creation.

### `/verify-email`

Email verification and resend flow.

### `/auth/callback`

Frontend OAuth completion route.

### `/discover`

Public city discovery index.

### `/discover/:slug`

City overview page with renters and listings.

### `/properties`

Public property search.

### `/properties/:id`

Public property detail page.

### `/pricing`

Subscription plans, current subscription state, and Stripe billing entry points.

### `/billing/success`

Stripe success return page.

### `/billing/cancel`

Stripe cancel return page.

### `/about`

Product rationale and business framing.

## Authenticated Routes

These require a signed-in user.

### `/welcome`

Post-login role selection flow for incomplete users.

Admin users are redirected away from this page.

### `/setup/tenant`

Tenant setup flow.

Purpose:

- collect tenant profile basics
- collect renter preferences
- route into partner discovery

### `/setup/landlord`

Landlord setup flow.

Purpose:

- collect landlord profile basics
- optionally collect verification request data
- route into landlord workspace

### `/matches`

Tenant compatibility results.

### `/notifications`

Unified activity feed across chats, connections, visits, groups, billing, and admin events.

### `/inbox`

Requests and chat workspace.

### `/favorites`

Saved users and saved properties.

### `/groups`

User's group list and invitations.

### `/groups/:id`

Group detail, members, shortlist, and planning.

### `/profile`

Role-aware profile page.

Possible variants:

- tenant profile view
- landlord profile view
- admin profile view

### `/partners/:id`

Public-style renter profile detail page for authenticated users.

## Landlord-Only Routes

### `/landlord`

Landlord workspace.

Main sections:

- verification status
- analytics
- listing creation
- owned listings
- visit request management

## Admin-Only Routes

### `/admin`

Admin console.

Main sections:

- overview stats
- moderation queue
- listing controls
- verification queue
- user moderation

## Route Behavior by Role

## Tenant

Typical path:

`login/register -> welcome -> setup/tenant -> matches/profile`

## Landlord

Typical path:

`login/register -> welcome -> setup/landlord -> landlord`

## Admin

Typical path:

`login -> profile or admin`

Admin users are intentionally excluded from the public setup workflow.

## Navigation Areas

## Shared core navigation

- Home
- Discover Cities
- Properties
- Pricing

## Tenant navigation additions

- Partners
- Notifications
- Inbox
- Favorites
- Groups
- Profile

## Landlord navigation additions

- Notifications
- Inbox
- Landlord Profile
- Listings

## Admin navigation additions

- Notifications
- Inbox
- Admin Profile
- Admin Console

## Notes

- route access is enforced by guarded-route logic plus role checks
- incomplete users are redirected into setup flows
- admins are routed differently from tenants and landlords
- Vercel SPA rewrites are required so deep links resolve correctly in production
