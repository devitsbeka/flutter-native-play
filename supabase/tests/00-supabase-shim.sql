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

-- Supabase's project bootstrap, and the reason a `REVOKE ... FROM public` can
-- read as correct and do nothing.
--
-- Every new function in schema public is granted to anon EXPLICITLY, so
-- revoking the PUBLIC pseudo-role's grant leaves anon's in place. That is how
-- claim_daily_reward ended up callable by anon through five rewrites of a
-- migration that revokes on every one of them.
--
-- Without this line the harness cannot see that class of bug at all: it
-- creates functions with no anon grant to begin with, so "anon cannot call
-- this" passes on every function in the schema and proves nothing. Verified
-- both ways -- with it, the harness reproduces production exactly (of the
-- seven money functions, claim_daily_reward true and the other six false).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

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
