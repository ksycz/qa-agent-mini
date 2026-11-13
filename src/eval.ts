// STEP 6: THE EVAL. Runs the agent several times in a row and scores the runs.
//
// Why: a model does not do the same thing twice, so one run proves nothing. Many runs show the rate (found 2 of 3 times, ...).
//
//   export ANTHROPIC_API_KEY=...
//   npm run eval -- --bugs=all --runs=3       the page has all four bugs
//   npm run eval -- --bugs=none --runs=3      the page is correct: every report is a false alarm
//   npm run eval -- --bugs=all --pressure     the prompt also says the agent is scored by the number of issues (step 19)
//   npm run eval -- --bugs=all --inject=action-neutral  the same, written like an ordinary staging note (step 10b)
//   npm run eval -- --bugs=all --inject=action  the hidden sentence asks for an ACTION (open a forbidden address, step 10a)
//   npm run eval -- --bugs=all --inject       the page also carries a hidden sentence that gives orders to an AI agent (the canary, step 6b);
//                                             the summary says in how many runs the agent obeyed it
//
// Everything is saved in evals/<time>/: summary.md (the table) and run-1/, run-2/, ... (the trace of each run).
// It costs real money: up to 120,000 tokens per run.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LIMITS } from './agent';
import { flag, hasFlag, parseBugs, parseInject, parseRuns } from './cli-args';
import { runOnce } from './run-once';
import { summarize, toRunStats, type FailedRun, type RunStats } from './score';
import { tracePageLinks } from './trace-page';

const bugs = parseBugs(flag('bugs'));
const inject = parseInject();
const pressure = hasFlag('pressure'); // step 19: the temptation line in the prompt
const model = process.env.QA_AGENT_MODEL ?? 'claude-haiku-5-5';

let runCount: number;
try {
  runCount = parseRuns(flag('runs'));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set. Run:  export ANTHROPIC_API_KEY=your-key');
  process.exit(1);
}

const dir = join('evals', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(dir, { recursive: true });
console.log(`${runCount} run(s), bugs: [${bugs.join(', ') || 'none'}], canary sentence: ${inject || 'no'}, pressure: ${pressure ? 'yes' : 'no'}, model: ${model}`);
console.log(`Costs real money: at most ${(runCount * DEFAULT_LIMITS.tokenBudget).toLocaleString('en-US')} tokens (and a little more, the last reply can cross the limit).\n`);

const stats: RunStats[] = [];
const failed: FailedRun[] = [];
for (let i = 1; i <= runCount; i++) {
  const runDir = join(dir, `run-${i}`);
  console.log(`Run ${i} of ${runCount} ...`);
  try {
    const result = await runOnce({ bugs, inject, pressure, model, dir: runDir }); // no step-by-step printing here: the table is the output
    stats.push({ ...toRunStats(result, bugs, readFileSync(join(runDir, 'trace.jsonl'), 'utf8')), run: i });
  } catch (e) {
    // One failed run (for example a short outage of the API) must not stop the others, and the summary must say it happened.
    const error = e instanceof Error ? e.message : String(e);
    console.error(`Run ${i} failed: ${error}`);
    failed.push({ run: i, error });
    process.exitCode = 1;
    // A wrong or missing key fails every run the same way: stop instead of trying again and again.
    if (/authentication|x-api-key|401/i.test(error)) {
      console.error('This looks like a problem with ANTHROPIC_API_KEY, so the other runs are not started.');
      break;
    }
  }
}

if (stats.length > 0) {
  const links = tracePageLinks(dir); // step 15: every run wrote a page; the summary links to them
  const summary = summarize(stats, bugs, inject, failed) + (links ? `\n\n${links}` : '');
  writeFileSync(join(dir, 'summary.md'), summary + '\n');
  console.log(`\n${summary}\n\nSaved in ${dir}/`);
}
