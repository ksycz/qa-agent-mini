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

// Arguments that are required but may be an empty string on purpose.
// Typing "" into a field is how a tester clears it. Everything else required must contain text.
const MAY_BE_EMPTY: Record<string, string[]> = { fill: ['text'] };

// Checks the model's input against the tool's own definition in TOOL_DEFS (the "schema").
// Models sometimes forget an argument. A missing one is an ERROR the model can read and fix, never silently turned into "".
// (Issue #9: `fill` without `text` used to succeed and clear the field, because a missing text was treated as "".)
// The menu (TOOL_DEFS) is the single source of truth: if a tool gets a new required argument there, it is checked here.
function validateInput(def: ToolDef, input: Record<string, unknown>): void {
  const required = (def.input_schema.required ?? []) as string[];
  for (const key of required) {
    const v = input[key];
    if (typeof v !== 'string') throw new Error(`Missing argument "${key}" (it must be a text value)`);
    if (v.trim() === '' && !(MAY_BE_EMPTY[def.name] ?? []).includes(key)) {
      throw new Error(`Empty argument "${key}"`);
    }
  }
}

// 4. RUN ONE TOOL. Returns text for the model. If something goes wrong it THROWS an error.
// The agent loop (step 3) catches the error and sends its message back to the model as text,
// so the model can see what went wrong and try something else. The loop never crashes because of a tool.
export async function runTool(ctx: ToolContext, name: string, input: Record<string, unknown>): Promise<string> {
  const def = TOOL_DEFS.find((t) => t.name === name);
  if (!def) throw new Error(`Unknown tool "${name}"`);
  validateInput(def, input); // after this line every required argument is known to be text

  // Reads an argument. Safe to use for required arguments, because validateInput has already checked them.
  const str = (key: string) => input[key] as string;

  switch (name) {
    case 'open_page': {
      const url = str('url');
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
      await ctx.browser.click(str('role'), str('name'));
      return 'Clicked.';
    case 'fill':
      // `text` must be present, but "" is allowed: it clears the field (see MAY_BE_EMPTY above).
      await ctx.browser.fill(str('label'), str('text'));
      return 'Filled.';
    case 'report_issue': {
      // All four fields are required, so a report always has steps, expected and actual results.
      ctx.issues.push({
        title: str('title'),
        steps: str('steps'),
        expected: str('expected'),
        actual: str('actual'),
      });
      return `Issue recorded (${ctx.issues.length} so far).`;
    }
    default:
      // Not reachable while every tool in TOOL_DEFS has a case above (a test checks that).
      throw new Error(`Unknown tool "${name}"`);
  }
}
