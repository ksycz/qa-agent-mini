---
name: boundary-value-testing
description: How to choose test values at the edges of ranges, thresholds and limits in a specification.
---
# Boundary value testing

Bugs hide at the edges of a rule, rarely in the middle. Use this when the specification has a range, a threshold, a limit or a price tier.

1. List every boundary in the specification. A range "from A to B" has two edges. A rule "N or more" has one edge. A limit "at most N" has one edge.
2. For each edge, test three values: just below it, exactly on it, just above it. For a range "A to B" that means A-1, A, A+1, B-1, B and B+1.
3. Counts are boundaries too. If a rule starts or stops at N items, build orders of N-1, N and N+1 items. If a tool can add several items in one call, use it: it is much cheaper than many single steps.
4. Also try the extremes the specification names (smallest, largest, empty, invalid) and one ordinary value in the middle.
5. Rules can combine. Test at least one combination where two rules meet at an edge.
6. Before each check, work out the expected result from the specification. Compare it with what the page shows. Report a problem only when they differ.

Example (not from our page): "a coupon works for orders of 50 to 500". Test 49, 50, 51, 499, 500 and 501.
