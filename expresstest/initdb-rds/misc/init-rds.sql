-- ============================================================
-- Bootstrap Initialization Script for RDS Testing Environment
-- Creates databases, roles, schemas, and sample admin table
-- ============================================================

-- 1. Create databases for each microservice
-- DO
-- $$
-- BEGIN
--    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'admins_db') THEN
--       PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE admins_db');
--    END IF;

--    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agents_db') THEN
--       PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE agents_db');
--    END IF;

--    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'profiles_db') THEN
--       PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE profiles_db');
--    END IF;

--    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'accounts_db') THEN
--       PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE accounts_db');
--    END IF;
-- END
-- $$ LANGUAGE plpgsql;

-- Note: If dblink is not available, you can instead run multiple
-- connections and CREATE DATABASE statements manually.


-- 2. Create generic CRUD user role
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_user') THEN
      CREATE ROLE service_user WITH LOGIN PASSWORD 'user_password';
   END IF;
END
$$ LANGUAGE plpgsql;


-- ==============
-- 3. ADMIN DB
-- ==============
\connect admins_db;

CREATE SCHEMA IF NOT EXISTS admins AUTHORIZATION CURRENT_USER;

SET search_path TO admins, pg_catalog;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS admin_list (
  id           uuid        PRIMARY KEY NOT NULL,
  first_name   text        NOT NULL,
  last_name    text        NOT NULL,
  email        citext      NOT NULL UNIQUE,
  role         text        NOT NULL DEFAULT 'admin',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  deleted_by   uuid,
  delete_reason text
);

-- Grant privileges for CRUD operations to the generic role
GRANT CONNECT ON DATABASE admins_db TO service_user;
GRANT USAGE ON SCHEMA admins TO service_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA admins TO service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA admins GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_user;


-- ==============
-- 4. AGENTS DB
-- ==============
\connect agents_db;

CREATE SCHEMA IF NOT EXISTS agents AUTHORIZATION CURRENT_USER;
SET search_path TO agents, pg_catalog;

CREATE TABLE IF NOT EXISTS agent_list (
  agent_id   uuid        PRIMARY KEY NOT NULL,
  first_name text        NOT NULL,
  last_name  text        NOT NULL,
  email      citext      NOT NULL UNIQUE,
  role       text        NOT NULL DEFAULT 'agent' CHECK (role = 'agent'),
  admin_sub   text        NOT NULL ON DELETE RESTRICT,
  cognito_sub text       NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  delete_reason text
);

CREATE INDEX IF NOT EXISTS idx_agent_list_admin_created_sub
  ON agent_list (admin_sub, created_at DESC, agent_id DESC)
  WHERE deleted_at IS NULL;

GRANT CONNECT ON DATABASE agents_db TO service_user;
GRANT USAGE ON SCHEMA agents TO service_user;
-- tables will be created later, but future grants are added now
ALTER DEFAULT PRIVILEGES IN SCHEMA agents GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_user;




-- ==============
-- 5. PROFILES DB
-- ==============
\connect profiles_db;

CREATE SCHEMA IF NOT EXISTS profiles AUTHORIZATION CURRENT_USER;
SET search_path TO agents, pg_catalog;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
    CREATE TYPE gender_enum AS ENUM ('M', 'F');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
    CREATE TYPE status_enum AS ENUM ('Active', 'Inactive', 'Disabled');
  END IF;
END$$;

-- Profiles table
-- CREATE TABLE IF NOT EXISTS profile_media_table(
--   id                uuid                FOREIGN KEY,
--   media_id          uuid                NOT NULL,
-- );
CREATE TABLE IF NOT EXISTS profile_list (
  id                 uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name         text                NOT NULL,
  last_name          text                NOT NULL,
  date_of_birth      date                NOT NULL,
  gender             gender_enum         NOT NULL,
  email              citext              NOT NULL,
  phone_number       text                NOT NULL,
  address            text                NOT NULL CHECK (char_length(address)  BETWEEN 5 AND 100),
  city               text                NOT NULL CHECK (char_length(city)     BETWEEN 2 AND 50),
  state              text                NOT NULL CHECK (char_length(state)    BETWEEN 2 AND 50),
  country            text                NOT NULL CHECK (char_length(country)  BETWEEN 2 AND 50),
  postal             text                NOT NULL CHECK (char_length(postal)   BETWEEN 4 AND 10),
  status             status_enum         NOT NULL DEFAULT 'Inactive',
  agent_id           uuid                NOT NULL,
  created_at         timestamptz         NOT NULL DEFAULT now(),
  updated_at         timestamptz         NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  deleted_by         uuid,
  delete_reason      text,
  CONSTRAINT phone_format CHECK (phone_number ~ '^\+?[1-9]\d{9,14}$')
);

-- Indexes:
-- List profiles by agent (Paginated by agent_id)
CREATE        INDEX IF NOT EXISTS idx_profile_list_agent_id ON profiles.profile_list (agent_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_list_email_ci_active      ON profiles.profile_list (email)        WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_list_phone_number_active  ON profiles.profile_list (phone_number) WHERE deleted_at IS NULL;
CREATE        INDEX IF NOT EXISTS idx_profile_city_state_country       ON profiles.profile_list (country, state, city);


GRANT CONNECT ON DATABASE profiles_db TO service_user;
GRANT USAGE ON SCHEMA profiles TO service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA profiles GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_user;


-- ==============
-- 6. ACCOUNTS DB
-- ==============
\connect accounts_db;

CREATE SCHEMA IF NOT EXISTS accounts AUTHORIZATION CURRENT_USER;

GRANT CONNECT ON DATABASE accounts_db TO service_user;
GRANT USAGE ON SCHEMA accounts TO service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA accounts GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_user;

-- ============================================================
-- END OF INITIALIZATION
-- ============================================================
