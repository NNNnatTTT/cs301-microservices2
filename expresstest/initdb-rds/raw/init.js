import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import pg from "pg";
import format from 'pg-format';


// const { Client } = require('pg');
const { Pool } = pg;

const client = new SecretsManagerClient({
    region: "ap-southeast-1",
});

// const secret_name = "itsainitdbsecret";
const secret_name = "itsainitdbUP";

async function getSecretValue() {
    try {
        const response = await client.send(
            new GetSecretValueCommand({
                SecretId: secret_name,
                VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
            })
        );
        // const secret = response.SecretString;
        const secret = JSON.parse(response.SecretString);

        return secret;
    } catch (error) {
        // For a list of exceptions thrown, see
        // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        throw error;
    }
}

async function bootstrapPool(secret, dbName){
    const pool = new Pool({
            host: secret.host,
            // host: ,
            port: secret.port,
            // port: 5432,
            user: secret.username,
            password: secret.password,
            database: dbName,
            max: 10,
            idleTimeoutMillis: 30000,
            ssl: { rejectUnauthorized: false } // quick fix
            // options: '-c search_path=profiles,public',
        });
    return pool;
}

async function tablePool(secret, dbName){
    const pool = new Pool({
            host: secret.host,
            // host: ,
            port: secret.port,
            // port: 5432,
            user: 'service_user',
            password: 'user_password',
            database: dbName,
            max: 10,
            idleTimeoutMillis: 30000,
            // options: '-c search_path=profiles,public',
        });
    return pool;
}

function logPgError(e, ctx = "") {
  console.error(`error?: ${ctx}`);
  console.error("message:", e.message);
  console.error("code:", e.code);
  console.error("detail:", e.detail);
  console.error("hint:", e.hint);
  console.error("position:", e.position);
  console.error("where:", e.where);
  console.error("schema:", e.schema, "table:", e.table, "column:", e.column);
  console.error("stack:", e.stack);
}

process.on("unhandledRejection", (e) => logPgError(e, "UnhandledRejection"));
process.on("uncaughtException", (e) => logPgError(e, "UncaughtException"));

async function assertTrue(client, sql, ctx) {
  const { rows } = await client.query(sql);
  const ok = rows?.[0]?.ok === true;
  if (!ok) throw new Error(`Assertion failed: ${ctx}`);
  console.log(`✅ ${ctx}`);
}

async function createDB(dbName, masterClient) {
    try {
        await masterClient.query('SELECT pg_advisory_lock(hashtext($1))', [dbName]);

        const { rows } = await masterClient.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
        );
        if (rows.length === 0) {
            // IMPORTANT: identifiers (database names) can’t be parameterized.
            // Use pg-format %I to quote safely, or whitelist.
            console.log("Creating database ", dbName);
            const sql = format('CREATE DATABASE %I', dbName);
            await masterClient.query(sql);
            console.log("Created database ", dbName);
        } else {
            console.log("Database exists: ", dbName);
        }
    } catch (e) {
        if (e.code !== '42P04') throw e;
    } finally {
        // Release advisory lock if taken
        try { await masterClient.query('SELECT pg_advisory_unlock(hashtext($1))', [dbName]); } catch (_) {}
        // client.release();
    }
}

async function initAdminsDB(adminsClient) {
    try {
        await adminsClient.query(`DROP SCHEMA IF EXISTS admins CASCADE;`);
        await adminsClient.query(`CREATE SCHEMA IF NOT EXISTS admins;`);
        await assertTrue(adminsClient,
            `SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='admins') AS ok`,
            "admins schema exists");
        await adminsClient.query(`SET search_path TO admins, public;`);
    } catch(e) {
        console.log("initAdminsDB error: ", e);
    }
}

