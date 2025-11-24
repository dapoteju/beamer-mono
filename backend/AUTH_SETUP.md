# Authentication Setup Guide

This document describes the authentication system for the Beamer OOH CMS.

## Initial Setup

### 1. Environment Variables

Ensure `JWT_SECRET` is set in your `.env` file:

```bash
JWT_SECRET=your-secure-random-secret-here
```

### 2. Database Migration

The users table has been created with the following fields:
- `id` (UUID, primary key)
- `email` (unique, required)
- `password_hash` (bcrypt hashed)
- `full_name`
- `org_id` (references organisations)
- `role` (enum: admin, ops, viewer)
- `created_at`, `updated_at`

### 3. Seed Initial Admin User

**REQUIRED**: You must seed the initial admin user before using the system:

```bash
npm run seed:admin
```

This creates:
- **Email**: `admin@beamer.com`
- **Password**: `beamer123`
- **Role**: `admin`
- **Organisation**: Beamer Internal (created automatically)

⚠️ **IMPORTANT**: Change this password after first login in production!

## API Endpoints

### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@beamer.com",
  "password": "beamer123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@beamer.com",
    "fullName": "Super Admin",
    "orgId": "org-uuid",
    "role": "admin",
    "createdAt": "2025-11-24T...",
    "updatedAt": "2025-11-24T..."
  }
}
```

### GET /api/auth/me
Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@beamer.com",
    "fullName": "Super Admin",
    "orgId": "org-uuid",
    "role": "admin",
    "createdAt": "2025-11-24T...",
    "updatedAt": "2025-11-24T..."
  }
}
```

### POST /api/auth/register
Create a new user. **Requires admin authentication**.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "full_name": "New User",
  "org_id": "organisation-uuid",
  "role": "ops"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "fullName": "New User",
    "orgId": "org-uuid",
    "role": "ops",
    "createdAt": "2025-11-24T...",
    "updatedAt": "2025-11-24T..."
  }
}
```

**Security Note**: Only users with the `admin` role can create new users. This prevents privilege escalation and unauthorized account creation.

### POST /api/auth/logout
Logout endpoint (currently a no-op since JWT is stateless).

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## User Roles

- **admin**: Full system access, can create other users
- **ops**: Operations role for day-to-day management
- **viewer**: Read-only access

## Security Features

1. **Password Hashing**: Uses bcrypt with 10 salt rounds
2. **JWT Authentication**: Tokens expire after 7 days
3. **Protected Registration**: Only admins can create new users
4. **Role-Based Access**: User roles stored in JWT payload
5. **Secure Defaults**: No public registration endpoint

## Using in Your CMS

Import types and middleware:

```typescript
import { 
  User, 
  AuthResponse, 
  JWTPayload,
  requireAuth,
  AuthRequest 
} from './modules/auth';
```

Protect routes with middleware:

```typescript
router.get('/protected', requireAuth, (req: AuthRequest, res) => {
  console.log('User:', req.user);
  // Access user info from req.user
});
```

## CMS Integration

For the CMS frontend, use these endpoints:

1. **Login Page**: POST to `/api/auth/login` with email/password
2. **Store Token**: Save the returned JWT token in localStorage/sessionStorage
3. **API Requests**: Include token in `Authorization: Bearer <token>` header
4. **User Management**: Admin users can create new users via `/api/auth/register`
5. **Current User**: Fetch user info from `/api/auth/me` on app load

### Example CMS API Client

```typescript
const API_BASE = 'http://localhost:3000/api';

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  localStorage.setItem('token', data.token);
  return data;
}

export async function getCurrentUser() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function createUser(userData: any) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(userData)
  });
  return res.json();
}
```
