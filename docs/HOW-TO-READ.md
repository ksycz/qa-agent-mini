# How to read this repo

Every file starts with a comment that says what it is for, and the code is commented line by line.
Read the files in this order:

1. `SPEC.md`: what the page should do.
2. `target/pricing.mjs`: the rules, and where the four bugs are planted.
3. `target/index.html`: the page (the script at the bottom is the logic).
4. `src/serve-target.ts`: the small server that shows the page.
5. `test/pricing.test.ts`: how the rules are tested.
6. `src/browser.ts`: the browser, as the agent sees it (five actions; `add_visitors` is built from them).
7. `src/tools.ts`: the tools and the safety checks around them.
8. `src/hands.ts`: the tools used by hand. Run it and compare the output with the code.
9. `test/tools.test.ts` and `test/browser.e2e.test.ts`: tests with a fake and with a real browser.
10. `src/llm.ts`: how the code talks to a model (types only).
11. `src/fake-llm.ts`: a pretend model that returns prepared answers.
12. `src/agent.ts`: the agent loop and its limits. The most important file in the repo.
    `src/agent-steps.ts`: the two halves of one round (ask the model, run the tools), and the limits (moved out of `src/agent.ts` in step 20).
    `src/stuck-guard.ts`: the one rule that notices when the agent goes round in circles (step 5).
13. `src/loop-demo.ts`: the loop running with the fake model. Run it with `npm run loop`.
14. `test/agent.test.ts`: how the loop is tested.
15. `src/prompt.ts`: what we tell the model (the standing instructions and the task).
16. `src/trace.ts`: the written record of a run.
17. `src/run.ts`: the first real run. The only file that starts everything together.
18. `src/llm.ts` again, the bottom part: the one place that calls the Anthropic API.
19. `src/run-once.ts` and `src/eval.ts`: one run, and many runs in a row (step 6). `src/score.ts`: how a run is scored. `src/cost.ts`: latency, run time and price of a run (step 17). `src/evidence.ts`: did the agent see what it reported (step 18).
20. `.github/workflows/ci.yml`: what runs on every pull request (step 7).
21. `src/skills.ts` and `skills/boundary-value-testing/SKILL.md`: the skills (step 8).
22. `src/trim-snapshots.ts`: cuts old page snapshots out of what the model sees (step 6c). `src/cli-args.ts`: reads the options `--bugs`, `--runs` and `--inject`.
23. `src/trace-to-html.ts`, `src/trace-page.ts` and `src/view-trace.ts`: turn one trace file into a web page you can read (steps 14 and 15). Every run writes its page by itself; for an older trace run `npm run trace -- <trace.jsonl>`.
24. The other tests: `test/llm.test.ts` (turning the API's answer into our blocks), `test/prompt.test.ts` (the prompts and the options), `test/trim-snapshots.test.ts`, `test/score.test.ts`, `test/skills.test.ts`, `test/trace-to-html.test.ts`, `test/trace-page.test.ts`, `test/cost.test.ts`, `test/evidence.test.ts` and `test/secrets.test.ts` (no API key in the repo).
25. `src/graph-agent.ts` and `test/graph-agent.test.ts`: the same loop built with LangGraph (step 20). Read it next to `src/agent.ts`.
26. `src/langchain-messages.ts` and `src/studio.ts` (with `langgraph.json`): the conversation in LangChain's format, and the agent prepared for LangGraph Studio (step 20b).
27. `src/overhead.ts`: how much time the loop itself costs, hand-written and LangGraph (step 21). Run it with `npm run overhead`.
