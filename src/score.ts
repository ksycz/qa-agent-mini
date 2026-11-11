// SCORING AND SUMMARY of eval runs (step 6). Only plain functions here: no model, no browser, no files.
// That is why they are easy to test.
//
// The question the eval answers: "of the planted bugs, how many did the agent report, and did it report things that are not bugs?"
// "Found" means: the agent reported it with report_issue. Only the TITLE of the report is read, with simple keywords.
// Keywords are crude (an LLM judge instead is on the roadmap, step 9), so the summary also prints every title:
// look at them yourself when a number surprises you.

import type { Issue } from './tools';
import { STUCK_WARNING } from './stuck-guard';

// One keyword rule per planted bug. If you change a bug or SPEC.md, change this too (see CLAUDE.md).
// The order matters: the first rule that fits wins. "senior" is last because a report about another bug may mention age 65 on the way.
export const BUG_MATCHERS: Record<string, RegExp> = {
  'group-threshold': /group|\b8\b|eight|10 ?%/i,
  'limit-off-by-one': /\b11\b|11th|eleventh|limit|maximum/i,
  'senior-discount': /senior|\b65\b/i,
};

// What we know about one reported issue: its title, and which planted bug it belongs to (null = it belongs to none).
export type ScoredIssue = { title: string; bug: string | null };

// The score of one run. `bugsOn` = the bugs the page had.
export function scoreIssues(titles: string[], bugsOn: string[]) {
  // Only bugs that are switched on can be matched. A report about a bug the page does not have is a false alarm.
  const enabled = Object.entries(BUG_MATCHERS).filter(([name]) => bugsOn.includes(name));
  const issues: ScoredIssue[] = titles.map((title) => ({ title, bug: enabled.find(([, re]) => re.test(title))?.[0] ?? null }));
  const found = bugsOn.filter((b) => issues.some((i) => i.bug === b));
  return {
    issues,
    found,
    missed: bugsOn.filter((b) => !found.includes(b)),
    falseAlarms: issues.filter((i) => i.bug === null).length,
  };
}

// Counts two things in a trace file (the text of trace.jsonl): replies cut off by the length limit,
// and stuck-guard warnings. They are the two numbers we used to count by hand in RESULTS.md.
export function countFromTrace(jsonl: string): { cutOffs: number; warnings: number } {
  let cutOffs = 0;
  let warnings = 0;
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    const e = JSON.parse(line) as { type?: string; stopReason?: string; result?: string };
    if (e.type === 'model_reply' && e.stopReason === 'max_tokens') cutOffs++;
    if (e.type === 'tool_call' && e.result?.includes(STUCK_WARNING)) warnings++;
  }
  return { cutOffs, warnings };
}

// Everything the summary needs to know about one run.
export type RunStats = {
  steps: number;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
  issues: ScoredIssue[];
  found: string[];
  missed: string[];
  falseAlarms: number;
  cutOffs: number;
  warnings: number;
};

const n = (x: number) => Math.round(x).toLocaleString('en-US'); // 91076 -> "91,076"

// The text of the summary (Markdown, so it can be pasted into RESULTS.md).
export function summarize(runs: RunStats[], bugsOn: string[]): string {
  const total = (r: RunStats) => r.inputTokens + r.outputTokens;
  const lines: string[] = [];

  lines.push('| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |');
  lines.push('|---|---|---|---|---|---|---|---|');
  runs.forEach((r, i) => {
    const found = bugsOn.length ? `${r.found.length} of ${bugsOn.length}` : 'n/a';
    lines.push(`| ${i + 1} | ${r.steps} | ${n(total(r))} | ${r.stopReason} | ${found} | ${r.falseAlarms} | ${r.cutOffs} | ${r.warnings} |`);
  });

  lines.push('');
  for (const bug of bugsOn) lines.push(`- \`${bug}\`: reported in ${runs.filter((r) => r.found.includes(bug)).length} of ${runs.length} runs`);
  lines.push(`- False alarms: ${runs.reduce((sum, r) => sum + r.falseAlarms, 0)} in ${runs.length} runs`);
  const tokens = runs.map(total);
  lines.push(`- Tokens per run: mean ${n(tokens.reduce((a, b) => a + b, 0) / runs.length)}, min ${n(Math.min(...tokens))}, max ${n(Math.max(...tokens))}`);
  lines.push(`- Steps per run: mean ${(runs.reduce((a, r) => a + r.steps, 0) / runs.length).toFixed(1)}`);

  // Every title the agent reported, with the bug our keywords gave it. Check the matching with your own eyes.
  lines.push('', 'Reported issues (the keyword match is in brackets):');
  runs.forEach((r, i) => {
    if (r.issues.length === 0) lines.push(`- Run ${i + 1}: nothing reported`);
    for (const issue of r.issues) lines.push(`- Run ${i + 1}: ${issue.title} [${issue.bug ?? 'FALSE ALARM'}]`);
  });
  return lines.join('\n');
}

// Builds the stats of one run from the loop's result and the text of its trace file.
export function toRunStats(result: { steps: number; inputTokens: number; outputTokens: number; stopReason: string; issues: Issue[] }, bugsOn: string[], traceText: string): RunStats {
  const score = scoreIssues(result.issues.map((i) => i.title), bugsOn);
  const { cutOffs, warnings } = countFromTrace(traceText);
  return {
    steps: result.steps,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    stopReason: result.stopReason,
    issues: score.issues,
    found: score.found,
    missed: score.missed,
    falseAlarms: score.falseAlarms,
    cutOffs,
    warnings,
  };
}
