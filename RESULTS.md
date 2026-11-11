# Results of real runs

A log of every real run of the agent: what was changed, what happened, and what we learned.
Raw terminal output of each run is saved in `results/`. The full traces (`runs/`) stay on the local machine.

How to read the table:

- **Bugs found** is out of the 3 planted bugs (`senior-discount`, `group-threshold`, `limit-off-by-one`).
- **False alarms** are reported issues that are not planted bugs.
- **Steps** is the number of calls to the model. One step can contain several tool calls.
- **Tokens** is input + output. Input tokens grow quickly because every step sends the whole conversation again.

| Run | Date | Model | Page | Change since previous run | Bugs found | False alarms | Steps | Tokens (in / out) | Stopped because |
|---|---|---|---|---|---|---|---|---|---|
| [1](results/run-01-output.txt) | 2026-11-11 | claude-haiku-5-5 | all 3 bugs | none (first run, this is the baseline) | 2 of 3 | 0 | 14 | 82,650 / 6,078 | token budget (80,000) |

## Run 1: the baseline

**Found:** `senior-discount` (age 65 pays €15.00 instead of €10.00) and `group-threshold` (8 tickets get no 10% discount).

**Missed:** `limit-off-by-one` (an 11th ticket can be added). The agent never tried to add an 11th ticket.

**Why it was missed:** the system prompt suggests testing 7, 8 and 10 tickets but never 11. The agent did what the prompt said.
The limit can only be tested by trying to go one over it.

**Why the token budget ran out:** every step sends the whole conversation again, including all earlier page snapshots.
A snapshot grows with every visitor added, so each step costs more than the one before. The limit from step 3 stopped the run as designed.
The budget is checked after a reply, so the run ended slightly over 80,000.

**What worked:** at step 9 the model called `click` without the `name` argument. The tool returned `Missing or empty argument "name"` as text,
and the model corrected the call at step 10. The loop did not crash.

**Ideas to try next, one at a time (not done yet):**

1. Prompt: tell the agent to try one more than every limit.
2. Context: keep only the latest snapshot in the conversation instead of all of them.
3. Cost: prompt caching for the part that repeats (system prompt, spec, tools).
4. Efficiency: a smaller snapshot, or fewer snapshots per step.

Change one thing per run, so the table shows what helped.
