import { describe, expect, it } from 'vitest';
import { createCoupon } from '@/api/coupons/coupons.service';
import { createSale } from '@/api/sales/sales.service';
import { createCategory, createProduct, createService, createStaff, rand } from './fixtures';

describe('coupons — bill-scoped discount', () => {
  it('applies a flat bill-wide discount to a sale', async () => {
    const staffId = await createStaff();
    const product = await createProduct({ stock: 5, priceInr: 1000 });
    const code = `FLAT100-${rand()}`;

    await createCoupon(
      {
        code,
        discountType: 'flat',
        discountValue: 100,
        minSpendInr: 0,
        scope: 'bill',
        items: [],
        isActive: true,
      },
      staffId
    );

    const sale = await createSale(
      {
        items: [{ type: 'product', id: product.id, quantity: 1, discountInr: 0 }],
        discountInr: 0,
        couponCode: code,
        payments: [{ method: 'cash', amountInr: 900 }],
      },
      staffId
    );

    expect(Number(sale.subtotal_inr)).toBe(1000);
    expect(Number(sale.coupon_discount_inr)).toBe(100);
    expect(Number(sale.total_inr)).toBe(900);
    expect(sale.coupon_code).toBe(code);
  });
});

describe('coupons — item-scoped discount', () => {
  it('only discounts the matching item, not the whole bill', async () => {
    const staffId = await createStaff();
    const categoryId = await createCategory();
    const service = await createService({ categoryId, priceInr: 1000 });
    const product = await createProduct({ stock: 5, priceInr: 500 });
    const code = `ITEM50PCT-${rand()}`;

    // 50% off, but scoped to just the service — the product must be
    // untouched by the discount.
    await createCoupon(
      {
        code,
        discountType: 'percent',
        discountValue: 50,
        minSpendInr: 0,
        scope: 'items',
        items: [{ type: 'service', id: service.id }],
        isActive: true,
      },
      staffId
    );

    const sale = await createSale(
      {
        items: [
          { type: 'service', id: service.id, quantity: 1, discountInr: 0 },
          { type: 'product', id: product.id, quantity: 1, discountInr: 0 },
        ],
        discountInr: 0,
        couponCode: code,
        payments: [{ method: 'cash', amountInr: 1000 }], // 1000 + 500 - 500(50% of service)
      },
      staffId
    );

    expect(Number(sale.subtotal_inr)).toBe(1500);
    expect(Number(sale.coupon_discount_inr)).toBe(500); // 50% of the ₹1000 service only
    expect(Number(sale.total_inr)).toBe(1000);
  });
});

describe('coupons — redemption cap', () => {
  it('cannot be redeemed past its maxRedemptions', async () => {
    const staffId = await createStaff();
    const code = `ONESHOT-${rand()}`;

    await createCoupon(
      {
        code,
        discountType: 'flat',
        discountValue: 50,
        minSpendInr: 0,
        scope: 'bill',
        items: [],
        maxRedemptions: 1,
        isActive: true,
      },
      staffId
    );

    const product1 = await createProduct({ stock: 5, priceInr: 200 });
    await createSale(
      {
        items: [{ type: 'product', id: product1.id, quantity: 1, discountInr: 0 }],
        discountInr: 0,
        couponCode: code,
        payments: [{ method: 'cash', amountInr: 150 }],
      },
      staffId
    );

    const product2 = await createProduct({ stock: 5, priceInr: 200 });
    await expect(
      createSale(
        {
          items: [{ type: 'product', id: product2.id, quantity: 1, discountInr: 0 }],
          discountInr: 0,
          couponCode: code,
          payments: [{ method: 'cash', amountInr: 150 }],
        },
        staffId
      )
    ).rejects.toThrow(/redemption/i);
  });
});
