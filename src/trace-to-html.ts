// TRACE TO HTML (step 14): turns the text of a trace file (trace.jsonl) into one web page that a person can read.
//
// A trace has one JSON object per line (see src/trace.ts). Reading it by eye is hard, so this file builds a page:
// the setup of the run on top, then every step of the agent: what the model said, which tools it called,
// what came back (errors in red), and at the end why the run stopped.
//
// This is a plain function: text in, text out. No files, no browser, no model. That is why it is easy to test.
//
// SAFETY: a trace contains text that we do not control (the page under test, the model's own words, even a hidden
// "canary" note). So every piece of text goes through esc() before it is put into the page. The page also carries a
// Content-Security-Policy that forbids scripts, as a second lock in case one escape is ever forgotten.

// One line of a trace file, after reading it. `type` says what kind of event it is, the rest depends on the type.
type TraceEvent = { type?: string; t?: string; [key: string]: unknown };

// Makes text safe to put inside HTML: the five characters that HTML treats as code become harmless text.
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;') // must come first, or it would break the ones below
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const n = (x: unknown) => (typeof x === 'number' ? x.toLocaleString('en-US') : '?'); // 91076 -> "91,076"
const time = (t: unknown) => (typeof t === 'string' ? t.slice(11, 19) : ''); // "2026-11-12T10:32:11.817Z" -> "10:32:11"
const json = (x: unknown) => JSON.stringify(x, null, 2) ?? '';

// A result is shown inline when it is short, and folded (<details>) when it is long or has many lines,
// because page snapshots are long and would bury everything else.
const FOLD_AFTER = 300; // characters
function folded(label: string, text: string, open = false): string {
  const long = text.length > FOLD_AFTER || text.split('\n').length > 4;
  if (!long) return `<pre>${esc(text)}</pre>`;
  const first = text.split('\n')[0].slice(0, 90);
  return `<details${open ? ' open' : ''}><summary>${esc(label)}: ${esc(first)} <span class="muted">(${text.length.toLocaleString('en-US')} characters)</span></summary><pre>${esc(text)}</pre></details>`;
}

// The setup of the run: who and what, the limits, and the two long texts the agent was given (folded).
function startCard(e: TraceEvent): string {
  const run = (e.run ?? {}) as Record<string, unknown>;
  const limits = (e.limits ?? {}) as Record<string, unknown>;
  const facts = Object.entries(run).map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(typeof v === 'string' ? v : JSON.stringify(v))}</li>`).join('');
  const lims = Object.entries(limits).map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('');
  return `<section class="card start"><h2>The run</h2>
<div class="cols"><div><h3>About this run</h3><ul>${facts}</ul></div><div><h3>Limits</h3><ul>${lims}</ul></div></div>
${folded('System prompt', String(e.system ?? ''))}
${folded('Task', String(e.task ?? ''))}</section>`;
}

// What the model said in one step: its text, the tools it asked for, and what the call cost.
function replyCard(e: TraceEvent): string {
  const blocks = Array.isArray(e.content) ? (e.content as Array<Record<string, unknown>>) : [];
  const texts = blocks.filter((b) => b.type === 'text').map((b) => `<p class="said">${esc(b.text)}</p>`).join('');
  const asks = blocks.filter((b) => b.type === 'tool_use').map((b) => `<code>${esc(b.name)}</code>`).join(' ');
  const usage = (e.usage ?? {}) as Record<string, unknown>;
  const thinking = Array.isArray(e.blockTypes) && e.blockTypes.includes('thinking') ? ' · <span class="muted">thinking (not recorded)</span>' : '';
  // A reply cut off by the length limit is worth a flag: the loop handles it, but the reader should see it.
  const cut = e.stopReason === 'max_tokens' ? ' <span class="bad">cut off by the length limit</span>' : '';
  return `<section class="card reply"><h2>Step ${esc(e.step)} <span class="muted">${esc(time(e.t))}</span></h2>
