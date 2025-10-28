import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminResetUserPasswordCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';
import { config } from '../config/index.js';

const client = new CognitoIdentityProviderClient({ region: config.aws.region });
const USER_POOL_ID = config.cognito.userPoolId;

function generateTempPassword() {
  // Cognito needs: min length, upper, lower, number, special (depending on policy)
  // 16 random bytes + forced composition characters
  const base = crypto.randomBytes(16).toString('base64url');
  return `A1!${base}`; // e.g. ensures upper+digit+special
}

export async function cognitoCreateUser({ email, firstName, lastName, role }) {
  // 1. Create the user in Cognito
  const create = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:firstName', Value: firstName },
        { Name: 'custom:lastName', Value: lastName },
      ],
      // A temp password is still required by the API, but it’ll be replaced immediately
      TemporaryPassword: generateTempPassword(),
      MessageAction: 'SUPPRESS', // Don't send the default "temporary password" email
    }),
  );

  // 2. Add user to the correct group (admin or agent)
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      GroupName: role,
    }),
  );

  // 3. Immediately send a "reset password / set password" email
  await client.send(
    new AdminResetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    }),
  );

  return create;
}

export async function cognitoIsUserDisabled(email) {
  try {
    const res = await client.send(
      new AdminGetUserCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: email,
      }),
    );
    // If Enabled is false, user is disabled
    return res.Enabled === false;
  } catch (err) {
    console.warn('User check failed:', err);
    // If user doesn’t exist, treat as deleted or disabled
    return true;
  }
}

export async function cognitoSetGroups({ email, add = [], remove = [] }) {
  for (const g of add) {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        GroupName: g,
      }),
    );
  }
  for (const g of remove) {
    await client.send(
      new AdminRemoveUserFromGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        GroupName: g,
      }),
    );
  }
}

export async function cognitoDisableUser(email) {
  await client.send(
    new AdminDisableUserCommand({ UserPoolId: USER_POOL_ID, Username: email }),
  );
}

export async function cognitoEnableUser(email) {
  await client.send(
    new AdminEnableUserCommand({ UserPoolId: USER_POOL_ID, Username: email }),
  );
}

export async function cognitoResetPassword(email) {
  await client.send(
    new AdminResetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    }),
  );
}

export async function cognitoGetUser(email) {
  return client.send(
    new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }),
  );
}