async function initAgentsDB(agentsClient) {
    try {
        await agentsClient.query(`DROP SCHEMA IF EXISTS agents CASCADE;`);
        await agentsClient.query(`CREATE SCHEMA IF NOT EXISTS agents;`);
        await assertTrue(agentsClient,
            `SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='agents') AS ok`,
            "agents schema exists");
        await agentsClient.query(`SET search_path TO agents, public;`);
        await agentsClient.query(`
            CREATE EXTENSION IF NOT EXISTS citext;
            CREATE EXTENSION IF NOT EXISTS pgcrypto;

            CREATE TABLE IF NOT EXISTS agents.agent_list (
                id   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
                first_name text        NOT NULL,
                last_name  text        NOT NULL,
                email      citext      NOT NULL UNIQUE,
                role       text        NOT NULL DEFAULT 'agent' CHECK (role = 'agent'),
                admin_sub   text       NOT NULL,
                cognito_sub text       NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                deleted_at timestamptz,
                deleted_by uuid,
                delete_reason text
            );
            GRANT CONNECT ON DATABASE agents_db TO service_user;
            GRANT USAGE ON SCHEMA agents TO service_user;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA agents TO service_user;
            ALTER DEFAULT PRIVILEGES IN SCHEMA agents GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_user;
        `);
        await agentsClient.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_list_admin_created_sub
            ON agents.agent_list (admin_sub, created_at DESC, id DESC)
            WHERE deleted_at IS NULL;
            `)

        await assertTrue(agentsClient,
            `SELECT EXISTS(
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='agents' AND table_name='agent_list'
            ) AS ok`,
            "agents.agent_list exists");
            

    } catch(e) {
        console.log("initAgentsDB error: ", e);
    }
}

async function initProfilesDB(serviceClient) {
    try {
        // await serviceClient.query(`
        //     DO $$
        //     BEGIN
        //         IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'profiles_user') THEN
        //             CREATE ROLE profiles_user WITH LOGIN PASSWORD 'profiles_user_password';
        //         END IF;
        //     END $$ LANGUAGE plpgsql;
        //     `);
        await serviceClient.query(`DROP SCHEMA IF EXISTS profiles CASCADE;`)
        await serviceClient.query(`CREATE SCHEMA IF NOT EXISTS profiles;`);
        await assertTrue(serviceClient,
            `SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='profiles') AS ok`,
            "profiles schema exists");

        await serviceClient.query(`SET search_path TO profiles, public;`);
        await serviceClient.query(`
            DO $$
                BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
                    CREATE TYPE gender_enum AS ENUM ('M', 'F');
                END IF;

                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
                    CREATE TYPE status_enum AS ENUM ('Active', 'Inactive', 'Disabled');
                END IF;
            END$$;

            CREATE EXTENSION IF NOT EXISTS citext;
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";

            CREATE TABLE IF NOT EXISTS profile_list (
                id                 uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
                first_name         text                NOT NULL,
                last_name          text                NOT NULL,
                date_of_birth      date                NOT NULL,
                gender             gender_enum         NOT NULL,
                email              citext              NOT NULL,
                phone_number       text                NOT NULL,
                address            text                NOT NULL CHECK (char_length(address)  BETWEEN 5 AND 100),
                city               text                NOT NULL CHECK (char_length(city)     BETWEEN 2 AND 50),
                state              text                NOT NULL CHECK (char_length(state)    BETWEEN 2 AND 50),
                country            text                NOT NULL CHECK (char_length(country)  BETWEEN 2 AND 50),
                postal             text                NOT NULL CHECK (char_length(postal)   BETWEEN 4 AND 10),
                status             status_enum         NOT NULL DEFAULT 'Inactive',
                agent_sub          text                NOT NULL,
                created_at         timestamptz         NOT NULL DEFAULT now(),
                updated_at         timestamptz         NOT NULL DEFAULT now(),
                deleted_at         timestamptz,
                deleted_by         text,
                delete_reason      text
            );
            GRANT CONNECT ON DATABASE profiles_db TO service_user;
            GRANT USAGE ON SCHEMA profiles TO service_user;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA profiles TO service_user;
            ALTER DEFAULT PRIVILEGES IN SCHEMA profiles GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_user;
            `);

            await assertTrue(serviceClient,
            `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'citext') AS ok`,
            "citext ext exists");
            await assertTrue(serviceClient,
            `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') AS ok`,
            "pgcrypto ext exists");



        await assertTrue(serviceClient,
            `SELECT EXISTS(
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='profiles' AND table_name='profile_list'
            ) AS ok`,
            "profiles.profile_list exists");


        await serviceClient.query(`
            CREATE        INDEX IF NOT EXISTS idx_profile_list_agent_sub ON profiles.profile_list (agent_sub, created_at DESC);
            CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_list_email_ci_active      ON profiles.profile_list (email)        WHERE deleted_at IS NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_list_phone_number_active  ON profiles.profile_list (phone_number) WHERE deleted_at IS NULL;
            CREATE        INDEX IF NOT EXISTS idx_profile_city_state_country       ON profiles.profile_list (country, state, city);
            `);

        //     //Indexes (look for regex or expressions)
        // const indexes = await serviceClient.query (`
        //     SELECT indexname, indexdef
        //     FROM pg_indexes
        //     WHERE schemaname='profiles' AND tablename='profile_list';`);
        //     console.log("indexes: ", indexes);
        //     // -- All constraints (expressions will be shown)
        // const constraints = await serviceClient.query(`
        //     SELECT conname, pg_get_expr(conbin, conrelid) AS expr
        //     FROM pg_constraint
        //     WHERE conrelid='profiles.profile_list'::regclass;`);
        // console.log("Constraints: ", constraints);
        // // -- Column defaults / generated expressions
        // const columnDefaults = await serviceClient.query(`
        //     SELECT a.attname, pg_get_expr(ad.adbin, ad.adrelid) AS expr
        // FROM pg_attrdef ad
        // JOIN pg_attribute a ON a.attrelid=ad.adrelid AND a.attnum=ad.adnum
        // WHERE ad.adrelid='profiles.profile_list'::regclass;`);
        // console.log("columnDefaults: ", columnDefaults);
        // // -- RLS policies
        // const rlsPolicies = await serviceClient.query(`
        //     SELECT polname,
        //     pg_get_expr(polqual, polrelid)      AS using_expr,
        //     pg_get_expr(polwithcheck, polrelid) AS check_expr
        // FROM pg_policy
        // WHERE polrelid='profiles.profile_list'::regclass;`);
        // console.log("rlsPolicies: ", rlsPolicies);
        // // -- Triggers on the table
        // const tableTriggers = await serviceClient.query(`
        //     SELECT tgname, pg_get_triggerdef(t.oid) AS trigger_def, p.proname AS func_name
        // FROM pg_trigger t
        // JOIN pg_proc p ON p.oid = t.tgfoid
        // WHERE t.tgrelid='profiles.profile_list'::regclass
        // AND NOT t.tgisinternal;`);
        // console.log("tableTriggers: ", tableTriggers);
        // // -- Bodies of relevant functions (search for regex use)
        // const relevantFunctions = await serviceClient.query(`
        //     SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) AS def
        // FROM pg_proc p
        // JOIN pg_namespace n ON n.oid=p.pronamespace
        // WHERE pg_get_functiondef(p.oid) ~ '(~\\*?|SIMILAR TO|regexp_)'
        // AND pg_get_functiondef(p.oid) ILIKE '%profile_list%';`);
        // console.log("relevantFunctions: ", relevantFunctions);
    } catch(e) {
        console.log("initProfilesDB error: ", e);
    }
}
//                CONSTRAINT phone_format CHECK (phone_number ~ '^\+?[1-9][0-9]{9,14}$')

