import { describe, expect, it } from 'vitest';
import { createSale } from '@/api/sales/sales.service';
import { query } from '@/config/db';
import {
  createCategory,
  createPackageRow,
  createProduct,
  createService,
  createStaff,
} from './fixtures';

async function stockOf(productId: string): Promise<number> {
  const { rows } = await query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [
    productId,
  ]);
  return rows[0].stock;
}

describe('sales.service — stock guard', () => {
  it('sells a product and decrements stock', async () => {
    const staffId = await createStaff();
    const product = await createProduct({ stock: 5, priceInr: 500 });

    const sale = await createSale(
      {
        items: [{ type: 'product', id: product.id, quantity: 2, discountInr: 0 }],
        discountInr: 0,
        payments: [{ method: 'cash', amountInr: 1000 }],
      },
      staffId
    );

    expect(Number(sale.total_inr)).toBe(1000);
    expect(await stockOf(product.id)).toBe(3);
  });

  it('rejects selling more than the available stock, leaving stock untouched', async () => {
    const staffId = await createStaff();
    const product = await createProduct({ stock: 1, priceInr: 500 });

    await expect(
      createSale(
        {
          items: [{ type: 'product', id: product.id, quantity: 2, discountInr: 0 }],
          discountInr: 0,
          payments: [{ method: 'cash', amountInr: 1000 }],
        },
        staffId
      )
    ).rejects.toThrow(/stock/i);

    expect(await stockOf(product.id)).toBe(1);
  });
});

describe('sales.service — package line items', () => {
  it('bills a package at its own flat price, not the summed linked-service prices', async () => {
    const staffId = await createStaff();
    const categoryId = await createCategory();
    const serviceA = await createService({ categoryId, priceInr: 1000 });
    const serviceB = await createService({ categoryId, priceInr: 1000 });
    const pkg = await createPackageRow({ priceInr: 1500, serviceIds: [serviceA.id, serviceB.id] });

    const sale = await createSale(
      {
        items: [{ type: 'package', id: pkg.id, quantity: 1, discountInr: 0 }],
        discountInr: 0,
        payments: [{ method: 'cash', amountInr: 1500 }],
      },
      staffId
    );

    expect(Number(sale.subtotal_inr)).toBe(1500);
    expect(Number(sale.total_inr)).toBe(1500);
    expect(sale.items).toHaveLength(1);
    expect(sale.items[0].itemType).toBe('package');
    expect(Number(sale.items[0].unitPrice)).toBe(1500);
  });

  it('rejects billing an inactive package', async () => {
    const staffId = await createStaff();
    const pkg = await createPackageRow({ priceInr: 1500, isActive: false });

    await expect(
      createSale(
        {
          items: [{ type: 'package', id: pkg.id, quantity: 1, discountInr: 0 }],
          discountInr: 0,
          payments: [{ method: 'cash', amountInr: 1500 }],
        },
        staffId
      )
    ).rejects.toThrow(/no longer offered/i);
  });

  it('bills a mixed cart (service + product + package) with correct totals', async () => {
    const staffId = await createStaff();
    const categoryId = await createCategory();
    const service = await createService({ categoryId, priceInr: 800 });
    const product = await createProduct({ stock: 3, priceInr: 200 });
    const pkg = await createPackageRow({ priceInr: 1500 });

    const sale = await createSale(
      {
        items: [
          { type: 'service', id: service.id, quantity: 1, discountInr: 0 },
          { type: 'product', id: product.id, quantity: 1, discountInr: 0 },
          { type: 'package', id: pkg.id, quantity: 1, discountInr: 0 },
        ],
        discountInr: 0,
        payments: [{ method: 'card', amountInr: 2500 }],
      },
      staffId
    );

    expect(Number(sale.total_inr)).toBe(800 + 200 + 1500);
    expect(sale.items).toHaveLength(3);
  });
});
