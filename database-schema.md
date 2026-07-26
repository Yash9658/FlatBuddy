# Database Schema

FlatBuddy uses **PostgreSQL** with **Prisma ORM**. The schema is relational because the application depends on many linked workflows that must stay consistent across users, listings, chats, groups, visits, moderation, and subscriptions.

## Core Design Principles

- one user can act as tenant, landlord, or admin
- user identity is separate from role-specific workflow data
- profile data and preference data are intentionally separate
- invitations are separate from memberships
- stored notifications are separate from read tracking
- billing state is normalized into a dedicated subscription table

## Main Models

## 1. User

The central identity table.

Key responsibilities:

- account identity
- auth provider
- role
- suspension state
- landlord verification state
- subscription relation

Important relations:

- one-to-one with `Profile`
- one-to-one with `Preference`
- one-to-many with `RefreshToken`
- one-to-many with owned `Property`
- one-to-many with messages, visits, reports, saves, notifications, and memberships

## 2. Profile

Stores user-facing profile and discovery fields.

Examples:

- full name
- occupation
- current city
- target city
- preferred area
- move-in date
- budget
- short bio
- phone

Why separate from `User`:

- keeps auth identity smaller
- role-specific product fields do not pollute login/session data
- easier profile evolution without touching auth logic

## 3. Preference

Stores compatibility-specific renter preferences.

Examples:

- food preference
- smoking preference
- drinking preference
- cleanliness
- sleep schedule
- pet friendliness
- languages
- interests

Why separate from `Profile`:

- profile = who the user is
- preference = how the user wants to live
- matching logic can evolve without mixing with identity fields

## 4. City and Area

Reference tables for geography.

### City

- city metadata
- slug
- overview relationships

### Area

- area names per city

These support:

- city discovery pages
- listing creation
- target city matching

## 5. Property and PropertyImage

### Property

Represents a landlord listing.

Important fields:

- owner
- city
- address and area
- property type
- rent and deposit
- available beds / total beds
- available from
- furnished
- status
- amenities
- house rules
- preferred tenants

### PropertyImage

Stores one-to-many listing images.

Why separate:

- one property can have multiple images
- simpler expansion to galleries and media ordering

## 6. ConnectionRequest

Represents tenant-to-tenant connection intent.

States:

- `PENDING`
- `ACCEPTED`
- `DECLINED`

Why important:

- it controls who can connect directly
- accepted requests unlock planning and chat flows

## 7. Chat, ChatParticipant, Message

Realtime chat is persisted relationally.

### Chat

- direct or group thread

### ChatParticipant

- join table between users and chat threads
- tracks `lastReadAt`

### Message

- sender
- sender type
- body
- timestamps

Why this model works:

- supports direct and group chat cleanly
- unread state is per participant, not global

## 8. Group, GroupMember, GroupInvitation, GroupShortlistedProperty

These four tables model group planning.

### Group

- tenant-created coordination unit
- linked to a city
- has leader and metadata

### GroupMember

- actual accepted membership

### GroupInvitation

- proposed membership before acceptance

### GroupShortlistedProperty

- shared shortlist between group members

Why invitation and membership are separate:

- invitation has state
- membership should only exist after acceptance
- avoids ambiguous partial membership

## 9. SavedProperty and SavedUser

Bookmark tables for personalized discovery.

### SavedProperty

- user bookmarks a property

### SavedUser

- user bookmarks another renter profile

Separate join tables make duplicate prevention and querying straightforward.

## 10. VisitRequest

Models landlord-tenant scheduling intent.

States:

- `PENDING`
- `APPROVED`
- `DECLINED`

Stores:

- requester
- property
- requested date
- requester note
- landlord message

## 11. Report

Moderation table.

Supports:

- user reports
- property reports
- resolution status
- admin review workflow

## 12. Subscription

One-to-one billing state per user.

Fields include:

- plan
- status
- Stripe customer ID
- Stripe subscription ID
- Stripe price ID
- period end
- cancellation flags

Why separate:

- billing state changes independently of profile/auth data
- Stripe sync becomes simpler

## 13. RefreshToken

Stores persisted refresh tokens for rotating sessions.

Why store them:

- logout revocation
- refresh rotation
- server-side session invalidation

## 14. EmailVerificationToken

Supports local account email verification.

Why separate:

- short-lived verification logic should not live on `User`
- token lifecycle is independent

## 15. UserNotification and NotificationRead

### UserNotification

Stored notification events, especially group-related events.

### NotificationRead

Tracks whether a specific user has read a specific notification key.

Why separate:

- the app builds some notifications dynamically
- read tracking must still be durable
- a feed item may be derived rather than fully stored

## Important Enums

Examples of domain enums:

- `UserRole`
- `AuthProvider`
- `PropertyType`
- `ListingStatus`
- `ConnectionStatus`
- `VisitRequestStatus`
- `SubscriptionPlan`
- `SubscriptionStatus`
- `VerificationStatus`
- `GroupInvitationStatus`

These reduce invalid states and keep business logic consistent across backend and database layers.

## Most Important Relationship Chains

### Identity chain

`User -> Profile`

### Matching chain

`User -> Preference`

### Landlord listing chain

`User -> Property -> PropertyImage`

### Chat chain

`Chat -> ChatParticipant -> Message`

### Group planning chain

`Group -> GroupMember`

`Group -> GroupInvitation`

`Group -> GroupShortlistedProperty -> Property`

### Visit chain

`User -> VisitRequest -> Property`

### Billing chain

`User -> Subscription`

## Consistency-Critical Tables

The most consistency-sensitive tables are:

- `User`
- `Profile`
- `Preference`
- `Property`
- `ConnectionRequest`
- `ChatParticipant`
- `Message`
- `GroupMember`
- `GroupInvitation`
- `VisitRequest`
- `Subscription`

These directly control routing, permissions, trust, billing, and visible marketplace behavior.

## Why PostgreSQL Fits This Schema

This schema depends on:

- strong joins
- foreign keys
- unique constraints
- transactional writes
- predictable query semantics

That makes PostgreSQL a better fit than a document-first database for this project's current design.
