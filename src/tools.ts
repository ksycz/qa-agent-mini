import type { BrowserPort } from './browser';

// A tool as the model will see it: a name, a description and the shape of its arguments.
export type ToolDef = { name: string; description: string; input_schema: Record<string, unknown> };

export type Issue = { title: string; steps: string; expected: string; actual: string };

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

export type ToolContext = {
  browser: BrowserPort;
  allowedHosts: string[];
  maxSnapshotChars: number;
  issues: Issue[];
};

// Guardrail in code, not in the prompt: the agent cannot leave the allowed hosts.
export function assertAllowed(url: string, allowedHosts: string[]): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!allowedHosts.includes(host)) {
    throw new Error(`Host "${host}" is not allowed. Allowed: ${allowedHosts.join(', ')}`);
  }
}

function str(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  if (typeof v !== 'string' || v.trim() === '') throw new Error(`Missing or empty argument "${key}"`);
  return v;
}

// Runs one tool call. Any error is thrown and the agent loop sends it back to the model as text.
export async function runTool(ctx: ToolContext, name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'open_page': {
      const url = str(input, 'url');
      assertAllowed(url, ctx.allowedHosts);
      await ctx.browser.open(url);
      return 'Page opened.';
    }
    case 'snapshot': {
      const text = await ctx.browser.snapshot();
      return text.length > ctx.maxSnapshotChars ? text.slice(0, ctx.maxSnapshotChars) + '\n[truncated]' : text;
    }
    case 'click':
      await ctx.browser.click(str(input, 'role'), str(input, 'name'));
      return 'Clicked.';
    case 'fill':
      await ctx.browser.fill(str(input, 'label'), String(input.text ?? ''));
      return 'Filled.';
    case 'report_issue': {
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
