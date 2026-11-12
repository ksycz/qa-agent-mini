// PRICING RULES of the demo ticket calculator.
//
// This file is the "brain" of the page we test. It is plain JavaScript, so the browser can load it
// and our unit tests can import it. The page and the tests use the SAME code.
//
// IMPORTANT IDEA: the page can run with "bugs" switched on. A bug is just a name from the list below.
// With a bug switched on, one rule is calculated wrongly on purpose. This way we always know
// what the correct answer is (SPEC.md) and what the page does wrong, so we can measure the agent later.

// Money is kept in integer CENTS (2000 = €20.00).
// Reason: decimals like 0.1 + 0.2 give 0.30000000000000004 in JavaScript. Whole numbers are safe.
export const BASE_CENTS = 2000; // adult ticket: €20.00

// The normal limit of tickets in one order (see SPEC.md).
export const MAX_TICKETS = 10;

// The names of all bugs that can be switched on. Used to check typos in `--bugs=...`.
export const KNOWN_BUGS = ['senior-discount', 'group-threshold', 'limit-off-by-one', 'clear-keeps-count'];

// How many tickets one order may contain.
// `bugs` is a list of bug names, for example ['limit-off-by-one']. Default: no bugs.
export function maxTickets(bugs = []) {
  // BUG "limit-off-by-one": the page allows 11 tickets instead of 10.
  return bugs.includes('limit-off-by-one') ? MAX_TICKETS + 1 : MAX_TICKETS;
}

// The price of ONE ticket, based on the visitor's age only (no group discount yet).
export function ageTicketCents(age, bugs = []) {
  if (age < 6) return 0; // under 6: free
  if (age < 18) return Math.round(BASE_CENTS * 0.5); // 6-17: half price
  if (age >= 65) {
    // Seniors pay "factor" of the adult price. Correct: 0.5 (50% off).
    // BUG "senior-discount": the factor is 0.75, so the discount is only 25%.
    const factor = bugs.includes('senior-discount') ? 0.75 : 0.5; // seniors: 50% off
    return Math.round(BASE_CENTS * factor);
  }
  return BASE_CENTS; // 18-64: full price
}

// The price of the WHOLE order. `ages` is a list like [30, 65, 4], one number per visitor.
// `carried` = how many tickets the page still remembers from orders that were cleared before. Correct: always 0,
// because "Clear order" starts a new order from zero. The page only passes a number above 0 when the bug
// "clear-keeps-count" is on (see target/index.html).
// Returns the price of every ticket and the total.
export function priceOrder(ages, bugs = [], carried = 0) {
  // Group discount: from this many tickets on, every ticket gets 10% off.
  // Correct: 8 tickets. BUG "group-threshold": 9 tickets.
  const groupFrom = bugs.includes('group-threshold') ? 9 : 8;

  // Free tickets also count towards the number of tickets (see SPEC.md).
  // BUG "clear-keeps-count": the tickets of cleared orders are counted too (`carried` is above 0 only then).
  const group = ages.length + carried >= groupFrom;

  const tickets = ages.map((age) => {
    const afterAge = ageTicketCents(age, bugs); // first the age discount...
    // ...then, in a group, 10% off that price.
    return { age, cents: group ? Math.round(afterAge * 0.9) : afterAge };
  });

  // Add up all tickets. `reduce` walks through the list and keeps a running sum.
  return { tickets, totalCents: tickets.reduce((sum, t) => sum + t.cents, 0) };
}

// Turns 1890 into "€18.90". Used for display only.
export function formatEuro(cents) {
  return '€' + (cents / 100).toFixed(2);
}
