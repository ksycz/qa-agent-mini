// UNIT TESTS of the translation between our messages and LangChain's (src/langchain-messages.ts, step 20b).
// The one rule: there and back again gives exactly what went in, so the model never sees a difference.

import { describe, expect, it } from 'vitest';
import { runAgent } from '../src/agent';
import type { BrowserPort } from '../src/browser';
import { say, scriptedLlm, toolCall, toolCalls } from '../src/fake-llm';
import { fromLangChain, toLangChain } from '../src/langchain-messages';
import type { Message } from '../src/llm';
import { NO_SKILLS } from '../src/skills';

// A conversation with every shape a real run can have.
const conversation: Message[] = [
  { role: 'user', content: 'Test the page at http://127.0.0.1:4173' },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: 'I will add a senior.' },
      { type: 'tool_use', id: 'a', name: 'fill', input: { label: 'Visitor age', text: '65' } },
      { type: 'tool_use', id: 'b', name: 'click', input: { role: 'button', name: 'Add visitor' } },
    ],
  },
  {
    role: 'user',
    content: [
      { type: 'tool_result', tool_use_id: 'a', content: 'Filled.' },
      { type: 'tool_result', tool_use_id: 'b', content: 'ERROR: no such button', is_error: true },
    ],
  },
  // A tool call FIRST and text after it: the order must survive.
  { role: 'assistant', content: [{ type: 'tool_use', id: 'c', name: 'snapshot', input: {} }, { type: 'text', text: 'Looking.' }] },
  // Tool results followed by the cut-off notice, in one user message.
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'c', content: '- button "Add visitor"' }, { type: 'text', text: 'Your last reply was cut off.' }] },
  // A reply cut off with no tool call: the next user message holds ONLY the cut-off notice (step 21 met this in a real run).
  { role: 'assistant', content: [{ type: 'text', text: 'Last, I will check' }] },
  { role: 'user', content: [{ type: 'text', text: 'Your last reply was cut off.' }] },
  { role: 'assistant', content: [{ type: 'text', text: 'Done.' }] },
];

describe('LangChain messages', () => {
  it('there and back again gives exactly the same conversation', () => {
    expect(fromLangChain(toLangChain(conversation))).toEqual(conversation);
  });

  it('becomes the LangChain message kinds human, ai and tool', () => {
    expect(toLangChain(conversation).map((m) => m.getType())).toEqual(['human', 'ai', 'tool', 'tool', 'ai', 'tool', 'human', 'ai', 'human', 'ai']);
    const ai = toLangChain(conversation)[1] as unknown as { tool_calls: { name: string }[] };
    expect(ai.tool_calls.map((c) => c.name)).toEqual(['fill', 'click']); // Studio lists the calls from here
  });

  it('gives back the same conversation for a real run of the loop (fake model)', async () => {
    const browser: BrowserPort = { open: async () => {}, snapshot: async () => '- button "Add visitor"', click: async () => {}, fill: async () => {}, close: async () => {} };
    const llm = scriptedLlm([
      toolCalls([['open_page', { url: 'http://127.0.0.1/' }], ['snapshot', {}]]),
      toolCall('open_page', { url: 'https://example.com/' }), // refused by the host check: an error result
      { ...toolCalls([['fill', { label: 'Visitor age', text: '5' }], ['click', { role: 'button' }]]), stopReason: 'max_tokens' }, // cut off
      { ...say('Last, I will check'), stopReason: 'max_tokens' }, // cut off with no tool call at all (step 21, a real run)
      say('finished'),
    ]);
    await runAgent({ llm, tools: { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 100, issues: [], skills: NO_SKILLS }, system: 's', task: 't' });
    const seen = llm.requests[llm.requests.length - 1].messages; // the whole conversation the model saw last
    expect(fromLangChain(toLangChain(seen))).toEqual(seen);
  });
});
