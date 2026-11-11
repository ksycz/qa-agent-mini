// UNIT TEST of the part of the real model client that can be tested without the API:
// turning the API's answer into our own blocks. (The call to the API itself is NOT tested here.)

import { describe, expect, it } from 'vitest';
import { fromAnthropicContent } from '../src/llm';

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
