// const initAgentSchemaQuery = ``;
// const initProfileSchemaQuery = `CREATE SCHEMA IF NOT EXISTS profiles;`;


async function initServiceDB(serviceName) {
    const query = `CREATE DATABASE IF NOT EXISTS ${serviceName}`;
    return query;
}

async function initSchemaQuery(serviceName) {
    const query = `CREATE SCHEMA IF NOT EXISTS ${serviceName}`;
    return query;
}

async function initServiceUserRoleQuery(serviceName) {
    const query = `
        DO$$
            BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${serviceName}_user_role') THEN
                CREATE ROLE ${serviceName}_user_role WITH LOGIN PASSWORD '${serviceName}_user_password';
            END IF;
        END$$;
    `;
    return query;
} 

async function grantUserRole(serviceName) {
    const query = `
        GRANT USAGE ON SCHEMA ${serviceName} TO ${serviceName}_user_role;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${serviceName} TO ${serviceName}_user_role;
    `;
    return query;
}

async function privilegeUserRole(serviceName) {
    const query = `
        ALTER DEFAULT PRIVILEGES IN SCHEMA ${serviceName}
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${serviceName}_user_role;
    `;
    return query;
}


export {
    initServiceUserRoleQuery, grantUserRole, privilegeUserRole, 
    initSchemaQuery,
}
