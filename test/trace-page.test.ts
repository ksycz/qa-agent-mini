// UNIT TESTS of src/trace-page.ts (step 15): the trace page is written next to the trace, and the eval summary links to the pages.
// No model, no browser, no network. The files live in a temporary folder that is removed afterwards.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tracePageLinks, writeTracePage } from '../src/trace-page';

const TRACE = JSON.stringify({ type: 'stop', stopReason: 'done', steps: 1, inputTokens: 10, outputTokens: 5, issues: 0 }) + '\n';

let dir: string;
beforeEach(() => void (dir = mkdtempSync(join(tmpdir(), 'qa-trace-page-'))));
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('writeTracePage', () => {
  it('writes trace.html next to trace.jsonl and gives back its path', () => {
    writeFileSync(join(dir, 'trace.jsonl'), TRACE);
    const page = writeTracePage(join(dir, 'trace.jsonl'));
    expect(page).toBe(join(dir, 'trace.html'));
    expect(readFileSync(join(dir, 'trace.html'), 'utf8')).toContain('The run stopped');
  });

  it('keeps the name of the trace, so several traces in one folder do not overwrite each other', () => {
    writeFileSync(join(dir, 'run-1-trace.jsonl'), TRACE);
    expect(writeTracePage(join(dir, 'run-1-trace.jsonl'))).toBe(join(dir, 'run-1-trace.html'));
  });

  it('gives back null, and writes nothing, when there is no trace file (a run that failed at the start)', () => {
    expect(writeTracePage(join(dir, 'trace.jsonl'))).toBeNull();
    expect(existsSync(join(dir, 'trace.html'))).toBe(false);
  });

  it('still writes a page for a trace that ends in the middle of a line (a run that crashed)', () => {
    writeFileSync(join(dir, 'trace.jsonl'), TRACE + '{"type":"model_reply","ste');
    writeTracePage(join(dir, 'trace.jsonl'));
    expect(readFileSync(join(dir, 'trace.html'), 'utf8')).toContain('could not be read');
  });
});

describe('tracePageLinks', () => {
  const runWithPage = (name: string) => {
    mkdirSync(join(dir, name));
    writeFileSync(join(dir, name, 'trace.html'), '<html></html>');
  };

  it('links every run that has a page, in the order of the run numbers (run-10 after run-9)', () => {
    for (const name of ['run-10', 'run-2', 'run-1', 'run-9']) runWithPage(name);
    expect(tracePageLinks(dir)).toBe('Pages that show what the agent did in each run: [run 1](run-1/trace.html), [run 2](run-2/trace.html), [run 9](run-9/trace.html), [run 10](run-10/trace.html)');
  });

  it('skips a run folder without a page and anything that is not a run folder', () => {
    runWithPage('run-1');
    mkdirSync(join(dir, 'run-2')); // no page
    writeFileSync(join(dir, 'summary.md'), 'x');
    mkdirSync(join(dir, 'run-3-old'));
    expect(tracePageLinks(dir)).toBe('Pages that show what the agent did in each run: [run 1](run-1/trace.html)');
  });

  it('gives back an empty string when there is no page at all', () => {
    expect(tracePageLinks(dir)).toBe('');
  });
});
