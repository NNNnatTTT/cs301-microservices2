-- CREATE DATABASE IF NOT EXISTS profileDB;
CREATE SCHEMA IF NOT EXISTS profiles;
SET search_path TO profiles, public;

-- case incencetive extension on AWS??
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
    CREATE TYPE gender_enum AS ENUM ('M', 'F');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
    CREATE TYPE status_enum AS ENUM ('Active', 'Inactive', 'Disabled');
  END IF;
END$$;

-- Profiles table
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
  agent_id           uuid                NOT NULL,
  created_at         timestamptz         NOT NULL DEFAULT now(),
  updated_at         timestamptz         NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  deleted_by         uuid,
  delete_reason      text,
  CONSTRAINT phone_format CHECK (phone_number ~ '^\+?[1-9]\d{9,14}$')
);

-- Indexes:
-- List profiles by agent (Paginated by agent_id)
CREATE        INDEX IF NOT EXISTS idx_profile_list_agent_id ON profiles.profile_list (agent_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_list_email_ci_active      ON profiles.profile_list (email)        WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_list_phone_number_active  ON profiles.profile_list (phone_number) WHERE deleted_at IS NULL;
CREATE        INDEX IF NOT EXISTS idx_profile_city_state_country       ON profiles.profile_list (country, state, city);


-- Seeding
INSERT INTO profile_list (id, first_name, last_name, date_of_birth, gender, email, phone_number, 
      address, city, state, country, postal, status, agent_id)
VALUES
  (gen_random_uuid(), 'Alicia',   'Tan',       '1995-02-14', 'F', 'alicia.tan@example.com',     '+6591234567', '23 Clementi Ave 3',     'Singapore', 
  'West Region', 'Singapore', '120402', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Benjamin', 'Lee',       '1989-11-09', 'M', 'ben.lee@example.com',         '+6587654321', '45 Bedok North Rd',    'Singapore', 
  'East Region', 'Singapore', '460045', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Cheryl',   'Lim',       '1993-07-21', 'F', 'cheryl.lim@example.com',       '+6588745623', '88 Jurong West St 42','Singapore', 
  'West Region', 'Singapore', '640088', 'Inactive', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Daniel',   'Ng',        '1990-04-15', 'M', 'daniel.ng@example.com',        '+6589123456', '12 Serangoon Ave 1',  'Singapore', 
  'North-East',  'Singapore', '550012', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Elaine',   'Goh',       '1997-12-03', 'F', 'elaine.goh@example.com',       '+6589987766', '31 Tiong Bahru Rd',   'Singapore', 
  'Central',     'Singapore', '160031', 'Inactive', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Francis',  'Tan',       '1987-09-17', 'M', 'francis.tan@example.com',      '+6588123477', '50 Hougang Ave 8',    'Singapore', 
  'North-East',  'Singapore', '530050', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Grace',    'Chong',     '1992-03-11', 'F', 'grace.chong@example.com',      '+6589456123', '18 Ang Mo Kio St 21', 'Singapore', 
  'North',       'Singapore', '560018', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Henry',    'Teo',       '1991-05-30', 'M', 'henry.teo@example.com',        '+6589012345', '27 Punggol Walk',     'Singapore', 
  'North-East',  'Singapore', '820027', 'Inactive', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Isabel',   'Loh',       '1998-10-20', 'F', 'isabel.loh@example.com',       '+6588567890', '7 Bukit Timah Rd',    'Singapore', 
  'Central',     'Singapore', '229837', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Jason',    'Koh',       '1988-01-25', 'M', 'jason.koh@example.com',        '+6588321456', '63 Pasir Ris Dr 3',   'Singapore', 
  'East',        'Singapore', '519490', 'Inactive', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Kelly',    'Wong',      '1996-09-04', 'F', 'kelly.wong@example.com',       '+6588456123', '90 Tampines Ave 5',   'Singapore', 
  'East',        'Singapore', '529276', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Leonard',  'Tan',       '1985-06-18', 'M', 'leonard.tan@example.com',      '+6588447788', '11 Yishun Ave 6',     'Singapore', 
  'North',       'Singapore', '768992', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Melissa',  'Ong',       '1999-08-12', 'F', 'melissa.ong@example.com',      '+6588776655', '44 Sengkang West Way','Singapore', 
  'North-East',  'Singapore', '797019', 'Inactive', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Nicholas', 'Chew',      '1994-05-22', 'M', 'nicholas.chew@example.com',     '+6589332211', '6 Toa Payoh Lor 7',   'Singapore', 
  'Central',     'Singapore', '310006', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Olivia',   'Sim',       '1993-11-09', 'F', 'olivia.sim@example.com',        '+6589213456', '19 Woodlands Dr 14', 'Singapore', 
  'North',       'Singapore', '739019', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Patrick',  'Yeo',       '1986-03-05', 'M', 'patrick.yeo@example.com',       '+6589765432', '75 Bishan St 22',    'Singapore', 
  'Central',     'Singapore', '570075', 'Inactive', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Queenie',  'Low',       '1991-02-27', 'F', 'queenie.low@example.com',       '+6589786543', '35 Choa Chu Kang St','Singapore', 
  'West',        'Singapore', '689352', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Ryan',     'Phua',      '1989-12-13', 'M', 'ryan.phua@example.com',         '+6589345678', '29 Bukit Batok Rd',  'Singapore', 
  'West',        'Singapore', '659029', 'Inactive', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Samantha', 'Tan',       '1997-07-02', 'F', 'samantha.tan@example.com',      '+6589456789', '8 Marine Parade Rd', 'Singapore', 
  'East',        'Singapore', '449281', 'Active',   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Thomas',   'Ng',        '1990-09-29', 'M', 'thomas.ng@example.com',         '+6589767890', '10 Orchard Blvd',    'Singapore', 
  'Central',     'Singapore', '248646', 'Active',   '11111111-1111-1111-1111-111111111111')
  -- ,
  -- (gen_random_uuid(), 'Ursula',  'Tan',   '1987-08-12', 'F', 'ursula.tan@example.com',   '+6589345123', '33 Bukit Merah Rd',   'Singapore', 'Central', 'Singapore', '159456', 'Inactive', '11111111-1111-1111-1111-111111111111',
  --   now() - interval '180 days', now() - interval '30 days', '11111111-1111-1111-1111-111111111111', 'Requested account deletion by user'),
  -- (gen_random_uuid(), 'Victor',  'Lim',   '1990-02-17', 'M', 'victor.lim@example.com',    '+6589776655', '19 Sembawang Rd',     'Singapore', 'North',   'Singapore', '758379', 'Disabled', '11111111-1111-1111-1111-111111111111',
  --   now() - interval '200 days', now() - interval '45 days', '11111111-1111-1111-1111-111111111111', 'Duplicate account detected'),
  -- (gen_random_uuid(), 'Wendy',   'Ong',   '1995-06-30', 'F', 'wendy.ong@example.com',     '+6589123987', '71 Paya Lebar Cres',  'Singapore', 'East',    'Singapore', '409034', 'Inactive', '11111111-1111-1111-1111-111111111111',
  --   now() - interval '150 days', now() - interval '20 days', '11111111-1111-1111-1111-111111111111', 'User inactive for >12 months'),
  -- (gen_random_uuid(), 'Xavier',  'Ng',    '1988-04-05', 'M', 'xavier.ng@example.com',     '+6589321456', '12 Bukit Panjang Rd', 'Singapore', 'West',    'Singapore', '679123', 'Inactive', '11111111-1111-1111-1111-111111111111',
  --   now() - interval '300 days', now() - interval '60 days', '11111111-1111-1111-1111-111111111111', 'Fraudulent activity reported'),
  -- (gen_random_uuid(), 'Yvonne',  'Chee',  '1992-10-22', 'F', 'yvonne.chee@example.com',   '+6589543210', '27 Changi South Ave', 'Singapore', 'East',    'Singapore', '486149', 'Disabled', '11111111-1111-1111-1111-111111111111',
  --   now() - interval '250 days', now() - interval '10 days', '11111111-1111-1111-1111-111111111111', 'Data retention policy cleanup')
    ;




-- CREATE SCHEMA IF NOT EXISTS agents;
-- SET search_path TO agents, public;

-- CREATE EXTENSION IF NOT EXISTS citext;
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -- admins table (minimal stub so FK works)
-- CREATE TABLE IF NOT EXISTS admins (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   email citext UNIQUE NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now()
-- );

-- CREATE TABLE IF NOT EXISTS agent_list (
--   agent_id   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
--   first_name text        NOT NULL,
--   last_name  text        NOT NULL,
--   email      citext      NOT NULL UNIQUE,
--   role       text        NOT NULL DEFAULT 'agent' CHECK (role = 'agent'),
--   admin_id   uuid        NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
--   created_at timestamptz NOT NULL DEFAULT now(),
--   updated_at timestamptz NOT NULL DEFAULT now(),
--   deleted_at timestamptz,
--   deleted_by uuid,
--   delete_reason text
-- );

-- CREATE INDEX IF NOT EXISTS idx_agent_list_admin_created_id
--   ON agent_list (admin_id, created_at DESC, agent_id DESC)
--   WHERE deleted_at IS NULL;




-- -- seed admin so FK works
-- INSERT INTO admins (id, email)
-- VALUES ('11111111-1111-1111-1111-111111111111', 'admin@example.com')
-- ON CONFLICT (email) DO NOTHING;

-- -- seed agents
-- INSERT INTO agent_list (first_name, last_name, email, admin_id)
-- VALUES
--   ('Ada', 'Lovelace', 'ada@example.com', '11111111-1111-1111-1111-111111111111'),
--   ('Grace', 'Hopper', 'grace@example.com', '11111111-1111-1111-1111-111111111111'),
--   ('test', 'ing', 'test@example.com', '11111111-1111-1111-1111-111111111111'),
--   ('Ryan', 'Tan', 'shao@en.com', '11111111-1111-1111-1111-111111111111'),
--   ('Ryanne', 'Tan', 'ryanne@en.com', '11111111-1111-1111-1111-111111111111')
--   ON CONFLICT DO NOTHING;
