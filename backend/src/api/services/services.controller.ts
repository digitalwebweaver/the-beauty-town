import { asyncHandler } from '@/utils/asyncHandler';
import { ok, paginated } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  createService,
  deleteService,
  findServiceById,
  listCategories,
  listServices,
  listServicesAdmin,
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