// -- Indexes (look for regex or expressions)
// SELECT indexname, indexdef
// FROM pg_indexes
// WHERE schemaname='profiles' AND tablename='profile_list';

// -- All constraints (expressions will be shown)
// SELECT conname, pg_get_expr(conbin, conrelid) AS expr
// FROM pg_constraint
// WHERE conrelid='profiles.profile_list'::regclass;

// -- Column defaults / generated expressions
// SELECT a.attname, pg_get_expr(ad.adbin, ad.adrelid) AS expr
// FROM pg_attrdef ad
// JOIN pg_attribute a ON a.attrelid=ad.adrelid AND a.attnum=ad.adnum
// WHERE ad.adrelid='profiles.profile_list'::regclass;

// -- RLS policies
// SELECT polname,
//        pg_get_expr(polqual, polrelid)      AS using_expr,
//        pg_get_expr(polwithcheck, polrelid) AS check_expr
// FROM pg_policy
// WHERE polrelid='profiles.profile_list'::regclass;

// -- Triggers on the table
// SELECT tgname, pg_get_triggerdef(t.oid) AS trigger_def, p.proname AS func_name
// FROM pg_trigger t
// JOIN pg_proc p ON p.oid = t.tgfoid
// WHERE t.tgrelid='profiles.profile_list'::regclass
//   AND NOT t.tgisinternal;

