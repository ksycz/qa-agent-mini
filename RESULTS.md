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

## Baseline v2: page with "Clear order" and a full trace

The page changed (PR #11: "Clear order" button, new section in `SPEC.md`) and the trace now keeps whole results (PR #10).
Runs 1 to 3 above belong to the old page, so a new baseline is measured with three runs on `--bugs=all`. Rows are added as the runs come in (runs 4 to 6).

| Run | Date | Model | Page | Bugs found | False alarms | Steps | Tokens (in / out) | Reloads | Stopped because |
|---|---|---|---|---|---|---|---|---|---|
| [4](results/run-04-output.txt) | 2026-11-11 | claude-haiku-5-5 | all 3 bugs, v2 | 1 of 3 | 0 | 8 | 33,558 / 3,886 | 0 | repeated call (issue #12) |
| [5](results/run-05-output.txt) | 2026-11-11 | claude-haiku-5-5 | all 3 bugs, v2 | 1 of 3 | 0 | 8 | 30,044 / 3,231 | 0 | repeated call (issue #12) |
| [6](results/run-06-output.txt) | 2026-11-11 | claude-haiku-5-5 | all 3 bugs, v2 | 1 of 3 | 0 | 9 | 36,168 / 4,105 | 0 | repeated call (issue #12) |

### Run 4 (baseline v2, first run)

**Found:** `senior-discount`. **Missed:** `group-threshold` and `limit-off-by-one`. The agent never had more than 5 tickets in one order, so it never reached the group discount (8) or the limit (10).

**The new button was used well:** the agent clicked "Clear order" three times (steps 5, 7 and 8) and did not reload the page after the first load. In runs 1 to 3 it reloaded 2 to 3 times.

**Fewer steps and tokens, but not a fair comparison yet:** 8 steps and about 37,400 tokens, against 13 to 14 steps and about 88,000 before.
Part of the saving is real (no reloads and no re-adding of visitors). Part is only because the run was cut short: it stopped on `repeated_call` at step 8 of 25,
before the interesting tests. The stop is tracked in issue #12: the guard fired on three identical "Add visitor" clicks in one reply, before the model could see any result.

### Run 5 (baseline v2, second run)

Same result as run 4: only `senior-discount` found, 0 false alarms, 0 reloads, stopped by `repeated_call` after 8 steps (30,044 / 3,231 tokens).
Step 8 was again: click "Clear order", fill 30, click "Add visitor" twice. The third identical click triggered the guard.
Both v2 runs ended at the same point, so the guard (issue #12) is systematic. The agent never had more than 5 tickets, so neither the group discount (8) nor the limit (10) was reached.

### Run 6 (baseline v2, third run)

**Found:** `senior-discount` (reported at step 8, after testing ages 65 and 66). **Missed:** `group-threshold` and `limit-off-by-one`. 0 false alarms, 0 reloads.
It stopped on `repeated_call` after 9 steps (36,168 / 4,105 tokens).

**Same stop as runs 4 and 5.** Step 9 was: fill 30, then "Add visitor" three times in one reply. The guard counts identical calls in a row
(`maxRepeatedCalls: 3` in `src/agent.ts`) and fires on the third one, before any result comes back. The terminal output shows only two clicks
because the guard returns before the third call is logged. This is issue #12 again.

**One difference from runs 4 and 5:** this time the agent did build an order of 8 tickets (ages 30, 0, 5, 6, 17, 18, 64, 65 in steps 2 to 5),
which is the size where the group discount should apply. It did not report `group-threshold`.
The terminal output hides the page snapshots (`- main: ...`), so from the paste alone I cannot say whether the snapshot showed a missing discount that the model overlooked,
or whether the model never looked at the total. The answer is in the trace (`runs/2026-11-11T16-42-27-746Z/`, kept only on the local machine). Not checked yet.
The 10-ticket limit was not reached in this run.

## Conclusion of baseline v2

Three runs, three times the same stop: only `senior-discount` found, 0 false alarms, 0 reloads, 8 to 9 steps, 30,000 to 36,000 input tokens.
The guard (issue #12) ends every run in the same place, before the limit (10 tickets) is reached. So baseline v2 mainly measures the guard, not the agent's coverage.
Run 6 adds one open question: an order of 8 tickets was built, but the group discount was not reported. It is not yet clear if that is a coverage problem or a reading problem.
Better plan: fix issue #12 (and #9), then measure a baseline v3 with 3 runs.

## Baseline v3: the plan (written before the runs)

**What changed since baseline v2:** step 5 (PR #14). The stuck guard now means "same call, same result, same page", and the model gets a warning before a stop (issue #12).
A call without a required argument is an error (issue #9). The page and the prompt are the same as in baseline v2, and so is the model (`claude-haiku-5-5`).
Baseline v3 is the first baseline that is not cut short by the guard, so it is the one later changes are compared with.

**What we run: 4 runs, nothing changed between them.**

| Runs | Command | Page | Why |
|---|---|---|---|
| 7, 8, 9 | `npm run agent -- --bugs=all` | all 3 bugs | Does the agent find the bugs, and how much does that vary? |
| 10 | `npm run agent -- --bugs=none` | no bugs | Does the agent invent problems (false alarms) on the new page? |

**Why several runs, and why 3.** The model answers a little differently every time, so one run is an anecdote.
Runs 1 and 2 were almost identical, run 3 differed, and in baseline v2 only run 6 reached an order of 8 tickets.
Three runs show a first impression of what is typical and how much it varies. That is not statistics: three runs cannot prove that a change helped.
Step 6 repeats runs automatically and counts, so we can use many more. Until then, three is what we can afford by hand (each run takes a few minutes and about 30,000 to 90,000 tokens).

**Why one run without bugs.** False alarms were measured only on the old page (run 3: none). The page changed since, so we check once more.
One run is only a first signal. If it reports something, we look at the trace and repeat it before we believe it.

**What we measure in every run** (the same columns as in baseline v2): bugs found out of 3, false alarms, steps, tokens in and out, reloads, and why the run stopped.
Two more things we read from the trace in `runs/`, because they answer the questions left open by baseline v2:

- Did the stuck guard still end the run? Search the trace for `WARNING` (the model was warned) and look at how the model reacted.
- How many tickets did the biggest order have? The group discount starts at 8 tickets and the limit is 10, so we need to know whether the agent got there,
  and if it did, whether it read the total and noticed the missing discount.

**What we expect (guesses, written down before we see the results, so we cannot fool ourselves later):**

1. Runs end on `done` or on the token budget, not on `repeated_call` at step 8 or 9.
2. More steps and more tokens per run than in baseline v2 (30,000 to 36,000 input tokens), because the runs are no longer cut short.
3. At least some runs reach 8 or even 10 tickets, so they have a chance to find `group-threshold` and `limit-off-by-one`.
4. 0 false alarms on the page without bugs.

If a guess turns out wrong, that is a result too. We write what happened, not what we hoped for.

**How to record a run:** copy the terminal output into `results/run-NN-output.txt`, add a row to the table below, and write a short section about it.
Rows are filled in as the runs come in, one pull request for the whole baseline.

| Run | Date | Model | Page | Bugs found | False alarms | Steps | Tokens (in / out) | Reloads | Largest order | Stopped because |
|---|---|---|---|---|---|---|---|---|---|---|
| [7](results/run-07-trace.jsonl) | 2026-11-11 | claude-haiku-5-5 (assumed, see run 7) | all 3 bugs | 2 of 3 | 0 | 13 | 84,139 / 6,937 | 0 | 10 | token budget (80,000) |
| [8](results/run-08-trace.jsonl) | 2026-11-11 | claude-haiku-5-5 (assumed) | all 3 bugs (assumed) | 2 of 3 | 0 | 14 | 84,061 / 6,840 | 0 | 10 | token budget (80,000) |
| [9](results/run-09-trace.jsonl) | 2026-11-11 | claude-haiku-5-5 (assumed) | all 3 bugs (assumed) | 1 of 3 (2 more seen, not reported) | 0 | 9 | 47,961 / 5,862 | 0 | 11 | `done`, but the last reply was empty (see run 9) |
| [10](results/run-10-trace.jsonl) | 2026-11-11 | claude-haiku-5-5 (assumed) | no bugs (assumed) | n/a | 0 | 13 | 76,508 / 6,227 | 0 | 10 | token budget (80,000) |

### Run 7 (baseline v3, first run)

For this run we have the trace (`results/run-07-trace.jsonl`) and not the terminal output. The trace holds everything except the model name,
so "claude-haiku-5-5" is an assumption: it is the default, and the plan says nothing was changed. Idea for later: write the model name into the first trace line.

**Found 2 of 3:** `senior-discount` (step 6) and `group-threshold` (step 12). **Missed:** `limit-off-by-one`. **False alarms:** 0 (both reports match planted bugs). **Reloads:** 0.
13 steps, 84,139 / 6,937 tokens, stopped on the token budget.

**The guard did its job.** In step 8 the model sent 8 clicks on "Add visitor" in one reply. The field empties after every successful add, so clicks 2 to 8 hit an empty field.
Click 2 changed the page (the message "Enter an age from 0 to 120." appeared), clicks 3 and 4 changed nothing, so at click 4 the guard added its warning to the result.
It did not stop the run: the other four clicks were in the same step, and the model had not yet been able to read the warning. In step 9 the model did something different.
In runs 4 to 6 the old guard ended the run in this kind of situation. We cannot tell if the model reacted to the warning or only to the page (its text mentions the empty field, not the warning).

**The run reached what runs 4 to 6 could not:** an order of 8 tickets (all €20.00, no discount: the planted bug, found) and an order of 10 tickets (all €18.00).

**Why `limit-off-by-one` was missed:** the model did ask for the 11th ticket in step 13, but the token budget is checked before the tools of a reply are run, so that step never ran.
The broken batch of eight clicks (step 8) produced one ticket and cost 8,036 tokens (input and output of that step); steps 9 and 10 repeated the work properly. The token budget is now what ends the runs, as in runs 1 to 3.

**A cut-off reply, probably.** Step 9 used exactly 1,000 output tokens, which is `maxTokensPerReply`, and its last call, `click`, arrived with no arguments (`{}`).
The new argument check refused it with a readable message (`Missing argument "role"`), and the model corrected itself in step 10. That the reply was cut by the limit is a guess: the trace does not say why a reply ended.
If it is true, it would also explain the forgotten arguments in runs 1 to 3 (many calls in one reply). Idea for later: write the stop reason of every reply into the trace.

**Against the guesses in the plan:** (1) no `repeated_call`: true. (2) more steps and tokens than baseline v2: true (13 steps, 91,076 tokens in total). (3) orders of 8 and 10 tickets reached: true.
(4) no false alarms on the page without bugs: not measured yet (run 10).

One run is an anecdote. The next runs show whether the budget again ends the run before the 11th ticket.

### Run 8 (baseline v3, second run)

Again only the trace (`results/run-08-trace.jsonl`). The trace stores neither the model name nor the list of switched-on bugs, so "claude-haiku-5-5" and "all 3 bugs" are assumptions:
the plan says nothing was changed, and the two bugs found are planted ones.

**Found 2 of 3:** `senior-discount` (step 8) and `group-threshold` (step 13). **Missed:** `limit-off-by-one`. **False alarms:** 0. **Reloads:** 0.
14 steps, 84,061 / 6,840 tokens, stopped on the token budget. The largest order had 10 tickets.

**Almost the same story as run 7**, with different details:

- The senior bug was found at step 8 (run 7: step 6). The model also saw that age 120 costs €15.00, and treated it as the same bug instead of reporting it twice.
- The group discount: 8 adults at €20.00 each (reported), then 10 adults at €18.00 each. The model noticed that "the discount seems to start at 9 tickets, not 8" and planned to confirm that on a fresh order in step 14.
- **The same mistake as in run 7:** a batch of eight "Add visitor" clicks without refilling the age (step 10). The field is empty after each add, so only one ticket was added, and the guard warned at click 4 and did not stop the run.
  That step cost 8,461 tokens. The model understood the cause from the page ("the age field clears after each add") and refilled the field before each add in the next steps.
  Two runs out of two make the same mistake, so it is not a one-off. An idea for later: tell the agent in the prompt or in the `fill` description that the field is cleared after each add.

**A cut-off reply again.** Step 14 used exactly 1,000 output tokens (`maxTokensPerReply`) and its last call is `fill` with no `text` (`{"label":"Visitor age"}`). This time the budget stop came first, so the new argument check never saw it.
Together with run 7 (step 9: exactly 1,000 tokens, last call `click` with `{}`) this is two out of two. It strongly points to replies being cut off by the limit, but the trace still does not record why a reply ended, so it remains a hypothesis.

**`limit-off-by-one` again not tested, and again because of the budget.** Unlike run 7, the model was not about to try the 11th ticket in this run: its next planned step was to confirm the threshold of 8 against 9.
So we cannot say that one more step would have been enough.

**Runs 7 and 8 together:** 2 of 3 bugs both times, 0 false alarms, 0 reloads, 13 and 14 steps, about 91,000 tokens, stop on the token budget. The guard warned once in each run and never stopped a run.
Both runs were ended by the budget before the limit was tested. Run 9 and the run without bugs (10) are still to come.

### Run 9 (baseline v3, third run)

Again only the trace (`results/run-09-trace.jsonl`); model name and bug list are assumptions, as in runs 7 and 8.

**Reported 1 of 3:** `senior-discount` (step 8). **False alarms:** 0. **Reloads:** 0 ("Clear order" was not used at all). 9 steps, 47,961 / 5,862 tokens. The largest order had 11 tickets.
"Found" in this document means "reported with `report_issue`". By that count this is the worst run of baseline v3, but the page showed all three bugs to the agent:

- **`group-threshold`:** at step 5 the order had 8 tickets with no discount (total €90.00). In step 6 the model wrote "the prices look undiscounted", added a 9th and a 10th ticket and saw the 10% appear. It never reported the missing discount at 8.
- **`limit-off-by-one`:** at step 7 the model added an 11th ticket and the page accepted it with no message (total €135.00). In step 8 it wrote "the 11th ticket was also accepted with no limit message" and called `report_issue` twice.
  The first call (senior price) worked. The second arrived with no arguments (`{}`), and the argument check refused it (`Missing argument "title"`). The limit bug was never reported.
  (It reached the 11th ticket almost by accident: the age field still held "30" from the cut-off step 6, so a bare click on "Add visitor" added it.)

**The run ended on `done`, and that is wrong.** Step 9 used 1,000 output tokens (`maxTokensPerReply`) but its content is empty: no text and no tool call. The loop reads "no tool requested" as "the model is finished",
so it stopped with `done` after 9 steps. The model never said it was finished. Without this, the run had 16 steps and about 30,000 tokens of budget left.
Our code does not look at why a reply ended (`src/llm.ts` ignores the API's stop reason), so it cannot tell "finished" from "cut off".

**Cut-off replies: now clear enough to call it the main problem of baseline v3.** Across runs 7, 8 and 9, every reply that used exactly 1,000 output tokens ended in an incomplete call or in nothing
(run 7 step 9; run 8 step 14; run 9 steps 6, 8 and 9). That is five replies out of five. The trace does not record the stop reason, so this is still an inference, not a proof.
There is a second clue: many replies use far more output tokens than their visible content needs (run 9, step 7: 982 tokens for about 45 words and two short calls).
`fromAnthropicContent` in `src/llm.ts` drops every block that is not text or a tool call (for example "thinking" blocks), so such blocks, if the model produces any, use up the 1,000 tokens and we never see them.
That is a guess too. Both guesses can be checked cheaply by writing the stop reason and the types of all returned blocks into the trace.

**The guard did not fire at all in this run** (no `WARNING` in the trace): the model did not send a batch of identical clicks.

**Runs 7, 8 and 9 together (page with 3 bugs):**

| | Run 7 | Run 8 | Run 9 |
|---|---|---|---|
| Reported | 2 of 3 | 2 of 3 | 1 of 3 |
| Seen on the page | 3 of 3 (11th ticket asked for, not run) | 2 of 3 | 3 of 3 |
| Steps | 13 | 14 | 9 |
| Tokens (in + out) | 91,076 | 90,901 | 53,823 |
| Replies cut at 1,000 tokens | 1 | 1 | 3 |
| Stopped because | token budget | token budget | `done` (empty reply) |

What we can say with three runs: the stuck guard no longer decides the outcome (it warned in two runs and stopped none), and the agent now tests all the areas.
What decides the outcome now is what happens inside a reply: replies are cut off, calls arrive without arguments, and one run ended by mistake.
Run 10 (page without bugs) is still to come. Fixing the cut-off replies is a new change and gets its own pull request, measured against these runs.

### Run 10 (baseline v3, page without bugs)

Again only the trace (`results/run-10-trace.jsonl`); model name and bug list (none) are assumptions, but every price and message on the page matches `SPEC.md`, so the page was the correct one.

**Reported nothing: 0 false alarms.** That is the right answer. The agent checked 30, 65, 5, 6, 17, 18, 64, 120, 121, -1 and 12.5 and compared every one with the specification,
then 7, 8 and 10 adults (€140.00, €144.00 with €18.00 each, and the message "Maximum 10 tickets per order.") and read the 11th ticket as refused.
13 steps, 76,508 / 6,227 tokens, stopped on the token budget. 0 reloads. Largest order: 10 tickets.

**The same pattern as in runs 7 and 8:** at step 8 the model sent seven "Add visitor" clicks without refilling the age field (one ticket added, 7,311 tokens for that step), the guard warned at click 4 and did not stop the run,
and the model corrected itself in step 9.

**Two replies cut off at exactly 1,000 output tokens.** Step 9 ended with `click` without `name` (the argument check refused it, the model repeated the work in step 10).
Step 13 ended with `fill` with no arguments, and the budget stop came first. The model had just written a good test plan in that reply:
a mixed order of 8 (one aged 12, one aged 65, one aged 3, five adults), expected total €9 + €9 + €0 + 5 × €18 = €108.00. That test never ran.

## Baseline v3: the result

| | Run 7 | Run 8 | Run 9 | Run 10 (no bugs) |
|---|---|---|---|---|
| Reported | 2 of 3 | 2 of 3 | 1 of 3 | n/a |
| False alarms | 0 | 0 | 0 | 0 |
| Steps | 13 | 14 | 9 | 13 |
| Tokens (in + out) | 91,076 | 90,901 | 53,823 | 82,735 |
| Largest order | 10 | 10 | 11 | 10 |
| Guard warnings / stops | 1 / 0 | 1 / 0 | 0 / 0 | 1 / 0 |
| Replies cut at 1,000 tokens | 1 | 1 | 3 | 2 |
| Stopped because | token budget | token budget | `done` (empty reply) | token budget |

**By bug, over the three runs with bugs:** `senior-discount` reported 3 of 3, `group-threshold` 2 of 3, `limit-off-by-one` 0 of 3 (in run 9 the agent saw it and the report was lost in a cut-off reply).
Three runs are a small sample, so these are rough numbers, not rates.

**What baseline v3 says**

1. **The stuck guard is fixed.** It warned in 3 of 4 runs and stopped none. The runs now reach orders of 8 and 10 tickets. The first three guesses in the plan came true (no `repeated_call`, more steps and tokens than v2, orders of 8 and 10 reached).
2. **No false alarms** in 4 runs: all 5 reported issues are planted bugs, and on the page without bugs the agent reported nothing (the fourth guess, from a single run).
3. **Cut-off replies are the main loss.** Every reply with exactly 1,000 output tokens (7 of 7, across runs 7 to 10) ended in an incomplete last call or in nothing, and none of the shorter replies had an incomplete call.
   They cost a lost report (run 9), a wrong `done` (run 9), and the last planned test of runs 8 and 10. The cause (the 1,000-token limit, or hidden blocks that use up tokens) is still a guess: the trace does not record why a reply ended (issue #17).
4. **The token budget ends most runs** (3 of 4), with tests still planned.
5. **A repeated mistake:** a batch of "Add visitor" clicks without refilling the age field (runs 7, 8 and 10). Each time it costs one step of about 7,300 to 8,500 tokens.

**Note:** traces written after the change for issue #17 contain the model, the bugs, the stop reason and the block types of every reply. Runs 7 to 10 do not, so those facts are assumptions or inferences above.

**Candidates for the next steps, each its own pull request, measured against these four runs:**

- issue #17: record the model, the bugs and why each reply ended (no change in behavior, so it keeps runs comparable, and it checks the guess in point 3);
- issue #18: a cut-off reply must not count as `done` or run as a half call;
- the size of `maxTokensPerReply`, and a prompt line asking for shorter replies and smaller batches;
- a prompt or tool-description line saying that the age field is cleared after each add;
- trimming old snapshots, to make the token budget last longer.

### Run 11 (the first run with diagnostics, all three bugs)

An extra sample taken after the change for issue #17 (PR #19). The agent code behaves exactly as in baseline v3, so this run is comparable with runs 7 to 9.
The trace (`results/run-11-trace.jsonl`) now says what the earlier ones only let us guess: model `claude-haiku-5-5`, bugs `senior-discount`, `group-threshold`, `limit-off-by-one`.

**Result:** 13 steps, 85,421 input and 7,495 output tokens, stopped on the token budget, 1 issue reported (`senior-discount`). 0 false alarms.
The guard warned once (step 10, a batch of identical "Add visitor" clicks, 9,949 tokens in that one step) and stopped nothing.

**What the new fields showed**

1. **Cut-off replies are real.** Step 5 ended with `stopReason: max_tokens` at exactly 1,000 output tokens, and its last call was `click` with no arguments
   (the argument check refused it: `Missing argument "role"`). The guess from runs 7 to 10 is now a fact.
2. **Hidden "thinking" blocks exist.** 10 of 13 replies contained one. Our code drops it (`fromAnthropicContent` keeps only text and tool calls), but it still counts as output tokens.
   Replies without one cost about 55 output tokens per tool call. Replies with one cost about 200 to 450 tokens more than their visible content would need (steps 3, 7, 10, 11 and 12).
   This is an estimate from the trace, not a measurement: the text of the hidden block is not recorded.
3. **A correct report was thrown away by the token budget.** After step 12 the total was 79,656 tokens (limit 80,000). Step 13 was a complete reply that included a correct `report_issue` for `group-threshold`
   and brought the total to 92,916. The budget check runs right after the model reply, before its tools run, so the run stopped and that report never reached the list (issues: 1, not 2).
   Running the tools costs no tokens, so this loss is not needed. Tracked as issue #20.
4. **Input is the cost.** 85,421 of 92,916 tokens (92%) are input: every step sends the whole conversation, including all earlier page snapshots, again.

| | Run 7 | Run 8 | Run 9 | Run 11 |
|---|---|---|---|---|
| Reported | 2 of 3 | 2 of 3 | 1 of 3 | 1 of 3 (a 2nd was lost to the budget check) |
| Steps | 13 | 14 | 9 | 13 |
| Tokens (in + out) | 91,076 | 90,901 | 53,823 | 92,916 |
| Guard warnings / stops | 1 / 0 | 1 / 0 | 0 / 0 | 1 / 0 |
| Replies cut at 1,000 tokens | 1 | 1 | 3 | 1 |
| Stopped because | token budget | token budget | `done` (empty reply) | token budget |

**Candidates after this run** (each its own pull request): run the tools of the last reply before the budget stop (issue #20); issue #18 (a cut-off reply is not `done`, and its half call is not run);
the size of `maxTokensPerReply` and the hidden thinking; trimming old snapshots (the largest lever, because input is 92% of the cost).

## Baseline v4: after reply handling, measured with the eval

**What changed since baseline v3:** the trace diagnostics (PR #19), reply handling (PR #22: a cut-off reply is not `done`, its half call is not run, the tools of the last reply run before the budget stop),
and the eval (PR #24, `npm run eval`). Prompt, limits, model (`claude-haiku-5-5`) and the page are the same.
Honest note: unlike for baseline v3, we did not write our guesses down before measuring. What follows is only what the numbers show.

**What we have**

- Run 12 (bugs all) and run 13 (no bugs): single runs with a full trace (`results/run-12-trace.jsonl`, `results/run-13-trace.jsonl`), taken before the eval existed.
- The first two evals, 3 runs each: bugs all (`results/eval-all-summary.md`) and no bugs (`results/eval-none-summary.md`). Only the summaries were kept, not the traces of these six runs, so we cannot look inside them.

### Run 12 and run 13

**Run 12 (bugs all):** 7 steps, 25,667 tokens, stopped on `done`, found 1 of 3 (`senior-discount`), 0 false alarms. Step 4 was cut off at 1,000 tokens and its last call was `fill {}`.
There is no `tool_error` for it in the trace, so the half call was not run, as intended. After the report the model stopped by itself and wrote that it had run out of step budget.
That was not true: it had used 7 of 25 steps and about a third of the tokens. Its own summary listed the limit, the group discount, validation and "Clear order" as not tested.
This is a different failure from run 9 (there the reply was cut off and empty). One run cannot say whether the new line about cut-off replies plays a part.

**Run 13 (no bugs):** 13 steps, 90,412 tokens, stopped on `token_budget`, 0 reports (correct). Step 12 was cut off, its last call was `click` without `name`, and it was not run
(no `tool_error`). In step 13 the model wrote that the last add had not run, so it knew. The total was 77,600 tokens after step 12 and 90,412 after step 13, yet the `click` and `snapshot` of step 13 are in the trace
before the `stop` line: the tools of the reply that crossed the budget now run (issue #20 works). The usual batch of seven "Add visitor" clicks without refilling the age field happened again in step 7 (guard warning).

### The first evals

| | Baseline v3 (runs 7 to 9, before the fixes) | Baseline v4 eval (3 runs, all bugs) |
|---|---|---|
| `senior-discount` reported | 3 of 3 | 3 of 3 |
| `group-threshold` reported | 2 of 3 | 3 of 3 |
| `limit-off-by-one` reported | 0 of 3 | 1 of 3 |
| False alarms | 0 | 0 |
| Tokens per run (mean) | 78,600 | 83,368 |
| Steps per run (mean) | 12 | 12.7 |
| Stopped on the token budget | 2 of 3 | 2 of 3 (the third: `done` at 76,347) |
| Guard warnings / stops | 2 / 0 | 3 / 0 |

On the page without bugs: 0 false alarms in 3 eval runs (all stopped on the token budget at 87,228 to 91,913 tokens, one cut-off reply each), and 0 in run 13.

**What the numbers say, and what they do not**

1. **The reports are not lost any more in the way they were in run 9 and run 11,** and the agent found more bugs per run than in v3 (7 reports in 3 runs, against 5 in 3 runs). But the differences are one run each (group 2 of 3 against 3 of 3, limit 0 of 3 against 1 of 3).
   With three runs per side that is within the normal variation, so we do not claim the fixes caused it. Together with run 12, the 4 runs with bugs after the fixes give: senior 4 of 4, group 3 of 4, limit 1 of 4.
2. **No false alarms** in 8 runs on both pages after the fixes (3 + 3 evals, run 12 and run 13). In the all-bugs eval the keywords matched all 7 reported titles to the right bug (checked by eye).
3. **`limit-off-by-one` is the weak spot** (1 of 4). To report it the agent must build an order of 11, and most runs end before that. This is a guess: the eval summaries do not show why a run ended.
4. **The token budget still ends most runs** (5 of 6 eval runs, plus run 13), at 84,000 to 92,000 tokens. Input is about 92% of the tokens (run 11, run 13), because every step sends all old page snapshots again.
5. **Run 12 shows a new failure:** the model can stop early and name a wrong reason. One example; the eval will show how often it happens (a run ending on `done` with few steps).
6. **The guard warned in 6 of these 8 runs and stopped none.** The usual cause is a batch of "Add visitor" clicks without refilling the age field.

**Candidates for the next step, each its own pull request, measured with the eval against these numbers:**

- trimming old page snapshots from the conversation (the biggest lever, because input is 92% of the cost; more steps for the same budget may also help `limit-off-by-one`);
- a prompt line against stopping early and against batches of clicks without refilling the age field;
- the reply length limit and hidden thinking (10 of 13 replies in each of runs 11 and 13 had a thinking block).

## Step 6c: trimming old snapshots, the plan (written before the runs)

**The change:** the model sees only the newest page snapshot in full. Older snapshot results are replaced by a short note (`src/trim-snapshots.ts`). Everything else is as in baseline v4.

**How we measure:** `npm run eval -- --bugs=all --runs=3` and `npm run eval -- --bugs=none --runs=3`, compared with baseline v4. Baseline v4 for reference:
all bugs: senior 3 of 3, group 3 of 3, limit 1 of 3, 0 false alarms, 12.7 steps and 83,368 tokens per run (about 6,600 tokens per step), 2 of 3 runs ended on the token budget;
no bugs: 0 false alarms, 12.3 steps and 89,620 tokens per run (about 7,300 tokens per step), 3 of 3 runs ended on the token budget.
Three runs is a small sample, so only a clear difference counts.

**Our estimate of the saving** (from the traces of runs 11 and 13, a rough calculation, not a measurement): old snapshots are about 10,000 tokens of the 83,000 to 85,000 input tokens of such a run, maybe up to 20,000.

**Guesses (written before measuring):**

1. The runs get more steps for the same budget: 14 to 17 steps per run instead of 12.7. Fewer runs end on the token budget.
2. `limit-off-by-one` is found more often (2 of 3 or better), because more runs reach an order of 11. This is the weakest part of the guess: it assumes that running out of budget is what stops the agent before the limit test.
3. `senior-discount` and `group-threshold` stay at 3 of 3 (2 of 3 would still not worry us). False alarms stay at 0.
4. A possible harm: without old snapshots the model may call `snapshot` more often, or compare worse with what it saw earlier. If bugs found go down or tokens per run do not go down, we drop the change.

## Summary of runs 1 and 2

Two runs with no change in between gave the same result: the same two bugs found, the same bug missed, no false alarms, 14 steps
and a stop on the token budget both times. The token counts differ by about 1% (88,728 and 87,763).
Correction after run 3: this paragraph first said the miss was systematic and caused by the prompt. Run 3 shows that is too strong.
On the correct page the agent did test the limit (see run 3). So the agent can test the 11th ticket, but whether it does depends on the order
in which it happens to test things. Runs 1 and 2 happened to give the same result. The budget problem is systematic (all three runs hit it);
the missed limit bug is more likely a matter of coverage that varies from run to run. Three runs are a small sample:
the eval in step 6 repeats runs automatically.

## Summary of run 3 (correct page)

On the page without bugs the agent reported nothing: 0 false alarms. It tested validation (121, -1, 120, 12.5 and an empty field) and the age borders
without inventing problems. It also ended on the token budget, so the budget is hit whether or not there is anything to find.
Together with runs 1 and 2 this is the **baseline** to beat: on the buggy page 2 of 3 bugs, about 14 steps and about 88,000 tokens;
on the correct page 0 false alarms, 13 steps and about 88,700 tokens.

## Run 1: the baseline

**Found:** `senior-discount` (age 65 pays €15.00 instead of €10.00) and `group-threshold` (8 tickets get no 10% discount).

**Missed:** `limit-off-by-one` (an 11th ticket can be added). The agent never tried to add an 11th ticket.

**Why it was missed:** the agent never added an 11th ticket in this run. The system prompt suggests testing 7, 8 and 10 tickets but does not mention 11,
which may have contributed. The limit can only be tested by trying to go one over it. Run 3 shows the agent does sometimes try it, so the prompt is not the only reason.

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

**Tested the limit, and knew it (confirmed in the trace):** before the first reload the agent added 11 visitors (ages 0, 5, 6, 17, 18, 64, 65, then 30 four times).
The snapshot at step 8 shows `alert: Maximum 10 tickets per order.`, and the model wrote "Maximum check passes." in its next reply.
It then reloaded the page on purpose: "the 10-ticket limit would mask those results" (a full order hides the validation tests).
So on this run the limit test happened, on the correct page. On the buggy page in runs 1 and 2 the agent never built an order beyond 8 tickets in one go.
Reloads are the agent's way of emptying the order, because the page has no "clear order" button.

**The same kind of mistake again (step 11):** `click` without `name`, refused with `ERROR: Missing or empty argument "name"`, corrected at step 12.
It happened in runs 1 and 3, and a missing `text` in `fill` in run 2 (issue #9). In all three the model had just asked for many `fill` and `click` calls in one reply.
So the model drops an argument from time to time, and the quality of the tool errors matters.

**Ideas to try next, one at a time (not done yet):**

1. Prompt: tell the agent to try one more than every limit.
2. Context: keep only the latest snapshot in the conversation instead of all of them.
3. Cost: prompt caching for the part that repeats (system prompt, spec, tools).
4. Efficiency: a smaller snapshot, or fewer snapshots per step.
5. Tools: check required arguments against the tool schema, so a missing argument is an error the model can read.
6. Prompt: tell the agent that a reload is expensive and that the order is empty only after a reload. Or remove the reason for reloading: a "Clear order" button on the page, or a `reset` tool. Done: the button, in PR #11.
7. Trace: `tool_call` events keep only the first 500 characters of a tool result, so long snapshots are cut (the ticket list above was cut in the middle). Store the whole result in the trace, it is the main debugging tool. Done in PR #10.
8. Measurement: because coverage differs between runs, judge every change by at least 3 runs, not one. This is what the eval in step 6 automates.

Change one thing per run, so the table shows what helped.
