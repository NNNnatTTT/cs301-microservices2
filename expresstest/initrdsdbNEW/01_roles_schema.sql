-- 01_roles_schema.sql
-- Params (string-replaced by init.js):
-- {DB_NAME}, {SCHEMA}, {OWNER_ROLE}, {MIGRATOR_ROLE}, {USER_ROLE}

----------------------------
-- Safety: lock down PUBLIC
----------------------------
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE {DB_NAME} FROM PUBLIC;

---------------------------------
-- Create roles (idempotent)
---------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{OWNER_ROLE}') THEN
    CREATE ROLE {OWNER_ROLE} NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{MIGRATOR_ROLE}') THEN
    CREATE ROLE {MIGRATOR_ROLE} LOGIN INHERIT;
    -- Password for {MIGRATOR_ROLE} is set from init.js with ALTER ROLE ... ENCRYPTED PASSWORD
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{USER_ROLE}') THEN
    CREATE ROLE {USER_ROLE} LOGIN INHERIT;
    -- Password for {USER_ROLE} is set from init.js with ALTER ROLE ... ENCRYPTED PASSWORD
  END IF;
END$$;

-- Ensure migrator inherits owner capabilities via membership
GRANT {OWNER_ROLE} TO {MIGRATOR_ROLE};

---------------------------------
-- Database level privileges
---------------------------------
GRANT CONNECT ON DATABASE {DB_NAME} TO {MIGRATOR_ROLE}, {USER_ROLE};

---------------------------------
-- Schema creation & ownership
---------------------------------
CREATE SCHEMA IF NOT EXISTS {SCHEMA} AUTHORIZATION {OWNER_ROLE};

-- Allow basic access to the schema
GRANT USAGE ON SCHEMA {SCHEMA} TO {MIGRATOR_ROLE}, {USER_ROLE};

---------------------------------
-- Default privileges (future objects in {SCHEMA})
---------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE {OWNER_ROLE}
IN SCHEMA {SCHEMA}
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {USER_ROLE};

ALTER DEFAULT PRIVILEGES FOR ROLE {OWNER_ROLE}
IN SCHEMA {SCHEMA}
GRANT USAGE, SELECT ON SEQUENCES TO {USER_ROLE};

ALTER DEFAULT PRIVILEGES FOR ROLE {OWNER_ROLE}
IN SCHEMA {SCHEMA}
GRANT EXECUTE ON FUNCTIONS TO {USER_ROLE};
