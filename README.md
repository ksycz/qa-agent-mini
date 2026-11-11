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

## Why a custom agent, and not Playwright Test Agents?

Playwright ships ready-made agents (the planner, generator and healer set up with `npx playwright init-agents`).
They are a good choice when you want to get working tests quickly. We deliberately do not use them here.

The goal of this repo is to understand how an agent is built: the tools, the loop, the limits, the safety checks and the eval.
A ready-made agent hides those parts. By writing a small one ourselves, every part is visible, can be changed and can be measured.
This is a learning project, not a replacement for the Playwright agents.

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
    `src/stuck-guard.ts`: the one rule that notices when the agent goes round in circles (step 5).
13. `src/loop-demo.ts`: the loop running with the fake model. Run it with `npm run loop`.
14. `test/agent.test.ts`: how the loop is tested.
15. `src/prompt.ts`: what we tell the model (the standing instructions and the task).
16. `src/trace.ts`: the written record of a run.
17. `src/run.ts`: the first real run. The only file that starts everything together.
18. `src/llm.ts` again, the bottom part: the one place that calls the Anthropic API.

## Roadmap

Each step is a small pull request, so the history reads like a tutorial.

- [x] **Step 1: the thing to test.** A page with planted bugs, a written spec and unit tests. No AI yet.
- [x] **Step 2: the hands.** A browser wrapper and a few tools (open page, snapshot, click, fill, report issue) with an allowed-hosts check. Run them by hand with `npm run hands`.
- [x] **Step 3: the brain and the loop.** A small interface for the LLM and the agent loop with hard limits (steps, tokens, repeated calls). Tested with a fake LLM, so no API key and no cost.
- [x] **Step 4: the first real run.** System prompt, the spec as the task, a trace file of everything the agent did. First `npm run agent` against the buggy page.
- [x] **Step 5: guardrails.** A smarter stuck guard (same call + same result + same page, with a warning before the stop) and a check of required tool arguments against the tool schema. Fixes issues #12 and #9.
- [ ] **Step 5b: prompt-injection canary.** A planted instruction on the page (`--inject`) to see whether the agent obeys it, and API key handling.
- [ ] **Step 6: eval.** Score runs against the three planted bugs: detection rate, false positives, steps, tokens, cost. Repeat runs, because LLMs vary.
- [ ] **Step 7: CI.** Typecheck and unit tests on every pull request. No API key in CI.
- [ ] **Step 8: skills for the agent.** A `load_skill` tool and a `skills/` folder. The prompt lists only the skill names and one-line descriptions; the agent loads the full instructions only when it needs them. First skill: `boundary-value-testing`. Measure with the eval whether the agent finds more bugs, or spends fewer tokens, with the skill than without it.
- [ ] **Step 9: make it better.** Prompt caching, a cheaper model for routine steps, an LLM judge instead of keyword scoring, a fourth planted bug.

Rule for every step: run it, break it on purpose, and write down what you learned in the pull request.

## Step 5: guardrails

Two small fixes to things the first real runs showed us. Nothing new is added to the loop's shape.

**1. The stuck guard no longer stops good tests (issue #12).** In runs 4, 5 and 6 the guard ended the run at the same place, when the model asked for
three identical "Add visitor" clicks in one reply. The old rule only compared the calls, and it checked them before any result came back. Now:

- `src/stuck-guard.ts`: "stuck" means the same call, the same result and the same page text afterwards, again and again.
  Adding a visitor changes the page every time, so it is not stuck. Clicking a button that does nothing is.
- The first time the model is stuck it is not stopped. A warning is added to the tool result it reads next.
  It is stopped only if it repeats again in a later step.
- `src/agent.ts`: after each tool call the loop takes a snapshot of the page (free: it is not sent to the model) and asks the guard.

**2. A missing argument is an error, not an empty string (issue #9).** In run 2 the model called `fill` without `text`, and the call "succeeded" by clearing the field.
`runTool` in `src/tools.ts` now checks the input against the tool's own definition in `TOOL_DEFS`. Missing or non-text arguments are refused with a message the model can read.
Only `fill`'s `text` may be an empty string, because that is how a field is cleared.

```bash
npm run typecheck && npm test      # the new tests are in test/agent.test.ts and test/tools.test.ts
```

Nothing here was run against the real model yet. The effect on the agent is measured in the next step with a new baseline (v3), see [RESULTS.md](RESULTS.md).

## Step 4: the first real run

The loop from step 3 stays exactly the same. We replace the fake model with a real one and give it a task.

- `src/llm.ts`: now also contains the real client. It is the only code that calls the Anthropic API.
- `src/prompt.ts`: the system prompt (who the model is and how it must work) and the task. The task contains the page address and
  the text of `SPEC.md`, so the human, the agent and the repo all use the same spec.
- `src/trace.ts`: writes every model answer, tool call and error to `runs/<time>/trace.jsonl`.
- `src/run.ts`: starts the page and the browser, runs the agent, prints the issues it found.

You need an API key from https://console.anthropic.com and a little credit. Keep the key out of files:

```bash
export ANTHROPIC_API_KEY=your-key        # only in this terminal window
npm run agent -- --bugs=all              # the page has three bugs
npm run agent -- --bugs=none             # the page is correct: a good agent reports nothing
```

What to look at after a run:

1. The printed issues. Which of the three bugs did it find? Did it report anything that is not a bug (a false alarm)?
2. `runs/<time>/trace.jsonl`. Follow the run line by line: what did the model ask for, what did it get back?
3. The last line of the output: how many steps and tokens did the run use, and why did it stop?

Runs are not identical. Run it three times and write down what changed. Try `QA_AGENT_MODEL=<another model> npm run agent`.

Results of real runs, with what we changed and learned, are logged in [RESULTS.md](RESULTS.md).

After every `git pull` that changes `package.json`, run `npm install` again, otherwise new packages are missing.

The first version of the prompt is a first guess. Improving it, and measuring whether the change helped, is what steps 5 and 6 are for.

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
