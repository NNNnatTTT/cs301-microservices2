-- CREATE DATABASE IF NOT EXISTS requestDB;
CREATE SCHEMA IF NOT EXISTS requests;
SET search_path TO requests, public;

-- case incencetive extension on AWS??
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- requests table
CREATE TABLE IF NOT EXISTS request_list (
  id                  uuid                PRIMARY KEY DEFAULT gen_random_uuid(), --request
  entity_id           text                NOT NULL, -- Profile or Account
  -- is_ready            BOOLEAN             NOT NULL CHECK -- must be true, if false cannot be created, Need store or can just check?
  supporting_docs     BOOLEAN             NOT NULL DEFAULT 'false',
  submitted_at        timestamptz         NOT NULL DEFAULT now(),
  submitted_by        uuid                NOT NULL,
  verified_at         date                NOT NULL,
  verified_by         timestamptz             NULL,
  rejected_at         timestamptz             NULL,
  rejected_by         text                    NULL,
  reject_reason       text                    NULL
);

-- Indexes:
-- List profiles by agent (Paginated by agent_id)
CREATE        INDEX IF NOT EXISTS idx_request_list_submitted_by        ON request_list (submitted_by, created_at DESC);

-- Seeding
INSERT INTO request_list (id, entity_id, supporting_docs, submitted_at, submitted_by, verified_at, verified_by, rejected_at, rejected_by, reject_reason)
VALUES
  ();