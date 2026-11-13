// STEP 21: HOW MUCH TIME DOES THE LOOP ITSELF COST? Free: no model, no browser, no API key.
//
// Run it with:  npm run overhead
//
// Both versions of the loop (src/agent.ts and src/graph-agent.ts) run the same 25-step script of a fake model
// against a fake browser, many times. The fake model and the fake browser answer at once, so what is measured is
// only the loop: the hand-written `while`, or LangGraph with its state, reducers and the translation of messages.
// In a real run, one call to the model takes about 2 seconds (step 17), so compare the numbers here with that.

import { performance } from 'node:perf_hooks';
import { runAgent } from './agent';
import type { AgentArgs, AgentResult } from './agent-steps';
import type { BrowserPort } from './browser';
import { say, scriptedLlm, toolCall } from './fake-llm';
import { runGraphAgent } from './graph-agent';
import { NO_SKILLS } from './skills';

const RUNS = 200;
const STEPS = 25; // the step limit of a real run

// A fake browser whose page is a little like the real one (a few hundred characters), answering at once.
const page = '- heading "Ticket price calculator"\n- spinbutton "Visitor age"\n- button "Add visitor"\n- list:\n  - listitem: "Visitor 1, age 65: €15.00"\n- paragraph: "Total: €15.00"';
const browser: BrowserPort = { open: async () => {}, snapshot: async () => page, click: async () => {}, fill: async () => {}, close: async () => {} };

// 24 steps that each fill a different age and look at the page (two tool calls per step), then a final answer.
function script() {
  const steps = Array.from({ length: STEPS - 1 }, (_, i) => ({
    ...toolCall('fill', { label: 'Visitor age', text: String(i) }),
    content: [
      { type: 'tool_use' as const, id: `f${i}`, name: 'fill', input: { label: 'Visitor age', text: String(i) } },
      { type: 'tool_use' as const, id: `s${i}`, name: 'snapshot', input: {} },
    ],
  }));
  return [...steps, say('done')];
}

async function measure(name: string, run: (args: AgentArgs) => Promise<AgentResult>) {
  const args = (): AgentArgs => ({
    llm: scriptedLlm(script()),
    tools: { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 5000, issues: [], skills: NO_SKILLS },
    system: 's',
    task: 't',
  });
  for (let i = 0; i < 20; i++) await run(args()); // warm-up, so the first slow runs of Node do not count
  const times: number[] = [];
  let steps = 0;
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const r = await run(args());
    times.push(performance.now() - start);
    steps = r.steps;
  }
  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95)];
  console.log(`${name.padEnd(18)} ${steps} steps per run   mean ${mean.toFixed(2)} ms per run (${(mean / steps).toFixed(3)} ms per step)   p95 ${p95.toFixed(2)} ms`);
  return mean / steps;
}

console.log(`${RUNS} runs of each loop with a fake model and a fake browser (no network):\n`);
const loop = await measure('hand-written loop', runAgent);
const graph = await measure('LangGraph', runGraphAgent);
console.log(`\nLangGraph adds about ${(graph - loop).toFixed(2)} ms per step. A real call to the model takes about 2,000 ms (step 17).`);
