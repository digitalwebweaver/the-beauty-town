import { z } from 'zod';
import { uuidString } from '@/utils/zodHelpers';

const codeField = z
  .string()
  .min(3, 'At least 3 characters')
  .max(30)
  .regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers, and hyphens only');

const couponItemSchema = z.object({
  type: z.enum(['service', 'product']),
  id: uuidString(),
});

export const createCouponSchema = z
  .object({
    code: codeField,
    description: z.string().max(200).optional(),
    discountType: z.enum(['flat', 'percent']),
    discountValue: z.coerce.number().positive().max(999999),
    maxDiscountInr: z.coerce.number().positive().max(999999).optional(),
    minSpendInr: z.coerce.number().min(0).max(999999).default(0),
    scope: z.enum(['bill', 'items']).default('bill'),
    items: z.array(couponItemSchema).max(50).default([]),
    startsAt: z
      .string()
      .datetime()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    expiresAt: z
      .string()
      .datetime()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    maxRedemptions: z.coerce.number().int().positive().optional(),
    perCustomerLimit: z.coerce.number().int().positive().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.discountType !== 'percent' || v.discountValue <= 100, {
    message: 'A percent-off coupon cannot exceed 100%',
    path: ['discountValue'],
  })
  .refine((v) => v.scope !== 'items' || v.items.length > 0, {
    message: 'Pick at least one service or product for a scoped coupon',
    path: ['items'],
  });

export const updateCouponSchema = z.object({
  code: codeField.optional(),
  description: z.string().max(200).nullable().optional(),
  discountType: z.enum(['flat', 'percent']).optional(),
  discountValue: z.coerce.number().positive().max(999999).optional(),
  maxDiscountInr: z.coerce.number().positive().max(999999).nullable().optional(),
  minSpendInr: z.coerce.number().min(0).max(999999).optional(),
  scope: z.enum(['bill', 'items']).optional(),
  items: z.array(couponItemSchema).max(50).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxRedemptions: z.coerce.number().int().positive().nullable().optional(),
  perCustomerLimit: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const previewCouponSchema = z.object({
  code: codeField,
  subtotalInr: z.coerce.number().min(0),
  items: z
    .array(
      z.object({
        type: z.enum(['service', 'product', 'package']),
        id: uuidString(),
        lineTotalInr: z.coerce.number().min(0),
      })
    )
    .default([]),
  customerPhone: z.string().max(20).optional(),
});
