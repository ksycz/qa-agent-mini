// UNIT TESTS of the agent loop (src/agent.ts) with a FAKE model and a FAKE browser.
//
// These tests prove that our code around the model behaves: it stops when it should, it survives errors,
// and it enforces the limits. None of them needs an API key, a browser or the network.
// Run all tests with: npm test

import { describe, expect, it } from 'vitest';
import { runAgent, type AgentLimits } from '../src/agent';
import type { BrowserPort } from '../src/browser';
import { say, scriptedLlm, toolCall, toolCalls } from '../src/fake-llm';
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

  // STUCK DETECTION (src/stuck-guard.ts). "Stuck" = the same call, the same result and the same page, again and again.
  // The model gets one warning first. It is stopped only if it keeps repeating after it could read the warning.
  it('warns first and stops only when the model ignores the warning', async () => {
    const stuck = scriptedLlm([toolCall('snapshot', {})]); // the script runs out, so it repeats the same answer forever
    const r = await run(stuck);
    expect(r.stopReason).toBe('repeated_call');
    expect(r.steps).toBe(4); // steps 1 and 2 are fine, step 3 gets the warning, step 4 repeats anyway
    // The 4th request to the model must contain the warning inside the last tool result.
    const lastMessage = stuck.requests[3].messages.at(-1)!;
    expect(JSON.stringify(lastMessage.content)).toContain('WARNING');
    // ...and the 3rd request (before the warning existed) must not.
    expect(JSON.stringify(stuck.requests[2].messages.at(-1)!.content)).not.toContain('WARNING');
  });

  it('does not stop a model that reacts to the warning', async () => {
    const r = await run(
      scriptedLlm([
        toolCall('snapshot', {}),
        toolCall('snapshot', {}),
        toolCall('snapshot', {}), // third identical call: the warning is added to this result
        toolCall('click', { role: 'button', name: 'Add visitor' }), // the model does something different
        say('end'),
      ]),
    );
    expect(r.stopReason).toBe('done');
    expect(r.steps).toBe(5);
  });

  // Issue #12: several identical clicks in ONE reply used to end the run before any result came back.
  // Clicking "Add visitor" again and again is a good test, because the page changes every time.
  it('does not call identical clicks stuck when the page changes each time', async () => {
    let tickets = 0;
    const browser = { ...fakeBrowser(), click: async () => void tickets++, snapshot: async () => `tickets: ${tickets}` };
    const click: [string, Record<string, unknown>] = ['click', { role: 'button', name: 'Add visitor' }];
    const r = await runAgent({
      llm: scriptedLlm([toolCalls([click, click, click, click]), say('end')]),
      tools: { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 100, issues: [] },
      system: 'system',
      task: 'task',
    });
    expect(r.stopReason).toBe('done');
    expect(tickets).toBe(4); // all four clicks really happened
  });

  it('does not stop in the same step in which it warned, because the model has not read the warning yet', async () => {
    const same: [string, Record<string, unknown>] = ['snapshot', {}]; // the page never changes
    const llm = scriptedLlm([toolCalls([same, same, same, same, same]), say('end')]);
    const r = await run(llm);
    expect(r.stopReason).toBe('done'); // the 3rd call warned; the 4th and 5th are in the same step, so no stop
    expect(r.steps).toBe(2);
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
