import pg from "pg";
import 'dotenv/config';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  options: '-c search_path=requests,public',
});

export default pool;


// Schema??
// CREATE DATABASE IF NOT EXISTS profileDB;
// CREATE SCHEMA IF NOT EXISTS profiles;

// case incencetive extension on AWS??
// CREATE EXTENSION IF NOT EXISTS citext;
// -- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
// CREATE EXTENSION IF NOT EXISTS "pgcrypto";

// DO $$
// BEGIN
//   IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
//     CREATE TYPE gender_enum AS ENUM ('M', 'F');
//   END IF;

//   IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
//     CREATE TYPE status_enum AS ENUM ('Active', 'Inactive', 'Disabled');
//   END IF;
// END$$;

// -- Profiles table
// CREATE TABLE IF NOT EXISTS profiles.profile_list (
//   id                 uuid                PRIMARY KEY DEFAULT gen_random_uuid()
//   first_name         text                NOT NULL,
//   last_name          text                NOT NULL,
//   date_of_birth      date                NOT NULL,
//   gender             gender_enum         NOT NULL,
//   email              citext              NOT NULL,
//   phone_number       text                NOT NULL,
//   address            text                NOT NULL CHECK (char_length(address)  BETWEEN 5 AND 100),
//   city               text                NOT NULL CHECK (char_length(city)     BETWEEN 2 AND 50),
//   state              text                NOT NULL CHECK (char_length(state)    BETWEEN 2 AND 50),
//   country            text                NOT NULL CHECK (char_length(country)  BETWEEN 2 AND 50),
//   postal             text                NOT NULL CHECK (char_length(postal)   BETWEEN 4 AND 10),
//   status             status_enum         NOT NULL DEFAULT 'Inactive',
//   agent_id           uuid                NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
//   created_at         timestamptz         NOT NULL DEFAULT now()
//   deleted_at         timestamptz,
//   deleted_by         uuid,
//   delete_reason      text,
//   CONSTRAINT phone_format CHECK (phone_number ~ '^\+?[1-9]\d{9,14}$')
// );

// -- Indexes:
// -- List agents by admin (Paginated by agent_id)
// CREATE        INDEX IF NOT EXISTS idx_profile_list_agent_id ON profiles.profile_list (agent_id, created_at DESC);
// CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_list_email_ci_active      ON profiles.profile_list (email)        WHERE deleted_at IS NULL;
// CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_list_phone_number_active  ON profiles.profile_list (phone_number) WHERE deleted_at IS NULL;
// CREATE        INDEX IF NOT EXISTS idx_profile_city_state_country       ON profiles.profile_list (country, state, city);

