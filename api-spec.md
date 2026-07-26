# API Specification

Base URL in local development:

```text
http://localhost:4000/api
```

All authenticated routes require:

```http
Authorization: Bearer <access-token>
```

## Response Conventions

- success returns JSON
- validation failures usually return `400`
- auth failures return `401`
- permission failures return `403`
- not found returns `404`
- duplicate/conflict cases return `409`
- unexpected server failures return `500`

## Health

### `GET /health`

Returns basic service status.

## Auth

### `POST /auth/register`

Creates a local account.

Body:

- `email`
- `password`
- `role` = `TENANT | LANDLORD`
- optional profile bootstrap fields

Behavior:

- hashes password
- creates `User`, `Profile`, and `Preference`
- creates email verification token

### `POST /auth/login`

Logs in a local account.

Body:

- `email`
- `password`

Returns:

- authenticated user
- access token
- refresh-token cookie

### `POST /auth/verify-email`

Verifies email using token.

### `POST /auth/resend-verification`

Resends verification email.

### `POST /auth/refresh`

Rotates refresh token and returns new access token.

### `POST /auth/logout`

Revokes refresh token and clears cookie.

### `GET /auth/config`

Returns client-facing auth configuration such as Google OAuth availability.

### `GET /auth/me`

Returns current authenticated user record.

### `GET /auth/google`

Starts Google OAuth flow.

### `GET /auth/google/callback`

Finishes Google OAuth flow and redirects to frontend callback route.

## Cities

### `GET /cities`

Returns city catalog, counts, and overview data for discovery.

### `GET /cities/:slug`

Returns a detailed city overview including renters and live listings.

## Properties

### `GET /properties`

Public property search.

Supported filters include:

- city slug
- rent range
- property type

### `GET /properties/:id`

Returns property detail and related listings.

### `GET /properties/mine`

Authenticated landlord/admin route for owned listings.

### `GET /properties/analytics`

Landlord Pro analytics route.

### `POST /properties`

Creates a landlord listing.

Requirements:

- landlord or admin role
- landlord verification approved
- valid city
- future-or-today `availableFrom`
- `availableBeds <= totalBeds`

## Uploads

### `POST /uploads/image`

Uploads a property image to Cloudinary.

Requirements:

- landlord or admin role
- multipart form with `image`

## Matches

### `GET /matches`

Returns tenant matches using profile, preference, and city targeting data.

Premium filters are enforced server-side.

## Connections

### `GET /connections`

Returns connection requests and accepted links for the current user.

### `POST /connections`

Creates a new renter connection request.

### `PATCH /connections/:id`

Accepts or declines a request.

Accepting may create direct chat access.

## Chats

### `GET /chats`

Returns chat threads for current user.

### `GET /chats/:chatId/messages`

Returns messages for a thread.

### `POST /chats/:chatId/messages`

Creates a chat message.

## Saved Items

### `GET /saved/users`
### `POST /saved/users`
### `DELETE /saved/users/:targetUserId`

Save and unsave renter profiles.

### `GET /saved/properties`
### `POST /saved/properties`
### `DELETE /saved/properties/:propertyId`

Save and unsave property listings.

## Groups

### `GET /groups`

Returns groups for the current user.

### `POST /groups`

Creates a group from accepted renter connections.

### `GET /groups/invitations`

Returns pending and historical group invitations.

### `POST /groups/invitations/:invitationId/respond`

Accepts or declines a group invite.

### `GET /groups/:id`

Returns full group detail.

### `PATCH /groups/:id`

Updates group metadata.

### `POST /groups/:id/members`

Invites a member into a group.

### `DELETE /groups/:id/members/me`

Allows a non-leader member to leave a group.

### `DELETE /groups/:id`

Deletes a group. Typically leader/admin only.

### `POST /groups/:id/shortlists`

Adds a property to the group shortlist.

### `DELETE /groups/:id/shortlists/:propertyId`

Removes a shortlisted property.

## Visits

### `GET /visits`

Returns visit requests relevant to current user.

### `POST /visits`

Creates a tenant visit request for a property.

### `PATCH /visits/:id`

Landlord/admin updates request status and optional message.

## Profile

### `GET /profile/users/:id`

Returns public tenant profile detail with compatibility context for the viewer.

### `PUT /profile/role`

Sets role selection between tenant and landlord.

### `PUT /profile`

Updates profile fields.

Important validation:

- `budgetMin <= budgetMax`
- `moveInDate` cannot be before today
- target city must exist

### `PUT /profile/preferences`

Updates preference fields.

### `POST /profile/verification`

Creates or updates landlord verification request.

## Notifications

### `GET /notifications`

Returns unified notification feed.

Sources include:

- connection requests
- group invitations
- chats
- visits
- admin/report events
- verification status
- billing status
- stored group notifications

### `POST /notifications/read-all`

Marks currently visible notifications as read.

### `POST /notifications/:key/read`

Marks one notification item as read.

## Billing

### `GET /billing/plans`

Returns subscription plan metadata.

### `POST /billing/checkout-session`

Creates Stripe Checkout session for:

- `TENANT_PRO`
- `LANDLORD_PRO`

Restrictions:

- tenant can only buy `TENANT_PRO`
- landlord can only buy `LANDLORD_PRO`
- admin cannot buy plans

### `POST /billing/portal-session`

Creates Stripe Billing Portal session for Stripe-managed subscriptions.

### `PATCH /billing/subscription`

Updates cancellation mode with:

- `cancelAtPeriodEnd: boolean`

### `POST /billing/webhook`

Stripe webhook endpoint.

Handles:

- checkout session completion
- subscription create/update/delete

## Admin

All admin routes require `ADMIN` role.

### `GET /admin/overview`

Returns aggregate counts for dashboard stats.

### `GET /admin/reports`

Returns moderation reports.

### `PATCH /admin/reports/:id`

Resolves or reopens a report.

### `GET /admin/listings`

Returns listings for moderation.

### `PATCH /admin/listings/:id`

Changes listing status such as `ACTIVE`, `PAUSED`, or `RENTED`.

### `GET /admin/users`

Returns user moderation data.

### `PATCH /admin/users/:id`

Suspends or reactivates a user.

### `PATCH /admin/users/:id/verification`

Approves or rejects landlord verification.
