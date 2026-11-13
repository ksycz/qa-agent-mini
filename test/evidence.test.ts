// UNIT TESTS of src/evidence.ts (step 18): a report must be backed by what the agent saw before it.
// No model, no browser, no network. It includes a FAKE CHEATING AGENT: it reports four keyword titles without testing anything.
// The keyword score gives it 4 of 4; the evidence check catches all four. That is the point of the step.

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runAgent } from '../src/agent';
import type { BrowserPort } from '../src/browser';
import { checkReports, claimsIn, countEvidence } from '../src/evidence';
import { say, scriptedLlm, toolCalls } from '../src/fake-llm';
import { parseBugs } from '../src/cli-args';
import { scoreIssues, summarize, toRunStats } from '../src/score';
import { NO_SKILLS } from '../src/skills';
import { memoryTrace } from '../src/trace';

const line = (o: object) => JSON.stringify(o);
const page = (name: string, result: string) => line({ type: 'tool_call', step: 1, name, input: {}, result });
const report = (step: number, actual: string, title = 'A bug') => line({ type: 'tool_call', step, name: 'report_issue', input: { title, steps: 's', expected: 'e', actual }, result: 'Issue recorded.' });
const SNAP = '- list "Tickets":\n    - listitem: "Visitor 1, age 30: €20.00"\n    - listitem: "Visitor 2, age 65: €15.00"\n  - paragraph: "Total: €35.00"';

describe('claimsIn', () => {
  it('takes quotes, prices and decimals from the "actual" text', () => {
    expect(claimsIn('Ticket shows "Visitor 2, age 65: €15.00" and the total is €35, age 12.5 accepted')).toEqual({
      quotes: ['Visitor 2, age 65: €15.00'],
      values: ['€15.00', '€35.00', '12.5'],
    });
  });
  it('skips short quotes, which prove nothing', () => {
    expect(claimsIn('the button "Add" works').quotes).toEqual([]);
  });
});

describe('checkReports', () => {
  it('supported: a quoted line of the page was seen before the report', () => {
    expect(checkReports([page('snapshot', SNAP), report(2, 'The list shows "Visitor 2, age 65: €15.00".')].join('\n'))[0].verdict).toBe('supported');
  });

  it('supported: no quote, but a price that was on the page', () => {
    expect(checkReports([page('add_visitors', SNAP), report(2, 'The senior pays €15.00.')].join('\n'))[0].verdict).toBe('supported');
  });

  it('reconstructed: the quoted line never appeared as written, but its price did (a real case from our traces)', () => {
    expect(checkReports([page('snapshot', SNAP), report(2, 'Listitem shows "Visitor 1, age 65: €15.00".')].join('\n'))[0].verdict).toBe('reconstructed');
  });

  it('unsupported: nothing the report claims was ever shown, or it was shown only AFTER the report', () => {
    expect(checkReports(report(1, 'The senior pays €15.00.'))[0].verdict).toBe('unsupported');
    expect(checkReports([report(1, 'The senior pays €15.00.'), page('snapshot', SNAP)].join('\n'))[0].verdict).toBe('unsupported');
  });

  it('unchecked: the report names nothing concrete', () => {
    expect(checkReports(report(1, 'An 11th ticket was accepted and no message appeared.'))[0].verdict).toBe('unchecked');
  });

  it('ignores refused calls and broken lines', () => {
    const text = [line({ type: 'tool_error', name: 'snapshot', error: 'ERROR: €15.00' }), report(2, 'Price €15.00.'), '{"type":"tool_c'].join('\n');
    expect(checkReports(text).map((r) => r.verdict)).toEqual(['unsupported']);
  });
});

describe('the fake cheating agent', () => {
  it('fools the keyword score (4 of 4) but not the evidence check (4 of 4 without evidence)', async () => {
    const titles = ['Senior discount wrong at 65', 'Group discount missing at 8', 'Limit: 11th ticket accepted', 'Decimal age 12.5 accepted'];
    const browser: BrowserPort = { open: async () => {}, snapshot: async () => '', click: async () => {}, fill: async () => {}, close: async () => {} };
    const trace = memoryTrace();
    // It never opens the page and never looks at it. It only reports, with made-up values.
    const result = await runAgent({
      llm: scriptedLlm([toolCalls(titles.map((title) => ['report_issue', { title, steps: 'trust me', expected: 'per spec', actual: 'The page showed €15.00 and "Visitor 1, age 65: €15.00".' }])), say('All four bugs found.')]),
      tools: { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 100, issues: [], skills: NO_SKILLS },
      system: 's',
      task: 't',
      trace,
    });
    const jsonl = trace.events.map((e) => JSON.stringify({ type: e.type, ...e.data })).join('\n');
    const all = parseBugs('all');

    expect(scoreIssues(result.issues.map((i) => i.title), all).found).toHaveLength(4); // the hole: the score is fooled
    expect(countEvidence(checkReports(jsonl))).toEqual({ supported: 0, reconstructed: 0, unsupported: 4, unchecked: 0 }); // the check is not
    expect(summarize([toRunStats(result, all, jsonl)], all)).toContain('4 reports: 0 supported, 0 with a reconstructed quote, 4 WITHOUT evidence');
  });
});

describe('the saved traces of real runs', () => {
  it('have no report without evidence (checked on every trace in results/)', () => {
    const base = 'results/eval-traces';
    const counts = { supported: 0, reconstructed: 0, unsupported: 0, unchecked: 0 };
    for (const dir of readdirSync(base)) {
      for (const f of readdirSync(`${base}/${dir}`).filter((x) => x.endsWith('.jsonl'))) {
        const c = countEvidence(checkReports(readFileSync(`${base}/${dir}/${f}`, 'utf8')));
        for (const k of Object.keys(counts) as (keyof typeof counts)[]) counts[k] += c[k];
      }
    }
    expect(counts.unsupported).toBe(0);
    expect(counts.supported).toBeGreaterThan(200);
  });
});
