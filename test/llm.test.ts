// UNIT TEST of the part of the real model client that can be tested without the API:
// turning the API's answer into our own blocks. (The call to the API itself is NOT tested here.)

import { describe, expect, it } from 'vitest';
import { fromAnthropicContent, fromAnthropicResponse } from '../src/llm';

describe('fromAnthropicContent', () => {
  it('keeps text and tool requests and drops other blocks', () => {
    const out = fromAnthropicContent([
      { type: 'thinking', thinking: 'hmm' },
      { type: 'text', text: 'I will open the page.' },
      { type: 'tool_use', id: 'abc', name: 'open_page', input: { url: 'http://127.0.0.1:1/' } },
    ]);
    expect(out).toEqual([
      { type: 'text', text: 'I will open the page.' },
      { type: 'tool_use', id: 'abc', name: 'open_page', input: { url: 'http://127.0.0.1:1/' } },
    ]);
  });
});

describe('fromAnthropicResponse', () => {
  it('keeps the stop reason and the types of ALL blocks, also the ones we drop (issue #17)', () => {
    const out = fromAnthropicResponse({
      content: [
        { type: 'thinking', thinking: 'hmm' },
        { type: 'text', text: 'Adding visitors.' },
        { type: 'tool_use', id: 'abc', name: 'click', input: {} }, // a cut-off call arrives with empty input
      ],
      stop_reason: 'max_tokens',
      usage: { input_tokens: 500, output_tokens: 1000 },
    });
    expect(out.stopReason).toBe('max_tokens');
    expect(out.blockTypes).toEqual(['thinking', 'text', 'tool_use']);
    expect(out.usage).toEqual({ inputTokens: 500, outputTokens: 1000 });
    expect(out.content.map((b) => b.type)).toEqual(['text', 'tool_use']); // the thinking block is still dropped
  });
});
