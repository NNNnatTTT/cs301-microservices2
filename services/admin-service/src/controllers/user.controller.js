import createError from 'http-errors';
import {
  createUser,
  listUsers,
  getUser,
  updateUser,
  softDeleteUser,
  setUserDisabledByCognitoEmail,
  adminResetPasswordByEmail,
} from '../services/user.service.js';
import { createSchema, updateSchema } from '../utils/validators.js';

export async function create(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body);
    if (error) throw createError(400, error.message);
    const actingEmail = req.user?.email || req.user?.['email'];
    const user = await createUser({ ...value, actingEmail });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const actingEmail = req.user?.email || req.user?.['email'];
    const includeAdmins = req.query?.includeAdmins === 'true';
    const users = await listUsers({ includeAdmins, actingEmail });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const actingEmail = req.user?.email || req.user?.['email'];
    const user = await getUser(req.params.id, actingEmail);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { value, error } = updateSchema.validate(req.body);
    if (error) throw createError(400, error.message);
    const actingEmail = req.user?.email || req.user?.['email'];
    const user = await updateUser(req.params.id, value, actingEmail);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function softDelete(req, res, next) {
  try {
    const actingEmail = req.user?.email || req.user?.['email'];
    const reason = req.body?.reason || 'No reason provided';
    const user = await softDeleteUser(req.params.id, reason, actingEmail);
    res.json({ message: 'User soft-deleted', user });
  } catch (err) {
    next(err);
  }
}

export async function disable(req, res, next) {
  try {
    const actingEmail = req.user?.email || req.user?.['email'];
    const { email, disabled } = req.body || {};
    if (typeof disabled !== 'boolean' || !email)
      throw createError(400, 'email and disabled required');
    const result = await setUserDisabledByCognitoEmail(
      email,
      disabled,
      actingEmail,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const actingEmail = req.user?.email || req.user?.['email'];
    const { email } = req.body || {};
    if (!email) throw createError(400, 'email required');
    const result = await adminResetPasswordByEmail(email, actingEmail);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
