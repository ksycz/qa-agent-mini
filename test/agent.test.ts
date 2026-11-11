// UNIT TESTS of the agent loop (src/agent.ts) with a FAKE model and a FAKE browser.
//
// These tests prove that our code around the model behaves: it stops when it should, it survives errors,
// and it enforces the limits. None of them needs an API key, a browser or the network.
// Run all tests with: npm test

import { describe, expect, it } from 'vitest';
import { runAgent, type AgentLimits } from '../src/agent';
import type { BrowserPort } from '../src/browser';
import { say, scriptedLlm, toolCall } from '../src/fake-llm';
import type { LlmClient } from '../src/llm';
import { memoryTrace } from '../src/trace';

// A fake browser that only writes down what it was asked to do.
function fakeBrowser(log: string[] = []): BrowserPort {
  return {
    open: async (u) => void log.push(`open ${u}`),
    snapshot: async () => '- button "Add visitor"',
    click: async (r, n) => void log.push(`click ${r}/${n}`),
    fill: async (l, t) => void log.push(`fill ${l}=${t}`),
    close: async () => {},
  };
}

// Runs the loop with the given fake model. `limits` overrides defaults for one test.
function run(llm: LlmClient, limits: Partial<AgentLimits> = {}, log: string[] = []) {
  return runAgent({
    llm,
    tools: { browser: fakeBrowser(log), allowedHosts: ['127.0.0.1'], maxSnapshotChars: 100, issues: [] },
    system: 'system',
    task: 'task',
    limits,
  });
}

describe('agent loop', () => {
  it('finishes when the model stops asking for tools', async () => {
    const r = await run(scriptedLlm([say('all done')]));
    expect(r.stopReason).toBe('done');
    expect(r.steps).toBe(1);
    expect(r.finalText).toBe('all done');
  });

  it('runs the requested tools and collects reported issues', async () => {
    const log: string[] = [];
    const r = await run(
      scriptedLlm([
        toolCall('open_page', { url: 'http://127.0.0.1:1/' }),
        toolCall('fill', { label: 'Visitor age', text: '65' }),
        toolCall('report_issue', { title: 'Senior', steps: 's', expected: 'e', actual: 'a' }),
        say('end'),
      ]),
      {},
      log,
    );
    expect(log).toEqual(['open http://127.0.0.1:1/', 'fill Visitor age=65']);
    expect(r.issues).toHaveLength(1);
    expect(r.stopReason).toBe('done');
  });

  it('gives tool results back to the model', async () => {
    const llm = scriptedLlm([toolCall('open_page', { url: 'http://127.0.0.1:1/' }, 'id1'), say('end')]);
    await run(llm);
    // The 2nd request to the model must end with a user message holding the answer to call "id1".
    const last = llm.requests[1].messages.at(-1)!;
    expect(last.role).toBe('user');
    expect(last.content).toEqual([{ type: 'tool_result', tool_use_id: 'id1', content: 'Page opened.' }]);
  });

  it('sends tool errors to the model as text and keeps going', async () => {
    const llm = scriptedLlm([toolCall('open_page', { url: 'https://evil.example/' }, 'id1'), say('ok')]);
    const r = await run(llm);
    expect(r.stopReason).toBe('done'); // the error did not crash the loop
    const last = llm.requests[1].messages.at(-1)!;
    expect(last.content).toMatchObject([{ tool_use_id: 'id1', is_error: true }]);
  });

  it('does not open hosts that are not allowed', async () => {
    const log: string[] = [];
    await run(scriptedLlm([toolCall('open_page', { url: 'https://evil.example/' }), say('ok')]), {}, log);
    expect(log).toEqual([]); // the browser was never asked
  });

  it('survives a tool name the model made up', async () => {
    const r = await run(scriptedLlm([toolCall('format_disk', {}), say('ok')]));
    expect(r.stopReason).toBe('done');
  });

  it('stops at the step limit', async () => {
    // A model that never finishes: each answer asks for a different call (so it is not "stuck").
    let n = 0;
    const endless: LlmClient = { complete: async () => toolCall('snapshot', { n: n++ }) };
    const r = await run(endless, { maxSteps: 3 });
    expect(r.stopReason).toBe('max_steps');
    expect(r.steps).toBe(3);
  });

  it('stops at the token budget', async () => {
    let n = 0;
    const endless: LlmClient = { complete: async () => toolCall('snapshot', { n: n++ }) };
    const r = await run(endless, { tokenBudget: 250 }); // each step costs 110 pretend tokens
    expect(r.stopReason).toBe('token_budget');
  });

  it('stops when the same call repeats', async () => {
    const stuck: LlmClient = { complete: async () => toolCall('snapshot', {}) };
    const r = await run(stuck);
    expect(r.stopReason).toBe('repeated_call');
  });

  it('writes every step to the trace', async () => {
    const trace = memoryTrace();
    await runAgent({
      llm: scriptedLlm([toolCall('open_page', { url: 'https://evil.example/' }), toolCall('snapshot', {}), say('end')]),
      tools: { browser: fakeBrowser(), allowedHosts: ['127.0.0.1'], maxSnapshotChars: 100, issues: [] },
      system: 'system',
      task: 'task',
      trace,
    });
    // start, then for each step: the model reply and the tool outcome, and finally the stop.
    expect(trace.events.map((e) => e.type)).toEqual([
      'start', 'model_reply', 'tool_error', 'model_reply', 'tool_call', 'model_reply', 'stop',
    ]);
  });

  it('keeps the whole tool result in the trace, not a shortened copy', async () => {
    const trace = memoryTrace();
    const longPage = 'x'.repeat(2000); // longer than the 500 characters the trace used to keep
    const browser = { ...fakeBrowser(), snapshot: async () => longPage };
    await runAgent({
      llm: scriptedLlm([toolCall('snapshot', {}), say('end')]),
      tools: { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 5000, issues: [] },
      system: 'system',
      task: 'task',
      trace,
    });
    const call = trace.events.find((e) => e.type === 'tool_call')!;
    expect(call.data.result).toBe(longPage);
  });
});
