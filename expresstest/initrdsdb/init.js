// init.js
import * as initSchemas from "./initQuery";
import * as initServices from "./initService";
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
        const secret = response.SecretString;
        // const secret = JSON.parse(res.SecretString);

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

async function main() {
    const secret = await getSecretValue();
    const masterPool = await bootstrapPool(secret, 'postgres');
    const masterClient = await masterPool.connect();
    await masterClient.query(`CREATE DATABASE admins_db`);
    await masterClient.query(`CREATE DATABASE agents_db`);
    await masterClient.query(`CREATE DATABASE profiles_db`);
    await masterClient.query(`CREATE DATABASE accounts_db`);
    await masterClient.query(`CREATE DATABASE logs_db`);
    // await masterClient.query(`CREATE DATABASE transactions_db`);
    await masterClient.end();
    await masterPool.end();



    // Connect to specific DB as bootstrap still
    // Create owner, migrator and user roles for each service
    // const microservices = ['admins', 'agents', 'profiles', 'accounts', 'logs', 'transactions'];
    const servicePool = await bootstrapPool(secret, 'admins_db');
    const serviceClient = await servicePool.connect();
    await serviceClient.query(initServices.createRoles('admins'));
    await serviceClient.query(initServices.createSchema('admins'));
    await serviceClient.query(initServices.alterPrivileges('admins'));

    // Connect as specific owner and create tables
    const pool = await tablePool(secret, 'admins_migrator', 'admins_password');
    const client = await pool.connect();
    await client.query();
    


    // await client.query(initSchemas.initSchemaQuery('profiles'));
    // await client.query(initSchemas.initServiceUserRoleQuery('profiles'));
    // await client.query(initSchemas.grantUserRole('profiles'));
    // await client.query(initSchemas.privilegeUserRole('profiles'));
    // await initServices.initProfilesDB(client);
    // await client.end();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
