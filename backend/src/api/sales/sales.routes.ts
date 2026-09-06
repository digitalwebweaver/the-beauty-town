import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { getAllSales, getMySales, getSale, patchVoidSale, postSale } from './sales.controller';
import { createSaleSchema, listSalesQuery, myPageQuery, voidSaleSchema } from './sales.validator';

const router = Router();

// Ring up a sale — walk-in or appointment checkout.
router.post('/', authenticate, requireRole('staff', 'admin'), validate(createSaleSchema), postSale);

// A staff member's own till, e.g. "what have I rung up today".
router.get('/mine', authenticate, requireRole('staff'), validate(myPageQuery, 'query'), getMySales);

// Admin + staff listing (staff always scoped to their own sales — see controller).
router.get(
  '/',
  authenticate,
  requireRole('staff', 'admin'),
  validate(listSalesQuery, 'query'),
  getAllSales
);

router.get('/:id', authenticate, requireRole('staff', 'admin'), getSale);

// Public invoice link — shareable (e.g. over WhatsApp) with no login.
// Safe by URL-obscurity: sale ids are random UUIDs, not enumerable/guessable,
// same trust model as most payment/invoice links.
router.get('/:id/public', getSale);

// Reverse a mis-rung sale — admin only, restocks any product lines.
router.patch(
  '/:id/void',
  authenticate,
  requireRole('admin'),
  validate(voidSaleSchema),
  patchVoidSale
);

export default router;
