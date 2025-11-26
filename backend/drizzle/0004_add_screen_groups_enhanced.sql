-- Migration: Enhanced Screen Groups with memberships, archiving, and proper indices
-- This migration updates the existing screen_groups table and renames screen_group_members

-- Step 1: Drop existing tables if they exist (clean slate approach)
DROP TABLE IF EXISTS screen_group_members CASCADE;
DROP TABLE IF EXISTS screen_groups CASCADE;

-- Step 2: Create enhanced screen_groups table
CREATE TABLE screen_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Create screen_group_memberships table (renamed from screen_group_members)
CREATE TABLE screen_group_memberships (
  group_id UUID NOT NULL REFERENCES screen_groups(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  added_by_user_id UUID REFERENCES users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, screen_id)
);

-- Step 4: Add indices for performance
CREATE UNIQUE INDEX idx_screen_groups_org_name ON screen_groups (org_id, lower(name)) WHERE is_archived = false;
CREATE INDEX idx_screen_group_memberships_screen ON screen_group_memberships (screen_id);
CREATE INDEX idx_screen_group_memberships_group ON screen_group_memberships (group_id);
CREATE INDEX idx_screen_groups_org ON screen_groups (org_id);
CREATE INDEX idx_screen_groups_archived ON screen_groups (is_archived);
