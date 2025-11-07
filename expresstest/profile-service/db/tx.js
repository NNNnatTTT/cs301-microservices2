// import pool from "./pool.js";
import { dbPool } from "./pool.js";
import * as profileQuery from "./query.js";
import * as profileException from "../utils/exceptions.js";

const pool = dbPool;

async function isElligible({agentSUB, id}) {
  console.log(agentSUB, id);
  try {
    // const profileQuery.isEligiblequery = `
    //   SELECT EXISTS (
    //     SELECT 1 FROM profiles.profile_list WHERE id = $1 AND agent_id = $2
    //     AND deleted_at IS NULL
    //   ) AS eligible;
    // `;

    const {rows } = await pool.query(profileQuery.isEligiblequery, [id, agentSUB]);
    if (rows.length === 0) throw new profileException.NotFoundError();
    return !!rows[0].eligible;
  } catch (e) {
    console.error('Error reading agent: ', e)
      // throw e;
      throw new profileException.ForbiddenError();
  }
}

async function createProfile({firstName, lastName, dateOfBirth, gender, email, phoneNumber, 
      address, city, state, country, postal, status, agentSUB }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // const insertProfileQuery = `
    //   INSERT INTO profiles.profile_list (first_name, last_name, date_of_birth, gender, email, phone_number, 
    //   address, city, state, country, postal, status, agent_id)
    //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    //   RETURNING id;
    // `;

    const values = [firstName, lastName, dateOfBirth, gender, email, phoneNumber, 
                    address, city, state, country, postal, status, agentSUB ];
    const result = await client.query(profileQuery.insertProfileQuery, values);

    const profileID = result.rows[0].id;
    
    await client.query("COMMIT");
    return profileID;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
      throw e;
  } finally {
    client.release();
  }
}

