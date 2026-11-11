# qa-agent-mini

A tiny QA agent, built step by step to learn how agents are made.

## Roadmap

Each step is a small pull request, so the history reads like a tutorial.

- [x] **Step 1: the thing to test.** A page with planted bugs, a written spec and unit tests. No AI yet.
- [ ] **Step 2: the hands.** A browser wrapper and a few tools (open page, snapshot, click, fill, report issue) with an allowed-hosts check. Run them by hand with `npm run hands`.
- [ ] **Step 3: the brain and the loop.** A small interface for the LLM and the agent loop with hard limits (steps, tokens, repeated calls). Tested with a fake LLM, so no API key and no cost.
- [ ] **Step 4: the first real run.** System prompt, the spec as the task, a trace file of everything the agent did. First `npm run agent` against the buggy page.
- [ ] **Step 5: guardrails and safety.** Prompt-injection canary on the page, tool errors returned to the model, API key handling.
- [ ] **Step 6: eval.** Score runs against the three planted bugs: detection rate, false positives, steps, tokens, cost. Repeat runs, because LLMs vary.
- [ ] **Step 7: CI.** Typecheck and unit tests on every pull request. No API key in CI.
- [ ] **Step 8: make it better.** Prompt caching, a cheaper model for routine steps, an LLM judge instead of keyword scoring, a fourth planted bug.

Rule for every step: run it, break it on purpose, and write down what you learned in the pull request.

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
