// UNIT TESTS of src/trace-to-html.ts (step 14): a trace file becomes a readable page, and nothing in the trace can act as code.
// No model, no browser, no network. The small traces below are invented; one test also reads a real trace saved in results/.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { esc, traceToHtml } from '../src/trace-to-html';

const line = (o: object) => JSON.stringify(o);
const lines = (...o: object[]) => o.map(line).join('\n') + '\n';

// A short run: one step with a text, a failing tool, a long result, a reported issue, and the stop.
const SMALL = lines(
  { t: '2026-11-12T10:00:00.000Z', type: 'start', run: { model: 'm', bugs: ['a'], inject: false }, system: 'SYSTEM TEXT', task: 'TASK TEXT', limits: { maxSteps: 25 } },
  { t: '2026-11-12T10:00:01.000Z', type: 'model_reply', step: 1, usage: { inputTokens: 1234, outputTokens: 56 }, stopReason: 'tool_use', blockTypes: ['thinking', 'text', 'tool_use'], content: [{ type: 'text', text: 'I will click.' }, { type: 'tool_use', id: 'x', name: 'click', input: {} }] },
  { type: 'tool_error', step: 1, name: 'click', input: { name: 'Nope' }, error: 'ERROR: no such element' },
  { type: 'tool_call', step: 1, name: 'snapshot', input: {}, result: 'PAGE LINE\n'.repeat(40) },
  { type: 'tool_call', step: 1, name: 'open_page', input: { url: 'http://127.0.0.1/' }, result: 'Page opened.' },
  { type: 'tool_call', step: 2, name: 'report_issue', input: { title: 'Senior pays 15', steps: 'S', expected: 'E', actual: 'A' }, result: 'Issue recorded (1 so far).' },
  { type: 'stop', stopReason: 'done', steps: 2, inputTokens: 3000, outputTokens: 400, issues: 1 },
);

describe('esc', () => {
  it('turns the characters that HTML treats as code into plain text', () => {
    expect(esc(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
    expect(esc(undefined)).toBe('');
    expect(esc(12)).toBe('12');
  });
});

describe('traceToHtml: what the page shows', () => {
  const html = traceToHtml(SMALL, 'My trace');

  it('has the setup, one card per step and the stop', () => {
    expect(html).toContain('<title>My trace</title>');
    expect(html).toContain('SYSTEM TEXT');
    expect(html).toContain('TASK TEXT');
    expect(html).toContain('maxSteps');
    expect(html).toContain('Step 1');
    expect(html).toContain('I will click.');
    expect(html).toContain('The run stopped');
    expect(html).toContain('<b>issues reported:</b> 1');
  });

  it('shows the tokens of a step with thousands separators, and notes the hidden thinking', () => {
    expect(html).toContain('in 1,234 · out 56');
    expect(html).toContain('thinking (not recorded)');
  });

  it('marks an error, highlights a reported issue and folds a long result but not a short one', () => {
    expect(html).toContain('class="card tool error"');
    expect(html).toContain('ERROR: no such element');
    expect(html).toContain('Issue reported');
    expect(html).toContain('Senior pays 15');
    expect(html).toMatch(/<details[^>]*><summary>Result: PAGE LINE/); // the long snapshot is folded
    expect(html).toContain('<pre>Page opened.</pre>'); // the short result is not
  });

  it('flags a reply that was cut off by the length limit', () => {
    const cut = traceToHtml(lines({ type: 'model_reply', step: 3, usage: {}, stopReason: 'max_tokens', content: [] }));
    expect(cut).toContain('cut off by the length limit');
  });
});

describe('traceToHtml: a trace is not trusted', () => {
  // The same hostile text in every place a trace can carry text from the page, the model or the user.
  const EVIL = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const hostile = lines(
    { type: 'start', run: { model: EVIL, bugs: [EVIL] }, system: EVIL, task: EVIL, limits: { [EVIL]: EVIL } },
    { type: 'model_reply', step: 1, usage: {}, stopReason: EVIL, content: [{ type: 'text', text: EVIL }, { type: 'tool_use', id: 'x', name: EVIL, input: {} }] },
    { type: 'tool_call', step: 1, name: EVIL, input: { url: EVIL }, result: EVIL },
    { type: 'tool_error', step: 1, name: EVIL, input: {}, error: EVIL },
    { type: 'tool_call', step: 2, name: 'report_issue', input: { title: EVIL, steps: EVIL, expected: EVIL, actual: EVIL }, result: EVIL },
    { type: EVIL, x: EVIL },
    { type: 'stop', stopReason: EVIL, steps: EVIL, issues: EVIL },
  ) + EVIL + '\n'; // the last line is not even JSON

  it('never puts the text of a trace into the page as code', () => {
    const html = traceToHtml(hostile, EVIL);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror=alert(2)>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;'); // it is there, as text
  });

  it('forbids scripts in the page itself, as a second lock', () => {
    expect(traceToHtml(SMALL)).toContain(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`);
  });
});

describe('traceToHtml: a broken or odd trace still gives a page', () => {
  it('says so about a line that is not JSON (for example the end of a run that crashed) and goes on', () => {
    const html = traceToHtml(SMALL + '{"type":"model_reply","ste');
    expect(html).toContain('could not be read');
    expect(html).toContain('The run stopped');
  });

  it('shows an event of an unknown type as it is', () => {
    expect(traceToHtml(lines({ type: 'something_new', value: 7 }))).toContain('event: something_new');
  });

  it('says that an empty trace is empty', () => {
    expect(traceToHtml('')).toContain('The trace is empty.');
  });

  it('reads a real trace of a run (saved in results/)', () => {
    const html = traceToHtml(readFileSync('results/eval-traces/budget-all/run-1-trace.jsonl', 'utf8'));
    expect(html).toContain('The run stopped');
    expect(html).toContain('Issue reported');
    expect(html).not.toContain('could not be read');
  });
});
