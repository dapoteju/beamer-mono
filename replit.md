# Replit Project: Beamer Mono

## Overview
Beamer Mono is a monorepo for the Beamer Player platform, a digital signage and advertising solution. It provides multiple delivery methods, including a web-based CMS and planned Electron desktop applications. The project aims to deliver a robust platform for managing digital advertising campaigns. The backend API and CMS Frontend are currently operational, with a focus on user and screen management.

## User Preferences
- None specified yet

## System Architecture

### Project Structure
The project is organized into a monorepo containing distinct applications and libraries:
- `backend/`: Express API server (TypeScript + Drizzle ORM)
- `cms-web/`: CMS Frontend (React + Vite + TypeScript + Tailwind v4)
- `player-core/`: Core TypeScript library (planned)
- `player-electron/`: Electron desktop application (planned)
- `player-web-sim/`: Web simulator (planned)

### Technology Stack

**Backend:**
- **Runtime**: Node.js 20
- **Framework**: Express 5.1.0
- **Language**: TypeScript 5.9.3
- **Database ORM**: Drizzle 0.44.7 (for PostgreSQL)
- **Dev Server**: Nodemon + ts-node

**Frontend (CMS Web):**
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 4.1.17
- **State Management**: Zustand 5.0.8 (with localStorage persistence)
- **Data Fetching**: TanStack Query 5.90.10
- **HTTP Client**: Axios 1.13.2
- **Routing**: React Router DOM 7.9.6

### Feature Specifications

**Authentication System:**
- JWT-based authentication with 7-day token expiration.
- Bcrypt password hashing (10 salt rounds).
- Role-based access control: `admin`, `ops`, `viewer`.
- Protected registration: only admins can create new users.
- Initial admin user: `admin@beamer.com` / `beamer123`.
- CMS Frontend handles login, protected routes, session persistence via localStorage, and user display in the topbar. Axios is used for API communication with automatic auth header injection.

**API Modules:**
- Health checks
- Organizations management
- Screens management (with extended metadata for classification and vehicles)
- Publishers management (Phase 3A)
- Advertisers management (Phase 3A)
- Regions management
- **Campaigns management** (Phase 4)
- **Flights management** (Phase 4)
- Creatives management
- Bookings management
- Invoices management
- Player API
- Reports

**Screens & Players Management:**
- Complete CRUD operations for screens with permission-based access.
- Atomic transactions for data integrity during player assignment/reassignment.
- Player swapping logic ensures one-player-per-screen business rule.
- Comprehensive validation includes region existence, publisher organization type, and player existence.
- Permissions: `beamer_internal` admin/ops can create screens; `beamer_internal` (all roles) and `publisher` (their own) can edit screens; `beamer_internal` can change publisher organization.

**Screen Classification & Extended Metadata (Phase 2):**
- **Three screen types**: Vehicle-mounted, Billboard/Static, and Indoor displays.
- **Vehicle screens**: Link to vehicles table with vehicle selection dropdown. Displays make, model, license plate information.
- **Billboard screens**: Include structure type, size description, illumination type, and address fields.
- **Indoor screens**: Store venue name, venue type, venue address, and optional GPS coordinates.
- **Backward compatibility**: All classification fields are nullable; existing screens work without metadata.
- **CMS UI enhancements**:
  - Type column in Screens list with colored badges (green for vehicle, blue for billboard, purple for indoor).
  - Classification filter dropdown for easy categorization.
  - Dynamic form sections in create/edit modal based on selected classification type.
  - Screen Detail page displays classification-specific metadata in organized sections.
- **Permissions**: Vehicle dropdown respects organization boundaries (advertisers blocked, publishers see own fleet, internal users see all).
- **Data flow**: Full end-to-end persistence from CMS form → backend API → database → GET responses → CMS display.

