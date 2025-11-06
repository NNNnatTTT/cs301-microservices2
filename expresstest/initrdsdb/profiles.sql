-- From database 'postgres'
CREATE DATABASE profiles_db;

-- Now connect to profilesdb
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='profiles_owner') THEN
    CREATE ROLE profiles_owner NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='profiles_user') THEN
    CREATE ROLE profiles_app LOGIN PASSWORD 'profiles_user_pw';
  END IF;
END$$;

CREATE SCHEMA IF NOT EXISTS profiles AUTHORIZATION profiles_owner;

-- keep app role scoped to the DB + schema
GRANT CONNECT ON DATABASE profiles_db TO profiles_app;
GRANT USAGE ON SCHEMA profiles TO profiles_app;

-- future objects auto-grant
ALTER DEFAULT PRIVILEGES IN SCHEMA profiles
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO profiles_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA profiles
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO profiles_app;
