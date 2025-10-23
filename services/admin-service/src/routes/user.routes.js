import { Router } from 'express';
import { authenticateCognito, authorizeGroups } from '../middleware/auth.js';
import * as ctrl from '../controllers/user.controller.js';

const router = Router();

// All user ops require authenticated admin
router.use(authenticateCognito, authorizeGroups('admin'));

/**
 * NOTE: "ONLY root admin can create/delete/update/view admins"
 * We enforce this inside controllers/services by checking actingEmail against ROOT_ADMIN_EMAIL
 * and by filtering admins from lists unless includeAdmins=true & actor is root.
 */

router.post('/', ctrl.create); // create user (root-only if role=admin)
router.get('/', ctrl.list); // list users (admins visible only to root)
router.get('/:id', ctrl.get); // get user (admin target visible only to root)
router.put('/:id', ctrl.update); // update user (role change to admin => root-only)
router.patch('/:id/delete', ctrl.softDelete); // soft delete (admin target => root-only)

// “Disable User” -> maps to Cognito disable/enable by email
router.patch('/disable', ctrl.disable);

// “Reset Password” -> admin-initiated Cognito reset
router.post('/reset-password', ctrl.resetPassword);

export default router;