// -- Bodies of relevant functions (search for regex use)
// SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) AS def
// FROM pg_proc p
// JOIN pg_namespace n ON n.oid=p.pronamespace
// WHERE pg_get_functiondef(p.oid) ~ '(~\\*?|SIMILAR TO|regexp_)'
//   AND pg_get_functiondef(p.oid) ILIKE '%profile_list%';


async function initAccountsDB(accountsClient) {
    await accountsClient.query(`DROP SCHEMA IF EXISTS accounts CASCADE;`)
    await accountsClient.query(`CREATE SCHEMA IF NOT EXISTS accounts;`);
    await assertTrue(accountsClient,
        `SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='accounts') AS ok`,
        "accounts schema exists");
    await accountsClient.query(`SET search_path TO accounts, public;`);
    await accountsClient.query(`
        CREATE EXTENSION IF NOT EXISTS citext;
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_enum') THEN
                CREATE TYPE account_enum AS ENUM ('Savings', 'Checking', 'Business');
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
                CREATE TYPE status_enum AS ENUM ('Inactive', 'Active', 'Disabled');
                -- CREATE TYPE status_enum AS ENUM ('Draft', 'Pending', 'Active', 'PendingClosure', 'Inactive');
            END IF;
        END$$;

        CREATE TABLE IF NOT EXISTS account_list (
            id                  uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id           uuid                NOT NULL,
            account_type        account_enum        NOT NULL,
            account_status      status_enum         NOT NULL DEFAULT 'Inactive',
            opening_date        date                NOT NULL DEFAULT (now()::date),
            initial_deposit     DECIMAL             NOT NULL,
            currency            text                NOT NULL,
            branch_id           uuid                NOT NULL,
            agent_sub            uuid                NOT NULL,
            created_at          timestamptz         NOT NULL DEFAULT now(),
            updated_at          timestamptz         NOT NULL DEFAULT now(),
            deleted_at          timestamptz,
            deleted_by          uuid,
            delete_reason       text
        );
        GRANT CONNECT ON DATABASE accounts_db TO service_user;
        GRANT USAGE ON SCHEMA accounts TO service_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA accounts TO service_user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA accounts GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_user;
    `);

    await assertTrue(accountsClient,
            `SELECT EXISTS(
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='accounts' AND table_name='account_list'
            ) AS ok`,
            "accounts.account_list exists");

    await accountsClient.query(`
        CREATE        INDEX IF NOT EXISTS idx_account_list_client_id ON accounts.account_list (client_id, created_at DESC) WHERE deleted_at IS NULL;
        CREATE        INDEX IF NOT EXISTS idx_account_list_branch_id ON accounts.account_list (branch_id, created_at DESC) WHERE deleted_at IS NULL;
        CREATE        INDEX IF NOT EXISTS idx_account_list_agent_sub ON accounts.account_list (agent_sub, created_at DESC) WHERE deleted_at IS NULL;
    `);
}

