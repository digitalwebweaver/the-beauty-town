import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  createCoupon,
  getCoupon,
  listCoupons,
  previewCoupon,
  updateCoupon,
} from './coupons.service';

export const postCoupon = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const coupon = await createCoupon(req.body, req.user.sub);
  res.status(201).json(ok(coupon));
});

export const getAllCoupons = asyncHandler(async (_req, res) => {
  res.json(ok(await listCoupons()));
});

export const getOneCoupon = asyncHandler(async (req, res) => {
  res.json(ok(await getCoupon(req.params.id as string)));
});

export const patchCoupon = asyncHandler(async (req, res) => {
  res.json(ok(await updateCoupon(req.params.id as string, req.body)));
});

export const postPreviewCoupon = asyncHandler(async (req, res) => {
  const { code, subtotalInr, items, customerPhone } = req.body;
  const result = await previewCoupon(code, { subtotalInr, items, customerPhone });
  res.json(ok(result));
});
