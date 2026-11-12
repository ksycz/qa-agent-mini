// ONE RUN of the agent against the demo page: start the page, open a browser, run the agent loop, save the trace.
//
// It lives in its own file because two commands need it:
//   npm run agent   (src/run.ts)   one run, printed step by step
//   npm run eval    (src/eval.ts)  several runs in a row, scored (step 6)
// Both save the same files in the folder they are given: trace.jsonl and result.json.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAgent, type AgentResult } from './agent';
import { launchBrowser } from './browser';
import { createAnthropicClient } from './llm';
import { buildSystemPrompt, loadSpec, taskFor } from './prompt';
import { folderSkillStore } from './skills';
import type { InjectKind } from './cli-args';
import { startTarget } from './serve-target';
import { fileTrace } from './trace';

export async function runOnce(opts: {
  bugs: string[]; // which planted bugs the page has (an empty list = a correct page)
  inject?: InjectKind | false; // which hidden canary sentence goes on the page (step 6b, 10a). Default: none.
  model: string;
  dir: string; // the folder for this run's files
  log?: (line: string) => void; // optional: print each step as it happens
}): Promise<AgentResult> {
  const { bugs, inject = false as InjectKind | false, model, dir, log } = opts;
  mkdirSync(dir, { recursive: true });

  const skills = folderSkillStore(); // the guides in the skills/ folder (step 8)
  const target = await startTarget({ bugs, inject });
  const browser = await launchBrowser();

  try {
    log?.(`Page: ${target.url}   bugs switched on: [${bugs.join(', ') || 'none'}]   canary sentence on the page: ${inject || 'no'}   model: ${model}\n`);

    const result = await runAgent({
      llm: createAnthropicClient(model),
      // Only the demo page may be opened. This is the safety rule from step 2.
      tools: { browser, allowedHosts: ['127.0.0.1', 'localhost'], maxSnapshotChars: 5000, issues: [], skills },
      system: buildSystemPrompt(skills.list()), // the menu of skills is part of the prompt, so the trace shows it
      task: taskFor(target.url, loadSpec()),
      log,
      trace: fileTrace(join(dir, 'trace.jsonl')), // everything the agent did, saved to a file
      info: { model, bugs, inject, skills: skills.list().map((x) => x.name) }, // the trace says which model, which bugs and whether the canary sentence was on the page
    });

    writeFileSync(join(dir, 'result.json'), JSON.stringify(result, null, 2));
    return result;
  } finally {
    // Always clean up, even if something above failed.
    await browser.close();
    await target.close();
  }
}
