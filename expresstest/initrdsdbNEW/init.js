// init.js
// Orchestrates DB creation & bootstrap for microservices:
// 1) Connect as bootstrap user to 'postgres' to CREATE DATABASE per service
// 2) Connect as bootstrap user to each DB to create roles/schema/grants
// 3) Connect as *migrator* to each DB, SET ROLE owner, then create extensions/tables

import { readFileSync } from "fs";
import { Pool } from "pg";

// ====== FILL THESE IN ======
const BOOTSTRAP = {
  host: process.env.PGHOST || "your-rds-endpoint.rds.amazonaws.com",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "bootstrap_user",   // RDS master/administrative user
  password: process.env.PGPASSWORD || "bootstrap_password",
  ssl: { rejectUnauthorized: false },
};

const SERVICES = [
  // You can add per-service specific table SQL paths or reuse a single template with in-memory tweaks
  { name: "admins",   db: "admins_db",   schema: "admins",   owner: "admins_owner",   migrator: "admins_migrator",   user: "admins_user",
    migratorPassword: process.env.ADMINS_MIGRATOR_PW || "admins_migrator_pw",
    userPassword:     process.env.ADMINS_USER_PW     || "admins_user_pw",
    // OPTIONAL: you can override objects SQL file per service, else defaultFile used
    objectsSqlPath:   "sql/02_objects.sql"
  },
  { name: "agents",   db: "agents_db",   schema: "agents",   owner: "agents_owner",   migrator: "agents_migrator",   user: "agents_user",
    migratorPassword: process.env.AGENTS_MIGRATOR_PW || "agents_migrator_pw",
    userPassword:     process.env.AGENTS_USER_PW     || "agents_user_pw",
    objectsSqlPath:   "sql/02_objects.sql"
  },
  { name: "profiles", db: "profiles_db", schema: "profiles", owner: "profiles_owner", migrator: "profiles_migrator", user: "profiles_user",
    migratorPassword: process.env.PROFILES_MIGRATOR_PW || "profiles_migrator_pw",
    userPassword:     process.env.PROFILES_USER_PW     || "profiles_user_pw",
    objectsSqlPath:   "sql/02_objects.sql"
  },
  { name: "accounts", db: "accounts_db", schema: "accounts", owner: "accounts_owner", migrator: "accounts_migrator", user: "accounts_user",
    migratorPassword: process.env.ACCOUNTS_MIGRATOR_PW || "accounts_migrator_pw",
    userPassword:     process.env.ACCOUNTS_USER_PW     || "accounts_user_pw",
    objectsSqlPath:   "sql/02_objects.sql"
  },
];

const ROLES_SCHEMA_SQL_PATH = "sql/01_roles_schema.sql";

function fill(template, map) {
  return Object.entries(map).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, v),
    template
  );
}

async function runSql(pool, sql, params = []) {
  // Split on semicolons cautiously? Here we just run as one batch.
  // Postgres can execute multiple statements in a single query call.
  await pool.query(sql, params);
}

async function createDatabaseIfNotExists(service) {
  const pool = new Pool({ ...BOOTSTRAP, database: "postgres" });
  try {
    const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${service.db}') THEN
        PERFORM dblink_exec('dbname=' || current_database(),
          'CREATE DATABASE ${service.db} WITH OWNER = ${BOOTSTRAP.user}');
        -- NOTE: RDS allows CREATE DATABASE from a privileged user.
        -- If dblink is not available, we can execute CREATE DATABASE directly:
      END IF;
    END$$;
    `;
    // Many RDS instances do not have dblink; so do direct CREATE DATABASE guarded by DO:
    const direct = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${service.db}') THEN
        EXECUTE 'CREATE DATABASE ${service.db}';
      END IF;
    END$$;`;
    await runSql(pool, direct);
    console.log(`✔ DB ensured: ${service.db}`);
  } finally {
    await pool.end();
  }
}

async function applyRolesAndSchema(service, rolesSchemaTmpl) {
  const pool = new Pool({ ...BOOTSTRAP, database: service.db });
  try {
    // Fill template and also set role passwords
    const filled = fill(rolesSchemaTmpl, {
      DB_NAME: service.db,
      SCHEMA: service.schema,
      OWNER_ROLE: service.owner,
      MIGRATOR_ROLE: service.migrator,
      USER_ROLE: service.user,
    });

    await runSql(pool, filled);

    // Set passwords for LOGIN roles
    await runSql(pool, `ALTER ROLE ${service.migrator} WITH ENCRYPTED PASSWORD '${service.migratorPassword}';`);
    await runSql(pool, `ALTER ROLE ${service.user} WITH ENCRYPTED PASSWORD '${service.userPassword}';`);

    console.log(`✔ Roles/schema/grants applied in ${service.db}`);
  } finally {
    await pool.end();
  }
}

async function applyObjectsAsOwnerViaMigrator(service, objectsTmpl) {
  // Connect as MIGRATOR, then SET ROLE OWNER to create objects owned by the NOLOGIN group
  const pool = new Pool({
    host: BOOTSTRAP.host,
    port: BOOTSTRAP.port,
    user: service.migrator,
    password: service.migratorPassword,
    database: service.db,
    ssl: BOOTSTRAP.ssl,
  });

  try {
    await runSql(pool, `SET ROLE ${service.owner};`);
    const filled = fill(objectsTmpl, {
      SCHEMA: service.schema,
    });
    await runSql(pool, filled);
    console.log(`✔ Objects created in ${service.db} as ${service.owner} (via ${service.migrator})`);
  } finally {
    await pool.end();
  }
}

async function main() {
  const rolesSchemaTmpl = readFileSync(ROLES_SCHEMA_SQL_PATH, "utf8");

  for (const svc of SERVICES) {
    await createDatabaseIfNotExists(svc);
    await applyRolesAndSchema(svc, rolesSchemaTmpl);

    // Load objects SQL (common or per-service)
    const objectsTmpl = readFileSync(svc.objectsSqlPath, "utf8");
    await applyObjectsAsOwnerViaMigrator(svc, objectsTmpl);
  }

  console.log("✅ All microservices initialized.");
}

main().catch((e) => {
  console.error("Initialization failed:", e);
  process.exit(1);
});
