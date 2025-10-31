const insertAgentQuery = `
    INSERT INTO agents.agent_list (first_name, last_name, email, role, admin_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING agent_id;
    `;
const insertCogSubQuery = `
    UPDATE agents.agent_list
    SET cognito_sub = $1,
        updated_at = now()
    WHERE 
        agent_id = $2
        AND deleted_at IS NULL
    RETURNING agent_id;
    `;

const devSelectByIDQuery = `
    SELECT agent_id, first_name, last_name, email, role
    FROM agents.agent_list
    WHERE agent_id = $1;
    `;
const devSelectAllQuery = `
    SELECT agent_id, first_name, last_name, email, role
    FROM agents.agent_list;
    `;

const selectByIDAdminIDQuery = `
    SELECT agent_id, first_name, last_name, email, role
    FROM agents.agent_list
    WHERE
        agent_id = $1 
        AND admin_id = $2
        AND deleted_at IS NULL;
    `;
const pageByAdminIDQuery = `
    SELECT agent_id, first_name, last_name, email, role
    FROM agents.agent_list
    WHERE 
        admin_id = $1 
        AND deleted_at IS NULL 
    ORDER BY 
        created_at DESC, 
        agent_id DESC
    LIMIT $2 OFFSET $3;
    `;
const searchAgentQuery = `
    SELECT agent_id, first_name, last_name, email, role
    FROM agents.agent_list
    WHERE 
        admin_id = $2
        AND deleted_at IS NULL AND (
            (first_name ILIKE $1::text)
            OR (last_name  ILIKE $1::text)
            OR (email      ILIKE $1::citext)
        );
    `;

// const updateAgentQuery = ``;
async function buildSearchQuery ({fields}) {
    const updateAgentQuery = `
        UPDATE agents.agent_list
        SET ${fields.join(', ')},
            updated_at = now()
        WHERE 
            agent_id = $1
            AND admin_id = $2
            AND deleted_at IS NULL
        RETURNING agent_id, first_name, last_name, email, role, created_at, updated_at;
    `;
    return updateAgentQuery;
}

const updateCogQuery = `

    `;

const softDeleteQuery = `
    UPDATE agents.agent_list
    SET 
        deleted_by = $2, 
        deleted_at = now(), 
        updated_at = now(), 
        delete_reason = $3
    WHERE 
        agent_id = $1
        AND admin_id = $2
        AND deleted_at IS NULL
    RETURNING agent_id, email, deleted_at;
    `;

const disableCogQuery =`
    
    `;

const hardDeleteQuery = `
    DELETE FROM agents.agent_list
    WHERE 
        agent_id = $1
        AND admin_id = $2 
        AND deleted_at IS NULL
    RETURNING agent_id;
    `;

export {
    insertAgentQuery, insertCogSubQuery,
    devSelectByIDQuery, devSelectAllQuery,
    selectByIDAdminIDQuery, pageByAdminIDQuery,
    searchAgentQuery,
    buildSearchQuery, updateCogQuery,
    softDeleteQuery, disableCogQuery,
    hardDeleteQuery
}