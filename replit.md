# Replit Project: Beamer Mono

## Overview
A monorepo for Beamer Player - a digital signage/advertising platform with multiple delivery methods (web, electron desktop app).

**Repository**: https://github.com/dapoteju/beamer-mono

## Current State
- **Status**: Backend API running successfully
- **Last Updated**: November 23, 2025
- Backend Express API is operational on port 3000
- PostgreSQL database configured with Drizzle ORM
- Node.js 20 development environment set up

## Project Structure
```
beamer-mono/
├── backend/          # Express API server (TypeScript + Drizzle ORM)
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

## Git Configuration
- **GitIgnore**: Configured to exclude node_modules, build outputs, .env files, and cache directories
- **Issue Fixed**: Removed git lockfile that was preventing commits
- Node modules and build artifacts are now properly excluded from git

## Recent Changes
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
- Player applications are not yet configured (player-core, player-electron, player-web-sim)
