const isEligibleQuery = `
      SELECT EXISTS (
        SELECT 1 FROM accounts.account_list WHERE id = $1 AND agent_id = $2
        AND deleted_at IS NULL
      ) AS eligible;
    `;

const isEligibleClientIDQuery = `
      SELECT EXISTS (
        SELECT 1 FROM accounts.account_list WHERE client_id = $1 AND agent_id = $2
        AND deleted_at IS NULL
      ) AS eligible;
    `;

const defaultCreateAccount = `
      INSERT INTO accounts.account_list (client_id, account_type, opening_date, initial_deposit, currency, branch_id, agent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;

const devSelectByIDQuery = `
      SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
      FROM accounts.account_list
      WHERE id = $1;
    `;

const devSelectAllQuery = `
    SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
    FROM accounts.account_list
`;

const getAccountByIDQuery = `
    SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
    FROM accounts.account_list
    WHERE 
        id = $1
        AND deleted_at IS NULL;
`;

const pageByAgentIDQuery = `
    SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
    FROM accounts.account_list
    WHERE 
        agent_id = $1 
        AND deleted_at IS NULL
    ORDER BY 
        opening_date DESC, 
        created_at DESC
    LIMIT $2 OFFSET $3;
    `;

const pageByClientIDQuery = `
    SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
    FROM accounts.account_list
    WHERE 
        client_id = $1 
        AND deleted_at IS NULL
    ORDER BY opening_date DESC, created_at DESC
    LIMIT $2 OFFSET $3;
    `;

const pageByBranchIDQuery = `
    SELECT id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id
    FROM accounts.account_list
    WHERE 
        branch_id = $1 
        AND agent_id = $2
        AND deleted_at IS NULL
    ORDER BY 
        opening_date DESC, 
        created_at DESC
    LIMIT $3 OFFSET $4;
    `;

async function dynamicUpdateQuery(fields) {
    return `
    UPDATE accounts.account_list
    SET 
        ${fields.join(', ')},
        updated_at = now()
    WHERE 
        id = $1
        AND agent_id = $2
        AND deleted_at IS NULL
    RETURNING id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id;
    `;
}

const verifyAccountQuery = `
    UPDATE accounts.account_list
    SET 
        account_status = 'Active',
        updated_at = now()
    WHERE 
        id = $1
        AND agent_id = $2
        AND account_status = 'Inactive'
        AND deleted_at IS NULL
    RETURNING id, client_id, account_type, account_status, opening_date, initial_deposit, currency, branch_id;
`;

const softDeleteQuery = `
    UPDATE accounts.account_list
    SET deleted_by = $2, deleted_at = now(), updated_at = now(), delete_reason = $3
    WHERE 
        id = $1
        AND deleted_at IS NULL
    RETURNING id, deleted_at
    `;

const devHardDeleteQuery = `
    DELETE FROM accounts.account_list
    WHERE 
        id = $1
        AND deleted_at IS NULL
    RETURNING id
    `;


export {
    isEligibleQuery, isEligibleClientIDQuery,
    defaultCreateAccount,
    devSelectByIDQuery, devSelectAllQuery,
    getAccountByIDQuery, pageByAgentIDQuery, pageByClientIDQuery, pageByBranchIDQuery,
    dynamicUpdateQuery, verifyAccountQuery,
    softDeleteQuery, devHardDeleteQuery
}