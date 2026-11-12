// TIME AND MONEY of a run (step 17). Only plain functions: the trace text in, numbers out. No files, no model.
//
// What is measured, per run, from the trace file:
//   - how long each call to the model took (the loop writes `durationMs` into every model_reply event since step 17)
//   - how long the whole run took (from the `start` event to the `stop` event)
//   - what the run cost in US dollars, from the tokens of every call and the list prices below
//   - how many input tokens came from the prompt cache (0 today: prompt caching is not switched on)
//
// The summary of an eval turns these into p50 and p95 latency, price per run and price per found bug (src/score.ts).

// LIST PRICES in US dollars per million tokens, for the models this repo uses.
// Source: Anthropic's pricing page (platform.claude.com/docs/en/about-claude/pricing), as quoted by several sites on 12 November 2026.
// The page itself could not be opened when this was written, so check it before you trust a price to the cent.
// Prices change: if you use another model or the prices move, change this table. A model that is not here gets "price unknown".
// Haiku 5.5 has two price levels: a request whose prompt is longer than 100,000 tokens pays the `long` prices.
// (Our requests stay far below that: about 3,000 to 10,000 input tokens each.)
type Prices = { input: number; output: number; cacheRead: number; cacheWrite?: number };
export const MODEL_PRICES: Record<string, { normal: Prices; long?: Prices; longFrom?: number }> = {
  'claude-haiku-5-5': {
    normal: { input: 0.1, output: 0.5, cacheRead: 0.01 }, // cache write price not recorded here: we do not use caching
    long: { input: 0.5, output: 2.5, cacheRead: 0.05 },
    longFrom: 100_000,
  },
  'claude-sonnet-5-5': {
    normal: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 }, // cache read halved to $0.10 on 7 October 2026
  },
};

// The token usage of one call, as the loop writes it into the trace (the cache fields only when the API sent them).
export type Usage = { inputTokens: number; outputTokens: number; cacheReadInputTokens?: number; cacheCreationInputTokens?: number };

// The price of one call in dollars, or null when it cannot be known (unknown model, or a price that is not in the table).
export function callCost(model: string, u: Usage): number | null {
  const p = MODEL_PRICES[model];
  if (!p) return null;
  const read = u.cacheReadInputTokens ?? 0;
  const write = u.cacheCreationInputTokens ?? 0;
  const prompt = u.inputTokens + read + write; // the whole prompt of this request, which decides the price level
  const prices = p.long && p.longFrom !== undefined && prompt > p.longFrom ? p.long : p.normal;
  if (write > 0 && prices.cacheWrite === undefined) return null; // we would have to guess
  const perToken = (x: number) => x / 1_000_000;
  return perToken(u.inputTokens) * prices.input + perToken(u.outputTokens) * prices.output + perToken(read) * prices.cacheRead + perToken(write) * (prices.cacheWrite ?? 0);
}

// The value below which p percent of the values lie, by the "nearest rank" rule: sort, then take the value at
// rank ceil(p/100 * n). Simple and easy to check by hand: p50 of [1, 2, 3, 4] is 2, p95 of 20 values is the 19th.
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

// Everything above for one run, read from the text of its trace file.
export type CostAndTime = {
  model: string;
  callDurationsMs: number[]; // one value per call to the model; empty for traces written before step 17
  runMs: number | null; // from start to stop; null if one of the two events is missing
  costUsd: number | null; // null when the price of the model is unknown
  inputTokens: number; // all input tokens of the run, with the ones from the cache
  cacheReadTokens: number;
};

export function costAndTimeFromTrace(jsonl: string): CostAndTime {
  let model = '';
  let start: number | null = null;
  let stop: number | null = null;
  const callDurationsMs: number[] = [];
  let costUsd: number | null = 0;
  let inputTokens = 0;
  let cacheReadTokens = 0;
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    let e: { type?: string; t?: string; run?: { model?: string }; durationMs?: unknown; usage?: Usage };
    try {
      e = JSON.parse(line);
    } catch {
      continue; // a broken last line of a crashed run: skip it, the rest still counts
    }
    const time = e.t ? Date.parse(e.t) : NaN;
    if (e.type === 'start') {
      model = String(e.run?.model ?? '');
      if (!Number.isNaN(time)) start = time;
    }
    if (e.type === 'stop' && !Number.isNaN(time)) stop = time;
    if (e.type === 'model_reply' && e.usage) {
      if (typeof e.durationMs === 'number') callDurationsMs.push(e.durationMs);
      const u = e.usage;
      inputTokens += u.inputTokens + (u.cacheReadInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0);
      cacheReadTokens += u.cacheReadInputTokens ?? 0;
      const c = callCost(model, u);
      costUsd = costUsd === null || c === null ? null : costUsd + c;
    }
  }
  return { model, callDurationsMs, runMs: start !== null && stop !== null ? stop - start : null, costUsd, inputTokens, cacheReadTokens };
}
