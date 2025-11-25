# Replit Project: Beamer Mono

## Overview
Beamer Mono is a monorepo for the Beamer Player platform, a digital signage and advertising solution. It provides a web-based CMS and is planned to include Electron desktop applications. The project's primary purpose is to deliver a robust platform for managing digital advertising campaigns, with current operations focused on user and screen management, authentication, API modules, and comprehensive reporting. The business vision is to provide multiple delivery methods for digital signage and advertising.

## User Preferences
- None specified yet

## System Architecture

### Project Structure
The project is organized as a monorepo with distinct applications and libraries:
- `backend/`: Express API server (TypeScript + Drizzle ORM)
- `cms-web/`: CMS Frontend (React + Vite + TypeScript + Tailwind)
- `player-core/`: Core TypeScript library (planned)
- `player-electron/`: Electron desktop application (planned)
- `player-web-sim/`: Web simulator (planned)

### Technology Stack
- **Backend**: Node.js 20, Express 5.1.0, TypeScript 5.9.3, Drizzle 0.44.7 (for PostgreSQL)
- **Frontend (CMS Web)**: React 19.2.0, Vite 7.2.4, TypeScript 5.9.3, Tailwind CSS 4.1.17, Zustand 5.0.8, TanStack Query 5.90.10, Axios 1.13.2, React Router DOM 7.9.6, Recharts 3.5.0

### UI/UX Decisions
- Tailwind CSS for utility-first styling.
- Responsive design for charts and forms.
- Colored badges for screen types and publisher types for visual clarity.
- Dynamic form sections based on user selections (e.g., screen classification, publisher type).
- Interactive charts (Line Chart, Bar Chart) using Recharts for campaign reporting.

### Feature Specifications
- **Authentication**: JWT-based with 7-day expiration, Bcrypt hashing, and role-based access control (`admin`, `ops`, `viewer`). Protected registration.
- **API Modules**: Comprehensive API for health checks, organizations, screens, publishers, advertisers, regions, campaigns, flights, creatives, bookings, invoices, and reports.
- **Screens & Players Management**: Full CRUD for screens with permission-based access, atomic transactions, player swapping logic, and comprehensive validation. Supports three screen types (Vehicle-mounted, Billboard/Static, Indoor) with extended metadata and dynamic CMS UI.
- **Publishers & Advertisers Separation**: Database restructuring to differentiate publishers and advertisers. Dedicated CRUD API endpoints and refined UI for managing both, ensuring permission-based access and data integrity.
- **Campaigns & Flights Management**: Full CRUD for campaigns and nested flights with permission-based access, filtering, status management, and targeting capabilities (screen/screen_group). Includes dedicated Flight Detail page accessible from Campaign Detail.
- **Flight Creatives Assignment**: Linking creatives to flights with configurable weights for playlist building. Full CRUD via `/api/flights/:flightId/creatives` endpoints (GET, POST, PATCH, DELETE). Frontend FlightDetail page with Overview and Creatives tabs. FlightCreativesTab displays assigned creatives with inline weight editing. FlightAddCreativesModal allows selecting campaign creatives and assigning weights. Validation ensures creatives belong to the same campaign as the flight.
- **Creatives Management**: Full CRUD for creatives (media assets) attached to campaigns. Supports file uploads via Multer with validation for image/video types (JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime). Includes regional approval workflow with per-region status tracking. Endpoints: `POST /api/uploads` for file upload, `GET/POST /api/campaigns/:id/creatives` for listing/creating, `PATCH/DELETE /api/creatives/:id` for updates/deletion, `POST /api/creatives/:id/approval` for approval status updates. Static file serving at `/uploads/*`.
- **Campaign Reporting**: API endpoint for campaign summaries with raw play event data. Frontend reporting page with campaign selector, date range picker, summary cards, data tables, and interactive charts (line and bar charts) for daily and screen-level impressions. Includes CSV export functionality.
- **Exposure Reporting**: Geographic visualization of ad impressions showing where ads were displayed. Clusters impressions by location (4 decimal precision) with circle markers sized by impression count. Static screens (billboard/indoor) show single location while vehicle screens show multiple exposure points based on GPS history. API endpoint at `/api/reports/campaigns/:id/exposure`.
- **Compliance Reporting**: Third tab in Campaign Reporting that shows scheduled screens (via flights) and their daily activity status based on heartbeat data. Displays daily metrics for scheduled, active, and offline screens with stacked bar chart visualization. Per-screen status indicators (OK, NO_DELIVERY, OFFLINE) based on heartbeat and impression data. API endpoint at `/api/reports/campaigns/:id/compliance`.
- **Development Tools**: Comprehensive seed script (`backend/scripts/seed.ts`) for deterministic and idempotent generation of extensive demo data, including organizations, users, publishers, screens, campaigns, and play events.

### System Design Choices
- **Monorepo Architecture**: Centralized repository for all platform components.
- **Microservice-like Separation**: Distinct backend and CMS web applications.
- **Database Management**: PostgreSQL with Drizzle ORM for schema management, using `npm run db:push` for updates.
- **Frontend Development**: React with Vite for fast development and HMR, Tailwind CSS for styling.
- **API Connectivity**: Vite proxy for seamless frontend-backend communication.
- **Authentication**: Stateless JWTs for scalability and client-side token management.
- **Data Integrity**: Transaction-based updates for critical operations.
- **Role-Based Access Control**: Granular permissions enforced at the API level.

## External Dependencies

- **Database**: PostgreSQL (via Replit integration)
- **Authentication**: JWT (JSON Web Tokens)
- **HTTP Client**: Axios
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS
- **File Uploads**: Multer (100MB limit, image/video validation)