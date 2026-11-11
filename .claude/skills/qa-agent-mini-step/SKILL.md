---
name: qa-agent-mini-step
description: Use when working on the qa-agent-mini repo: starting, building, testing or finishing a roadmap step and opening its pull request.
---

# Working on qa-agent-mini, one roadmap step at a time

qa-agent-mini is a tiny QA agent built step by step so its owner learns how agents are made.
The steps are listed in the Roadmap section of README.md. Follow this procedure for every step.

## Before you start

1. Read CLAUDE.md and the Roadmap in README.md. Find the next unchecked step. Build only that step.
2. If the previous step's pull request is not merged yet, branch from its branch and open the new PR against that branch. Say so at the top of the PR description.
3. Tell the owner in one or two sentences what this step adds and why it comes now.

## While you build

- Go slowly and keep the step small. If something is hard to explain, simplify the code rather than adding more.
- Every file starts with a comment saying what it is for. Comment every non-obvious line in plain, simple English.
- Everything in the repo (code, comments, README, commits, PRs) is in English. Talk to the owner in Czech.
- Never call a real LLM in a unit test. Use the fake model and the fake browser.
- Safety rules (allowed hosts, step and token limits) live in code, not only in the prompt.
- Keep SPEC.md, the planted bugs and the tests consistent. Change one, change all.
- In target/index.html, never write the placeholder name of the bug list inside a comment: the server replaces only its first occurrence.
- Add a short section for the step to README.md, tick the step in the Roadmap, and add the new files to the reading order in "How to read this repo".

## Before you say it is done

1. Run `npm run typecheck` and `npm test`. If the page, the browser wrapper or the tools changed, also run `E2E=1 npm test` (set QA_AGENT_BROWSER_PATH if Playwright cannot download a browser).
2. Run any demo script the step adds, and read the output.
3. State honestly what was verified and what was not. Example: "the loop is tested with a fake model; nothing was run against the real Anthropic API".

## Pull request

One step = one branch = one PR. Name the branch `step-N-short-name`. The description always has these four parts:

```
## What changed
(the files and the behaviour, short)

## What problem it solves
(why this step exists)

## How to test locally
(exact commands, and what the output should show)

## Risk
(what could break, and what is a first guess)
```

Open the PR and give the owner the link. Do not wait for GitHub checks.

## After the PR

Stop. Do not start the next step until the owner says the PR is merged, unless they explicitly ask you to work ahead.
Ask for their questions about the step first: the goal is that they understand it, not that the repo is finished.
