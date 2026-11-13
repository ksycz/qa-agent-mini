// THE AGENT IN LANGGRAPH STUDIO (step 20b): the file that `npm run studio` loads (see langgraph.json).
//
// LangGraph Studio is a web page that draws a graph, runs it, and shows the state after every node. It talks to a
// small server on this computer (`npm run studio`), and that server loads the graph exported at the bottom here.
//
// Studio runs the graph by itself, so this file has to prepare everything a run needs BEFORE the first run: the demo
// page with all four bugs, the browser, and a model. It does so once, when the server starts.
//
// The model:
//   by default a FAKE model with a prepared script (free, no API key): the same idea as `npm run loop`.
//   QA_AGENT_STUDIO_MODEL=claude-haiku-5-5 npm run studio   uses the real model (costs money, needs ANTHROPIC_API_KEY).
//
// In Studio, type any message (for example "Start") to begin a run. The real task (the page address and SPEC.md)
// is already in the system prompt here, because only this file knows the address of the page.
// Start a NEW THREAD in Studio for every new run.

import { createStuckGuard } from './stuck-guard';
import { startRun } from './agent-steps';
import { launchBrowser } from './browser';
import { say, toolCall } from './fake-llm';
import { buildGraph } from './graph-agent';
import { createAnthropicClient, type LlmClient } from './llm';
import { buildSystemPrompt, loadSpec, taskFor } from './prompt';
import { startTarget } from './serve-target';
import { folderSkillStore } from './skills';
import { KNOWN_BUGS } from '../target/pricing.mjs';

// The demo page with all four planted bugs, and a browser that may open only that page (host AND port).
const target = await startTarget({ bugs: [...KNOWN_BUGS] });
const allowedHosts = [new URL(target.url).host];
const browser = await launchBrowser(allowedHosts);
const skills = folderSkillStore();

// The fake model's script: open the page, add a 65-year-old, read the page, report the wrong senior price, finish.
const script = [
  toolCall('open_page', { url: target.url }),
  toolCall('fill', { label: 'Visitor age', text: '65' }),
  toolCall('click', { role: 'button', name: 'Add visitor' }),
  toolCall('snapshot', {}),
  toolCall('report_issue', { title: 'Senior price wrong at 65', steps: 'Add a visitor aged 65', expected: '€10.00 (senior price)', actual: '€15.00' }),
  say('I tested one senior ticket and found 1 issue.'),
];

// A fake model that picks its answer by how many answers it has ALREADY given in this conversation
// (= the number of assistant messages). So every new thread in Studio starts again at the beginning of the script.
const fakeLlm: LlmClient = {
  async complete({ messages }) {
    const given = messages.filter((m) => m.role === 'assistant').length;
    return script[Math.min(given, script.length - 1)];
  },
};

const realModel = process.env.QA_AGENT_STUDIO_MODEL;
const model = realModel ? createAnthropicClient(realModel) : fakeLlm;

const ctx = startRun({
  // The first message of a thread (the user's "Start") means a new run: clear what the last run left behind.
  llm: {
    async complete(request) {
      if (request.messages.length === 1) {
        ctx.tools.issues.length = 0; // the issues of the previous run
        ctx.guard = createStuckGuard(ctx.limits.maxRepeatedCalls); // the stuck guard's memory of the previous run
      }
      return model.complete(request);
    },
  },
  tools: { browser, allowedHosts, maxSnapshotChars: 5000, issues: [], skills },
  system: `${buildSystemPrompt(skills.list())}\n\n${taskFor(target.url, loadSpec())}`,
  task: '', // not used here: in Studio the run starts with the message you type
  log: console.log, // every step is also printed in the terminal where `npm run studio` runs
});

console.log(`qa-agent-mini for LangGraph Studio: page ${target.url}, all four bugs, model: ${realModel ?? 'fake (prepared script, free)'}`);

// Close the browser and the page when the server stops (Ctrl+C).
process.once('SIGINT', async () => {
  await browser.close();
  await target.close();
  process.exit(0);
});

// THE GRAPH that Studio shows and runs: exactly the one src/graph-agent.ts builds for `npm run agent -- --engine=graph`.
export const graph = buildGraph(ctx);
