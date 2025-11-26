-- Add isActive and revokedAt columns to players table
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;
