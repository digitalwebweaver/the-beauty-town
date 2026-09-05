import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import { createSale, getSaleById, listMySales, listSales, voidSale } from './sales.service';

export const postSale = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const sale = await createSale(req.body, req.user.sub);
  res.status(201).json(ok(sale));
});

// Shared by both GET /:id (authenticated) and GET /:id/public (no login,
// intentionally open — see sales.routes.ts). `req.user` is only present
// on the authenticated route, so the ownership check below naturally
// skips for the public link and for admin, and only restricts staff to
// their own till — mirroring the scoping getAllSales already applies.
export const getSale = asyncHandler(async (req, res) => {
  const sale = await getSaleById(req.params.id as string);
  if (!sale) throw ApiError.notFound('Sale not found');
  if (req.user?.role === 'staff' && sale.staff_id !== req.user.sub) {
    throw ApiError.notFound('Sale not found');
  }
  res.json(ok(sale));
});

export const getAllSales = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const isStaff = req.user.role === 'staff';
  // Staff only ever see their own sales; admin sees everything,
  // or filters by ?staffId=... to see one staff member's till.
  const staffId = isStaff ? req.user.sub : (req.query.staffId as string | undefined);
  const data = await listSales({
    status: req.query.status as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    q: req.query.q as string | undefined,
    staffId,
  });
  res.json(ok(data));
});

export const getMySales = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const data = await listMySales(req.user.sub);
  res.json(ok(data));
});

export const patchVoidSale = asyncHandler(async (req, res) => {
  const updated = await voidSale(req.params.id as string, req.body?.reason);
  res.json(ok(updated));
});
