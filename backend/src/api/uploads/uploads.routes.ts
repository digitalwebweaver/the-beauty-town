import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import {
  relativeUrl,
  uploadAvatar,
  uploadMisc,
  uploadPackage,
  uploadService,
  uploadStaff,
  verifyImageMagicBytes,
} from '@/middlewares/upload';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import { query } from '@/config/db';

const router = Router();

// User avatar (any authenticated user, updates their own profile picture)
router.post(
  '/avatar',
  authenticate,
  uploadAvatar.single('image'),
  verifyImageMagicBytes,
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image uploaded');
    const url = relativeUrl(req.file);
    await query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [url, req.user!.sub]);
    res.status(201).json(ok({ url }));
  })
);

// Service image (admin only) — returns URL, admin then calls PATCH /services/:id with imageUrl
router.post(
  '/service',
  authenticate,
  requireRole('admin'),
  uploadService.single('image'),
  verifyImageMagicBytes,
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image uploaded');
    res.status(201).json(ok({ url: relativeUrl(req.file) }));
  })
);

// Staff image (admin only)
router.post(
  '/staff',
  authenticate,
  requireRole('admin'),
  uploadStaff.single('image'),
  verifyImageMagicBytes,
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image uploaded');
    res.status(201).json(ok({ url: relativeUrl(req.file) }));
  })
);

// Package image (admin only) — returns URL, admin then calls PATCH /packages/:id with imageUrl
router.post(
  '/package',
  authenticate,
  requireRole('admin'),
  uploadPackage.single('image'),
  verifyImageMagicBytes,
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image uploaded');
    res.status(201).json(ok({ url: relativeUrl(req.file) }));
  })
);

// Salon logo (admin only) — returns URL, admin then calls PATCH /settings with logoUrl
router.post(
  '/logo',
  authenticate,
  requireRole('admin'),
  uploadMisc.single('image'),
  verifyImageMagicBytes,
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image uploaded');
    res.status(201).json(ok({ url: relativeUrl(req.file) }));
  })
);

// Coupon designer image (logo/background/element image, admin only)
router.post(
  '/coupon-design',
  authenticate,
  requireRole('admin'),
  uploadMisc.single('image'),
  verifyImageMagicBytes,
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image uploaded');
    res.status(201).json(ok({ url: relativeUrl(req.file) }));
  })
);

export default router;
