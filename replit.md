# Replit Project: Beamer Mono

## Overview
A monorepo for Beamer Player - a digital signage/advertising platform with multiple delivery methods (web, electron desktop app).

**Repository**: https://github.com/dapoteju/beamer-mono

## Current State
- **Status**: Backend API and CMS Frontend both running successfully
- **Last Updated**: November 24, 2025
- Backend Express API is operational on port 3000
- CMS Web Frontend is operational on port 5000 (visible in preview)
- PostgreSQL database configured with Drizzle ORM
- Node.js 20 development environment set up

## Project Structure
```
beamer-mono/
├── backend/          # Express API server (TypeScript + Drizzle ORM)
├── cms-web/          # CMS Frontend (React + Vite + TypeScript + Tailwind v4)
├── player-core/      # Core TypeScript library
├── player-electron/  # Electron desktop application
└── player-web-sim/   # Web simulator (empty)
```

## Technology Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express 5.1.0
- **Language**: TypeScript 5.9.3
- **Database**: PostgreSQL (via Replit integration)
- **ORM**: Drizzle 0.44.7
- **Dev Server**: Nodemon + ts-node

### Frontend (CMS Web)
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 4.1.17
- **State Management**: Zustand 5.0.8
- **Data Fetching**: TanStack Query 5.90.10
- **HTTP Client**: Axios 1.13.2
- **Routing**: React Router DOM 7.9.6

### API Modules
- Health checks
- Organizations management
- Screens management
- Regions management
- Campaigns management
- Creatives management
- Bookings management
- Invoices management
- Player API
- Reports

## Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection (auto-configured by Replit)
- `PORT`: API server port (default: 3000)

### Workflows
- **Backend API**: Runs `npm run dev` in backend directory
  - Port: 3000 (localhost)
  - Auto-restarts on TypeScript file changes
- **CMS Frontend**: Runs `npm run dev` in cms-web directory
  - Port: 5000 (visible in Replit preview)
  - Hot module replacement enabled
  - Configured with allowedHosts for Replit preview compatibility

### Database
- PostgreSQL database created via Replit
- Schema managed via Drizzle ORM
- Migrations: Use `npm run db:push` (never manual SQL)
- Located at: `backend/src/db/schema.ts`

## Development Commands

### Backend
```bash
cd backend
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm run start        # Run production build
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio
```

### CMS Frontend
```bash
cd cms-web
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Git Configuration
- **GitIgnore**: Configured to exclude node_modules, build outputs, .env files, and cache directories
- **Issue Fixed**: Removed git lockfile that was preventing commits
- Node modules and build artifacts are now properly excluded from git

## Recent Changes
- November 24, 2025: Database Migration from Legacy Database
  - Created migration scripts to transfer data from old Replit database
  - Successfully migrated all data (organisations, regions, screens, campaigns, creatives, bookings, flights, invoices)
  - Handled schema differences with column mapping (e.g., issue_date → issued_date)
  - Implemented auto-generation of invoice numbers in format INV-YYYYMMDD-####
  - Added JSON data sanitization for legacy creative_approvals records
  - Documented migration process in backend/scripts/README.md
  - All API endpoints verified working with migrated data

- November 24, 2025: CMS Frontend setup and configuration
  - Configured Vite server to run on port 5000 with host 0.0.0.0
  - Fixed Tailwind CSS v4 PostCSS configuration (installed @tailwindcss/postcss)
  - Added allowedHosts: true to Vite config for Replit preview compatibility
  - Created CMS Frontend workflow and verified preview working
  
- November 23, 2025: Initial Replit environment setup
  - Added .gitignore to prevent committing node_modules and build artifacts
  - Installed Node.js 20 and backend dependencies
  - Created PostgreSQL database and configured environment variables
  - Pushed database schema using Drizzle
  - Configured and started backend workflow on port 3000
  - Verified backend API runs without errors

## User Preferences
- None specified yet

## Notes
- The repository was initially empty when imported to Replit
- Backend uses port 3000 (localhost) for API
- CMS Frontend uses port 5000 (visible in Replit preview pane)
- CRITICAL: Vite config must include `allowedHosts: true` for Replit preview to work
- Player applications are not yet configured (player-core, player-electron, player-web-sim)
