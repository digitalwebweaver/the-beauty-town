import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import {
  getAdminCategories,
  getAdminServices,
  getCategories,
  getService,
  getServices,
  patchCategory,
  patchService,
  postCategory,
  postService,
  removeService,
} from './services.controller';
import {
  adminListServicesQuery,
  createCategorySchema,
  createServiceSchema,
  updateCategorySchema,
  updateServiceSchema,
} from './services.validator';

const router = Router();

router.get('/categories', getCategories);
router.get('/categories/admin', authenticate, requireRole('admin'), getAdminCategories);
router.post(
  '/categories',
  authenticate,
  requireRole('admin'),
  validate(createCategorySchema),
  postCategory
);
router.patch(
  '/categories/:id',
  authenticate,
  requireRole('admin'),
  validate(updateCategorySchema),
  patchCategory
);
// Must be registered before /:id — otherwise "admin" would be captured as
// the :id param and this route would never be reached.
router.get(
  '/admin',
  authenticate,
  requireRole('admin'),
  validate(adminListServicesQuery, 'query'),
  getAdminServices
);
router.get('/', getServices);
router.get('/:id', getService);

router.post('/', authenticate, requireRole('admin'), validate(createServiceSchema), postService);
router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updateServiceSchema),
  patchService
);
router.delete('/:id', authenticate, requireRole('admin'), removeService);

export default router;
