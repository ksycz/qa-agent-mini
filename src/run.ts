// STEP 4: THE FIRST REAL RUN. A real model tests the demo page.
//
// Run it with:
//   export ANTHROPIC_API_KEY=...            (once per terminal window; never put the key in a file)
//   npm run agent -- --bugs=all             the page has all three bugs
//   npm run agent -- --bugs=none            the page is correct: a good agent reports nothing
//
// What happens: we start the demo page, open a browser, create the real model, and hand everything
// to the same agent loop we tested with the fake model. Then we print what the agent found and
// save the full trace in runs/<time>/trace.jsonl.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAgent } from './agent';
import { launchBrowser } from './browser';
import { flag, parseBugs } from './cli-args';
import { createAnthropicClient } from './llm';
import { loadSpec, SYSTEM_PROMPT, taskFor } from './prompt';
import { startTarget } from './serve-target';
import { fileTrace } from './trace';

const bugs = parseBugs(flag('bugs'));
// The model name can be changed without touching code: QA_AGENT_MODEL=... npm run agent
const model = process.env.QA_AGENT_MODEL ?? 'claude-haiku-5-5';

// Fail early with a clear message, before starting the browser, if the key is missing.
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set. Run:  export ANTHROPIC_API_KEY=your-key');
  process.exit(1);
}

// Every run gets its own folder, named after the time, so runs never overwrite each other.
const dir = join('runs', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(dir, { recursive: true });

const target = await startTarget({ bugs });
const browser = await launchBrowser();

try {
  console.log(`Page: ${target.url}   bugs switched on: [${bugs.join(', ') || 'none'}]   model: ${model}\n`);

  const result = await runAgent({
    llm: createAnthropicClient(model),
    // Only the demo page may be opened. This is the safety rule from step 2.
    tools: { browser, allowedHosts: ['127.0.0.1', 'localhost'], maxSnapshotChars: 5000, issues: [] },
    system: SYSTEM_PROMPT,
    task: taskFor(target.url, loadSpec()),
    log: console.log, // print each step as it happens
    trace: fileTrace(join(dir, 'trace.jsonl')), // and save everything to a file
  });

  writeFileSync(join(dir, 'result.json'), JSON.stringify(result, null, 2));

  console.log(`\nIssues reported: ${result.issues.length}`);
  for (const i of result.issues) {
    console.log(`\n- ${i.title}\n  steps:    ${i.steps}\n  expected: ${i.expected}\n  actual:   ${i.actual}`);
  }
  console.log(`\nTrace and result saved in ${dir}/`);
} catch (e) {
  // A readable message instead of a long stack trace. The most common problem is a wrong or missing key.
  const message = e instanceof Error ? e.message : String(e);
  console.error(`\nThe run failed: ${message}`);
  if (/authentication|x-api-key|401/i.test(message)) console.error('Check that ANTHROPIC_API_KEY is correct.');
  console.error(`Whatever was recorded before the failure is in ${dir}/trace.jsonl`);
  process.exitCode = 1;
} finally {
  // Always clean up, even if something above failed.
  await browser.close();
  await target.close();
}
