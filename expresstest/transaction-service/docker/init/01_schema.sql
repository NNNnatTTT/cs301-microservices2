-- CREATE DATABASE IF NOT EXISTS profileDB;
CREATE SCHEMA IF NOT EXISTS transactions;
SET search_path TO transactions, public;

-- case incencetive extension on AWS??
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_enum') THEN
    CREATE TYPE transaction_enum AS ENUM ('D', 'W');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
    CREATE TYPE status_enum AS ENUM ('Complete', 'Pending', 'Failed');
  END IF;
END$$;

-- Profiles table
CREATE TABLE IF NOT EXISTS transaction_list (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         uuid               NOT NULL,
  client_id        uuid               NOT NULL,
  transaction      transaction_enum   NOT NULL,
  amount           DECIMAL            NOT NULL,
  date             date        NOT NULL DEFAULT now(),
  status           status_enum        NOT NULL,
  created_at       timestamptz        NOT NULL DEFAULT now()
);

-- Indexes:
-- List profiles by agent (Paginated by agent_id)
CREATE INDEX IF NOT EXISTS idx_transaction_list_batch_id ON transaction_list (batch_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_list_client_id ON transaction_list (client_id, date DESC);


-- Seeding
INSERT INTO transaction_list (batch_id, client_id, transaction, amount, date, status)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'D',     1200.50, '2025-10-01', 'Complete'),
  ('b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'W',   300.00,  '2025-10-02', 'Complete'),
  ('b1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'D',     500.00,  '2025-10-02', 'Pending'),
  ('b1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'W',    220.75,  '2025-10-03', 'Complete'),
  ('b2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'D',     88.90,   '2025-10-03', 'Complete'),
  ('b2222222-2222-2222-2222-222222222222', 'c4444444-4444-4444-4444-444444444444', 'W',  640.00,  '2025-10-04', 'Pending'),
  ('b2222222-2222-2222-2222-222222222222', 'c5555555-5555-5555-5555-555555555555', 'D',     1500.00, '2025-10-04', 'Complete'),
  ('b3333333-3333-3333-3333-333333333333', 'c6666666-6666-6666-6666-666666666666', 'W',    780.00,  '2025-10-05', 'Failed'),
  ('b3333333-3333-3333-3333-333333333333', 'c7777777-7777-7777-7777-777777777777', 'D',     50.00,   '2025-10-05', 'Complete'),
  ('b3333333-3333-3333-3333-333333333333', 'c8888888-8888-8888-8888-888888888888', 'W',  200.00,  '2025-10-06', 'Complete'),
  ('b4444444-4444-4444-4444-444444444444', 'c9999999-9999-9999-9999-999999999999', 'D',     310.40,  '2025-10-06', 'Complete'),
  ('b4444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'W',    420.00,  '2025-10-06', 'Complete'),
  ('b4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'D',     950.00,  '2025-10-07', 'Complete'),
  ('b5555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333', 'W',  123.45,  '2025-10-07', 'Complete'),
  ('b5555555-5555-5555-5555-555555555555', 'c4444444-4444-4444-4444-444444444444', 'W',    800.00,  '2025-10-08', 'Failed'),
  ('b5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555', 'D',     2500.00, '2025-10-08', 'Complete'),
  ('b6666666-6666-6666-6666-666666666666', 'c6666666-6666-6666-6666-666666666666', 'D',     175.00,  '2025-10-09', 'Pending'),
  ('b6666666-6666-6666-6666-666666666666', 'c7777777-7777-7777-7777-777777777777', 'W',  670.00,  '2025-10-09', 'Complete'),
  ('b6666666-6666-6666-6666-666666666666', 'c8888888-8888-8888-8888-888888888888', 'D',     90.00,   '2025-10-10', 'Complete'),
  ('b6666666-6666-6666-6666-666666666666', 'c9999999-9999-9999-9999-999999999999', 'W',    430.00,  '2025-10-10', 'Complete');