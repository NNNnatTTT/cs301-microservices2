const isEligiblequery = `
    SELECT EXISTS (
        SELECT 1 FROM profiles.profile_list 
        WHERE 
            id = $1 
            AND agent_sub = $2
            AND deleted_at IS NULL
    ) AS eligible;
`;

const insertProfileQuery = `
    INSERT INTO profiles.profile_list (first_name, last_name, date_of_birth, gender, email, phone_number, 
    address, city, state, country, postal, status, agent_sub)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id;
`;

const devSelectByIDQuery = `
    SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    address, city, state, country, postal, status, agent_sub
    FROM profiles.profile_list
    WHERE 
        id = $1;
`;

const devSelectAllQuery = `
    SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    address, city, state, country, postal, status, agent_sub
    FROM profiles.profile_list
`;

const selectByIDagentSUBQuery = `
    SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    address, city, state, country, postal, status, agent_sub
    FROM profiles.profile_list
    WHERE 
        id = $1 
        AND agent_sub = $2;
`;

const pageByagentSUBQuery = `
    SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    address, city, state, country, postal, status, agent_sub
    FROM profiles.profile_list
    WHERE 
        agent_sub = $1 
        AND deleted_at IS NULL
    ORDER BY 
        created_at DESC, 
        agent_sub DESC
    LIMIT $2 OFFSET $3;
`;

const searchQuery = `
    SELECT id, first_name, last_name, date_of_birth, gender, email, phone_number, 
    address, city, state, country, postal, status, agent_sub
    FROM 
        profiles.profile_list
    WHERE 
        agent_sub = $2
        AND deleted_at IS NULL 
        AND (
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
    ORDER BY 
        created_at DESC, 
        agent_sub DESC
    LIMIT $3 OFFSET $4;
`;
// ORDER BY created_at DESC, agent_sub DESC LIMIT 10;

async function dynamicUpdate(fields) {
    const updateQuery = `
        UPDATE profiles.profile_list
        SET 
            ${fields.join(', ')},
            updated_at = now()
        WHERE 
            id = $1
            AND agent_sub = $2
            AND deleted_at IS NULL
        RETURNING id, first_name, last_name, date_of_birth, gender, email, phone_number, 
        address, city, state, country, postal, status, agent_sub, updated_at;
    `;
    // console.log('Generated SQL:\n', updateQuery);
    return updateQuery;
} 

const verifyProfileQuery = `
    UPDATE profiles.profile_list
    SET 
        status = 'Active',
        updated_at = now()
    WHERE 
        id = $1
        AND agent_sub = $2
        AND deleted_at IS NULL
    RETURNING id;
`;

const softDeleteQuery = `
    UPDATE profiles.profile_list
    SET 
        deleted_by = $2, 
        deleted_at = now(), 
        updated_at = now(), 
        delete_reason = $3
    WHERE 
        id = $1
        AND agent_sub = $2
        AND deleted_at IS NULL
    RETURNING id, deleted_at
`;

export {
    isEligiblequery,
    insertProfileQuery,
    devSelectByIDQuery, devSelectAllQuery,
    selectByIDagentSUBQuery, pageByagentSUBQuery,
    searchQuery,
    dynamicUpdate, verifyProfileQuery,
    softDeleteQuery
}