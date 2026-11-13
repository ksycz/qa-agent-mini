// UNIT TESTS that only the LangGraph version of the loop (src/graph-agent.ts) needs.
// The tests of the behaviour it shares with the hand-written loop are in test/agent.test.ts (they run on both).

import { describe, expect, it } from 'vitest';
import type { BrowserPort } from '../src/browser';
import { scriptedLlm, toolCall } from '../src/fake-llm';
import { graphAsMermaid, runGraphAgent } from '../src/graph-agent';
import { NO_SKILLS } from '../src/skills';

const browser: BrowserPort = { open: async () => {}, snapshot: async () => '- textbox "Visitor age"', click: async () => {}, fill: async () => {}, close: async () => {} };

describe('LangGraph version of the loop', () => {
  // LangGraph stops a graph after 25 nodes by default, and one of our steps runs two nodes. Without our own
  // recursionLimit, this run would end with a GraphRecursionError at about step 12 instead of our step limit.
  it('reaches our own step limit (25) without hitting the LangGraph limit', async () => {
    // A model that never finishes, and types a different age every time, so the stuck guard has no reason to stop it.
    const script = Array.from({ length: 30 }, (_, i) => toolCall('fill', { label: 'Visitor age', text: String(i) }));
    const r = await runGraphAgent({
      llm: scriptedLlm(script),
      tools: { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 100, issues: [], skills: NO_SKILLS },
      system: 's',
      task: 't',
    });
    expect(r.stopReason).toBe('max_steps');
    expect(r.steps).toBe(25);
  });

  it('can be drawn: two nodes, and the model and the tools both lead back or to the end', () => {
    const mermaid = graphAsMermaid();
    expect(mermaid).toContain('__start__ -.-> model');
    expect(mermaid).toContain('model -.-> tools');
    expect(mermaid).toContain('model -.-> __end__');
    expect(mermaid).toContain('tools -.-> model');
    expect(mermaid).toContain('tools -.-> __end__');
  });
});
