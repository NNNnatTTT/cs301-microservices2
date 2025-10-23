import pg from "pg";
import 'dotenv/config';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  options: '-c search_path=agents,public',
});

export default pool;


// Schema
// CREATE DATABASE IF NOT EXISTS transactionDB;
// CREATE SCHEMA IF NOT EXISTS transactions;

// case incencetive extension on AWS??
// CREATE EXTENSION IF NOT EXISTS citext;
// -- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
// -- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

// -- Transactions table, call as transactions.transaction_list
// CREATE TABLE IF NOT EXISTS transaction_list (
//   id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
//   batch_id         uuid                                    NOT NULL,
//   client_id        uuid                                    NOT NULL,
//   transaction      ENUM('D', 'W')                          NOT NULL,
//   amount           DECIMAL                                 NOT NULL,
//   date             timestamptz                             NOT NULL DEFAULT now(),
//   status           ENUM('Completed', 'Pending','Failed') NOT NULL,
// );

// -- Indexes:
// -- List agents by admin (Paginated by agent_id)
// CREATE INDEX IF NOT EXISTS idx_transaction_list_batch_id ON transaction_list (batch_id, date DESC);
// CREATE INDEX IF NOT EXISTS idx_transaction_list_client_id ON transaction_list (client_id, date DESC);
