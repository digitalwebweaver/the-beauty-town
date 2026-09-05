import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { query } from '@/config/db';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';

const router = Router();

const createSchema = z.object({
  name: z.string().min(2).max(150),
  brand: z.string().max(100).optional(),
  category: z.string().max(80).optional(),
  stock: z.coerce.number().int().min(0),
  priceInr: z.coerce.number().min(0),
  reorderLevel: z.coerce.number().int().min(0),
});
const patchSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Admin + staff list — staff need this to ring up retail products at checkout.
router.get(
  '/',
  authenticate,
  requireRole('admin', 'staff'),
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, name, brand, category, stock, price_inr, reorder_level, is_active, updated_at
       FROM products
       ORDER BY name ASC`
    );
    res.json(ok(rows));
  })
);

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof createSchema>;
    const { rows } = await query(
      `INSERT INTO products (name, brand, category, stock, price_inr, reorder_level)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [b.name, b.brand ?? null, b.category ?? null, b.stock, b.priceInr, b.reorderLevel]
    );
    res.status(201).json(ok(rows[0]));
  })
);

router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(patchSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof patchSchema>;
    const sets: string[] = [];
    const params: unknown[] = [];
    const push = (col: string, val: unknown) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };
    if (b.name !== undefined) push('name', b.name);
    if (b.brand !== undefined) push('brand', b.brand);
    if (b.category !== undefined) push('category', b.category);
    if (b.stock !== undefined) push('stock', b.stock);
    if (b.priceInr !== undefined) push('price_inr', b.priceInr);
    if (b.reorderLevel !== undefined) push('reorder_level', b.reorderLevel);
    if (b.isActive !== undefined) push('is_active', b.isActive);
    if (!sets.length) throw ApiError.badRequest('Nothing to update');

    params.push(req.params.id as string);
    const { rows, rowCount } = await query(
      `UPDATE products SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING *`,
      params
    );
    if (!rowCount) throw ApiError.notFound('Product not found');
    res.json(ok(rows[0]));
  })
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(`DELETE FROM products WHERE id = $1`, [
      req.params.id as string,
    ]);
    if (!rowCount) throw ApiError.notFound('Product not found');
    res.json(ok({ deleted: true }));
  })
);

export default router;
