# qa-agent-mini

A tiny QA agent, built step by step to learn how agents are made.

## Step 1: the thing to test (no AI yet)

Before an agent can test anything, we need a page to test and a way to know the right answer.

- `target/pricing.mjs`: the pricing rules of a ticket calculator, with three bugs that can be switched on
  (`senior-discount`, `group-threshold`, `limit-off-by-one`).
- `target/index.html`: the page itself.
- `src/serve-target.ts`: starts the page locally. Also can inject a hidden instruction (used much later for a security test).
- `SPEC.md`: the written requirements. A bug is a difference between the page and this document.
- `test/pricing.test.ts`: normal unit tests that prove the rules and the planted bugs behave as we claim.

```bash
npm install
npm test
npm run target -- --bugs=all   # open http://127.0.0.1:4173 and find the bugs by hand
```

Try it by hand first, using `SPEC.md`: pick boundary values, work out the expected price yourself, then compare it with the page.
Whatever you can find manually is what the agent should later find too.
