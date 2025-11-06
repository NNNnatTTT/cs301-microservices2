-- 02_objects.sql
-- Params (string-replaced by init.js):
-- {SCHEMA}

SET search_path = {SCHEMA}, pg_catalog;

----------------------------
-- Extensions (idempotent)
----------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

----------------------------
-- Example table(s)
-- (Adjust per microservice)
----------------------------

-- Example for "admins" service:
CREATE TABLE IF NOT EXISTS {SCHEMA}.admin_list (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       citext NOT NULL UNIQUE,
  first_name  text   NOT NULL,
  last_name   text   NOT NULL,
  role        text   NOT NULL CHECK (role IN ('Owner','Admin','Viewer')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz
);

CREATE INDEX IF NOT EXISTS admin_list_email_idx
  ON {SCHEMA}.admin_list (email);

-- If you have sequences (example):
-- (No explicit sequence needed because gen_random_uuid() used.
-- Example for serial-like:
-- CREATE SEQUENCE IF NOT EXISTS {SCHEMA}.some_seq OWNED BY {SCHEMA}.some_table.some_id;)

-- Add more tables/indexes specific to each service as needed...
