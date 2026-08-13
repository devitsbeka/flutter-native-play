-- Minimal stand-in for the parts of Supabase the migrations lean on.
-- Enough to execute the SQL and exercise its behaviour; not a Supabase clone.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT authenticated TO postgres;
GRANT service_role  TO postgres;
GRANT anon          TO postgres;

CREATE SCHEMA IF NOT EXISTS auth;

-- raw_user_meta_data is not optional: handle_new_user() reads it to build the
-- profile row, so a shim without it fails every insert into auth.users.
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb
);

-- The test harness sets these to impersonate a caller.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('test.uid', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('test.role', true), ''), 'authenticated');
$$;
