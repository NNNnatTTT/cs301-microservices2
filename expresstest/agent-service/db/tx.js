import pool from "./pool.js";

async function isElligible({adminID, agentID}) {
  console.log({adminID, agentID});
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM agents.agent_list WHERE agent_id = $1 AND admin_id = $2
        AND deleted_at IS NULL
      ) AS eligible;
    `;

    const {rows } = await pool.query(query, [agentID, adminID]);
    return !!rows[0].eligible;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  }
}

async function createAgent({ firstName, lastName, email, adminID }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO agents.agent_list (first_name, last_name, email, role, admin_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING agent_id;
    `;

    const values = [firstName, lastName, email, "agent", adminID];
    const result = await client.query(insertQuery, values);

    const agentId = result.rows[0].agent_id;
    
    await client.query("COMMIT");
    return agentId;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
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

async function getAgentByIDByAdminID({ adminID, agentID }) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE agent_id = $1 AND admin_id = $2
      AND deleted_at IS NULL;
    `;

    const result = await client.query(selectByIDQuery, [agentID, adminID]);
    
    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

// Only returns matches in first column
async function looseGetAgentByAdminID({ adminID, firstName, lastName, email }) {
  // if (!(await isElligible(adminID, agentID))) throw new Error ('Not Elllgible');
  const client = await pool.connect();
  try {

    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE admin_id = $4
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
      adminID,
    ]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function searchAgentWithAdminID({ adminID, searchValue }) {
  const client = await pool.connect();
  try {

    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE admin_id = $2
        AND deleted_at IS NULL AND (
              (first_name ILIKE $1::text)
          OR (last_name  ILIKE $1::text)
          OR (email      ILIKE $1::citext)
        );
    `;
    //ORDER BY created_at DESC, agent_id DESC LIMIT 10;

    const { rows } = await client.query(selectByIDQuery, [
      searchValue ? `%${searchValue}%` : null,
      adminID,
    ]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function strictGetAgentByAdminID({ adminID, firstName, lastName, email }) {
  const client = await pool.connect();
  try {

    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE admin_id = $4 AND deleted_at IS NULL AND (
        ($1::text         IS NOT NULL AND first_name ILIKE $1::text)
          OR ($2::text    IS NOT NULL AND last_name ILIKE $2::text)
          OR ($3::citext  IS NOT NULL AND email = $3::citext)
          );
    `;

    const result = await client.query(selectByIDQuery, [firstName ?? null, lastName ?? null, email ?? null, adminID]);
    
    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e);
      throw e;
  } finally {
    client.release();
  }
}

// 1 page 20 clients
async function getAllAgentByAdminID({ adminID, limit, offset }) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT agent_id, first_name, last_name, email, role
      FROM agents.agent_list
      WHERE admin_id = $1 AND deleted_at IS NULL 
      ORDER BY created_at DESC, agent_id DESC
      LIMIT $2 OFFSET $3;
    `;

    const {rows} = await client.query(selectByIDQuery, [adminID, limit, offset]);

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

async function updateAgentByAdminID({ adminID, agentID, firstName, lastName, email}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ adminID, agentID});
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

    const params = [agentID, adminID, ...values];

    await client.query('BEGIN');
    const sql = `
      UPDATE agents.agent_list
      SET ${fields.join(', ')},
          updated_at = now()
      WHERE agent_id = $1
        AND admin_id = $2
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

async function hardDeleteByAdminID({adminID, agentID}) {
  if (!(await isElligible(adminID, agentID))) throw new Error ('Not Elllgible');

  const client = await pool.connect();
  try {
    const sql = `
      DELETE FROM agents.agent_list
      WHERE agent_id = $1
      AND admin_id = $2 
      AND deleted_at IS NULL
      RETURNING agent_id
    `;

    const result = await pool.query(sql, [agentID, adminID]);

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

async function softDeleteAgent({adminID, agentID, deleteReason}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ adminID, agentID, client});
    if (!ok) throw new Error('Not Elligible');
    const sql = `
      UPDATE agents.agent_list
      SET deleted_by = $2, deleted_at = now(), updated_at = now(), delete_reason = $3
      WHERE agent_id = $1
        AND admin_id = $2
        AND deleted_at IS NULL
      RETURNING agent_id, deleted_at
    `;
    await client.query('BEGIN');
    const result = await client.query(sql, [agentID, adminID, deleteReason]);

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
export { createAgent,
        getAgentByID, getAllAgent, 
        getAgentByIDByAdminID, getAllAgentByAdminID, 
        looseGetAgentByAdminID, strictGetAgentByAdminID,
        searchAgentWithAdminID,
        updateAgentByAdminID, 
        softDeleteAgent, 
        hardDeleteByAdminID
      };
