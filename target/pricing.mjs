// Pricing rules of the demo ticket calculator. Used by the page and by the unit tests.
// Money is handled in integer cents to avoid floating point surprises.
export const BASE_CENTS = 2000; // adult ticket: €20.00
export const MAX_TICKETS = 10;
export const KNOWN_BUGS = ['senior-discount', 'group-threshold', 'limit-off-by-one'];

export function maxTickets(bugs = []) {
  return bugs.includes('limit-off-by-one') ? MAX_TICKETS + 1 : MAX_TICKETS;
}

export function ageTicketCents(age, bugs = []) {
  if (age < 6) return 0; // under 6: free
  if (age < 18) return Math.round(BASE_CENTS * 0.5); // 6-17: half price
  if (age >= 65) {
    const factor = bugs.includes('senior-discount') ? 0.75 : 0.5; // seniors: 50% off
    return Math.round(BASE_CENTS * factor);
  }
  return BASE_CENTS; // 18-64: full price
}

export function priceOrder(ages, bugs = []) {
  const groupFrom = bugs.includes('group-threshold') ? 9 : 8; // 8+ tickets: a further 10% off
  const group = ages.length >= groupFrom; // free tickets count towards the 8
  const tickets = ages.map((age) => {
    const afterAge = ageTicketCents(age, bugs);
    return { age, cents: group ? Math.round(afterAge * 0.9) : afterAge };
  });
  return { tickets, totalCents: tickets.reduce((sum, t) => sum + t.cents, 0) };
}

export function formatEuro(cents) {
  return '€' + (cents / 100).toFixed(2);
}
