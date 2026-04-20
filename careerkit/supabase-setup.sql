-- CareerKit — Supabase Database Setup
-- Run this in your Supabase project → SQL Editor

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id          TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  date        TEXT,
  metrics     TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium   BOOLEAN DEFAULT FALSE,
  decode_count INTEGER DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings   ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "journal_entries_own" ON journal_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_settings_own" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
