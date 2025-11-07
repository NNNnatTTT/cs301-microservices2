import pool from "./pool.js";
import * as cognito from "../cognito/services/cognito.service.js";
// import * as agentQuery from "./query.js";
// import * as agentException from "../utils/exceptions.js";

async function isElligible({ adminSub, agentID }) {
  console.log({ adminSub, agentID });
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM agents.agent_list WHERE agent_id = $1 AND admin_sub = $2
        AND deleted_at IS NULL
      ) AS eligible;
    `;

    const {rows } = await pool.query(query, [agentID, adminSub]);
    return !!rows[0].eligible;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  }
}

async function createAgent({ firstName, lastName, email, adminSub }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO agents.agent_list (first_name, last_name, email, role, admin_sub)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING agent_id;
    `;
    const values = [firstName, lastName, email, "agent", adminSub];
    const result = await client.query(insertQuery, values);
    const createdID = result.rows[0].agent_id;
    
    const cognitoRes = await cognito.cognitoCreateUser({email, firstName, lastName});
    const sub = cognitoRes?.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
    const insertCogSubQuery =`
      UPDATE agents.agent_list
      SET cognito_sub = $1,
        updated_at = now()
      WHERE 
        agent_id = $2
        AND deleted_at IS NULL
      RETURNING agent_id
      ;`;
    const updateValues = [sub, createdID,]
    const updateCognitoSubResult = await client.query(insertCogSubQuery, updateValues);
    const agentID = updateCognitoSubResult.rows[0].agent_id;
    await client.query("COMMIT");
    return agentID;
  } catch (e) {
    try { 
      await client.query("ROLLBACK"); 
    } catch (rollbackError) {
      throw rollbackError;
    }
    throw e;
      // next(e)
  } finally {
    client.release();
  }
}

// NOT FOR PROD
async function getAgentByID({ agentID }) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE agent_id = $1;
    `;

    const result = await client.query(selectByIDQuery, [agentID]);
    
    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

// NOT FOR PROD
async function getAllAgent({ agentID }) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
    `;

    const result = await client.query(selectByIDQuery, [agentID]);
    
    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getAgentByIDByAdminSub({ adminSub, agentID }) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE agent_id = $1 AND admin_sub = $2
      AND deleted_at IS NULL;
    `;

    const result = await client.query(selectByIDQuery, [agentID, adminSub]);
    // if (rows.length === 0) throw new NotFoundError("Agent not found for this admin");
    // if (rows.length === 0) throw new NotFoundError(); // Will default msg in class print?

    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

// Only returns matches in first column
async function looseGetAgentByAdminSub({ adminSub, firstName, lastName, email }) {
  // if (!(await isElligible(adminSub, agentID))) throw new Error ('Not Elllgible');
  const client = await pool.connect();
  try {

    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE admin_sub = $4
        AND deleted_at IS NULL AND (
              ($1::text   IS NOT NULL AND first_name ILIKE $1::text)
          OR ($2::text    IS NOT NULL AND last_name  ILIKE $2::text)
          OR ($3::citext  IS NOT NULL AND email      =     $3::citext)
        );
    `;
    //ORDER BY created_at DESC, agent_id DESC LIMIT 10;


    const {rows} = await client.query(selectByIDQuery, [
      firstName ? `%${firstName}%` : null,
      lastName  ? `%${lastName }%` : null,
      email ?? null,
      adminSub,
    ]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function searchAgentWithAdminSub({ adminSub, searchValue }) {
  const client = await pool.connect();
  try {

    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE admin_sub = $2
        AND deleted_at IS NULL AND (
              (first_name ILIKE $1::text)
          OR (last_name  ILIKE $1::text)
          OR (email      ILIKE $1::citext)
        );
    `;
    //ORDER BY created_at DESC, agent_id DESC LIMIT 10;

    const { rows } = await client.query(selectByIDQuery, [
      searchValue ? `%${searchValue}%` : null,
      adminSub,
    ]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function strictGetAgentByAdminSub({ adminSub, firstName, lastName, email }) {
  const client = await pool.connect();
  try {

    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE admin_sub = $4 AND deleted_at IS NULL AND (
        ($1::text         IS NOT NULL AND first_name ILIKE $1::text)
          OR ($2::text    IS NOT NULL AND last_name ILIKE $2::text)
          OR ($3::citext  IS NOT NULL AND email = $3::citext)
          );
    `;

    const result = await client.query(selectByIDQuery, [firstName ?? null, lastName ?? null, email ?? null, adminSub]);
    
    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e);
      throw e;
  } finally {
    client.release();
  }
}

