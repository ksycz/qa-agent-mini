// WRITING THE TRACE PAGE TO DISK (steps 14 and 15).
//
// src/trace-to-html.ts only turns text into text. This file does the file work around it:
//   writeTracePage:  trace.jsonl  ->  trace.html, next to it (used by `npm run trace` and, since step 15, after every run)
//   tracePageLinks:  the lines for summary.md that link to the page of every run of an eval

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { traceToHtml } from './trace-to-html';

// Reads a trace file and writes the page next to it: trace.jsonl -> trace.html, run-1-trace.jsonl -> run-1-trace.html.
// Gives back the path of the page, or null when there is no trace file (a run that failed before it wrote anything).
export function writeTracePage(tracePath: string): string | null {
  if (!existsSync(tracePath)) return null;
  const pagePath = tracePath.replace(/\.jsonl$/, '') + '.html';
  writeFileSync(pagePath, traceToHtml(readFileSync(tracePath, 'utf8'), `Trace: ${basename(tracePath)}`));
  return pagePath;
}

// For the summary of an eval: one link per run that has a page, for example "[run 1](run-1/trace.html)".
// The links are relative, so they work wherever the folder is. Gives back an empty string when there is no page.
export function tracePageLinks(evalDir: string): string {
  const runs = readdirSync(evalDir)
    .map((name) => /^run-(\d+)$/.exec(name))
    .filter((m): m is RegExpExecArray => m !== null && existsSync(join(evalDir, m[0], 'trace.html')))
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b); // run-10 must come after run-9, so we sort the numbers and not the names
  if (runs.length === 0) return '';
  return 'Pages that show what the agent did in each run: ' + runs.map((n) => `[run ${n}](run-${n}/trace.html)`).join(', ');
}
