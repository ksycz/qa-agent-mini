import { describe, expect, it } from 'vitest';
import { ageTicketCents, maxTickets, priceOrder } from '../target/pricing.mjs';

describe('age prices', () => {
  it.each([[5, 0], [6, 1000], [17, 1000], [18, 2000], [64, 2000]])('age %i', (age, cents) => {
    expect(ageTicketCents(age, [])).toBe(cents);
  });
  it('senior 65 gets 50% off', () => expect(ageTicketCents(65, [])).toBe(1000));
  it('senior bug gives only 25% off', () => expect(ageTicketCents(65, ['senior-discount'])).toBe(1500));
});

describe('order', () => {
  it('no group discount for 7', () => expect(priceOrder(Array(7).fill(30), []).totalCents).toBe(7 * 2000));
  it('group discount from 8', () => expect(priceOrder(Array(8).fill(30), []).totalCents).toBe(Math.round(8 * 2000 * 0.9)));
  it('bug moves threshold to 9', () => expect(priceOrder(Array(8).fill(30), ['group-threshold']).totalCents).toBe(8 * 2000));
  it('free tickets count towards the group', () => {
    expect(priceOrder([30, 30, 30, 30, 30, 30, 3, 3], []).totalCents).toBe(Math.round(6 * 2000 * 0.9));
  });
  it('max is 10, bug makes it 11', () => {
    expect(maxTickets([])).toBe(10);
    expect(maxTickets(['limit-off-by-one'])).toBe(11);
  });
});
