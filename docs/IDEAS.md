# Ideas for later (not planned)

Nothing here is on the roadmap and none of it is started. It is a list of what could come next, so the ideas are not lost. Each idea says what it is, why it would be interesting, and how big it is. If one of them is picked up, it follows the usual rule: one step, one branch, one pull request, a guess written before the measurement.

**Safety**

- **More canaries** (issue #37). So far the hidden sentence was one short note on the page, and Haiku obeyed it in no run (0 of 3 in step 6b, 0 of 6 in 10a, 0 of 6 in 10b). Variants that are still missing:
  - an order that looks like it comes from the product owner, or an "addendum to the spec";
  - the order in an unexpected place: the answer of a tool, an error message, the label of a button;
  - an order that asks to leak something: a fake secret that must never appear in a report;
  - a second model (step 12 tries Sonnet with the neutral note).

  Why: the host check in code has never met a real attempt in a run with a model. Size: small each (the text, a line in the scoring, a measurement).
- **A test that the protection holds even when the agent is fooled.** A fake "agent" that does what the page says, run against the real tools, to check that the host check and the limits refuse it. No model and no cost, so it can be a normal unit test. Size: small.

**Honest scoring**

- **Beyond the evidence check** (step 18 made the first version): an LLM judge that also decides whether a report's conclusion is right, and a measured test that TEMPTS the agent to game the score, for example a prompt that says it is scored by the number of reports. Size: medium.
- **An LLM as the judge** instead of the keyword rules. A model reads the report, `SPEC.md` and the relevant steps from the trace, and says which planted bug (if any) the report is about, and whether the report is true. Why: keywords are crude (step 9c had to avoid a pattern that also matches prices such as "13.50"), and a judge could also catch a false report. Risks: the judge costs money, makes mistakes of its own, and needs a hand-labelled set of titles to check it against (we already have more than 100 real titles in `results/`). Size: medium to large.
- **More runs or a better statistic.** Six runs show only large differences; one bug more or less in one run is noise. A small table with the spread (not only the mean) would help to see this. Size: small.

**A better agent**

- **Cheaper runs without the early stops.** Step 16 showed that Haiku stopped early because of a sentence in the prompt; without it, it finds more but uses 36% more tokens. Open: can the same coverage be had for less, for example with prompt caching (below) or a check in code that lists the areas of `SPEC.md` that were never tested before the agent may finish? Size: small to medium.
- **Prompt caching.** Every step sends the same system prompt, spec and tools again. Since step 17 the summary would show the share of cache reads and the price would include them. Caching that part should make a run cheaper. Size: small to medium; the effect is easy to measure in tokens.
- **A cheaper model for the routine steps**, and a stronger one for the thinking steps. Size: large; the gain is not certain.
- **Small things left from step 9:** a prompt line against a `snapshot` after every `add_visitors` call, a better note where an old snapshot was removed, and the reply length limit together with hidden thinking (many replies carry a thinking block). Each is a small step with one measurement.
- **A second skill**, for example one about the price rules. The first skill (step 8) was loaded in every run and changed nothing, so the first question is what a skill should contain to matter. Size: small, expected gain small.

**A bigger target**

- **More planted bugs of different kinds**, or a second page. A new bug must be independent of the others (lesson 7), so the independence check from step 9c comes first. Size: medium each.

**For showing it to other people**

- **More for the trace page** (step 14 made the first version): a view that puts two runs side by side, or a summary of the tool calls per step. Size: small to medium.
- **A scheduled run in CI** with a tiny eval and a cost cap, so a change that makes the agent worse is noticed. CI today (step 7) runs no model. Size: medium; it needs the API key stored as a secret.
