async function createRolesOLD(serviceName) {
    const query = `
        DO $$
            BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${serviceName}_owner') THEN
                CREATE ROLE ${serviceName}_owner NOLOGIN;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${serviceName}_migrator') THEN
                CREATE ROLE ${serviceName}_migrator LOGIN PASSWORD '${serviceName}_password';
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${serviceName}_user') THEN
                CREATE ROLE ${serviceName}_user LOGIN PASSWORD '${serviceName}_password';
            END IF;

            GRANT ${serviceName}_owner TO ${serviceName}_migrator;
            ALTER ROLE ${serviceName}_migrator INHERIT;
        END$$;
    `;

    return query;
}

async function createRoles(_serviceName) {
    const query = `
        DO $$
            BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'user') THEN
                CREATE ROLE user LOGIN PASSWORD 'user_password';
            END IF;
        END$$;
    `;

    return query;
}

async function createSchema(serviceName) {
    const query = `
        CREATE SCHEMA IF NOT EXISTS ${serviceName} AUTHORIZATION ${serviceName}_owner;
    `;
    return query;
}

async function alterPrivileges(serviceName) {
    const query = `
        
        ALTER ROLE ${serviceName}_user IN DATABASE ${serviceName}_db
            SET search_path = ${serviceName};
        GRANT CONNECT ON DATABASE ${serviceName}_db TO ${serviceName}_user;
        GRANT USAGE ON SCHEMA ${serviceName} TO ${serviceName}_user;

        ALTER DEFAULT PRIVILEGES FOR ROLE ${serviceName}_owner IN SCHEMA ${serviceName}
            GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${serviceName}_user;
        ALTER DEFAULT PRIVILEGES FOR ROLE ${serviceName}_owner IN SCHEMA ${serviceName}
            GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${serviceName}_user;
        ALTER DEFAULT PRIVILEGES FOR ROLE "${serviceName}_owner" IN SCHEMA "${serviceName}"
            GRANT EXECUTE ON FUNCTIONS               TO "${serviceName}_user";
        
    `;

    return query;
}

async function createExtensions() {

}

async function createTable() {

}

async function createIndexes() {

}

export {
    createRoles,
    createSchema,
    alterPrivileges,
}