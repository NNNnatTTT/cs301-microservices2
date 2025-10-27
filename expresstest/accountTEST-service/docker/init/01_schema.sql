-- CREATE DATABASE IF NOT EXISTS accountDB;
CREATE SCHEMA IF NOT EXISTS accounts;
SET search_path TO accounts, public;

-- case incencetive extension on AWS??
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_enum') THEN
    CREATE TYPE account_enum AS ENUM ('Savings', 'Checking', 'Business');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
    CREATE TYPE status_enum AS ENUM ('Draft', 'Pending', 'Active', 'PendingClosure', 'Inactive');
  END IF;
END$$;

-- Accounts table
CREATE TABLE IF NOT EXISTS account_list (
  id                  uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid                NOT NULL,
  account_type        account_enum        NOT NULL,
  account_status      status_enum         NOT NULL DEFAULT 'Draft',
  opening_date        date                    NULL,
  initial_deposit     DECIMAL                 NULL,
  currency            text                    NULL,
  branch_id           uuid                NOT NULL,
  agent_id            uuid                NOT NULL,
  created_at          timestamptz         NOT NULL DEFAULT now(),
  updated_at          timestamptz         NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  deleted_by          uuid,
  delete_reason       text
);

-- Indexes:
-- List accounts by agent (Paginated by agent_id)
CREATE        INDEX IF NOT EXISTS idx_account_list_client_id ON accounts.account_list (client_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE        INDEX IF NOT EXISTS idx_account_list_branch_id ON accounts.account_list (branch_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE        INDEX IF NOT EXISTS idx_account_list_agent_id ON accounts.account_list (agent_id, created_at DESC) WHERE deleted_at IS NULL;

-- Seeding
INSERT INTO account_list (client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id, agent_id, delete_reason)
VALUES
  (gen_random_uuid(), 'Savings',  'Active',   '2022-01-15',  1500.00, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Checking', 'Active',   '2023-02-10',  2500.50, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Business', 'Inactive', '2024-03-12', 10000.00, 'SGD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Dormant account'),
  (gen_random_uuid(), 'Savings',  'Active',   '2023-07-05',   950.25, 'EUR', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Checking', 'Disabled', '2022-05-20',  3200.75, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Fraud alert'),
  (gen_random_uuid(), 'Savings',  'Active',   '2024-01-08',  1200.00, 'SGD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Business', 'Active',   '2021-11-30', 25000.00, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Checking', 'Inactive', '2023-06-15',   800.00, 'MYR', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'No transactions'),
  (gen_random_uuid(), 'Savings',  'Active',   '2023-03-01',  1100.00, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Business', 'Active',   '2024-05-25', 18000.00, 'EUR', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Savings',  'Disabled', '2021-08-19',   500.00, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Closed by user'),
  (gen_random_uuid(), 'Checking', 'Active',   '2022-09-13',  2700.00, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Savings',  'Active',   '2023-10-07',   600.00, 'SGD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Business', 'Inactive', '2022-12-22', 15500.00, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Dormant > 1 year'),
  (gen_random_uuid(), 'Checking', 'Active',   '2023-04-18',  3300.00, 'MYR', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Savings',  'Inactive', '2021-07-11',   700.00, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Dormant'),
  (gen_random_uuid(), 'Business', 'Active',   '2024-02-02', 30000.00, 'EUR', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Savings',  'Active',   '2023-11-15',  1250.00, 'USD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL),
  (gen_random_uuid(), 'Checking', 'Disabled', '2022-10-10',  5000.00, 'SGD', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Regulatory freeze'),
  (gen_random_uuid(), 'Savings',  'Active',   '2024-08-05',   950.00, 'MYR', gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL);
  