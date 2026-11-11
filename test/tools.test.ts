// UNIT TESTS of the tools (src/tools.ts), using a FAKE browser.
//
// The fake browser does not open anything. It only writes down what it was asked to do (in `log`),
// so a test can check "was the browser called, and with what?". These tests are instant, free and never flaky.
// Run all tests with: npm test

import { describe, expect, it } from 'vitest';
import type { BrowserPort } from '../src/browser';
import { assertAllowed, runTool, TOOL_DEFS, type ToolContext } from '../src/tools';

// Builds a tool context around a fake browser. `overrides` changes single settings for one test.
// `log` collects what the fake browser was asked to do.
function ctx(overrides: Partial<ToolContext> = {}, log: string[] = []): ToolContext {
  const browser: BrowserPort = {
    open: async (u) => void log.push(`open ${u}`),
    snapshot: async () => 'x'.repeat(50), // always returns 50 characters
    click: async (r, n) => void log.push(`click ${r}/${n}`),
    fill: async (l, t) => void log.push(`fill ${l}=${t}`),
    close: async () => {},
  };
  return { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 20, issues: [], ...overrides };
}

describe('assertAllowed', () => {
  it('accepts an allowed host', () => expect(() => assertAllowed('http://127.0.0.1:4173/', ['127.0.0.1'])).not.toThrow());
  it('rejects another host', () => expect(() => assertAllowed('https://evil.example/', ['127.0.0.1'])).toThrow(/not allowed/));
  // A classic trick: a host that STARTS with the allowed name. It must still be refused.
  it('rejects a lookalike host', () => expect(() => assertAllowed('http://127.0.0.1.evil.example/', ['127.0.0.1'])).toThrow());
  it('rejects garbage', () => expect(() => assertAllowed('not a url', ['127.0.0.1'])).toThrow(/Invalid URL/));
});

describe('runTool', () => {
  it('opens an allowed page', async () => {
    const log: string[] = [];
    await runTool(ctx({}, log), 'open_page', { url: 'http://127.0.0.1:1/' });
    expect(log).toEqual(['open http://127.0.0.1:1/']);
  });
  it('does not open a blocked page', async () => {
    const log: string[] = [];
    await expect(runTool(ctx({}, log), 'open_page', { url: 'https://evil.example/' })).rejects.toThrow();
    expect(log).toEqual([]); // the browser was never even asked
  });
  it('truncates long snapshots', async () => {
    const out = await runTool(ctx(), 'snapshot', {});
    expect(out).toBe('x'.repeat(20) + '\n[truncated]'); // limit is 20 in this test
  });
  it('rejects missing arguments', async () => {
    // For fill, an empty text is allowed (it clears a field), so this succeeds.
    await expect(runTool(ctx(), 'fill', { label: 'Visitor age' })).resolves.toBe('Filled.');
    // For click, the name is required.
    await expect(runTool(ctx(), 'click', { role: 'button' })).rejects.toThrow(/name/);
  });
  it('rejects unknown tools', async () => {
    await expect(runTool(ctx(), 'delete_everything', {})).rejects.toThrow(/Unknown tool/);
  });
  it('collects issues and checks their fields', async () => {
    const c = ctx();
    await runTool(c, 'report_issue', { title: 't', steps: 's', expected: 'e', actual: 'a' });
    expect(c.issues).toHaveLength(1);
    // An incomplete report is refused.
    await expect(runTool(c, 'report_issue', { title: 't' })).rejects.toThrow();
  });
  // Safety net: if someone adds a tool to the menu but forgets to write its code, this test fails.
  it('every tool definition has a handler', async () => {
    for (const t of TOOL_DEFS) {
      // Empty input may fail on a missing argument, but never with "Unknown tool".
      await runTool(ctx(), t.name, {}).catch((e: Error) => expect(e.message).not.toMatch(/Unknown tool/));
    }
  });
});
