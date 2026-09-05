import { z } from 'zod';
import { imageRef, uuidString } from '@/utils/zodHelpers';

const gender = z.enum(['male', 'female', 'unisex']);

export const createPackageSchema = z.object({
  name: z.string().min(2).max(150),
  category: z.string().min(2).max(100),
  gender,
  description: z.string().max(2000).optional(),
  priceInr: z.coerce.number().min(0),
  worthInr: z.coerce.number().min(0).optional(),
  validityLabel: z.string().max(60).optional(),
  inclusions: z.array(z.string().max(200)).max(30).default([]),
  imageUrl: imageRef().optional(),
  serviceIds: z.array(uuidString()).max(20).default([]),
  displayOrder: z.coerce.number().int().optional(),
});

export const updatePackageSchema = createPackageSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listPackagesQuery = z.object({
  category: z.string().optional(),
  gender: gender.optional(),
});