// 1 page 20 clients
async function getAllAgentByAdminSub({ adminSub, limit, offset }) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE admin_sub = $1 AND deleted_at IS NULL 
      ORDER BY created_at DESC, agent_id DESC
      LIMIT $2 OFFSET $3;
    `;

    const {rows} = await client.query(selectByIDQuery, [adminSub, limit, offset]);

    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

function logQuery(sql, params) {
  const numPlaceholders = (sql.match(/\$\d+/g) || []).length;
  console.log({ numPlaceholders, paramsLength: params.length, params, preview: sql.slice(0, 120) });
}

async function updateAgentByAdminSub({ adminSub, agentID, firstName, lastName, email}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ adminSub, agentID});
    if (!ok) throw new Error('Not Elligible');
    
    const fields = [];
    const values = [];
    let i = 2;

    const push = (sqlFragment, value) => {
      fields.push(`${sqlFragment} $${++i}`);
      values.push(value);
    };

    if (firstName !== undefined) push('first_name =', firstName);
    if (lastName  !== undefined) push('last_name =',  lastName);
    if (email     !== undefined) push('email =',      email);

    if (fields.length === 0) {
      // nothing to update
      await client.query('ROLLBACK');
      return null;
    } 

    const params = [agentID, adminSub, ...values];

    await client.query('BEGIN');
    const sql = `
      UPDATE agents.agent_list
      SET ${fields.join(', ')},
          updated_at = now()
      WHERE agent_id = $1
        AND admin_sub = $2
        AND deleted_at IS NULL
      RETURNING agent_id, first_name, last_name, email, role, created_at, updated_at;
    `;
    logQuery(sql, params);
    const result = await client.query(sql, params);
    if (result.rowCount === 0) {
      throw new Error('No rows affected');
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

async function hardDeleteByAdminSub({adminSub, agentID}) {
  if (!(await isElligible(adminSub, agentID))) throw new Error ('Not Elllgible');

  const client = await pool.connect();
  try {
    const sql = `
      DELETE FROM agents.agent_list
      WHERE agent_id = $1
      AND admin_sub = $2 
      AND deleted_at IS NULL
      RETURNING agent_id
    `;

    const result = await pool.query(sql, [agentID, adminSub]);

    if (result.rowCount === 0) {
      // Either dont exist, or admin dont own it
      throw new Error('Delete failed: not found or not authorized');
    }
  return result.rows[0].agent_id;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
      throw e;
  } finally {
    client.release();
  }
}

async function softDeleteAgent({adminSub, agentID, deleteReason}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ adminSub, agentID });
    if (!ok) throw new Error('Not Elligible');
    const sql = `
      UPDATE agents.agent_list
      SET deleted_by = $2, deleted_at = now(), updated_at = now(), delete_reason = $3
      WHERE agent_id = $1
        AND admin_sub = $2
        AND deleted_at IS NULL
      RETURNING agent_id, email, deleted_at
    `;
    await client.query('BEGIN');
    const softDeleteResult = await client.query(sql, [agentID, adminSub, deleteReason]);
    const result = [softDeleteResult.rows[0].agent_id, softDeleteResult.rows[0].deleted_at];
    if (softDeleteResult.rowCount === 0) {
      throw new Error('Soft delete failed, not found ');
    }

    // Idk if this will work, according to documentation this is in the metadata but idk
    // if can just check like this
    const cognitoRes = await cognito.cognitoDisableUser(softDeleteResult.rows[0].email);
    if (cognitoRes.httpStatusCode !== '200') {
      throw new Error('Failed to disable login')
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
export { createAgent,
        getAgentByID, getAllAgent, 
        getAgentByIDByAdminSub, getAllAgentByAdminSub, 
        looseGetAgentByAdminSub, strictGetAgentByAdminSub,
        searchAgentWithAdminSub,
        updateAgentByAdminSub, 
        softDeleteAgent, 
        hardDeleteByAdminSub
      };
