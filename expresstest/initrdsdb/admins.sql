CREATE DATABASE IF NOT EXISTS admins_db;

CREATE SCHEMA IF NOT EXISTS admins;
SET search_path TO admins, pg_catalog;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS admin_list (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text        NOT NULL,
  last_name  text        NOT NULL,
  email      citext      NOT NULL UNIQUE,
  role       text        NOT NULL DEFAULT 'agent' CHECK (role = 'agent'),
--   cognito_sub text       NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  delete_reason text
);