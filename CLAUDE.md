# qa-agent-mini

A tiny QA agent, built step by step to learn how agents are made. Every step must be easy to understand.

## How we work

- Follow the roadmap in `README.md`. One step = one branch = one pull request. Do not build ahead of the current step.
- Go slowly. If something is not obvious, explain it, do not add more code.
- Every file starts with a comment saying what it is for. Comment non-obvious lines in plain, simple English.
- Everything in the repo (code, comments, README, PRs, commits) is in English. Talk to the owner in Czech.
- The full procedure for a step is the project skill `.claude/skills/qa-agent-mini-step/SKILL.md`.
- Pull request description always has four parts: what changed, what problem it solves, how to test it locally, what the risk is.

## Commands

```bash
npm install
npm test                 # unit tests, no API key, no network
npm run typecheck
E2E=1 npm test           # also runs the real browser test
npm run target -- --bugs=all    # the demo page on http://127.0.0.1:4173
npm run hands            # the agent's tools used by hand
```

If Playwright cannot download its browser, set `QA_AGENT_BROWSER_PATH` to an installed Chrome.

## Rules for the code

- Unit tests must never call a real LLM or need an API key. Use a fake LLM and a fake browser.
- Only `src/llm.ts` (the real client arrived in step 4) may talk to the Anthropic API.
- Safety rules (allowed hosts, step and token limits) live in code, not only in the prompt.
- Money is kept in integer cents.
- The three planted bugs and `SPEC.md` are the ground truth for the eval. If you change one, change the others and the tests.
- In `target/index.html`, never write the placeholder name for the bug list inside a comment: the server replaces only its first occurrence.

## Before saying a step is done

Run `npm run typecheck` and `npm test`. If the page, the browser wrapper or the tools changed, also run `E2E=1 npm test`.
Say honestly what was verified and what was not (for example: nothing was tested against the real Anthropic API).