<p class="muted">model · in ${n(usage.inputTokens)} · out ${n(usage.outputTokens)} · stop reason: ${esc(e.stopReason)}${thinking}${cut}</p>
${texts || '<p class="muted">(no text, only tool calls)</p>'}
${asks ? `<p>asks for: ${asks}</p>` : ''}</section>`;
}

// One tool call and its answer. An error is red. A report_issue call is highlighted, because it is the product of the run.
function toolCard(e: TraceEvent, isError: boolean): string {
  const input = (e.input ?? {}) as Record<string, unknown>;
  const body = isError ? String(e.error ?? '') : String(e.result ?? '');
  const head = `<code>${esc(e.name)}</code> <span class="muted">${esc(JSON.stringify(input))}</span>`;
  if (e.name === 'report_issue' && !isError) {
    return `<section class="card tool issue"><p><b>Issue reported</b> (step ${esc(e.step)}): ${esc(input.title)}</p>
${folded('Details', ['steps: ' + input.steps, 'expected: ' + input.expected, 'actual: ' + input.actual].join('\n'))}<p class="muted">${esc(body)}</p></section>`;
  }
  return `<section class="card tool${isError ? ' error' : ''}"><p>${isError ? '<span class="bad">error</span> ' : ''}${head}</p>${folded(isError ? 'Error' : 'Result', body)}</section>`;
}

// The end of the run: why it stopped and what it cost.
function stopCard(e: TraceEvent): string {
  return `<section class="card stop"><h2>The run stopped</h2>
<p><b>Reason:</b> ${esc(e.stopReason)} · <b>steps:</b> ${esc(e.steps)} · <b>tokens:</b> ${n(e.inputTokens)} in + ${n(e.outputTokens)} out · <b>issues reported:</b> ${esc(e.issues)}</p></section>`;
}

const STYLE = `
body{font:15px/1.5 system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 12px;color:#1f2328;background:#f6f8fa}
h1{font-size:20px} h2{font-size:16px;margin:0 0 4px} h3{font-size:14px;margin:8px 0 2px}
.card{background:#fff;border:1px solid #d0d7de;border-radius:6px;padding:10px 14px;margin:10px 0}
.reply{border-left:4px solid #0969da} .tool{margin-left:28px;padding:6px 12px} .issue{border-left:4px solid #1a7f37;background:#f0fff4}
.error{border-left:4px solid #cf222e;background:#fff5f5} .stop{border-left:4px solid #6e7781}
.start ul{margin:0;padding-left:18px} .cols{display:flex;gap:32px;flex-wrap:wrap}
pre{background:#f6f8fa;padding:6px 8px;border-radius:4px;overflow:auto;white-space:pre-wrap;margin:4px 0;font-size:13px}
code{background:#eaeef2;padding:1px 5px;border-radius:4px;font-size:13px} .muted{color:#6e7781} .bad{color:#cf222e;font-weight:600}
.said{white-space:pre-wrap;margin:4px 0} summary{cursor:pointer}
`;

// The whole page. A line that cannot be read (for example the last line of a run that crashed halfway)
// becomes a note on the page instead of an error, because a broken trace is exactly when you want to read it.
export function traceToHtml(jsonl: string, title = 'Trace'): string {
  const cards: string[] = [];
  jsonl.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    let e: TraceEvent;
    try {
      e = JSON.parse(line) as TraceEvent;
    } catch {
      cards.push(`<section class="card error"><p class="bad">Line ${i + 1} could not be read.</p><pre>${esc(line.slice(0, 300))}</pre></section>`);
      return;
    }
    if (e.type === 'start') cards.push(startCard(e));
    else if (e.type === 'model_reply') cards.push(replyCard(e));
    else if (e.type === 'tool_call') cards.push(toolCard(e, false));
    else if (e.type === 'tool_error') cards.push(toolCard(e, true));
    else if (e.type === 'stop') cards.push(stopCard(e));
    else cards.push(`<section class="card"><p class="muted">event: ${esc(e.type)}</p><pre>${esc(json(e))}</pre></section>`); // a type we do not know yet
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><h1>${esc(title)}</h1>
${cards.join('\n') || '<p>The trace is empty.</p>'}
</body></html>
`;
}
