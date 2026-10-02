import { describe, expect, it } from 'vitest';
import { calculateBill } from './_core/billing';

describe('billing calculations', () => {
  it('calculates hourly charges correctly', () => {
    const result = calculateBill({
      pricingType: 'hourly',
      hourlyRate: 5,
      durationMinutes: 90,
      additionalCharges: [{ name: 'Printing', amount: 2 }],
      discountAmount: 1,
    });

    expect(result.baseCharge).toBe(7.5);
    expect(result.additionalCharges).toBe(2);
    expect(result.discountAmount).toBe(1);
    expect(result.totalAmount).toBe(8.5);
  });

  it('uses fixed package pricing when provided', () => {
    const result = calculateBill({
      pricingType: 'fixed',
      fixedPackagePrice: 20,
      durationMinutes: 120,
      additionalCharges: [{ name: 'Snack', amount: 3 }],
    });

    expect(result.baseCharge).toBe(20);
    expect(result.totalAmount).toBe(23);
  });
});
