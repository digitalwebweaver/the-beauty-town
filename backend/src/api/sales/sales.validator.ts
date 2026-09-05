import { z } from 'zod';
import { nameField, phoneField, uuidString } from '@/utils/zodHelpers';

const saleItemSchema = z.object({
  type: z.enum(['service', 'product', 'package']),
  id: uuidString(),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  discountInr: z.coerce.number().min(0).max(999999).default(0),
});

const paymentSchema = z.object({
  method: z.enum(['cash', 'card', 'upi']),
  amountInr: z.coerce.number().positive().max(999999),
});

export const createSaleSchema = z.object({
  appointmentId: uuidString().optional(),
  customerId: uuidString().optional(),
  customerName: nameField(2, 120).optional(),
  customerPhone: phoneField().optional(),
  items: z.array(saleItemSchema).min(1).max(40),
  discountInr: z.coerce.number().min(0).max(999999).default(0),
  couponCode: z.string().max(30).optional(),
  payments: z.array(paymentSchema).min(1).max(3),
  notes: z.string().max(500).optional(),
});

export const voidSaleSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const listSalesQuery = z.object({
  status: z.enum(['completed', 'void']).optional(),
  staffId: uuidString().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional(),
  q: z.string().max(120).optional(),
});
