import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import {
  getAdminPackages,
  getPackage,
  getPackages,
  patchPackage,
  postPackage,
  removePackage,
} from './packages.controller';
import { createPackageSchema, updatePackageSchema } from './packages.validator';

const router = Router();

router.get('/admin', authenticate, requireRole('admin'), getAdminPackages);
router.get('/', getPackages);
router.get('/:id', getPackage);

router.post('/', authenticate, requireRole('admin'), validate(createPackageSchema), postPackage);
router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updatePackageSchema),
  patchPackage
);
router.delete('/:id', authenticate, requireRole('admin'), removePackage);

export default router;
