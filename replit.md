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
- Regions management
- Campaigns management
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