async function main() {
    try {
        const secret = await getSecretValue();
        const masterPool = await bootstrapPool(secret, 'postgres');
        const masterClient = await masterPool.connect();
        await createDB('admins_db', masterClient);
        await createDB('agents_db', masterClient);
        await createDB('profiles_db', masterClient);
        await createDB('accounts_db', masterClient);
        // await createDB('logs_db', masterClient);
        // await createDB('transactions_db', masterClient);
        // await masterClient.query(`CREATE DATABASE admins_db`);
        // // await masterClient.query(`
        // //     DO $$
        // //     BEGIN
        // //         IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_user') THEN
        // //             CREATE ROLE service_user WITH LOGIN PASSWORD 'user_password';
        // //         END IF;
        // //     END $$ LANGUAGE plpgsql;
        // //     `);
        await masterClient.release();
        // await masterPool.end();

        // Connect to specific DB as bootstrap still
        // Create owner, migrator and user roles for each service
        // const microservices = ['admins', 'agents', 'profiles', 'accounts', 'logs', 'transactions'];
        // const servicePool = await bootstrapPool(secret, 'admins_db');
        // const serviceClient = await servicePool.connect();
        // await serviceClient.query(`
        //     DO $$
        //     BEGIN
        //         IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_user') THEN
        //             CREATE ROLE service_user WITH LOGIN PASSWORD 'user_password';
        //         END IF;
        //     END $$ LANGUAGE plpgsql;
        //     `);
        // await serviceClient.query(`CREATE SCHEMA IF NOT EXISTS admins;`);
        // await assertTrue(serviceClient,
        //     `SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='admins') AS ok`,
        //     "admins schema exists");

        // await serviceClient.query(`SET search_path TO admins, pg_catalog;`);
        // await serviceClient.query(`
        //     CREATE EXTENSION IF NOT EXISTS citext;
        //     CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        //     CREATE TABLE IF NOT EXISTS admin_list (
        //         id           uuid        PRIMARY KEY NOT NULL,
        //         first_name   text        NOT NULL,
        //         last_name    text        NOT NULL,
        //         email        citext      NOT NULL UNIQUE,
        //         role         text        NOT NULL DEFAULT 'admin',
        //         created_at   timestamptz NOT NULL DEFAULT now(),
        //         updated_at   timestamptz NOT NULL DEFAULT now(),
        //         deleted_at   timestamptz,
        //         deleted_by   uuid,
        //         delete_reason text
        //     );

        //     GRANT CONNECT ON DATABASE admins_db TO service_user;
        //     GRANT USAGE ON SCHEMA admins TO service_user;
        //     GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA admins TO service_user;
        //     ALTER DEFAULT PRIVILEGES IN SCHEMA admins GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_user;
        //     `);

        // await assertTrue(serviceClient,
        //     `SELECT EXISTS(
        //         SELECT 1 FROM information_schema.tables
        //         WHERE table_schema='admins' AND table_name='admin_list'
        //     ) AS ok`,
        //     "admins.admin_list exists");
        const adminsPool = await bootstrapPool(secret, 'admins_db');
        const adminsClient = await adminsPool.connect();
        await initAdminsDB(adminsClient);
        const agentsPool = await bootstrapPool(secret, 'admins_db');
        const agentsClient = await agentsPool.connect();
        await initAgentsDB(agentsClient);
        const profilesPool = await bootstrapPool(secret, 'profiles_db');
        const profilesClient = await profilesPool.connect();
        await initProfilesDB(profilesClient);
        const accountsPool = await bootstrapPool(secret, 'accounts_db');
        const accountsClient = await accountsPool.connect();
        await initAccountsDB(accountsClient);
        


        await adminsClient.release();
        await agentsClient.release();
        await profilesClient.release();
        await accountsClient.release();
        await adminsPool.end();
        await agentsPool.end();
        await profilesPool.end();
        await accountsPool.end();
        await masterPool.end();
    } catch (e) {
        if (e.code === "42P04"){
            console.log("main error: ", e);
        } else {
            throw e; // ignore duplicate_database
        }
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
