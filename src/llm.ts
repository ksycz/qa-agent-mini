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
};

// The contract: anything with this one function can be the agent's brain.
export interface LlmClient {
  complete(request: LlmRequest): Promise<LlmResponse>;
}
