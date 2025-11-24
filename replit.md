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
- **State Management**: Zustand 5.0.8 (with localStorage persistence)
- **Data Fetching**: TanStack Query 5.90.10
- **HTTP Client**: Axios 1.13.2 (configured with auth headers)
- **Routing**: React Router DOM 7.9.6 (with protected routes)
- **Authentication**: JWT-based with auto-hydration from localStorage

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

**Backend:**
- `DATABASE_URL`: PostgreSQL connection (auto-configured by Replit)
- `PORT`: API server port (default: 3000)
- `JWT_SECRET`: Secret key for JWT token signing (configured)

**Frontend:**
- `VITE_API_URL`: Backend API URL (empty by default, uses Vite proxy)

### Workflows
- **Backend API**: Runs `npm run dev` in backend directory
  - Port: 3000 (localhost)
  - Auto-restarts on TypeScript file changes
- **CMS Frontend**: Runs `npm run dev` in cms-web directory
  - Port: 5000 (visible in Replit preview)
  - Hot module replacement enabled
  - Configured with allowedHosts for Replit preview compatibility
  - Vite proxy forwards /api requests to backend on port 3000

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

## Authentication System

### Implementation Details
- **JWT-based authentication** with 7-day token expiration
- **Bcrypt password hashing** with 10 salt rounds
- **Role-based access control**: admin, ops, viewer
- **Protected registration**: Only admins can create new users

### Database Schema
Users table includes:
- `id` (UUID)
- `email` (unique)
- `password_hash` (bcrypt)
- `full_name`
- `org_id` (references organisations)
- `role` (enum: admin, ops, viewer)
- `created_at`, `updated_at`

### API Endpoints
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user (requires JWT)
- `POST /api/auth/register` - Create user (admin only)
- `POST /api/auth/logout` - Logout (stateless)

### Initial Admin User
- **Email**: admin@beamer.com
- **Password**: beamer123
- **Role**: admin
- **Created via**: `npm run seed:admin`

### Security Features
- No public registration (prevents unauthorized access)
- Admin-only user creation (prevents privilege escalation)
- JWT middleware for route protection
- Environment-based JWT secret

## CMS Frontend Authentication

### Implementation
- **Login Page**: Beautiful form with email/password inputs and error handling
- **Protected Routes**: Automatic redirect to /login for unauthenticated users
- **Session Persistence**: Auto-login on page refresh using localStorage
- **User Display**: Topbar shows user full name, email, and role badge
- **Logout**: Clears session and redirects to login page

### Technical Details
- **API Client**: Axios instance with automatic auth header injection
- **Auth Store**: Zustand store with hasHydrated flag to prevent race conditions
- **Auth Initializer**: React component that hydrates auth state on app load
- **Route Protection**: ProtectedRoute component with loading state during hydration

### Files Created
- `cms-web/src/api/client.ts` - Axios API client configuration
- `cms-web/src/api/auth.ts` - Auth API helpers and TypeScript types
- `cms-web/src/store/authStore.ts` - Zustand auth store with persistence
- `cms-web/src/pages/Login.tsx` - Login page component
- `cms-web/.env` - Environment variables (VITE_API_URL)

### Files Modified
- `cms-web/src/router/index.tsx` - Added ProtectedRoute and /login route
- `cms-web/src/layouts/AppLayout.tsx` - Updated topbar with real user data and logout
- `cms-web/src/main.tsx` - Added AuthInitializer for proper hydration

## Recent Changes
- November 24, 2025: Fixed API Connectivity Issue
  - Configured Vite proxy to forward /api requests to backend
  - Updated API client to use relative URLs instead of hardcoded localhost
  - Frontend can now successfully communicate with backend in Replit environment
  - Login flow working end-to-end with admin@beamer.com / beamer123
  - Architect verified and approved the fix

- November 24, 2025: CMS Frontend Authentication Integration
  - Implemented complete authentication flow in CMS frontend
  - Created API client with Axios and auth token management
  - Built Zustand auth store with localStorage persistence
  - Created beautiful login page with form validation
  - Added route protection with ProtectedRoute component
  - Updated AppLayout topbar with user info (name, email, role badge) and logout button
  - Fixed hydration race condition with hasHydrated flag and AuthInitializer component
  - All TypeScript compiles with no errors
  - Production-ready and architect-approved

- November 24, 2025: Authentication System Implementation
  - Created comprehensive JWT-based authentication system
  - Implemented user management with role-based access control (admin, ops, viewer)
  - Added bcrypt password hashing for security
  - Created auth endpoints: login, register (admin-only), me, logout
  - Built JWT middleware for protecting routes
  - Added seed script for initial admin user (admin@beamer.com / beamer123)
  - Configured JWT_SECRET environment variable
  - Exported TypeScript types for CMS integration
  - Documented complete API in AUTH_SETUP.md
  - Security: Fixed privilege escalation vulnerability by requiring admin auth for registration

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
