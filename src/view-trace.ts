// STEP 14: turns one trace file into a web page you can open in the browser.
//
// Run it with:  npm run trace -- runs/<time>/trace.jsonl
//
// It writes the page next to the trace, with the same name and the ending .html
// (so run-1-trace.jsonl becomes run-1-trace.html). The page is only a local file: it is not uploaded anywhere,
// and the folders runs/ and evals/ are ignored by git.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { traceToHtml } from './trace-to-html';

// The first argument that is not an option is the path to the trace file.
const input = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!input) {
  console.error('Usage: npm run trace -- <path to a trace.jsonl file>');
  process.exit(1);
}
if (!existsSync(input)) {
  console.error(`File not found: ${input}`);
  process.exit(1);
}

const output = input.replace(/\.jsonl$/, '') + '.html'; // trace.jsonl -> trace.html, next to the input
writeFileSync(output, traceToHtml(readFileSync(input, 'utf8'), `Trace: ${basename(input)}`));
console.log(`Written: ${output}`);
