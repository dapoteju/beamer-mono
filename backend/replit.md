# Overview

This project, "beamer-api", is a Node.js/TypeScript backend API built with Express.js. Its primary purpose is to manage digital advertising campaigns, creatives, and screens, providing a robust platform for content delivery and performance reporting. The API supports secure player registration, authenticated playlist delivery, and comprehensive analytics for campaigns, bookings, screens, and creatives. It aims to offer a scalable and type-safe solution for digital out-of-home advertising management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Backend Framework
- **Express.js 5.x**: Core web framework.
- **TypeScript**: Ensures type safety and improves developer experience.

## UI/UX Decisions
- **API-first design**: Focuses on providing structured JSON responses for a CMS frontend.
- **Reporting Engine**: Designed to output dashboard-ready JSON, optimized for consumption by external UIs.

## Technical Implementations
- **Development Workflow**: `nodemon` with `ts-node` for hot-reloading. Production uses compiled JavaScript in `dist/`.
- **Security & Middleware**: `CORS` enabled, `Helmet` for security headers (planned use), `express.json()` for request body parsing.
- **API Structure**: JSON responses with `{status, data/message}`. Player endpoints require Bearer token authentication.
- **Module Structure**: Predominantly function-based services for business logic (e.g., campaigns, creatives, reports), with some class-based services.

## Feature Specifications
- **Campaign Management**: Full CRUD operations for campaigns, flights, and creative attachments.
- **Creative Workflow**: Creation, regional approval, and management of creative assets.
- **Player API**:
    - Secure player registration with unique IDs and auth tokens.
    - Authenticated playlist delivery with content targeting by screen/group and city.
    - `HTTP 304 Not Modified` support using `config_hash` for bandwidth optimization.
    - Fallback creative system ensuring content availability.
    - Regulatory compliance checks for pre-approval in specific regions.
    - Play event and heartbeat tracking.
- **Reporting Engine**:
    - Comprehensive analytics for campaigns (impressions, compliance), bookings (delivery, performance), screens (health, uptime, impressions), and creatives (plays, duration, approval status).
    - Data aggregated using Drizzle ORM with SQL for efficiency.
    - Deterministic compliance rollup logic (approved > pending > rejected).
    - **Date Window Filtering** (added November 23, 2025): All report endpoints support optional `startDate` and `endDate` query parameters for custom date range analysis. Filters apply to all play event aggregations while maintaining backward compatibility.

## System Design Choices
- **Database Layer**:
    - **Drizzle ORM**: Primary data access method, serving as the single source of truth for schema definitions.
    - **PostgreSQL Driver (pg)**: Used for direct queries where Drizzle's efficiency is limited (e.g., complex multi-table inserts).
    - **Schema-first design**: Drizzle defines all database schemas.
    - **Gradual Migration**: Ongoing shift from raw SQL to Drizzle ORM for all operations.
- **Authentication**: Token-based authentication for players using a `player_id:auth_token` Bearer scheme.
- **Configuration Management**: `dotenv` for environment variables.
- **Deployment**: Supports both automatic (`start:migrate`) and manual database migration strategies.

# External Dependencies

## Core Runtime Dependencies
- **express**: Web application framework.
- **cors**: Cross-Origin Resource Sharing.
- **helmet**: Security middleware.
- **dotenv**: Environment variable management.

## Database & ORM
- **drizzle-orm**: TypeScript ORM.
- **drizzle-kit**: CLI for migrations and schema management.
- **pg**: PostgreSQL client for Node.js.

## Development Tools
- **typescript**: TypeScript compiler.
- **ts-node**: TypeScript execution engine.
- **nodemon**: Development server with hot-reloading.

## External Services
- **PostgreSQL Database**: Primary data store.