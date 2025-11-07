import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand
} from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';
import { config } from '../../config/index.js';

// it automatically looks for credentials in this order:
// AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (from your .env)
// AWS_SESSION_TOKEN (if temporary credentials are used)
// AWS shared config files (~/.aws/credentials)
// ECS / Lambda / EC2 instance roles (for production)
// Web identity tokens (OIDC/IAM roles)
// So as long as your .env is loaded before this line runs,
// the SDK finds everything automatically — no need to pass them in manually.
const client = new CognitoIdentityProviderClient({ region: config.aws.region });
const USER_POOL_ID = config.cognito.userPoolId;

function generateTempPassword() {
  // Cognito needs: min length, upper, lower, number, special (depending on policy)
  // 16 random bytes + forced composition characters
  const base = crypto.randomBytes(16).toString('base64url');
  return `A1!${base}`; // e.g. ensures upper+digit+special
}

export async function cognitoCreateUser({ email, firstName, lastName }) {
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
      // MessageAction: 'SUPPRESS', // Don't send the default "temporary password" email
    }),
  );

  // 2. Add user to the correct group (agent)
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      GroupName: "agent",
    }),
  );

  // // 3. Immediately send a "reset password / set password" email
  // await client.send(
  //   new AdminResetUserPasswordCommand({
  //     UserPoolId: USER_POOL_ID,
  //     Username: email,
  //   }),
  // );

  return create;
}

/**
 * Update user attributes (custom:firstName / custom:lastName) in Cognito.
 * @param {string} username Cognito username (sub or email)
 * @param {object} updates Fields like { firstName, lastName }
 */
export async function cognitoUpdateUserAttributes(username, updates) {
  if (!username) {
    console.warn("⚠️ Skipping Cognito update — missing username");
    return;
  }

  const attrs = [];

  // ✅ Use custom attributes since your pool defines them explicitly
  if (updates.firstName)
    attrs.push({ Name: "custom:firstName", Value: updates.firstName });
  if (updates.lastName)
    attrs.push({ Name: "custom:lastName", Value: updates.lastName });

  if (attrs.length === 0) {
    console.log("ℹ️ No Cognito attributes to update");
    return;
  }

  try {
    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        UserAttributes: attrs,
      })
    );
    console.log(`✅ Cognito custom attributes updated for ${username}`);
  } catch (err) {
    console.error("❌ Failed to update Cognito user attributes:", err);
    // Optional: rethrow if you want the controller to handle it
    throw err;
  }
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

// export async function cognitoResetPassword(email) {
//   await client.send(
//     new AdminResetUserPasswordCommand({
//       UserPoolId: USER_POOL_ID,
//       Username: email,
//     }),
//   );
// }

// export async function cognitoGetUser(email) {
//   return client.send(
//     new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }),
//   );
// }
