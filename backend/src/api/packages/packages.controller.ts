import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  createPackage,
  deletePackage,
  findPackageById,
  listPackages,
  updatePackage,
} from './packages.repository';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const getPackages = asyncHandler(async (req, res) => {
  const data = await listPackages({
    category: req.query.category as string | undefined,
    gender: req.query.gender as string | undefined,
    activeOnly: true,
  });
  res.json(ok(data));
});

export const getAdminPackages = asyncHandler(async (_req, res) => {
  const data = await listPackages({ activeOnly: false });
  res.json(ok(data));
});

// Public — only ever resolves an active package (e.g. the booking page's
// `?package=<id>` deep link), so archiving a package correctly kills any
// previously-shared link instead of leaving it fully bookable.
export const getPackage = asyncHandler(async (req, res) => {
  const p = await findPackageById(req.params.id as string, { activeOnly: true });
  if (!p) throw ApiError.notFound('Package not found');
  res.json(ok(p));
});

export const postPackage = asyncHandler(async (req, res) => {
  const b = req.body;
  const pkg = await createPackage({
    name: b.name,
    slug: slugify(b.name) + '-' + Date.now().toString(36),
    category: b.category,
    gender: b.gender,
    description: b.description,
    priceInr: b.priceInr,
    worthInr: b.worthInr,
    validityLabel: b.validityLabel,
    inclusions: b.inclusions ?? [],
    imageUrl: b.imageUrl,
    serviceIds: b.serviceIds ?? [],
    displayOrder: b.displayOrder,
  });
  res.status(201).json(ok(pkg));
});

export const patchPackage = asyncHandler(async (req, res) => {
  const pkg = await updatePackage(req.params.id as string, req.body);
  if (!pkg) throw ApiError.notFound('Package not found');
  res.json(ok(pkg));
});

export const removePackage = asyncHandler(async (req, res) => {
  const done = await deletePackage(req.params.id as string);
  if (!done) throw ApiError.notFound('Package not found');
  res.json(ok({ deleted: true }));
});
