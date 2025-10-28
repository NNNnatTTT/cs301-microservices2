import pool from "./pool.js";

async function isEligible(id, agentID, client) {
  console.log(agentID, id);
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM accounts.account_list WHERE id = $1 AND agent_id = $2
        AND deleted_at IS NULL
      ) AS eligible;
    `;

    const {rows } = await client.query(query, [id, agentID]);
    return !!rows[0].eligible;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  }
}

async function isEligibleClientID(clientID, agentID, client) {
  console.log(agentID, clientID);
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM accounts.account_list WHERE client_id = $1 AND agent_id = $2
        AND deleted_at IS NULL
      ) AS eligible;
    `;

    const {rows } = await client.query(query, [clientID, agentID]);
    return !!rows[0].eligible;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  }
}

// NOT FOR PROD
async function createAccount({clientID, accountType, openingDate, initialDeposit, currency, branchID, agentID}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO accounts.account_list (client_id, account_type, opening_date, initial_deposit, currency, branch_id, agent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;

    const values = [clientID, accountType, openingDate, initialDeposit, currency, branchID, agentID];
    const result = await client.query(insertQuery, values);

    const accountID = result.rows[0].id;
    
    await client.query("COMMIT");
    return accountID;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
      throw e;
  } finally {
    client.release();
  }
}

// async function draftAccount({clientID, accountType, openingDate, initialDeposit, currency, branchID}) {
//   const client = await pool.connect();
//   try {
    
//     const fields = ['client_id', 'account_type', 'branch_id'];
//     const placeHolder = ['$1', '$2', '$3'];
//     const values = [clientID, accountType, branchID];
//     let i = 3;

//     const push = (column, value) => {
//       fields.push(`${column}`);
//       values.push(value)
//       placeHolder.push(`, $${++i}`);
//     };

//     if (openingDate !== undefined) push('opening_date', openingDate);
//     if (initialDeposit  !== undefined) push('initial_deposit',  initialDeposit);
//     if (currency  !== undefined) push('currency',  currency);

//     const insertQuery = `
//       INSERT INTO accounts.account_list (${fields.join(', ')})
//       VALUES (${placeHolder.join(', ')})
//       RETURNING id;
//     `;

//     // const values = [clientID, accountType, branchID, ...values];

//     await client.query('BEGIN');
//     const result = await client.query(insertQuery, values);
//     await client.query("COMMIT");

//     return result.rows[0].id;
//   } catch (e) {
//     try { await client.query("ROLLBACK"); } catch {}
//       throw e;
//   } finally {
//     client.release();
//   }
// }

