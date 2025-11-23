# Database Setup Guide

This project uses PostgreSQL with Drizzle ORM for database management.

## Quick Setup

### 1. Create PostgreSQL Database

Use the Replit interface to create a PostgreSQL database:
- Look for the "Database" or "Postgres" tab in your Replit sidebar
- Click to create a new PostgreSQL database
- This will automatically set up the `DATABASE_URL` environment variable
- Restart your development server after creating the database

### 2. Generate Initial Migration

Create a baseline migration that captures your schema:

```bash
npm run db:generate
```

This will create migration files in the `drizzle/` directory. **Commit these files** to version control - they're essential for reproducible deployments.

### 3. Run Migrations

Apply the migrations to create your database tables:

```bash
npm run db:migrate
```

This command will:
- Read migration files from the `drizzle/` directory
- Create the `organisations` and `screens` tables
- Set up all enums, constraints, and relationships

### 4. Verify Tables

You can verify your tables were created using Drizzle Studio:

```bash
npm run db:studio
```

This opens a web interface where you can browse your database tables and data.

## Available Database Commands

- `npm run db:generate` - Generate migration files from schema changes (production workflow)
- `npm run db:migrate` - Run pending migrations (production workflow)
- `npm run db:push` - Push schema changes directly to database (development only - use with caution)
- `npm run db:studio` - Open Drizzle Studio to browse your database

## Schema Overview

### Organisations Table
- Stores advertiser, publisher, and internal organizations
- Fields: id, name, type, billingEmail, country, createdAt

### Screens Table
- Stores digital advertising screens managed by publishers
- Fields: id, publisherOrgId, name, screenType, resolution, location details, status, createdAt
- References the organisations table via `publisherOrgId`

## Troubleshooting

**Issue: "DATABASE_URL is not defined"**
- Make sure you've created a PostgreSQL database in Replit
- Check that the `DATABASE_URL` environment variable is set
- Restart your development server after creating the database

**Issue: "Connection refused"**
- Verify your database is running in the Replit interface
- Check that you're using the correct DATABASE_URL

## Development Workflow

### Recommended: Migration-First (Production-Ready)

This approach ensures reproducible deployments and proper version control:

1. Update your schema in `src/db/schema.ts`
2. Run `npm run db:generate` to create migration files
3. Review the generated SQL in `drizzle/` directory
4. Run `npm run db:migrate` to apply migrations to your database
5. **Commit migration files** to version control
6. Your team and production deployments can now run `db:migrate` to get the exact same schema

### Alternative: Direct Push (Local Prototyping Only)

⚠️ **Use with caution** - Not recommended for production or team environments:

1. Update your schema in `src/db/schema.ts`
2. Run `npm run db:push` to apply changes immediately
3. Drizzle will diff your schema against the live database (destructive changes possible)
4. No migration files are created (not reproducible)

**Why migrations are better:**
- Reproducible: Anyone can recreate your exact database schema
- Safe: Review SQL changes before applying them
- Trackable: Migration history in version control
- Rollback-friendly: You can revert to previous states if needed
