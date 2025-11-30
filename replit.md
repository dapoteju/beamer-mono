# Replit Project: Beamer Mono

## Overview
Beamer Mono is a monorepo for the Beamer Player platform, a digital signage and advertising solution. Its primary purpose is to provide a robust platform for managing digital advertising campaigns, encompassing user and screen management, authentication, API modules, and comprehensive reporting. The project aims to offer multiple delivery methods for digital signage and advertising, including a web-based CMS and planned Electron desktop applications.

## User Preferences
- None specified yet

## System Architecture

### Project Structure
The project is organized as a monorepo with distinct applications and libraries:
- `backend/`: Express API server
- `cms-web/`: CMS Frontend (React, Vite, TypeScript, Tailwind)
- `player-core/`: Core TypeScript library for player devices
- `player-electron/`: Electron desktop application (planned)
- `player-web-sim/`: Web simulator (planned)

### Technology Stack
- **Backend**: Node.js 20, Express 5.1.0, TypeScript 5.9.3, Drizzle 0.44.7 (for PostgreSQL)
- **Frontend (CMS Web)**: React 19.2.0, Vite 7.2.4, TypeScript 5.9.3, Tailwind CSS 4.1.17, Zustand 5.0.8, TanStack Query 5.90.10, Axios 1.13.2, React Router DOM 7.9.6, Recharts 3.5.0

### UI/UX Decisions
- Tailwind CSS for utility-first styling and responsive design.
- Interactive charts (Line, Bar) using Recharts for reporting.
- Dynamic forms and colored badges for visual clarity.

### Feature Specifications
- **Authentication**: JWT-based with role-based access control (admin, ops, viewer), secure password reset, and initial admin setup.
- **API Modules**: Comprehensive APIs for organizations, screens, publishers, advertisers, campaigns, flights, creatives, bookings, invoices, and reports.
- **Screens & Players Management**: Full CRUD for screens, including permission-based access, atomic transactions, player swapping, dynamic CMS UI, and remote player disconnection. Supports three screen types with extended metadata.
- **Publishers & Advertisers Separation**: Dedicated CRUD APIs and UI for managing publishers and advertisers.
- **Campaigns & Flights Management**: Full CRUD for campaigns and nested flights, with status management, targeting capabilities, and a dedicated Flight Detail page.
- **Flight Creatives Assignment**: Linking creatives to flights with configurable weights for playlist building, including inline editing and bulk operations.
- **Creative "Used In" Tracking**: Creatives display assigned flights.
- **Creatives Management**: Full CRUD for media assets attached to campaigns, supporting file uploads (image/video) via Multer. Includes regional approval workflow with auto-generated approval codes for pre-approval regions. Playback is controlled solely by regional approvals. Internal QA status auto-syncs: when any region approval is set to "approved", the creative's internal QA status is automatically updated to "approved" (unless explicitly rejected).
- **Campaign Reporting**: API and frontend for campaign summaries, including daily/screen-level impressions, exposure reporting (geographic visualization), compliance reporting (scheduled vs. active screens), and diagnostics (offline screens, unused creatives).
- **Visual Campaign Timeline**: Gantt-style timeline for flights within campaign overviews.
- **Enhanced Targeting Preview**: Real-time eligible screen count with breakdown by region, resolution, and screen group.
- **Player Telemetry**: GPS-aware heartbeats and playback events with device metrics, resiliently stored and transmitted.
- **Playlist Creative Type Support**: Playlist API returns `type` field (image/video) based on MIME type.
- **Player Configuration**: Ops-friendly device provisioning via `beamer.config.json` file.
- **Player Registration Conflict Detection**: Explicit detection and error handling for screens already linked to another player.
- **Regions**: Country-level regulatory jurisdictions for creative approval tracking (e.g., Nigeria, Kenya).
- **Vehicles Management**: Full inventory management for vehicles carrying mobile screens, including UUIDs, publisher-scoped access, soft-delete, and integration into Publisher Detail pages.
- **Human-Readable Public Codes**: Auto-generated sequential public codes for publishers, advertisers, and organizations for easy identification.
- **Enhanced Screen Specifications**: Screens include width/height, screen_type, orientation, and `is_active` fields.
- **Publisher-scoped Screen Groups**: Screen groups are strictly scoped to publisher organizations, with access control hardening, overlap detection, and a "Groups" tab on Screen Detail pages.

### System Design Choices
- **Monorepo Architecture**: Centralized repository for all platform components.
- **Microservice-like Separation**: Distinct backend and CMS web applications.
- **Database Management**: PostgreSQL with Drizzle ORM.
- **Frontend Development**: React with Vite and Tailwind CSS.
- **API Connectivity**: Vite proxy.
- **Authentication**: Stateless JWTs.
- **Data Integrity**: Transaction-based updates.
- **Role-Based Access Control**: Granular permissions.

## External Dependencies

- **Database**: PostgreSQL
- **Authentication**: JWT
- **HTTP Client**: Axios
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS
- **File Uploads**: Multer