import { describe, expect, it } from 'vitest';
import type { BrowserPort } from '../src/browser';
import { assertAllowed, runTool, TOOL_DEFS, type ToolContext } from '../src/tools';

function ctx(overrides: Partial<ToolContext> = {}, log: string[] = []): ToolContext {
  const browser: BrowserPort = {
    open: async (u) => void log.push(`open ${u}`),
    snapshot: async () => 'x'.repeat(50),
    click: async (r, n) => void log.push(`click ${r}/${n}`),
    fill: async (l, t) => void log.push(`fill ${l}=${t}`),
    close: async () => {},
  };
  return { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 20, issues: [], ...overrides };
}

describe('assertAllowed', () => {
  it('accepts an allowed host', () => expect(() => assertAllowed('http://127.0.0.1:4173/', ['127.0.0.1'])).not.toThrow());
  it('rejects another host', () => expect(() => assertAllowed('https://evil.example/', ['127.0.0.1'])).toThrow(/not allowed/));
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
    expect(log).toEqual([]);
  });
  it('truncates long snapshots', async () => {
    const out = await runTool(ctx(), 'snapshot', {});
    expect(out).toBe('x'.repeat(20) + '\n[truncated]');
  });
  it('rejects missing arguments', async () => {
    await expect(runTool(ctx(), 'fill', { label: 'Visitor age' })).resolves.toBe('Filled.'); // text may be empty
    await expect(runTool(ctx(), 'click', { role: 'button' })).rejects.toThrow(/name/);
  });
  it('rejects unknown tools', async () => {
    await expect(runTool(ctx(), 'delete_everything', {})).rejects.toThrow(/Unknown tool/);
  });
  it('collects issues and checks their fields', async () => {
    const c = ctx();
    await runTool(c, 'report_issue', { title: 't', steps: 's', expected: 'e', actual: 'a' });
    expect(c.issues).toHaveLength(1);
    await expect(runTool(c, 'report_issue', { title: 't' })).rejects.toThrow();
  });
  it('every tool definition has a handler', async () => {
    for (const t of TOOL_DEFS) {
      // Empty input may fail on a missing argument, but never with "Unknown tool".
      await runTool(ctx(), t.name, {}).catch((e: Error) => expect(e.message).not.toMatch(/Unknown tool/));
    }
  });
});
