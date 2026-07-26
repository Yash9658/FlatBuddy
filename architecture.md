# Architecture

## 1. System Overview

FlatBuddy is a split frontend/backend application:

- **client**: React SPA served separately
- **server**: Express API with Prisma and PostgreSQL
- **database**: PostgreSQL as the system of record
- **realtime layer**: Socket.IO attached to the backend HTTP server
- **external services**: Google OAuth, Stripe, Cloudinary, email provider

## 2. High-Level Shape

```text
Browser (React SPA)
  -> REST API calls -> Express server
  -> Socket.IO      -> same Express HTTP server

Express server
  -> Prisma client
  -> PostgreSQL
  -> Stripe / Google / Cloudinary / Email providers
```

## 3. Frontend Architecture

The frontend is a Vite-based React SPA.

### Main layers

- `src/App.tsx`: route map
- `src/context/*`: auth, socket, toast providers
- `src/hooks/*`: API-facing data hooks
- `src/pages/*`: page-level workflows
- `src/components/*`: reusable layout and UI parts
- `src/lib/*`: API helpers, routing helpers, constants, subscription helpers

### Frontend responsibilities

- route protection
- setup-flow redirects
- access-token handling
- UI forms and validation
- optimistic interaction feedback
- rendering chat, groups, listings, notifications, and billing flows

## 4. Backend Architecture

The backend is an Express application structured by feature.

### Main layers

- `src/app.ts`: middleware and route registration
- `src/routes/*`: endpoint definitions
- `src/controllers/*`: request handlers and business logic
- `src/lib/*`: shared infrastructure helpers
- `src/middleware/*`: auth, rate limiting, error handling
- `prisma/schema.prisma`: relational data model

### Backend responsibilities

- authentication and session refresh
- role enforcement
- business validation
- persistence through Prisma
- Stripe and Google integration
- realtime socket events
- notification aggregation

## 5. Authentication Architecture

FlatBuddy uses a two-token model.

### Access token

- short-lived JWT
- sent as `Authorization: Bearer <token>`
- stored in frontend memory

### Refresh token

- stored in database
- issued in secure HTTP-only cookie
- rotated on refresh
- revoked on logout

### Supported auth providers

- `LOCAL`
- `GOOGLE`

### Auth flow

1. user logs in or finishes Google OAuth
2. backend returns access token
3. backend sets refresh-token cookie
4. frontend stores access token in auth context
5. when access token expires, frontend calls `/api/auth/refresh`

## 6. Role-Based Product Design

The application is intentionally multi-role.

### Tenant

- compatibility profile
- partner discovery
- connections
- groups
- saved users/properties
- visit requests

### Landlord

- landlord setup
- verification request
- listing publishing
- image uploads
- visit approvals
- premium analytics

### Admin

- moderation dashboard
- report handling
- listing status control
- user suspension
- landlord verification review

## 7. Profile Completion Design

Profile completion is computed on the backend, not trusted from the client.

### Tenant completion requires

- full name
- target city
- minimum budget
- maximum budget

### Landlord completion requires

- full name
- target city
- preferred area
- phone number

### Admin

- always treated as complete

This logic is centralized in `server/src/lib/profile-completion.ts`.

## 8. Domain Modules

### Cities

- city catalog
- area catalog
- city overview pages
- fallback seed support

### Properties

- public property discovery
- landlord-owned listing management
- featured listing logic for premium landlords
- visit coordination

### Matching

- compatibility-driven tenant matching
- city and preference-based ranking
- premium filters gated by subscription

### Connections

- renter-to-renter connection requests
- acceptance creates direct chat access

### Chats

- direct chat threads
- persisted messages
- realtime updates
- unread tracking

### Groups

- tenant-created planning groups
- invitation workflow
- membership model
- shared property shortlists
- member leave support

### Notifications

The notification feed is hybrid:

- some notifications are derived dynamically from live data
- some are stored explicitly as `UserNotification`
- read state is tracked separately in `NotificationRead`

### Billing

- public plan listing
- authenticated checkout session creation
- Stripe Billing Portal
- webhook-driven subscription synchronization

### Admin

- trust and moderation controls
- report review
- listing moderation
- user suspension
- verification queue

## 9. Realtime Architecture

Socket.IO is attached to the same server process as the API.

### Socket auth

- client connects with access token
- backend verifies token before allowing connection

### Room model

- `user:<userId>`
- `chat:<chatId>`

### Emitted use cases

- new message in a chat
- connection request status change
- chat list refresh

## 10. Database Architecture Rationale

PostgreSQL plus Prisma is a strong fit because the project depends on:

- many relationships
- transactional consistency
- role-specific joins
- reporting/admin queries
- structured constraints

Examples:

- user <-> profile <-> preference
- landlord <-> property
- group <-> members <-> invitations <-> shortlisted properties
- chat <-> participants <-> messages
- subscription <-> user

## 11. Error Handling Strategy

The backend centralizes error responses with:

- Zod validation handling
- Prisma known error mapping
- upload error mapping
- generic production-safe fallback

This keeps route handlers relatively clean while preserving meaningful client errors.

## 12. Deployment Architecture

Recommended production split:

- **frontend**: Vercel
- **backend**: Render
- **database**: Neon Postgres

Reason:

- Vercel fits the SPA frontend well
- Render is simple for long-running Node services and webhooks
- Neon provides managed Postgres with a standard `DATABASE_URL`

## 13. Operational Risks to Watch

- misconfigured `CLIENT_URL` / `CORS_ORIGINS`
- broken Google callback URL
- missing Stripe webhook secret
- cookie domain and `SameSite` mistakes
- missing Cloudinary env values
- database disconnects during hosted restarts

The backend already includes retry logic for transient Prisma/Postgres disconnects.
