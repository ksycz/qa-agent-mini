// UNIT TESTS of the pricing rules (target/pricing.mjs).
//
// These tests check that the page's logic does what SPEC.md says, and that every planted bug
// really breaks what we claim it breaks. If a planted bug stopped working, the agent could not be measured.
//
// How to read this file:
//   describe('name', () => { ... })   a group of tests
//   it('what should happen', () => { expect(actual).toBe(expected) })   one test
//   it.each([...])                    the same test repeated for several inputs
// Run all tests with: npm test

import { describe, expect, it } from 'vitest';
import { ageTicketCents, isValidAge, maxTickets, priceOrder } from '../target/pricing.mjs';

describe('age prices', () => {
  // Each row is [age, expected price in cents]. We test the BORDERS between age groups:
  // 5 is the last free age, 6 the first half price, 17 the last half price, 18 the first full price...
  it.each([[5, 0], [6, 1000], [17, 1000], [18, 2000], [64, 2000]])('age %i', (age, cents) => {
    expect(ageTicketCents(age, [])).toBe(cents);
  });
  it('senior 65 gets 50% off', () => expect(ageTicketCents(65, [])).toBe(1000));
  // With the bug switched on, a senior pays 1500 (25% off) instead of 1000.
  it('senior bug gives only 25% off', () => expect(ageTicketCents(65, ['senior-discount'])).toBe(1500));
});

describe('order', () => {
  // Array(7).fill(30) means "seven visitors, each 30 years old".
  it('no group discount for 7', () => expect(priceOrder(Array(7).fill(30), []).totalCents).toBe(7 * 2000));
  it('group discount from 8', () => expect(priceOrder(Array(8).fill(30), []).totalCents).toBe(Math.round(8 * 2000 * 0.9)));
  // With the bug, 8 tickets get NO discount yet (the threshold moved to 9).
  it('bug moves threshold to 9', () => expect(priceOrder(Array(8).fill(30), ['group-threshold']).totalCents).toBe(8 * 2000));
  it('free tickets count towards the group', () => {
    // 6 adults + 2 small children = 8 tickets, so the 10% discount applies to the 6 paid tickets.
    expect(priceOrder([30, 30, 30, 30, 30, 30, 3, 3], []).totalCents).toBe(Math.round(6 * 2000 * 0.9));
  });
  it('max is 10, bug makes it 11', () => {
    expect(maxTickets([])).toBe(10);
    expect(maxTickets(['limit-off-by-one'])).toBe(11);
  });
});

describe('age validation', () => {
  // A valid age is a whole number from 0 to 120 (SPEC.md). Everything else is refused.
  it.each(['0', '5', '17', '65', '120'])('accepts %s', (raw) => expect(isValidAge(raw, [])).toBe(true));
  it.each(['', '-1', '121', '12.5', '0.5', 'abc'])('refuses "%s"', (raw) => expect(isValidAge(raw, [])).toBe(false));
  // With the bug, a decimal age passes. Everything else is still refused, so the bug is only about decimals.
  it('bug decimal-age-accepted lets 12.5 and 0.5 pass', () => {
    expect(isValidAge('12.5', ['decimal-age-accepted'])).toBe(true);
    expect(isValidAge('0.5', ['decimal-age-accepted'])).toBe(true);
  });
  it.each(['', '-1', '-0.5', '120.5', '121', 'abc'])('bug decimal-age-accepted still refuses "%s"', (raw) => {
    expect(isValidAge(raw, ['decimal-age-accepted'])).toBe(false);
  });
  it('the other bugs do not change the validation (they are independent of it)', () => {
    expect(isValidAge('12.5', ['senior-discount', 'group-threshold', 'limit-off-by-one'])).toBe(false);
  });
});
