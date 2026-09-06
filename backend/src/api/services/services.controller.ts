import { asyncHandler } from '@/utils/asyncHandler';
import { ok, paginated } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import { setAuditContext } from '@/utils/auditContext';
import {
  createCategory,
  createService,
  deleteService,
  findServiceById,
  listCategories,
  listCategoriesAdmin,
  listServices,
  listServicesAdmin,
  updateCategory,
  updateService,
} from './services.repository';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const getCategories = asyncHandler(async (_req, res) => {
  res.json(ok(await listCategories()));
});

export const getAdminCategories = asyncHandler(async (_req, res) => {
  res.json(ok(await listCategoriesAdmin()));
});

export const postCategory = asyncHandler(async (req, res) => {
  const b = req.body;
  const category = await createCategory({
    gender: b.gender,
    label: b.label,
    keySuffix: slugify(b.label),
    displayOrder: b.displayOrder,
  });
  setAuditContext(req, {
    action: 'categories.created',
    targetType: 'service_category',
    targetId: category.id,
    meta: { key: category.key, label: category.label },
  });
  res.status(201).json(ok(category));
});

export const patchCategory = asyncHandler(async (req, res) => {
  const category = await updateCategory(req.params.id as string, req.body);
  if (!category) throw ApiError.notFound('Category not found');
  setAuditContext(req, {
    action: 'categories.updated',
    targetType: 'service_category',
    targetId: category.id,
  });
  res.json(ok(category));
});

export const getServices = asyncHandler(async (req, res) => {
  const data = await listServices({
    categoryKey: req.query.categoryKey as string | undefined,
    gender: req.query.gender as string | undefined,
    q: req.query.q as string | undefined,
    activeOnly: true,
  });
  res.json(ok(data));
});

export const getAdminServices = asyncHandler(async (req, res) => {
  const q = req.query as unknown as {
    categoryKey?: string;
    gender?: string;
    q?: string;
    status: 'active' | 'archived' | 'all';
    page: number;
    pageSize: number;
  };
  const { rows, total } = await listServicesAdmin(q);
  res.json(paginated(rows, q.page, q.pageSize, total));
});

export const getService = asyncHandler(async (req, res) => {
  const s = await findServiceById(req.params.id as string);
  if (!s) throw ApiError.notFound('Service not found');
  res.json(ok(s));
});

export const postService = asyncHandler(async (req, res) => {
  const b = req.body;
  const service = await createService({
    categoryId: b.categoryId,
    name: b.name,
    slug: slugify(b.name) + '-' + Date.now().toString(36),
    description: b.description,
    gender: b.gender,
    priceInr: b.priceInr,
    durationMinutes: b.durationMinutes,
    imageUrl: b.imageUrl,
    maxConcurrentBookings: b.maxConcurrentBookings,
  });
  res.status(201).json(ok(service));
});

export const patchService = asyncHandler(async (req, res) => {
  const svc = await updateService(req.params.id as string, req.body);
  if (!svc) throw ApiError.notFound('Service not found');
  res.json(ok(svc));
});

export const removeService = asyncHandler(async (req, res) => {
  const done = await deleteService(req.params.id as string);
  if (!done) throw ApiError.notFound('Service not found');
  res.json(ok({ deleted: true }));
});
