// A FAKE MODEL for tests and demos. It does not think: it returns prepared answers one after another.
//
// This lets us test the agent LOOP (limits, errors, stopping) exactly, for free, without an API key.
// We are not testing whether the model is clever. We are testing that OUR code around it is correct.

import type { LlmClient, LlmRequest, LlmResponse } from './llm';

// Builds a model answer that asks for one tool. Example: toolCall('fill', { label: 'Visitor age', text: '65' })
// Every call costs a pretend 100 input and 10 output tokens, so token budgets can be tested.
export function toolCall(name: string, input: Record<string, unknown>, id = `call_${Math.random().toString(36).slice(2, 8)}`): LlmResponse {
  return {
    content: [{ type: 'tool_use', id, name, input }],
    usage: { inputTokens: 100, outputTokens: 10 },
    stopReason: 'tool_use', // like the real API, so the trace of a test looks like the trace of a real run
    blockTypes: ['tool_use'],
  };
}

// Builds a model answer that asks for SEVERAL tools in one reply (real models do this often).
// Example: toolCalls([['fill', { label: 'Visitor age', text: '5' }], ['click', { role: 'button', name: 'Add visitor' }]])
export function toolCalls(calls: [string, Record<string, unknown>][]): LlmResponse {
  return {
    content: calls.map(([name, input], i) => ({ type: 'tool_use' as const, id: `batch_${i}_${Math.random().toString(36).slice(2, 8)}`, name, input })),
    usage: { inputTokens: 100, outputTokens: 10 },
    stopReason: 'tool_use',
    blockTypes: calls.map(() => 'tool_use'),
  };
}

// Builds a model answer with only text and no tool request. This is how a model says "I am finished".
export function say(text: string): LlmResponse {
  return {
    content: [{ type: 'text', text }],
    usage: { inputTokens: 100, outputTokens: 10 },
    stopReason: 'end_turn',
    blockTypes: ['text'],
  };
}

// A fake model that returns the answers from `script` in order.
// When the script runs out, it repeats the last answer (useful for "the model never stops" tests).
// `requests` records everything the loop sent to the model, so a test can check what the model "saw".
export function scriptedLlm(script: LlmResponse[]): LlmClient & { requests: LlmRequest[] } {
  let next = 0;
  const requests: LlmRequest[] = [];
  return {
    requests,
    async complete(request) {
      // The loop keeps adding to its message list, so we store a COPY of what the model saw at this moment.
      requests.push(structuredClone(request));
      return script[Math.min(next++, script.length - 1)];
    },
  };
}