**Publishers & Advertisers Separation (Phase 3A):**
- **Database restructure**: Added `organisation_category` field to organisations table; created dedicated `publisher_profiles` table with flexible fields for organisational/individual publishers; added nullable `publisherId` FK to screens table.
- **Backend Publishers module**: Full CRUD API endpoints with permission-based access (beamer_internal sees all, publishers see own profiles, advertisers blocked); validation ensures organisationId references publisher organisations only; returns enriched data with screen/vehicle counts; added GET /api/publishers/dropdown endpoint for publisher selection in screens.
- **Backend Advertisers module**: Full CRUD API endpoints with permission-based access; campaign dependency checks before deletion; simplified data model focused on billing and campaign management.
- **Screens API enhancements**: Returns publisher profile data in GET responses; persists publisherId in all mutation operations (create/update); maintains backward compatibility with legacy publisherOrgId field during transition.
- **Frontend Publishers UI**: List page with organisational/individual type badges; detail page showing publisher profile with screen/vehicle counts; create/edit modal with dynamic fields based on publisher type; organisation dropdown for organisational publishers.
- **Frontend Advertisers UI**: List page with advertiser organisations; detail page showing advertiser details and campaign count; create/edit modal with country dropdown and billing email; delete protection for advertisers with active campaigns.
- **Frontend Screens UI alignment**: Refactored ScreenFormModal to use publisher profiles instead of legacy organisation dropdown; publisher dropdown shows enriched labels (type badge + name); Screens list displays Publisher column with type badges; ScreenDetail shows publisher info with type and organisation fallback; backward compatibility maintained for legacy screens without publisher profiles.
- **Navigation updates**: Added Publishers and Advertisers links to internal user navigation; routes protected by org type guards; clean separation from legacy Organisations page.
- **Migration strategy**: Nullable publisherId field ensures backward compatibility; dual FK support (publisherOrgId + publisherId) during transition; existing screens continue to work without publisher profiles; internal users select publisher from dropdown (updating both publisherId and publisherOrgId); publisher users create/edit with auto-populated org ID.

**Campaigns & Flights Management (Phase 4):**
- **Backend Campaigns API**: Full CRUD operations with permission-based access; GET /api/campaigns with filtering by status, date range, search; GET /api/campaigns/:id returns campaign with flights and total impressions stats; PUT /api/campaigns/:id for updates; PATCH /api/campaigns/:id/status for quick status changes; advertiser users scoped to their org, internal users see all campaigns with optional org_id filtering.
- **Backend Flights API**: Nested creation under campaigns via POST /api/campaigns/:campaignId/flights; GET /api/campaigns/:campaignId/flights lists all flights for a campaign; standalone PUT /api/flights/:id and PATCH /api/flights/:id/status endpoints for updates; flights support screen and screen_group targeting with flexible targeting; permission checks inherited from parent campaign.
- **Backend Bookings API**: Full CRUD with filtering by campaign and advertiser; permission-based access matching campaigns module; supports multiple billing models (CPM, flat fee, revenue share).
- **Frontend Campaigns UI**: List page with search, status filter, and advertiser column for internal users; "New Campaign" form with advertiser selection (internal users only), validation, date range checks; Campaign detail page with overview tab showing all campaign fields, flights tab with inline flight management, bookings placeholder tab; status quick-change dropdown in detail header.
- **Frontend Flights UI**: Flights table within campaign detail showing flight name, status badges, start/end datetimes, target type/ID; "Add Flight" button opens modal with datetime pickers, target selection; flight edit modal preloads existing data; flights list refreshes after mutations.
- **Frontend Campaign Forms**: Create form validates dates, budget, required fields; edit modal (CampaignFormModal) for updating all campaign fields except advertiser; targeting JSON textarea with validation; currency dropdown (NGN, USD, GBP, EUR).
- **Permissions**: Advertisers create campaigns for their own org (advertiserOrgId auto-set); internal users select advertiser from dropdown; advertiser users see only their campaigns; internal users see all campaigns or filter by org_id; flight permissions inherited from parent campaign.
- **Data Flow**: Campaign detail endpoint returns {campaign, flights, stats: {totalImpressions}}; frontend types match backend response structure; null-safe access to stats.totalImpressions with default to 0; flight mutations use standalone /api/flights/:id endpoints.
- **Navigation**: Campaigns link visible to internal users and advertisers; routes: /campaigns (list), /campaigns/new (create), /campaigns/:id (detail with tabs).

### System Design Choices
- **Monorepo Architecture**: Centralized repository for all platform components.
- **Microservice-like Separation**: Distinct `backend` and `cms-web` applications.
- **Database Management**: PostgreSQL with Drizzle ORM for schema management and migrations. `npm run db:push` is the designated method for schema updates.
- **Frontend Development**: React with Vite for fast development and hot module replacement. Tailwind CSS for utility-first styling.
- **API Connectivity**: Vite proxy forwards `/api` requests from the frontend to the backend API.
- **Authentication**: Stateless JWTs for scalability, with client-side token management.
- **Data Integrity**: Transaction-based updates for critical operations like screen management.
- **Role-Based Access Control**: Granular permissions implemented at the API level.

## External Dependencies

- **Database**: PostgreSQL (provided via Replit integration)
- **Authentication**: JWT (JSON Web Tokens)
- **HTTP Client**: Axios
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS