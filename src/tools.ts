// THE TOOLS of the agent.
//
// A "tool" is a small action the model can ask for. The model never touches the browser directly.
// It writes something like: "call fill with label=Visitor age and text=65". OUR code then decides
// whether to do it and how. That is where the safety rules live.
//
// This file has four parts:
//   1. TOOL_DEFS:      the menu we show to the model (names, descriptions, arguments).
//   2. ToolContext:    what the tools need to work (the browser, the allowed hosts, ...).
//   3. assertAllowed:  the allowed-hosts guard.
//   4. runTool:        the code that actually runs a tool.

import type { BrowserPort } from './browser';

// A tool as the model will see it: a name, a description and the shape of its arguments (JSON schema).
// The description is part of the prompt: the model decides what to call by reading it.
export type ToolDef = { name: string; description: string; input_schema: Record<string, unknown> };

// A problem the agent found. This is the agent's OUTPUT, the thing we later score.
export type Issue = { title: string; steps: string; expected: string; actual: string };

// 1. THE MENU. Five tools. Keep descriptions short and concrete.
export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'open_page',
    description: 'Open a URL in the browser. Only the allowed test host can be opened.',
    input_schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
  },
  {
    name: 'snapshot',
    description:
      'Return a text snapshot of the current page (roles and names of elements). Call it after every action to see the result.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'click',
    description: 'Click an element by its ARIA role and accessible name, for example role "button", name "Add visitor".',
    input_schema: {
      type: 'object',
      properties: { role: { type: 'string' }, name: { type: 'string' } },
      required: ['role', 'name'],
    },
  },
  {
    name: 'fill',
    description: 'Type text into a form field found by its label, for example label "Visitor age", text "30".',
    input_schema: {
      type: 'object',
      properties: { label: { type: 'string' }, text: { type: 'string' } },
      required: ['label', 'text'],
    },
  },
  {
    name: 'report_issue',
    description:
      'Report one problem you observed. Report only differences between the specification and what you saw on the page.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        steps: { type: 'string', description: 'Exact steps to reproduce' },
        expected: { type: 'string', description: 'What the specification says' },
        actual: { type: 'string', description: 'What you saw on the page' },
      },
      required: ['title', 'steps', 'expected', 'actual'],
    },
  },
];

// 2. EVERYTHING A TOOL NEEDS. We pass it in (instead of using global variables),
// so tests can pass in a fake browser.
export type ToolContext = {
  browser: BrowserPort; // the real or the fake browser
  allowedHosts: string[]; // the only web hosts the agent may open, for example ['127.0.0.1']
  maxSnapshotChars: number; // snapshots longer than this are cut (saves tokens)
  issues: Issue[]; // the list where report_issue stores what the agent found
};

// 3. THE GUARD. The agent may open only hosts on the allow list.
// This is enforced in CODE. A sentence in the prompt such as "do not visit other sites" is only a request;
// the model can be tricked into ignoring it. This check cannot be tricked.
export function assertAllowed(url: string, allowedHosts: string[]): void {
  let host: string;
  try {
    host = new URL(url).hostname; // "http://127.0.0.1:4173/x" -> "127.0.0.1"
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  // We compare the WHOLE host name, so "127.0.0.1.evil.example" is NOT accepted.
  if (!allowedHosts.includes(host)) {
    throw new Error(`Host "${host}" is not allowed. Allowed: ${allowedHosts.join(', ')}`);
  }
}

// Reads one text argument from the model's input and checks that it is not missing or empty.
// Models sometimes forget an argument; a clear error message lets them fix the call.
function str(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  if (typeof v !== 'string' || v.trim() === '') throw new Error(`Missing or empty argument "${key}"`);
  return v;
}

// 4. RUN ONE TOOL. Returns text for the model. If something goes wrong it THROWS an error.
// The agent loop (step 3) catches the error and sends its message back to the model as text,
// so the model can see what went wrong and try something else. The loop never crashes because of a tool.
export async function runTool(ctx: ToolContext, name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'open_page': {
      const url = str(input, 'url');
      assertAllowed(url, ctx.allowedHosts); // guard first, browser second
      await ctx.browser.open(url);
      return 'Page opened.';
    }
    case 'snapshot': {
      const text = await ctx.browser.snapshot();
      // Long pages would cost many tokens, so we cut them and say so.
      return text.length > ctx.maxSnapshotChars ? text.slice(0, ctx.maxSnapshotChars) + '\n[truncated]' : text;
    }
    case 'click':
      await ctx.browser.click(str(input, 'role'), str(input, 'name'));
      return 'Clicked.';
    case 'fill':
      // `text` may legitimately be empty (to clear a field), so it is not checked with str().
      await ctx.browser.fill(str(input, 'label'), String(input.text ?? ''));
      return 'Filled.';
    case 'report_issue': {
      // All four fields are required, so a report always has steps, expected and actual results.
      ctx.issues.push({
        title: str(input, 'title'),
        steps: str(input, 'steps'),
        expected: str(input, 'expected'),
        actual: str(input, 'actual'),
      });
      return `Issue recorded (${ctx.issues.length} so far).`;
    }
    default:
      throw new Error(`Unknown tool "${name}"`);
  }
}
