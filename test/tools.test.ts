// UNIT TESTS of the tools (src/tools.ts), using a FAKE browser.
//
// The fake browser does not open anything. It only writes down what it was asked to do (in `log`),
// so a test can check "was the browser called, and with what?". These tests are instant, free and never flaky.
// Run all tests with: npm test

import { describe, expect, it } from 'vitest';
import type { BrowserPort } from '../src/browser';
import { assertAllowed, MAX_VISITORS_PER_CALL, runTool, TOOL_DEFS, type ToolContext } from '../src/tools';

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
    // click: the name is required.
    await expect(runTool(ctx(), 'click', { role: 'button' })).rejects.toThrow(/name/);
    // Issue #9: fill without `text` used to succeed and silently clear the field. Now it is an error.
    const log: string[] = [];
    await expect(runTool(ctx({}, log), 'fill', { label: 'Visitor age' })).rejects.toThrow(/text/);
    expect(log).toEqual([]); // the browser was never asked
  });
  it('still allows an empty text in fill, because that clears a field', async () => {
    const log: string[] = [];
    await expect(runTool(ctx({}, log), 'fill', { label: 'Visitor age', text: '' })).resolves.toBe('Filled.');
    expect(log).toEqual(['fill Visitor age=']);
  });
  it('rejects an empty value where text is required, and values that are not text', async () => {
    await expect(runTool(ctx(), 'click', { role: 'button', name: '  ' })).rejects.toThrow(/Empty argument "name"/);
    await expect(runTool(ctx(), 'fill', { label: 'Visitor age', text: 65 })).rejects.toThrow(/text/); // a number is not text
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
      // Fill every required argument with text, so the input passes the check against the schema.
      // The call may still fail (for example "x" is not a URL), but never with "Unknown tool".
      const required = (t.input_schema.required ?? []) as string[];
      const input = Object.fromEntries(required.map((k) => [k, 'x']));
      await runTool(ctx(), t.name, input).catch((e: Error) => expect(e.message).not.toMatch(/Unknown tool/));
    }
  });
});

// Step 6e: add_visitors does fill + click for every age, and reads the page after every click.
describe('add_visitors', () => {
  // A fake browser whose page shows an alert line after the Nth click (never when `alertAfter` is 0).
  function fakeShop(alertAfter = 0) {
    const log: string[] = [];
    let clicks = 0;
    const c = ctx({ maxSnapshotChars: 1000 }, log);
    c.browser.click = async (r, n) => void (clicks++, log.push(`click ${r}/${n}`));
    c.browser.snapshot = async () =>
      alertAfter > 0 && clicks === alertAfter ? '- alert: Maximum 10 tickets per order.' : `- paragraph: ${clicks} tickets`;
    return { c, log };
  }

  it('fills and clicks once per age, in order, and returns the page', async () => {
    const { c, log } = fakeShop();
    const out = await runTool(c, 'add_visitors', { ages: '30, 65 8' }); // commas and spaces both work
    expect(log).toEqual([
      'fill Visitor age=30', 'click button/Add visitor',
      'fill Visitor age=65', 'click button/Add visitor',
      'fill Visitor age=8', 'click button/Add visitor',
    ]);
    expect(out).toBe('Added 3 of 3 visitors.\nPage now:\n- paragraph: 3 tickets');
  });

  it('stops at the first message of the page and tells the model what it said', async () => {
    const { c, log } = fakeShop(2); // the page complains after the 2nd click
    const out = await runTool(c, 'add_visitors', { ages: '1,2,3,4' });
    expect(out).toContain('Stopped after age 2 (2 of 4)');
    expect(out).toContain('Maximum 10 tickets per order.');
    expect(out).toContain('The remaining ages were not added.');
    expect(log.filter((l) => l.startsWith('click'))).toHaveLength(2); // ages 3 and 4 were never tried
  });

  it('refuses bad input before the browser is touched', async () => {
    const { c, log } = fakeShop();
    await expect(runTool(c, 'add_visitors', { ages: '' })).rejects.toThrow(/Empty argument/);
    await expect(runTool(c, 'add_visitors', { ages: ' , ' })).rejects.toThrow(/No ages/);
    await expect(runTool(c, 'add_visitors', { ages: '30, abc' })).rejects.toThrow(/"abc" is not a whole number/);
    await expect(runTool(c, 'add_visitors', { ages: '-5' })).rejects.toThrow(/not a whole number/);
    const tooMany = Array.from({ length: MAX_VISITORS_PER_CALL + 1 }, () => '30').join(',');
    await expect(runTool(c, 'add_visitors', { ages: tooMany })).rejects.toThrow(/Too many ages/);
    expect(log).toEqual([]); // nothing was typed anywhere
  });
});
