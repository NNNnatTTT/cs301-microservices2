// init.js
// Bootstraps RDS: creates DBs, a generic service role, schemas, and admins table.
// Run with env or AWS Secrets Manager (preferred).

import { Client } from "pg";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const REQUIRED_ENVS = [
  // Either provide SECRET_ID (+ AWS_REGION), or provide individual PG_* vars
  // When using SECRET_ID, the secret value should be a JSON like:
  // {"host":"...", "port":5432, "username":"...", "password":"...", "database":"postgres", "ssl":true}
  // database can be omitted; default "postgres" will be used for bootstrap step.
  "SERVICE_USER_NAME", "SERVICE_USER_PASSWORD"
];

for (const v of REQUIRED_ENVS) {
  if (!process.env[v]) {
    console.error(`Missing required env: ${v}`);
    process.exit(1);
  }
}

const SERVICE_USER_NAME = process.env.SERVICE_USER_NAME;       // e.g. "service_user"
const SERVICE_USER_PASSWORD = process.env.SERVICE_USER_PASSWORD; // e.g. "strong-password"

// Databases & schemas
const DBS = [
  { name: "admins_db",   schema: "admins"   },
  { name: "agents_db",   schema: "agents"   },
  { name: "profiles_db", schema: "profiles" },
  { name: "accounts_db", schema: "accounts" }
];

// SQL blocks (idempotent)

// Role creation (generic CRUD)
const SQL_CREATE_ROLE = `
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${SERVICE_USER_NAME}') THEN
      CREATE ROLE ${SERVICE_USER_NAME} WITH LOGIN PASSWORD '${SERVICE_USER_PASSWORD}';
   END IF;
END$$;
`;

// Schema + grants (generic; run inside each DB)
const schemaAndGrants = (schema) => `
CREATE SCHEMA IF NOT EXISTS ${schema};

GRANT CONNECT ON DATABASE current_database() TO ${SERVICE_USER_NAME};
GRANT USAGE ON SCHEMA ${schema} TO ${SERVICE_USER_NAME};

-- future tables in this schema -> CRUD for service_user
ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema}
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${SERVICE_USER_NAME};

-- future sequences in this schema -> usage for service_user
ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema}
  GRANT USAGE, SELECT ON SEQUENCES TO ${SERVICE_USER_NAME};
`;

// Admins table (only for admins_db)
const SQL_CREATE_ADMINS_TABLE = `
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS admins.admin_list (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    text        NOT NULL,
  last_name     text        NOT NULL,
  email         citext      NOT NULL UNIQUE,
  role          text        NOT NULL DEFAULT 'admin',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  deleted_by    uuid,
  delete_reason text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON admins.admin_list TO ${SERVICE_USER_NAME};
`;

// ---------- Helpers ----------

async function getBootstrapConfig() {
  // (A) Prefer AWS Secrets Manager if SECRET_ID is present
  if (process.env.SECRET_ID) {
    if (!process.env.AWS_REGION) {
      throw new Error("SECRET_ID was provided but AWS_REGION is missing.");
    }
    const sm = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const out = await sm.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
    if (!out?.SecretString) throw new Error("SecretString missing in Secrets Manager response.");
    const s = JSON.parse(out.SecretString);

    return {
      host: s.host,
      port: s.port ?? 5432,
      user: s.username,
      password: s.password,
      database: s.database || "postgres",
      ssl: s.ssl === false ? false : { rejectUnauthorized: true } // recommend true in prod
    };
  }

  // (B) Otherwise take individual env vars (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGPASSWORD) {
    throw new Error("Provide SECRET_ID or PGHOST/PGUSER/PGPASSWORD envs.");
  }
  return {
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || "5432", 10),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "postgres",
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: true }
  };
}

async function withClient(config, fn) {
  const client = new Client(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function ensureDatabase(bootstrapConfig, dbName) {
  await withClient(bootstrapConfig, async (client) => {
    const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (rows.length === 0) {
      console.log(`Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName}`);
    } else {
      console.log(`Database already exists: ${dbName}`);
    }
  });
}

async function runInDatabase(baseConfig, dbName, statements) {
  const cfg = { ...baseConfig, database: dbName };
  await withClient(cfg, async (client) => {
    // Make each DB step atomic-ish (but keep CREATE EXTENSION outside txn in RDS if needed)
    // We'll split: non-transactional extensions and transactional DDL separately.

    // First pass: run everything except extensions inside a transaction.
    const nonExt = statements
      .filter((s) => !/CREATE\s+EXTENSION/i.test(s))
      .join("\n");

    // Second pass: run extension statements individually (RDS may allow in txn, but safer outside).
    const onlyExt = statements
      .filter((s) => /CREATE\s+EXTENSION/i.test(s));

    if (nonExt.trim()) {
      await client.query("BEGIN");
      try {
        await client.query(nonExt);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }

    for (const stmt of onlyExt) {
      await client.query(stmt);
    }
  });
}

// ---------- Main ----------

(async () => {
  const bootstrap = await getBootstrapConfig();

  // 1) Create generic CRUD role (once) at the cluster level (connect to bootstrap DB)
  await withClient(bootstrap, async (client) => {
    console.log("Ensuring generic service role exists…");
    await client.query(SQL_CREATE_ROLE);
  });

  // 2) Ensure the 4 databases exist
  for (const db of DBS) {
    await ensureDatabase(bootstrap, db.name);
  }

  // 3) Per-DB: create schema, grants; add admins table only for admins_db
  for (const { name, schema } of DBS) {
    console.log(`Configuring schema & grants in ${name}.${schema}…`);
    const blocks = [
      schemaAndGrants(schema)
    ];

    if (name === "admins_db") {
      // make sure extension + table + grant
      blocks.push(SQL_CREATE_ADMINS_TABLE);
    }

    await runInDatabase(bootstrap, name, blocks);
  }

  console.log("✅ RDS bootstrap complete.");
})().catch((e) => {
  console.error("Bootstrap failed:", e);
  process.exit(1);
});
