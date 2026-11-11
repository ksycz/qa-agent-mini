# qa-agent-mini

A tiny QA agent, built step by step to learn how agents are made.

## What the agent will do

The agent is a small AI tester. You give it a web page and a written specification (`SPEC.md`). It works like a QA engineer would:

1. It opens the page in a real browser.
2. It tries things: types a visitor's age, clicks "Add visitor", reads the price on the page.
3. It works out what the price should be according to the spec, and compares.
4. When the page does something different from the spec, it reports an issue with the steps, the expected result and the actual result.
5. When it has tested enough, it stops and writes a short summary.

The page is a ticket price calculator with three bugs planted on purpose. Because we know the bugs, we can measure the agent:
how many bugs it finds, how many false alarms it raises, and how many steps, tokens and euros a run costs.

The agent decides what to test next. Our code does everything else: it runs the browser, blocks unsafe actions,
enforces limits on steps and cost, and records what happened.

**Where we are:** the page, the tools and the agent loop exist and are tested with a fake model. The real model comes in step 4 (see the roadmap below).


## How to read this repo

Every file starts with a comment that says what it is for, and the code is commented line by line.
Read the files in this order:

1. `SPEC.md`: what the page should do.
2. `target/pricing.mjs`: the rules, and where the three bugs are planted.
3. `target/index.html`: the page (the script at the bottom is the logic).
4. `src/serve-target.ts`: the small server that shows the page.
5. `test/pricing.test.ts`: how the rules are tested.
6. `src/browser.ts`: the browser, as the agent sees it (five actions).
7. `src/tools.ts`: the tools and the safety checks around them.
8. `src/hands.ts`: the tools used by hand. Run it and compare the output with the code.
9. `test/tools.test.ts` and `test/browser.e2e.test.ts`: tests with a fake and with a real browser.
10. `src/llm.ts`: how the code talks to a model (types only).
11. `src/fake-llm.ts`: a pretend model that returns prepared answers.
12. `src/agent.ts`: the agent loop and its limits. The most important file in the repo.
13. `src/loop-demo.ts`: the loop running with the fake model. Run it with `npm run loop`.
14. `test/agent.test.ts`: how the loop is tested.

## Roadmap

Each step is a small pull request, so the history reads like a tutorial.

- [x] **Step 1: the thing to test.** A page with planted bugs, a written spec and unit tests. No AI yet.
- [x] **Step 2: the hands.** A browser wrapper and a few tools (open page, snapshot, click, fill, report issue) with an allowed-hosts check. Run them by hand with `npm run hands`.
- [x] **Step 3: the brain and the loop.** A small interface for the LLM and the agent loop with hard limits (steps, tokens, repeated calls). Tested with a fake LLM, so no API key and no cost.
- [ ] **Step 4: the first real run.** System prompt, the spec as the task, a trace file of everything the agent did. First `npm run agent` against the buggy page.
- [ ] **Step 5: guardrails and safety.** Prompt-injection canary on the page, tool errors returned to the model, API key handling.
- [ ] **Step 6: eval.** Score runs against the three planted bugs: detection rate, false positives, steps, tokens, cost. Repeat runs, because LLMs vary.
- [ ] **Step 7: CI.** Typecheck and unit tests on every pull request. No API key in CI.
- [ ] **Step 8: make it better.** Prompt caching, a cheaper model for routine steps, an LLM judge instead of keyword scoring, a fourth planted bug.

Rule for every step: run it, break it on purpose, and write down what you learned in the pull request.

## Step 3: the brain and the loop (fake brain, real hands)

An agent is a loop: ask the model what to do, run the tool it asks for, give it the result, repeat until it says it is done.

- `src/llm.ts`: the contract for a model: send messages and a menu of tools, get back text and tool requests, plus token usage.
- `src/fake-llm.ts`: a pretend model with prepared answers, so the loop can be tested without an API key.
- `src/agent.ts`: the loop. The model only decides the next move; our code runs the tools and enforces the limits
  (number of steps, token budget, the same call repeated, long results). Tool errors go back to the model as text.
- `src/loop-demo.ts`: the real loop and real browser, driven by the fake model.
- `test/agent.test.ts`: tests for stopping, limits and errors.

```bash
npm run loop      # watch the loop: model asks, tool runs, result goes back
npm test
```

There is still no real AI. The loop does not change when we plug a real model in (step 4).

## Step 2: the hands (still no AI)

An agent is a model that decides which tool to call. Before adding the model, we build the tools and prove they work on their own.

- `src/browser.ts`: a tiny browser interface (open, snapshot, click, fill) on top of Playwright. The page is shown to the agent
  as a text tree of roles and names (an ARIA snapshot), which is much cheaper than a screenshot.
- `src/tools.ts`: the five tools the agent will get (`open_page`, `snapshot`, `click`, `fill`, `report_issue`), their descriptions,
  and the checks around them. The allowed-hosts check lives here, in code, not in a prompt. Long results are cut off.
- `src/hands.ts`: a script that calls the tools one by one, like the agent will, including calls that must fail.
- `test/tools.test.ts`: unit tests with a fake browser. `test/browser.e2e.test.ts` uses a real browser (`E2E=1 npm test`).

```bash
npm install
npx playwright install chromium     # once; or set QA_AGENT_BROWSER_PATH to an installed Chrome
npm run hands
```

Read the output. Notice that errors come back as plain text. In step 3 the model will receive them the same way and can react.

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
