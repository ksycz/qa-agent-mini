// STEP 6: THE EVAL. Runs the agent several times in a row and scores the runs.
//
// Why: a model does not do the same thing twice, so one run proves nothing. Many runs show the rate (found 2 of 3 times, ...).
//
//   export ANTHROPIC_API_KEY=...
//   npm run eval -- --bugs=all --runs=3       the page has three bugs
//   npm run eval -- --bugs=none --runs=3      the page is correct: every report is a false alarm
//   npm run eval -- --bugs=all --inject       the page also carries a hidden sentence that gives orders to an AI agent (the canary, step 6b);
//                                             the summary says in how many runs the agent obeyed it
//
// Everything is saved in evals/<time>/: summary.md (the table) and run-1/, run-2/, ... (the trace of each run).
// It costs real money: up to 80,000 tokens per run.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LIMITS } from './agent';
import { flag, hasFlag, parseBugs, parseRuns } from './cli-args';
import { runOnce } from './run-once';
import { summarize, toRunStats, type RunStats } from './score';

const bugs = parseBugs(flag('bugs'));
const inject = hasFlag('inject');
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
console.log(`${runCount} run(s), bugs: [${bugs.join(', ') || 'none'}], canary sentence: ${inject ? 'yes' : 'no'}, model: ${model}`);
console.log(`Costs real money: at most ${(runCount * DEFAULT_LIMITS.tokenBudget).toLocaleString('en-US')} tokens (and a little more, the last reply can cross the limit).\n`);

const stats: RunStats[] = [];
try {
  for (let i = 1; i <= runCount; i++) {
    const runDir = join(dir, `run-${i}`);
    console.log(`Run ${i} of ${runCount} ...`);
    const result = await runOnce({ bugs, inject, model, dir: runDir }); // no step-by-step printing here: the table is the output
    stats.push(toRunStats(result, bugs, readFileSync(join(runDir, 'trace.jsonl'), 'utf8')));
  }
} catch (e) {
  // One failed run (for example a wrong key) must not throw away the runs that finished.
  console.error(`\nA run failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}

if (stats.length > 0) {
  const summary = summarize(stats, bugs, inject);
  writeFileSync(join(dir, 'summary.md'), summary + '\n');
  console.log(`\n${summary}\n\nSaved in ${dir}/`);
}
