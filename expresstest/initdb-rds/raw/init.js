import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import pg from "pg";

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

async function tablePool(secret, serviceUser, servicePW, dbName){
    const pool = new Pool({
            host: secret.host,
            // host: ,
            port: secret.port,
            // port: 5432,
            user: serviceUser,
            password: servicePW,
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


async function main() {
    try {
        const secret = await getSecretValue();
        // const masterPool = await bootstrapPool(secret, 'postgres');
        // const masterClient = await masterPool.connect();
        // await masterClient.query(`CREATE DATABASE admins_db`);
        // // await masterClient.query(`
        // //     DO $$
        // //     BEGIN
        // //         IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_user') THEN
        // //             CREATE ROLE service_user WITH LOGIN PASSWORD 'user_password';
        // //         END IF;
        // //     END $$ LANGUAGE plpgsql;
        // //     `);
        // // await masterClient.query(`CREATE DATABASE agents_db`);
        // // await masterClient.query(`CREATE DATABASE profiles_db`);
        // // await masterClient.query(`CREATE DATABASE accounts_db`);
        // // await masterClient.query(`CREATE DATABASE logs_db`);
        // // await masterClient.query(`CREATE DATABASE transactions_db`);
        // await masterClient.release();
        // await masterPool.end();

        // Connect to specific DB as bootstrap still
        // Create owner, migrator and user roles for each service
        // const microservices = ['admins', 'agents', 'profiles', 'accounts', 'logs', 'transactions'];
        const servicePool = await bootstrapPool(secret, 'admins_db');
        const serviceClient = await servicePool.connect();
        await serviceClient.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_user') THEN
                    CREATE ROLE service_user WITH LOGIN PASSWORD 'user_password';
                END IF;
            END $$ LANGUAGE plpgsql;
            `);
        await serviceClient.query(`CREATE SCHEMA IF NOT EXISTS admins;`);
        await assertTrue(serviceClient,
            `SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='admins') AS ok`,
            "admins schema exists");

        await serviceClient.query(`SET search_path TO admins, pg_catalog;`);
        await serviceClient.query(`
            CREATE EXTENSION IF NOT EXISTS citext;
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";

            CREATE TABLE IF NOT EXISTS admin_list (
                id           uuid        PRIMARY KEY NOT NULL,
                first_name   text        NOT NULL,
                last_name    text        NOT NULL,
                email        citext      NOT NULL UNIQUE,
                role         text        NOT NULL DEFAULT 'admin',
                created_at   timestamptz NOT NULL DEFAULT now(),
                updated_at   timestamptz NOT NULL DEFAULT now(),
                deleted_at   timestamptz,
                deleted_by   uuid,
                delete_reason text
            );

            GRANT CONNECT ON DATABASE admins_db TO service_user;
            GRANT USAGE ON SCHEMA admins TO service_user;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA admins TO service_user;
            ALTER DEFAULT PRIVILEGES IN SCHEMA admins GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_user;
            `);

        await assertTrue(serviceClient,
            `SELECT EXISTS(
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='admins' AND table_name='admin_list'
            ) AS ok`,
            "admins.admin_list exists");

        await serviceClient.release();
        await servicePool.end();
    } catch (e) {
        if (e.code === "42P04"){
            console.log("admins_db already exists");
        } else {
            throw e; // ignore duplicate_database
        }
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
