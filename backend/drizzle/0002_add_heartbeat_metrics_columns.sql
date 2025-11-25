-- Migration: Add memory_free_mb and online columns to heartbeats table
-- Created: 2025-11-25

ALTER TABLE heartbeats ADD COLUMN IF NOT EXISTS memory_free_mb INTEGER;
ALTER TABLE heartbeats ADD COLUMN IF NOT EXISTS online BOOLEAN;
