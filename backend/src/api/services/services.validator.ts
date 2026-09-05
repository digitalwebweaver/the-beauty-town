import { z } from 'zod';
import { imageRef, uuidString } from '@/utils/zodHelpers';

const gender = z.enum(['male', 'female', 'unisex']);

export const createServiceSchema = z.object({
  categoryId: uuidString(),
  name: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  gender,
  priceInr: z.coerce.number().min(0),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  imageUrl: imageRef().optional(),
  // How many customers this service can serve at the same time. Omit /
  // leave blank for unlimited (matches every service's behavior today).
  maxConcurrentBookings: z.coerce.number().int().positive().optional(),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
  // Overrides the base (optional-only) field so an admin can explicitly
  // clear the cap back to "unlimited" by sending null, not just omit it.
  maxConcurrentBookings: z.coerce.number().int().positive().nullable().optional(),
});

export const listServicesQuery = z.object({
  categoryKey: z.string().optional(),
  gender: gender.optional(),
  q: z.string().max(80).optional(),
});

export const adminListServicesQuery = z.object({
  categoryKey: z.string().optional(),
  gender: gender.optional(),
  q: z.string().max(80).optional(),
  status: z.enum(['active', 'archived', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
