import pg from "pg";
import 'dotenv/config';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  options: '-c search_path=agents,public',
});

export default pool;


// Schema??
// CREATE DATABASE IF NOT EXISTS agentDB;
// CREATE SCHEMA IF NOT EXISTS agents;

// case incencetive extension on AWS??
// CREATE EXTENSION IF NOT EXISTS citext;
// -- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
// -- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

// -- Agents table
// CREATE TABLE IF NOT EXISTS agent_list (
//   agent_id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
//   first_name         text        NOT NULL,
//   last_name          text        NOT NULL,
//   email              citext      NOT NULL UNIQUE,
//   role               text        NOT NULL CHECK (role IN ('agent')),
//   admin_id           uuid        NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
//   created_at         timestamptz NOT NULL DEFAULT now()
//   deleted_at         timestamptz
//   deleted_by         uuid
//   delete_reason      text
// );

// -- Indexes:
// -- List agents by admin (Paginated by agent_id)
// CREATE        INDEX IF NOT EXISTS idx_agent_list_creator_id ON agent_list (creator_admin_id, created_at DESC, agent_id DESC);
// CREATE UNIQUE INDEX IF NOT EXISTS ux_agent_list_email_ci    ON agent_list (email);
