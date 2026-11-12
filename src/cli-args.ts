// Small helpers to read the options typed after a command, for example:
//   npm run agent -- --bugs=all --inject

import { KNOWN_BUGS } from '../target/pricing.mjs'; // the one list of bug names, so "all" can never be out of date

// Reads one option of the form --name=value. Returns undefined when it is not there.
export function flag(name: string, argv: string[] = process.argv): string | undefined {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

// True when a flag without a value is there, for example --inject.
export function hasFlag(name: string, argv: string[] = process.argv): boolean {
  return argv.includes(`--${name}`);
}

// Turns the --bugs value into a list of bug names.
//   undefined or "all"  -> all the bugs the page knows (four)
//   "none"              -> no bugs (the page is correct)
//   "a,b"               -> exactly those bugs
export function parseBugs(value: string | undefined): string[] {
  const v = value ?? 'all';
  if (v === 'none') return [];
  if (v === 'all') return [...KNOWN_BUGS];
  return v.split(',').filter(Boolean);
}

// Reads how many runs the eval should make. Default 3. The maximum is in code, not only in the docs,
// because every run costs real money (up to 80,000 tokens each).
export const MAX_EVAL_RUNS = 10;
export function parseRuns(value: string | undefined): number {
  if (value === undefined) return 3;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_EVAL_RUNS) throw new Error(`--runs must be a whole number from 1 to ${MAX_EVAL_RUNS}`);
  return n;
}
