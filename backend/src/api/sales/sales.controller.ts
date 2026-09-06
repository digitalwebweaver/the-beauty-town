import { asyncHandler } from '@/utils/asyncHandler';
import { ok, paginated } from '@/utils/ApiResponse';
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
  const q = req.query as unknown as {
    status?: string;
    from?: string;
    to?: string;
    q?: string;
    staffId?: string;
    page: number;
    pageSize: number;
  };
  const isStaff = req.user.role === 'staff';
  // Staff only ever see their own sales; admin sees everything,
  // or filters by ?staffId=... to see one staff member's till.
  const staffId = isStaff ? req.user.sub : q.staffId;
  const { rows, total } = await listSales({
    status: q.status,
    from: q.from,
    to: q.to,
    q: q.q,
    staffId,
    page: q.page,
    pageSize: q.pageSize,
  });
  res.json(paginated(rows, q.page, q.pageSize, total));
});

export const getMySales = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const { rows, total } = await listMySales(req.user.sub, { page, pageSize });
  res.json(paginated(rows, page, pageSize, total));
});

export const patchVoidSale = asyncHandler(async (req, res) => {
  const updated = await voidSale(req.params.id as string, req.body?.reason);
  res.json(ok(updated));
});
