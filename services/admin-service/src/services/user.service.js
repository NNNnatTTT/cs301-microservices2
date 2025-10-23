import createError from 'http-errors';
import { prisma } from '../db/prisma.js';
import {
  cognitoCreateUser,
  cognitoSetGroups,
  cognitoDisableUser,
  cognitoEnableUser,
  cognitoResetPassword,
  cognitoIsUserDisabled,
} from './cognito.service.js';
import { config } from '../config/index.js';

// Only Root Admin can manage *admins* (policy helper)
function assertRootAdminActingOnAdmin({ actingEmail, targetRole }) {
  if (
    targetRole === 'admin' &&
    actingEmail.toLowerCase() !== (config.rootAdminEmail || '').toLowerCase()
  ) {
    throw createError(403, 'Only root admin can manage admins');
  }
}

export async function createUser({
  actingEmail,
  firstName,
  lastName,
  email,
  role,
}) {
  assertRootAdminActingOnAdmin({ actingEmail, targetRole: role });

  // 1) create in Cognito + group
  const resp = await cognitoCreateUser({ email, firstName, lastName, role });
  const sub = resp?.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;

  // 2) upsert mirror in Postgres
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      role,
      cognitoSub: sub || undefined,
      deletedAt: null,
      deletedReason: null,
    },
    create: { firstName, lastName, email, role, cognitoSub: sub || undefined },
  });

  // never expose internal fields
  return user;
}

export async function updateUser(id, updates, actingEmail) {
  // If role is changing, enforce root-only for admins
  if (updates?.role === 'admin') {
    assertRootAdminActingOnAdmin({ actingEmail, targetRole: 'admin' });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw createError(404, 'User not found');

  // Sync Cognito groups if role changes
  if (updates.role && updates.role !== existing.role) {
    // Move between 'agent' <-> 'admin'
    await cognitoSetGroups({
      email: existing.email,
      add: [updates.role],
      remove: [existing.role],
    });
  }

  const allowed = ['firstName', 'lastName', 'role'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k)),
  );

  const user = await prisma.user.update({ where: { id }, data: filtered });
  return user;
}

export async function softDeleteUser(
  id,
  reason = 'No reason provided',
  actingEmail,
) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw createError(404, 'User not found');

  // Only root admin can delete *admins*
  if (existing.role === 'admin') {
    assertRootAdminActingOnAdmin({ actingEmail, targetRole: 'admin' });
    // Root admin account itself cannot be deleted
    if (
      existing.email.toLowerCase() ===
      (config.rootAdminEmail || '').toLowerCase()
    ) {
      throw createError(403, 'Root admin cannot be deleted');
    }
  }

  // Mark deleted in app DB
  const user = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), deletedReason: reason },
  });

  // Optionally disable in Cognito too
  await cognitoDisableUser(existing.email);

  return user;
}

export async function getUser(id, actingEmail) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) throw createError(404, 'User not found');

  // Enforce "only root admin can view admins"
  if (
    user.role === 'admin' &&
    actingEmail.toLowerCase() !== (config.rootAdminEmail || '').toLowerCase()
  ) {
    throw createError(403, 'Only root admin can view admins');
  }

  // Add Cognito disabled state
  const disabled = await cognitoIsUserDisabled(user.email);

  return { ...user, disabled };
}

export async function listUsers({ includeAdmins = false, actingEmail }) {
  // Only root admin can view admins
  const allowAdmins =
    includeAdmins &&
    actingEmail.toLowerCase() === (config.rootAdminEmail || '').toLowerCase();

  const where = allowAdmins
    ? { deletedAt: null }
    : { deletedAt: null, role: 'agent' };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Fetch Cognito disabled status for each
  const enriched = await Promise.all(
    users.map(async (u) => {
      const disabled = await cognitoIsUserDisabled(u.email);
      return { ...u, disabled };
    }),
  );
  return enriched;
}

// Enable/Disable (maps to "Disable User" requirement)
export async function setUserDisabledByCognitoEmail(
  email,
  disabled,
  actingEmail,
) {
  // Check target in DB for policy enforcement
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) throw createError(404, 'User not found');

  if (target.role === 'admin') {
    assertRootAdminActingOnAdmin({ actingEmail, targetRole: 'admin' });
    if (
      target.email.toLowerCase() === (config.rootAdminEmail || '').toLowerCase()
    ) {
      throw createError(403, 'Root admin cannot be disabled');
    }
  }

  if (disabled) {
    await cognitoDisableUser(email);
  } else {
    await cognitoEnableUser(email);
  }

  // return combined view
  return { email, disabled };
}

// Reset password (Admin-only; root-only if target is admin)
export async function adminResetPasswordByEmail(email, actingEmail) {
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) throw createError(404, 'User not found');

  if (target.role === 'admin') {
    assertRootAdminActingOnAdmin({ actingEmail, targetRole: 'admin' });
    if (
      target.email.toLowerCase() === (config.rootAdminEmail || '').toLowerCase()
    ) {
      throw createError(
        403,
        'Root admin password reset must be done via Cognito console',
      );
    }
  }

  await cognitoResetPassword(email);
  return { email, status: 'RESET_INITIATED' };
}