// NOT FOR PROD
async function getAccountByIDDev({ id }) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
      FROM accounts.account_list
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
async function getAllAccountsDev({ id }) {
  const client = await pool.connect();
  try {
    const selectByIDQuery = `
      SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
      FROM accounts.account_list
    `;

    const {rows} = await client.query(selectByIDQuery);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getAccountByID({id, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isEligible(id, agentID, client);
    if (!ok) throw new Error("Not Elligible");

    const getAccountByIDClientID = `
      SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
      FROM accounts.account_list
      WHERE id = $1
      AND deleted_at IS NULL;
    `;

    const result = await client.query(getAccountByIDClientID, [id]);
    
    return result.rows[0] || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getAccountPagesByAgentID({limit, offset, agentID}) {
  const client = await pool.connect();
  try {
    const getAccountPagesByClientIDQuery = `
      SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
      FROM accounts.account_list
      WHERE agent_id = $1 AND deleted_at IS NULL
      ORDER BY opening_date DESC, created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const {rows} = await client.query(getAccountPagesByClientIDQuery, [agentID, limit, offset]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getAccountPagesByClientID({clientID, limit, offset, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isEligibleClientID(clientID, agentID, client);
    if (!ok) throw new Error("Not Elligible");

    const getAccountPagesByClientIDQuery = `
      SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
      FROM accounts.account_list
      WHERE client_id = $1 AND deleted_at IS NULL
      ORDER BY opening_date DESC, created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const {rows} = await client.query(getAccountPagesByClientIDQuery, [clientID, limit, offset]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getAccountPagesByBranchID({branchID, agentID, limit, offset}) {
  const client = await pool.connect();
  try {
    const getAccountPagesBranchIDQuery = `
      SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
      FROM accounts.account_list
      WHERE branch_id = $1 AND agent_id = $2
      AND deleted_at IS NULL
      ORDER BY opening_date DESC, created_at DESC
      LIMIT $3 OFFSET $4;
    `;

    const {rows} = await client.query(getAccountPagesBranchIDQuery, [branchID, agentID, limit, offset]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

// async function searchAccount ({agentID, searchValue, limit, offset}) {
//   const client = await pool.connect();
//   try {
//     console.log(searchValue);
//     // No DOB, gender or status
//     const searchQuery = `
//       SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
//       FROM accounts.account_list
//       WHERE agent_id = $2
//         AND deleted_at IS NULL AND (
//               (first_name       ILIKE $1::text)
//           OR (last_name         ILIKE $1::text)
//           OR (email             ILIKE $1::citext)
//           OR translate(phone_number, ' -', '') ILIKE '%' || translate($1::text, ' -', '') || '%'
//           OR (address           ILIKE $1::text)
//           OR (city              ILIKE $1::text)
//           OR (state             ILIKE $1::text)
//           OR (country           ILIKE $1::text)
//           OR (postal            ILIKE $1::text)
//         )
//       ORDER BY created_at DESC, agent_id DESC
//       LIMIT $3 OFFSET $4;
//     `;
//     // ORDER BY created_at DESC, agent_id DESC LIMIT 10;


//     const { rows } = await client.query(searchQuery, [
//       searchValue ? `%${searchValue}%` : null,
//       agentID, limit, offset
//     ]);
//     console.log(rows);
//     return rows || null;
//   } catch (e) {
//     console.error('Error reading agent: ', e)
//       throw e;
//   } finally {
//     client.release();
//   }
// }



async function updateAccount({ id, accountType, accountStatus, openingDate, initialDeposit, currency, branchID, newAgentID, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isEligible(id, agentID, client);
    if (!ok) throw new Error('Not Elligible');
    
    const fields = [];
    const values = [];
    let i = 2;

    const push = (sqlFragment, value) => {
      fields.push(`${sqlFragment} $${++i}`);
      values.push(value);
    };

    if (accountType !== undefined) push('account_type =', accountType);
    if (accountStatus  !== undefined) push('account_status =',  accountStatus);
    if (openingDate  !== undefined) push('opening_date =',  openingDate);
    if (initialDeposit  !== undefined) push('initial_deposit =',  initialDeposit);
    if (currency     !== undefined) push('currency =',      currency);
    if (branchID  !== undefined) push('branch_id =',  branchID);
    if (newAgentID  !== undefined) push('agent_id =',  newAgentID);

    if (fields.length === 0) {
      // nothing to update
      // await client.query('ROLLBACK');
      return null;
    } 

    const params = [id, agentID, ...values];

    await client.query('BEGIN');
    const sql = `
      UPDATE accounts.account_list
      SET ${fields.join(', ')},
          updated_at = now()
      WHERE id = $1
        AND agent_id = $2
        AND deleted_at IS NULL
      RETURNING id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id;
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

async function verifyAccount({id, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isEligible(id, agentID, client);
    if (!ok) throw new Error('Not Elligible');

    const params = [id, agentID];

    await client.query('BEGIN');
    const sql = `
      UPDATE accounts.account_list
      SET account_status = 'Active',
          updated_at = now()
      WHERE id = $1
        AND agent_id = $2
        AND account_status = 'Inactive'
        AND deleted_at IS NULL
      RETURNING id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id;
    `;

    const result = await client.query(sql, params);
    if (result.rowCount === 0) {
      throw new Error('No rows affected');
    }
    await client.query("COMMIT");
    console.log('rowCount:', result.rowCount, 'rows:', result.rows);
    return result.rows[0] || null;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
      throw e;
  } finally {
    client.release();
  }
}

async function softDeleteAccount({id, deleteReason, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isEligible( id, agentID, client);
    if (!ok) throw new Error('Not Elligible');
    const sql = `
      UPDATE accounts.account_list
      SET deleted_by = $2, deleted_at = now(), updated_at = now(), delete_reason = $3
      WHERE id = $1
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

async function hardDeleteAccount({id, agentID}) {
  const client = await pool.connect();
  try {
    const ok = await isEligible( id, agentID, client);
    if (!ok) throw new Error('Not Elligible');
    const sql = `
      DELETE FROM accounts.account_list
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
    `;
    await client.query('BEGIN');
    const result = await client.query(sql, [id, agentID, deleteReason]);

    if (result.rowCount === 0) {
      throw new Error('Delete failed, not found');
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
export { createAccount,
        getAccountByIDDev, getAllAccountsDev, 
        getAccountByID,
        getAccountPagesByClientID, getAccountPagesByBranchID, getAccountPagesByAgentID,
        // searchAccount,
        updateAccount, verifyAccount, 
        softDeleteAccount, 
      };
