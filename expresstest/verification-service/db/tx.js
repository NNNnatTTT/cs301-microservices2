import pool from "./pool.js";

async function isElligible({agentID, id}) {
  console.log(agentID, id);
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM requests.request_list WHERE id = $1 AND agent_id = $2
        AND deleted_at IS NULL
      ) AS eligible;
    `;

    const {rows } = await pool.query(query, [id, agentID]);
    return !!rows[0].eligible;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  }
}

async function createRequest({entity_id, supportingDocs, agentID}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO requests.request_list (entity_id, supportingDocs, submitted_by)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;

    const values = [entity_id, supportingDocs, agentID];
    const result = await client.query(insertQuery, values);

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
    const selectByIDQuery = `
      SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
      address, city, state, country, postal, status, agent_id
      FROM profiles.profile_list
      WHERE id = $1;
    `;

    const result = await client.query(selectByIDQuery, [id]);
    
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
    const selectByIDQuery = `
      SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
      address, city, state, country, postal, status, agent_id
      FROM profiles.profile_list
    `;

    const {rows} = await client.query(selectByIDQuery, [id]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getRequestByIDagentID({id, agentID}) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT id, entity_id, supporting_docs, subnmitted_at, submitted_by, verified_at, verified_by, rejected_at, rejected_by, reject_reason
      FROM reqeusts.request_list
      WHERE id = $1 AND submitted_by = $2;
    `;

    const result = await client.query(selectByIDQuery, [id, agentID]);
    
    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getRequestPagesByAgentID({agentID, limit, offset}) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT id, entity_id, supporting_docs, subnmitted_at, submitted_by, verified_at, verified_by, rejected_at, rejected_by, reject_reason
      FROM reqeusts.request_list
      WHERE submitted_by = $1
      ORDER BY created_at DESC, agent_id DESC
      LIMIT $2 OFFSET $3;
    `;

    const {rows} = await client.query(selectByIDQuery, [agentID, limit, offset]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}


async function searchProfile ({agentID, searchValue, limit, offset}) {
  const client = await pool.connect();
  try {
    console.log(searchValue);
    // No DOB, gender or status
    const searchQuery = `
      SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
      address, city, state, country, postal, status, agent_id
      FROM profiles.profile_list
      WHERE agent_id = $2
        AND deleted_at IS NULL AND (
              (first_name       ILIKE $1::text)
          OR (last_name         ILIKE $1::text)
          OR (email             ILIKE $1::citext)
          OR translate(phone_number, ' -', '') ILIKE '%' || translate($1::text, ' -', '') || '%'
          OR (address           ILIKE $1::text)
          OR (city              ILIKE $1::text)
          OR (state             ILIKE $1::text)
          OR (country           ILIKE $1::text)
          OR (postal            ILIKE $1::text)
        )
      ORDER BY created_at DESC, agent_id DESC
      LIMIT $3 OFFSET $4;
    `;
    // ORDER BY created_at DESC, agent_id DESC LIMIT 10;


    const { rows } = await client.query(searchQuery, [
      searchValue ? `%${searchValue}%` : null,
      agentID, limit, offset
    ]);
    console.log(rows);
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function verifyRequest({id, supportingDocs, verifiedAt, verifiedBy, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ agentID, id});
    if (!ok) throw new Error('Not Elligible');
    
    const fields = [];
    const values = [];
    let i = 2;

    const push = (sqlFragment, value) => {
      fields.push(`${sqlFragment} $${++i}`);
      values.push(value);
    };

    if (supportingDocs  !== undefined) push('last_Name =',  supportingDocs);
    if (verifiedAt     !== undefined) push('email =',      verifiedAt);
    if (verifiedBy  !== undefined) push('phone_number =',  verifiedBy);

    if (fields.length === 0) {
      // nothing to update
      // await client.query('ROLLBACK');
      return null;
    } 

    const params = [id, agentID, ...values];

    await client.query('BEGIN');
    const sql = `
      UPDATE profiles.profile_list
      SET ${fields.join(', ')},
          updated_at = now()
      WHERE id = $1
        AND submitted_by = $2
      RETURNING id, entity_id, supporting_docs, subnmitted_at, submitted_by, verified_at, verified_by, rejected_at, rejected_by, reject_reason;
    `;

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

async function rejectRequest({id, supportingDocs, rejectedAt, rejectedBy, rejectReason, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ agentID, id});
    if (!ok) throw new Error('Not Elligible');
    
    const fields = [];
    const values = [];
    let i = 2;

    const push = (sqlFragment, value) => {
      fields.push(`${sqlFragment} $${++i}`);
      values.push(value);
    };

    if (supportingDocs  !== undefined) push('last_Name =',  supportingDocs);
    if (rejectedAt  !== undefined) push('address =',  rejectedAt);
    if (rejectedBy  !== undefined) push('city =',  rejectedBy);
    if (rejectReason  !== undefined) push('state =',  rejectReason);

    if (fields.length === 0) {
      // nothing to update
      // await client.query('ROLLBACK');
      return null;
    } 

    const params = [id, agentID, ...values];

    await client.query('BEGIN');
    const sql = `
      UPDATE requests.request_list
      SET ${fields.join(', ')},
          updated_at = now()
      WHERE id = $1
        AND submitted_by = $2
      RETURNING id, entity_id, supporting_docs, subnmitted_at, submitted_by, verified_at, verified_by, rejected_at, rejected_by, reject_reason;
    `;

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

async function updateRequest({ id, entityID, supportingDocs, subnmittedAt, submittedBy, verifiedAt, verifiedBy, rejectedAt, rejectedBy, rejectReason, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ agentID, id});
    if (!ok) throw new Error('Not Elligible');
    
    const fields = [];
    const values = [];
    let i = 2;

    const push = (sqlFragment, value) => {
      fields.push(`${sqlFragment} $${++i}`);
      values.push(value);
    };

    if (entityID !== undefined) push('first_name =', entityID);
    if (supportingDocs  !== undefined) push('last_Name =',  supportingDocs);
    if (subnmittedAt  !== undefined) push('date_of_birth =',  subnmittedAt);
    if (submittedBy  !== undefined) push('gender =',  submittedBy);
    if (verifiedAt     !== undefined) push('email =',      verifiedAt);
    if (verifiedBy  !== undefined) push('phone_number =',  verifiedBy);
    if (rejectedAt  !== undefined) push('address =',  rejectedAt);
    if (rejectedBy  !== undefined) push('city =',  rejectedBy);
    if (rejectReason  !== undefined) push('state =',  rejectReason);

    if (fields.length === 0) {
      // nothing to update
      // await client.query('ROLLBACK');
      return null;
    } 

    const params = [id, agentID, ...values];

    await client.query('BEGIN');
    const sql = `
      UPDATE profiles.profile_list
      SET ${fields.join(', ')},
          updated_at = now()
      WHERE id = $1
        AND submitted_by = $2
      RETURNING id, entity_id, supporting_docs, subnmitted_at, submitted_by, verified_at, verified_by, rejected_at, rejected_by, reject_reason;
    `;

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

async function verifyProfile ({id, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ id, agentID, client});
    if (!ok) throw new Error('Not Elligible');

    const verifySQL = `
      UPDATE profiles.profile_list
      SET profile_status = 'Active'
      WHERE id = $1
        AND agent_id = $2
        AND deleted_at IS NULL
      RETURNING id
    `;
    await client.query('BEGIN')
    const result = client.query(verifySQL, [id, agentID]);
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

async function softDeleteProfile({id, agentID, deleteReason}) {
  const client = await pool.connect();
  try {
    const ok = await isElligible({ id, agentID, client});
    if (!ok) throw new Error('Not Elligible');
    const sql = `
      UPDATE profiles.profile_list
      SET deleted_by = $2, deleted_at = now(), updated_at = now(), delete_reason = $3
      WHERE id = $1
        AND agent_id = $2
        AND deleted_at IS NULL
      RETURNING id, deleted_at
    `;
    await client.query('BEGIN');
    const result = await client.query(sql, [id, agentID, deleteReason]);

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
// export { createProfile,
//         getProfileByID, getAllProfiles, 
//         getProfileByIDagentID, getProfilePagesByAgentID,
//         searchProfile,
//         updateProfile, verifyProfile,
//         softDeleteProfile, 
//       };

export { createRequest,
        // getProfileByID, getAllProfiles, 
        getRequestByIDagentID, getRequestPagesByAgentID,
        updateRequest, verifyRequest, rejectRequest, 
      };

