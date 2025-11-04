import pg from "pg";
import 'dotenv/config';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
// import * as secretsClient from "./secrets";

const client = new SecretsManagerClient({
  region: "ap-southeast-1",
});

const secret_name = "itsatestdb";

async function initPool() {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
      })
    );
  } catch (error) {
    // For a list of exceptions thrown, see
    // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    throw error;
  }

  const secret = response.SecretString;
  // const secret = JSON.parse(res.SecretString);

  const pool = new Pool({
    host: secret.host,
    port: secret.port,
    user: secret.username,
    password: secret.password,
    database: secret.dbname,
    max: 10,
    idleTimeoutMillis: 30000,
    options: '-c search_path=profiles,public',
  });
  return pool;
}

export const dbPool = await initPool();
// const { Pool } = pg;

// const pool = new Pool({
//   // connectionString: process.env.DATABASE_URL,
//   // ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
//   options: '-c search_path=profiles,public',
// });

// export default pool;

// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html





// let response;

// try {
//   response = await client.send(
//     new GetSecretValueCommand({
//       SecretId: secret_name,
//       VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
//     })
//   );
// } catch (error) {
//   // For a list of exceptions thrown, see
//   // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
//   throw error;
// }

// const secret = response.SecretString;

// Your code goes here


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