// NOT FOR PROD
async function getProfileByID({ id }) {
  const client = await pool.connect();
  try {
    // const selectByIDQuery = `
    //   SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    //   address, city, state, country, postal, status, agent_id
    //   FROM profiles.profile_list
    //   WHERE id = $1;
    // `;

    const result = await client.query(profileQuery.devSelectByIDQuery, [id]);
    if (result.rowCount === 0) {
      throw new profileException.NotFoundError();
    }
    
    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}
// NOT FOR PROD
async function getAllProfiles({ id }) {
  const client = await pool.connect();
  try {
    // const selectByIDQuery = `
    //   SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    //   address, city, state, country, postal, status, agent_id
    //   FROM profiles.profile_list
    // `;

    const {rows} = await client.query(profileQuery.devSelectAllQuery, [id]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getProfileByIDagentSUB({id, agentSUB}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ agentSUB, id});
    if (!ok) throw new profileException.ForbiddenError();
    // const selectByIDQuery = `
    //   SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    //   address, city, state, country, postal, status, agent_id
    //   FROM profiles.profile_list
    //   WHERE id = $1 AND agent_id = $2;
    // `;

    const result = await client.query(profileQuery.selectByIDagentSUBQuery, [id, agentSUB]);
    
    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getProfilePagesByagentSUB({agentSUB, limit, offset}) {
  const client = await pool.connect();
  try {
    // const selectByIDQuery = `
    //   SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    //   address, city, state, country, postal, status, agent_id
    //   FROM profiles.profile_list
    //   WHERE agent_id = $1 AND deleted_at IS NULL
    //   ORDER BY created_at DESC, agent_id DESC
    //   LIMIT $2 OFFSET $3;
    // `;

    const {rows} = await client.query(profileQuery.pageByagentSUBQuery, [agentSUB, limit, offset]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}


async function searchProfile ({agentSUB, searchValue, limit, offset}) {
  const client = await pool.connect();
  try {
    console.log(searchValue);
    // No DOB, gender or status
    // const searchQuery = `
    //   SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    //   address, city, state, country, postal, status, agent_id
    //   FROM profiles.profile_list
    //   WHERE agent_id = $2
    //     AND deleted_at IS NULL AND (
    //           (first_name       ILIKE $1::text)
    //       OR (last_name         ILIKE $1::text)
    //       OR (email             ILIKE $1::citext)
    //       OR translate(phone_number, ' -', '') ILIKE '%' || translate($1::text, ' -', '') || '%'
    //       OR (address           ILIKE $1::text)
    //       OR (city              ILIKE $1::text)
    //       OR (state             ILIKE $1::text)
    //       OR (country           ILIKE $1::text)
    //       OR (postal            ILIKE $1::text)
    //     )
    //   ORDER BY created_at DESC, agent_id DESC
    //   LIMIT $3 OFFSET $4;
    // `;
    // // ORDER BY created_at DESC, agent_id DESC LIMIT 10;


    const { rows } = await client.query(profileQuery.searchQuery, [
      searchValue ? `%${searchValue}%` : null,
      agentSUB, limit, offset
    ]);
    if (rows.length === 0) {
      throw new profileException.NotFoundError();
    }
    console.log(rows);
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function updateProfile({ id, firstName, lastName, dateOfBirth, gender, email, phoneNumber, 
      address, city, state, country, postal, status, newAgentID, agentSUB}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ agentSUB, id});
    if (!ok) throw new profileException.ForbiddenError();
    
    const fields = [];
    const values = [];
    let i = 2;

    const push = (sqlFragment, value) => {
      fields.push(`${sqlFragment} $${++i}`);
      values.push(value);
    };

    if (firstName !== undefined) push('first_name =', firstName);
    if (lastName  !== undefined) push('last_Name =',  lastName);
    if (dateOfBirth  !== undefined) push('date_of_birth =',  dateOfBirth);
    if (gender  !== undefined) push('gender =',  gender);
    if (email     !== undefined) push('email =',      email);
    if (phoneNumber  !== undefined) push('phone_number =',  phoneNumber);
    if (address  !== undefined) push('address =',  address);
    if (city  !== undefined) push('city =',  city);
    if (state  !== undefined) push('state =',  state);
    if (country  !== undefined) push('country =',  country);
    if (postal  !== undefined) push('postal =',  postal);
    if (status  !== undefined) push('status =',  status);
    if (newAgentID  !== undefined) push('agent_id =',  newAgentID);

    if (fields.length === 0) {
      // nothing to update
      // await client.query('ROLLBACK');
      return null;
    } 

    const params = [id, agentSUB, ...values];

    await client.query('BEGIN');
    // const sql = `
    //   UPDATE profiles.profile_list
    //   SET ${fields.join(', ')},
    //       updated_at = now()
    //   WHERE id = $1
    //     AND agent_id = $2
    //     AND deleted_at IS NULL
    //   RETURNING id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    //   address, city, state, country, postal, status, agent_id, updated_at;
    // `;

    const result = await client.query(await profileQuery.dynamicUpdate(fields), params);
    if (result.rowCount === 0) {
      throw new profileException.NoAffectedRowError();
    }
    await client.query("COMMIT");
    return result.rows[0] || null;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
      throw e;
  } finally {
    client.release();
  }
}

async function verifyProfile ({id, agentSUB}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ id, agentSUB, client});
    if (!ok) throw new Error('Not Elligible');

    // const verifySQL = `
    //   UPDATE profiles.profile_list
    //   SET profile_status = 'Active'
    //   WHERE id = $1
    //     AND agent_id = $2
    //     AND deleted_at IS NULL
    //   RETURNING id
    // `;
    await client.query('BEGIN')
    const result = await client.query(profileQuery.verifyProfileQuery, [id, agentSUB]);
    if (result.rowCount === 0) {
      throw new Error('No rows affected');
    }
    await client.query('COMMIT')
    return result.rows[0] || null;
  } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
  } finally {
    client.release();
  }
}

async function softDeleteProfile({id, agentSUB, deleteReason}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ id, agentSUB, client});
    if (!ok) throw new Error('Not Elligible');
    // const sql = `
    //   UPDATE profiles.profile_list
    //   SET deleted_by = $2, deleted_at = now(), updated_at = now(), delete_reason = $3
    //   WHERE id = $1
    //     AND agent_id = $2
    //     AND deleted_at IS NULL
    //   RETURNING id, deleted_at
    // `;
    await client.query('BEGIN');
    const result = await client.query(profileQuery.softDeleteQuery, [id, agentSUB, deleteReason]);

    if (result.rowCount === 0) {
      throw new Error('Soft delete failed, not found ');
    }
    await client.query("COMMIT");
    return result.rows[0];
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
      throw e;
  } finally {
    client.release();
  }
}




// CommonJS: module.exports = {}
// ESM: export {}
export { createProfile,
        getProfileByID, getAllProfiles, 
        getProfileByIDagentSUB, getProfilePagesByagentSUB,
        searchProfile,
        updateProfile, verifyProfile,
        softDeleteProfile, 
      };
