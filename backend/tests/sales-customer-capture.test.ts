import { describe, expect, it } from 'vitest';
import { createSale } from '@/api/sales/sales.service';
import { query } from '@/config/db';
import { createProduct, createStaff } from './fixtures';

async function findCustomerByPhone(phone: string) {
  const { rows } = await query<{
    id: string;
    name: string;
    date_of_birth: string | null;
    anniversary_date: string | null;
  }>(`SELECT id, name, date_of_birth, anniversary_date FROM users WHERE phone = $1`, [phone]);
  return rows[0] ?? null;
}

describe('sales.service — birthday/anniversary capture for a new walk-in', () => {
  it('creates a real customer record when a birthday is given with no account', async () => {
    const staffId = await createStaff();
    const product = await createProduct({ stock: 5, priceInr: 500 });
    const phone = '9000000001';

    const sale = await createSale(
      {
        customerName: 'Priya Sharma',
        customerPhone: phone,
        customerDateOfBirth: '1995-06-15',
        items: [{ type: 'product', id: product.id, quantity: 1, discountInr: 0 }],
        discountInr: 0,
        payments: [{ method: 'cash', amountInr: 500 }],
      },
      staffId
    );

    const customer = await findCustomerByPhone(phone);
    expect(customer).not.toBeNull();
    expect(customer!.date_of_birth?.slice(0, 10)).toBe('1995-06-15');
    expect(sale.customer_id).toBe(customer!.id);
  });

  it('attaches an anniversary to the same customer on a repeat visit instead of duplicating', async () => {
    const staffId = await createStaff();
    const product = await createProduct({ stock: 5, priceInr: 500 });
    const phone = '9000000002';

    await createSale(
      {
        customerName: 'Rahul Verma',
        customerPhone: phone,
        customerDateOfBirth: '1990-01-20',
        items: [{ type: 'product', id: product.id, quantity: 1, discountInr: 0 }],
        discountInr: 0,
        payments: [{ method: 'cash', amountInr: 500 }],
      },
      staffId
    );
    const firstVisitCustomer = await findCustomerByPhone(phone);

    const secondSale = await createSale(
      {
        customerName: 'Rahul Verma',
        customerPhone: phone,
        customerAnniversaryDate: '2015-11-02',
        items: [{ type: 'product', id: product.id, quantity: 1, discountInr: 0 }],
        discountInr: 0,
        payments: [{ method: 'cash', amountInr: 500 }],
      },
      staffId
    );

    const { rows: allWithPhone } = await query('SELECT id FROM users WHERE phone = $1', [phone]);
    expect(allWithPhone).toHaveLength(1); // no duplicate account

    const customer = await findCustomerByPhone(phone);
    expect(customer!.id).toBe(firstVisitCustomer!.id);
    expect(customer!.date_of_birth?.slice(0, 10)).toBe('1990-01-20'); // preserved
    expect(customer!.anniversary_date?.slice(0, 10)).toBe('2015-11-02'); // newly added
    expect(secondSale.customer_id).toBe(firstVisitCustomer!.id);
  });

  it('does not create a customer record when neither date is given', async () => {
    const staffId = await createStaff();
    const product = await createProduct({ stock: 5, priceInr: 500 });
    const phone = '9000000003';

    await createSale(
      {
        customerName: 'Walk-in',
        customerPhone: phone,
        items: [{ type: 'product', id: product.id, quantity: 1, discountInr: 0 }],
        discountInr: 0,
        payments: [{ method: 'cash', amountInr: 500 }],
      },
      staffId
    );

    expect(await findCustomerByPhone(phone)).toBeNull();
  });
});
