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
| [2](results/run-02-output.txt) | 2026-11-11 | claude-haiku-5-5 | all 3 bugs | none (repeat of run 1, to see how much runs differ) | 2 of 3 | 0 | 14 | 80,826 / 6,937 | token budget (80,000) |
| [3](results/run-03-output.txt) | 2026-11-11 | claude-haiku-5-5 | no bugs | none (same prompt, correct page, to measure false alarms) | n/a (0 bugs exist) | 0 | 13 | 82,721 / 5,976 | token budget (80,000) |

## Summary of runs 1 and 2

Two runs with no change in between gave the same result: the same two bugs found, the same bug missed, no false alarms, 14 steps
and a stop on the token budget both times. The token counts differ by about 1% (88,728 and 87,763).
The agent is not random here: the miss and the budget problem are systematic, so they come from the prompt and the design, not from luck.
Two runs are still a small sample. The eval in step 6 will repeat runs automatically.

## Summary of run 3 (correct page)

On the page without bugs the agent reported nothing: 0 false alarms. It tested validation (121, -1, 120, 12.5 and an empty field) and the age borders
without inventing problems. It also ended on the token budget, so the budget is hit whether or not there is anything to find.
Together with runs 1 and 2 this is the **baseline** to beat: on the buggy page 2 of 3 bugs, about 14 steps and about 88,000 tokens;
on the correct page 0 false alarms, 13 steps and about 88,700 tokens.

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

## Run 2: a repeat, no changes

**Found:** the same two bugs. **Missed:** the same one, `limit-off-by-one`. The agent reached 8 tickets but never tried an 11th.

**Reloaded the page twice** (steps 6 and 9) to start from an empty order. Every reload means adding visitors again, which costs steps and tokens.

**A silent mistake in a tool call (step 9):** the model called `fill` without the `text` argument. The tool schema says `text` is required,
but our code treats a missing `text` as an empty string (this is on purpose for clearing a field), so the call "succeeded" and cleared the field.
In run 1 the same kind of mistake (`click` without `name`) was caught, because that argument is checked. Lesson: a tool should check its input
against its own schema, and decide deliberately which arguments may be empty.
Tracked as issue #9 (planned for step 5).

## Run 3: correct page, no changes

**Reported:** nothing. This is the right answer for a page without bugs.

**Probably tried an 11th ticket without meaning to:** before the first reload (steps 2 to 8) the output shows 11 clicks on "Add visitor"
(ages 0, 5, 6, 17, 18, 64, 65, then 30 four times). The limit is 10, so the 11th click should have been refused with "Maximum 10 tickets per order.".
The output does not show the page text (snapshots are printed as `- main: ...`), so this is not confirmed. Check in the trace:
`grep "Maximum" runs/<run folder>/trace.jsonl`. If the message is there, the agent saw the limit work on the correct page by accident.
On the buggy page it never reached 11 tickets in one order, because it reloaded the page and started over.

**The same kind of mistake again (step 11):** `click` without `name`, refused with `ERROR: Missing or empty argument "name"`, corrected at step 12.
It happened in runs 1 and 3, and a missing `text` in `fill` in run 2 (issue #9). In all three the model had just asked for many `fill` and `click` calls in one reply.
So the model drops an argument from time to time, and the quality of the tool errors matters.

**Ideas to try next, one at a time (not done yet):**

1. Prompt: tell the agent to try one more than every limit.
2. Context: keep only the latest snapshot in the conversation instead of all of them.
3. Cost: prompt caching for the part that repeats (system prompt, spec, tools).
4. Efficiency: a smaller snapshot, or fewer snapshots per step.
5. Tools: check required arguments against the tool schema, so a missing argument is an error the model can read.
6. Prompt: tell the agent that a reload is expensive and that the order is empty only after a reload.

Change one thing per run, so the table shows what helped.
