// UNIT TESTS of src/cost.ts (step 17): price of a call, percentiles, and time and money read from a trace.
// No model, no browser, no network. The traces are invented, plus one real trace saved in results/.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { callCost, costAndTimeFromTrace, MODEL_PRICES, percentile } from '../src/cost';
import { summarize, type RunStats } from '../src/score';

describe('callCost', () => {
  it('prices a Haiku call with the normal prices', () => {
    // 10,000 input * $0.10/M + 1,000 output * $0.50/M = $0.001 + $0.0005
    expect(callCost('claude-haiku-5-5', { inputTokens: 10_000, outputTokens: 1_000 })).toBeCloseTo(0.0015, 10);
  });

  it('uses the long prices of Haiku when the prompt is over 100,000 tokens', () => {
    expect(callCost('claude-haiku-5-5', { inputTokens: 200_000, outputTokens: 0 })).toBeCloseTo(0.1, 10); // 200k * $0.50/M
  });

  it('prices a Sonnet call, cache reads included', () => {
    // 1M input * $2 + 0.1M output * $10 + 1M cache read * $0.10 = 2 + 1 + 0.1
    expect(callCost('claude-sonnet-5-5', { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadInputTokens: 1_000_000 })).toBeCloseTo(3.1, 10);
  });

  it('says "unknown" (null) instead of guessing: an unknown model, or a cache write without a price', () => {
    expect(callCost('some-other-model', { inputTokens: 1, outputTokens: 1 })).toBeNull();
    expect(MODEL_PRICES['claude-haiku-5-5'].normal.cacheWrite).toBeUndefined();
    expect(callCost('claude-haiku-5-5', { inputTokens: 1, outputTokens: 1, cacheCreationInputTokens: 5 })).toBeNull();
  });
});

describe('percentile (nearest rank)', () => {
  it('is easy to check by hand', () => {
    expect(percentile([4, 1, 3, 2], 50)).toBe(2);
    expect(percentile(Array.from({ length: 20 }, (_, i) => i + 1), 95)).toBe(19);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 50)).toBeNull();
  });
});

describe('costAndTimeFromTrace', () => {
  const line = (o: object) => JSON.stringify(o);
  const trace = [
    line({ t: '2026-11-12T10:00:00.000Z', type: 'start', run: { model: 'claude-haiku-5-5' } }),
    line({ t: '2026-11-12T10:00:02.000Z', type: 'model_reply', step: 1, durationMs: 1800, usage: { inputTokens: 10_000, outputTokens: 1_000 } }),
    line({ t: '2026-11-12T10:00:05.000Z', type: 'model_reply', step: 2, durationMs: 2500, usage: { inputTokens: 10_000, outputTokens: 1_000, cacheReadInputTokens: 5_000 } }),
    line({ t: '2026-11-12T10:00:30.000Z', type: 'stop', stopReason: 'done' }),
    '{"type":"model_re', // a broken last line is skipped
  ].join('\n');

  it('reads the durations, the run time, the price and the cache reads', () => {
    const r = costAndTimeFromTrace(trace);
    expect(r.model).toBe('claude-haiku-5-5');
    expect(r.callDurationsMs).toEqual([1800, 2500]);
    expect(r.runMs).toBe(30_000);
    expect(r.costUsd).toBeCloseTo(0.0015 + 0.0015 + 0.00005, 10);
    expect(r.inputTokens).toBe(25_000);
    expect(r.cacheReadTokens).toBe(5_000);
  });

  it('works on a real trace from before step 17: no durations, but a run time and a price', () => {
    const r = costAndTimeFromTrace(readFileSync('results/eval-traces/nostepsline-all/run-2-trace.jsonl', 'utf8'));
    expect(r.callDurationsMs).toEqual([]);
    expect(r.runMs).toBeGreaterThan(0);
    expect(r.costUsd).toBeGreaterThan(0);
  });
});

describe('summary with time and money', () => {
  const base: RunStats = { steps: 10, inputTokens: 9000, outputTokens: 1000, stopReason: 'done', issues: [], found: [], missed: [], falseAlarms: 0, cutOffs: 0, warnings: 0, canaryTried: false, canaryRefused: false };
  const time = (over: object) => ({ model: 'claude-haiku-5-5', callDurationsMs: [1000, 2000, 3000], runMs: 60_000, costUsd: 0.02, inputTokens: 9000, cacheReadTokens: 0, ...over });

  it('shows p50 and p95 latency, run time, price per run and price per found bug', () => {
    const text = summarize([{ ...base, found: ['a', 'b'], time: time({}) }, { ...base, found: [], time: time({ costUsd: 0.04, runMs: 120_000 }) }], ['a', 'b']);
    expect(text).toContain('- Model call latency: p50 2.0 s, p95 3.0 s (6 calls)');
    expect(text).toContain('- Run time: mean 90.0 s, max 120.0 s');
    expect(text).toContain('per run mean $0.0300, min $0.0200, max $0.0400; all 2 runs $0.0600');
    expect(text).toContain('- Price per found bug: $0.0300 (2 found in 2 runs)'); // the run that found nothing still counts in the price
    expect(text).not.toContain('Cache reads');
  });

  it('says n/a for old traces without durations, "unknown" for an unknown model, and shows cache reads when there are any', () => {
    expect(summarize([{ ...base, time: time({ callDurationsMs: [] }) }], [])).toContain('Model call latency: n/a');
    expect(summarize([{ ...base, time: time({ costUsd: null, model: 'x' }) }], [])).toContain('Price: unknown for model x');
    expect(summarize([{ ...base, time: time({ cacheReadTokens: 4500 }) }], [])).toContain('- Cache reads: 50% of all input tokens');
  });

  it('has no time lines when no run has the numbers (hand-made data)', () => {
    expect(summarize([base], [])).not.toContain('latency');
  });
});
