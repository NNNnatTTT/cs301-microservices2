import pool from "./pool.js";

async function isElligible({clientID}) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM transaction.transactions_list WHERE client_id = $1
      ) AS eligible;
    `;

    const {rows } = await client.query(query, [clientID]);
    return !!rows[0].eligible;
  } catch (e) {
    console.error('Error reading transaction: ', e)
      throw e;
  }
}

async function createTransaction({ id, batchID, clientID, transaction, amount, status }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO transactions.transaction_list (id, batch_id, client_id, transaction, amount, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;

    const values = [id, batchID, clientID, transaction, amount, status];
    const result = await client.query(insertQuery, values);

    const agentId = result.rows[0].id;
    
    await client.query("COMMIT");
    return agentId;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
      throw e;
  } finally {
    client.release();
  }
}

// getters
async function getTransactionByTID({ id, clientID }) {
  const client = await pool.connect();
  try {
    if (!(await isElligible(clientID))) throw new Error ('Not Elligible') ;
    const selectByIDQuery = `
      SELECT id, batch_id, client_id, transaction, amount, date, status
      FROM transactions.transaction_list
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

// Technically only for admins
async function getTransactionsByBID({ batchID, limit, offset }) {
  const client = await pool.connect();
  try {
    const selectByTIDQuery = `
      SELECT id, batch_id, client_id, transaction, amount, date, status
      FROM transactions.transaction_list
      WHERE batch_id = $1
      ORDER BY date DESC
      LIMIT $2 OFFSET $3;
    `;

    const {rows} = await client.query(selectByTIDQuery, [batchID, limit, offset]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getTransactionsByClientID({ clientID, limit, offset }) {
  const client = await pool.connect();
  try {
    const selectByClientIDQuery = `
      SELECT id, batch_id, client_id, transaction, amount, date, status
      FROM transactions.transaction_list
      WHERE client_id = $1
      ORDER BY date DESC
      LIMIT $2 OFFSET $3;
    `;

    const {rows} = await client.query(selectByClientIDQuery, [clientID, limit, offset]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

async function getTransactionsByClientIDFilterType({ clientID, transaction, limit, offset }) {
  const client = await pool.connect();
  try {
    const selectByClientIDQuery = `
      SELECT id, batch_id, client_id, transaction, amount, date, status
      FROM transactions.transaction_list
      WHERE client_id = $1 AND transaction = $2
      ORDER BY date DESC
      LIMIT $3 OFFSET $4;
    `;

    const {rows} = await client.query(selectByClientIDQuery, [clientID, transaction, limit, offset]);
    
    return rows || null;
  } catch (e) {
    console.error('Error reading agent: ', e)
      throw e;
  } finally {
    client.release();
  }
}

// 1 page 20 clients
// async function getAllAgentByAdminID({ adminID, limit, offset }) {
//   const client = await pool.connect();
//   try {
//     const selectByIDQuery = `
//       SELECT agent_id, first_name, last_name, email, role
//       FROM agents.agent_list
//       WHERE admin_id = $1 AND deleted_at IS NULL 
//       ORDER BY created_at DESC, agent_id DESC
//       LIMIT $2 OFFSET $3;
//     `;

//     const {rows} = await client.query(selectByIDQuery, [adminID, limit, offset]);

//     return rows || null;
//   } catch (e) {
//     console.error('Error reading agent: ', e)
//       throw e;
//   } finally {
//     client.release();
//   }
// }

function logQuery(sql, params) {
  const numPlaceholders = (sql.match(/\$\d+/g) || []).length;
  console.log({ numPlaceholders, paramsLength: params.length, params, preview: sql.slice(0, 120) });
}

// CommonJS: module.exports = {}
// ESM: export {}
export { createTransaction,
          getTransactionByTID,
          getTransactionsByBID,
          getTransactionsByClientID,
          getTransactionsByClientIDFilterType
      };
