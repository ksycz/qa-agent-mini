// THE MODEL, as the rest of the code sees it. Only TYPES and one small interface, no real model yet.
//
// Why a separate file? The agent loop (src/agent.ts) must not care WHICH model is behind it.
// It only needs something with one function: complete(request) -> response.
//   - In tests and in the demo, that "something" is a FAKE that returns prepared answers (src/fake-llm.ts).
//   - In step 4, we add a REAL one that calls the Anthropic API.
// Because of this, we can test the whole loop without an API key, without cost and without randomness.
//
// The shapes below follow how chat models with tools work: a conversation is a list of messages,
// and a message can contain blocks of text, tool requests and tool results.

import type { ToolDef } from './tools';

// Plain text written by the model.
export type TextBlock = { type: 'text'; text: string };

// The model says: "I want to call this tool with these arguments."
// `id` is a label so that the answer can be matched to this request.
export type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

// OUR answer to a tool request. `tool_use_id` points to the request it answers.
// `is_error: true` tells the model "this call failed", so it can try something else.
export type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

// One message in the conversation.
//   'user'      = us (the task, and the results of tools)
//   'assistant' = the model (its text and its tool requests)
export type Message = {
  role: 'user' | 'assistant';
  content: string | Array<TextBlock | ToolUseBlock | ToolResultBlock>;
};

// Everything we send to the model in one call.
export type LlmRequest = {
  system: string; // standing instructions: who the model is and how it should work
  tools: ToolDef[]; // the menu of tools it may ask for
  messages: Message[]; // the conversation so far
  maxTokens: number; // the longest answer we accept (protects the budget)
};

// What comes back. `usage` says how many tokens were used: this is what we pay for.
export type LlmResponse = {
  content: Array<TextBlock | ToolUseBlock>;
  usage: { inputTokens: number; outputTokens: number };
  // For the trace only: why did the model stop writing? The API says it, for example
  //   'end_turn' (it finished), 'tool_use' (it asked for tools) or 'max_tokens' (it was CUT OFF by our length limit).
  // The loop does not act on it yet. It is written to the trace so we can see cut-off answers (issue #17).
  stopReason?: string | null;
  // For the trace only: the type of EVERY block the API returned, in order, including the blocks we drop
  // (for example 'thinking'). Dropped blocks still use up output tokens, so we want to know they exist.
  blockTypes?: string[];
};

// The contract: anything with this one function can be the agent's brain.
export interface LlmClient {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

// ---------------------------------------------------------------------------------------------
// THE REAL MODEL (added in step 4). This is the ONLY place in the repo that talks to the Anthropic API.
// ---------------------------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';

// Turns the blocks the API sends back into our own, simpler blocks.
// The API can return other kinds of blocks (for example "thinking"); we keep only text and tool requests.
// It is a separate function so a unit test can check it without calling the API.
export function fromAnthropicContent(blocks: ReadonlyArray<{ type: string } & Record<string, unknown>>): Array<TextBlock | ToolUseBlock> {
  return blocks.flatMap((block): Array<TextBlock | ToolUseBlock> => {
    if (block.type === 'text') return [{ type: 'text', text: String(block.text) }];
    if (block.type === 'tool_use') {
      return [{ type: 'tool_use', id: String(block.id), name: String(block.name), input: block.input as Record<string, unknown> }];
    }
    return [];
  });
}

// Turns a whole API answer into our LlmResponse. Pure function (no network), so a unit test can check it.
// `res` has the shape of the API answer, but we only describe the few fields we read.
export function fromAnthropicResponse(res: {
  content: ReadonlyArray<{ type: string } & Record<string, unknown>>;
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}): LlmResponse {
  return {
    content: fromAnthropicContent(res.content),
    // These two numbers are what we pay for.
    usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
    stopReason: res.stop_reason,
    blockTypes: res.content.map((b) => b.type), // all of them, also the ones fromAnthropicContent drops
  };
}

// Creates a model client for one model name, for example "claude-haiku-5-5".
// The API key is NOT passed in code: the SDK reads it from the environment variable ANTHROPIC_API_KEY.
// That way the key is never written into a file that could be committed.
export function createAnthropicClient(model: string): LlmClient {
  const client = new Anthropic();
  return {
    async complete({ system, tools, messages, maxTokens }) {
      // Our request shape is already almost the API's shape, so we pass it on.
      // (`as never` only silences the type checker about the SDK's very detailed types.)
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        tools: tools as never,
        messages: messages as never,
      });
      return fromAnthropicResponse(res as never);
    },
  };
}
