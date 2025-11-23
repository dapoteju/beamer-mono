# Deployment Guide

This guide explains how to deploy your Beamer API to production on Replit.

## Current Configuration

Your deployment is currently set to:

- **Build command**: `npm run build` (compiles TypeScript)
- **Run command**: `npm start` (starts server, NO migrations)
- **Target**: Autoscale

**This means migrations are NOT running automatically.** Choose an approach below.

---

## Choose Your Migration Strategy

### Option A: Auto-Migrate on Startup ⭐ Recommended

**What**: Migrations run automatically when containers start
**Pros**: Simple, one-click deploys
**Cons**: Very small race condition risk (Drizzle handles it safely)
**Best for**: 95% of applications

### Option B: Manual Migrations

**What**: You run migrations yourself before deploying
**Pros**: Full control over migration timing
**Cons**: Extra manual step every deployment
**Best for**: High-traffic apps or complex schema changes

---

## Option A Setup: Auto-Migrate (Recommended)

### 1. Add DATABASE_URL Secret

In Replit:
1. Open **Deployments** pane (left sidebar)
2. Click **Configuration** tab
3. Scroll to "Secrets" section
4. Click **Add production secret**
5. Enter:
   - **Name**: `DATABASE_URL` (exactly this)
   - **Value**: Your production Postgres connection string
6. Click **Save**

### 2. Change Run Command to Auto-Migrate

Still in Deployments → Configuration:
1. Find the **"Run command"** field (shows: `npm start`)
2. Change it to: `npm run start:migrate`
3. Click **Save changes** at bottom

**This one change enables auto-migrations!** ✅

### 3. Deploy

1. Ensure migrations are committed:
   ```bash
   npm run db:generate  # If you changed schema
   git add drizzle/
   git commit -m "Add migrations"
   ```
2. Click **Deploy** in Deployments pane
3. Wait for build to complete
4. When containers start, migrations run automatically, then server starts

**That's it!** Future deployments will auto-migrate.

---

## Option B Setup: Manual Migrations

### 1. Add DATABASE_URL Secret

(Same as Option A, step 1)

### 2. Keep Current Run Command

Leave run command as `npm start` (default) - no changes needed

### 3. Run Migrations Before Each Deploy

**Method 1: Temporary environment variable**

In Replit Shell, run:
```bash
DATABASE_URL="your-prod-db-url-here" npm run db:migrate
```

This runs migrations against production without changing any files.

**Method 2: Use development secret**

1. Add `DATABASE_URL` as a development secret in Replit (Secrets tab)
2. Set it to your production database URL
3. Run:
   ```bash
   npm run db:migrate
   ```
4. Remove or change the development secret back afterward

This reuses your deployment secret configuration temporarily.

### 4. Deploy

After migrations succeed:
```bash
git add drizzle/
git commit -m "Update schema"
```
Then click **Deploy** in Replit

---

## Quick Deploy Checklist

- [ ] Production `DATABASE_URL` secret added
- [ ] Migrations committed to git
- [ ] (Approach 1 only) Run command set to `npm run start:migrate`
- [ ] (Approach 2 only) Migrations run on production database
- [ ] Click Deploy button

## Environment Variables

The following environment variables are automatically provided:

- `DATABASE_URL` - Your production database connection string (from secrets)
- `PORT` - The port your app should listen on (set by Cloud Run)

## Testing Your Deployment

After deployment, test your endpoints:

```bash
# Health check
curl https://your-deployment-url.replit.app/health

# List organisations
curl https://your-deployment-url.replit.app/api/organisations

# List screens
curl https://your-deployment-url.replit.app/api/screens
```

## Troubleshooting

### "DATABASE_URL is not set" Error

- Make sure you added `DATABASE_URL` as a production secret in the Deployments configuration
- Verify the secret name is exactly `DATABASE_URL` (case-sensitive)

### Migration Errors During Build

- Ensure all migration files in `drizzle/` are committed to your repository
- Check that your production database is accessible
- Review build logs in the Deployments pane for specific error messages

### Application Not Starting

- Check the deployment logs in the Deployments pane
- Verify your build completed successfully
- Ensure the `npm start` command works locally by running:
  ```bash
  npm run build
  npm start
  ```

## Updating Your Deployment

**If using Approach 1 (Auto-Migrate)**:
1. Make code/schema changes
2. Run `npm run db:generate` if schema changed
3. Commit and deploy - migrations run automatically!

**If using Approach 2 (Manual)**:
1. Make code/schema changes
2. Run `npm run db:generate` if schema changed
3. Run migrations on production (see Approach 2, Step 3)
4. Commit and deploy

## Comparing the Approaches

| | Approach 1: Auto-Migrate | Approach 2: Manual |
|---|---|---|
| **Deployment** | One-click | Requires pre-deploy migration step |
| **Safety** | Drizzle handles locks | Full manual control |
| **Best for** | Most users | Complex migrations, high-traffic apps |
| **Run command** | `npm run start:migrate` | `npm start` |

## Production vs Development

| Environment | Command | Database | Migrations |
|-------------|---------|----------|------------|
| Development | `npm run dev` | Dev DB | `npm run db:push` (quick sync) |
| Production | `npm start` or `npm run start:migrate` | Prod DB | Per your chosen approach |
