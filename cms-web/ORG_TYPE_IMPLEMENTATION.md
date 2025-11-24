# Org-Type Aware CMS Implementation

## Overview
The CMS frontend has been updated to provide organization-type specific experiences for different user types.

## Organization Types
- **beamer_internal** - Full access to all features
- **advertiser** - Campaign-focused access
- **publisher** - Screen/player management access

## Navigation Configuration

### Beamer Internal
- Dashboard
- Campaigns
- Screens & Players
- Organisations
- Reporting

### Advertiser
- Dashboard
- Campaigns
- Reporting

### Publisher
- Dashboard
- Screens & Players
- Reporting

## UI Updates

### Topbar (Left Side)
- Organization name (e.g., "Beamer Internal")
- Organization type with color-coded badge:
  - **Internal** (Cyan)
  - **Advertiser** (Green)
  - **Publisher** (Orange)

### Topbar (Right Side)
- User full name
- User email
- User role badge (Admin/Ops/Viewer)
- Logout button

### Sidebar Navigation
- Dynamically renders menu items based on user's `orgType`
- Non-accessible routes are completely hidden from the sidebar

## Route Protection

### `/organisations` Route
- **Access**: Restricted to `beamer_internal` users only
- **Behavior**: Non-beamer_internal users attempting to access this route are redirected to `/dashboard`
- **Implementation**: `OrgTypeGuard` component in `src/router/index.tsx`

## Technical Details

### Files Modified
1. `src/api/auth.ts` - User interface includes `orgType` and `orgName` (camelCase)
2. `src/layouts/AppLayout.tsx` - Org-type aware sidebar and topbar
3. `src/router/index.tsx` - Route guard for org-type restrictions

### Field Naming Convention
All fields use **camelCase** to match the backend API response:
- `orgType` (not org_type)
- `orgName` (not org_name)
- `fullName` (not full_name)
- `orgId` (not org_id)

## Testing

### To Test Different Org Types
1. Login with a user from each organization type
2. Verify sidebar shows correct menu items
3. Try accessing `/organisations` with non-beamer_internal users
4. Confirm redirect to `/dashboard` occurs

### Current Test User
- **Email**: admin@beamer.com
- **Password**: beamer123
- **Org Type**: beamer_internal
- **Org Name**: Beamer Internal

## Notes
- If you don't see the changes after login, clear your browser's localStorage and log in again
- The navigation is rendered dynamically based on the authenticated user's organization type
- Route guards prevent unauthorized access even if users manually type URLs
