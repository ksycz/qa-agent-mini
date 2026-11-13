// THE AGENT LOOP. This is the heart of an agent, and it is surprisingly small.
//
// The idea in plain words:
//   1. Give the model the task and the menu of tools.
//   2. The model answers. If it asks for tools, WE run them and give the results back. Go to 2.
//   3. If the model answers without asking for a tool, it is finished (unless its answer was cut off).
//
// The model only decides what to do next. Our code does everything else, and it enforces LIMITS,
// because a loop that talks to a paid model must never be able to run forever.
//
// Step 20: the two halves of a round (ask the model, run the tools) moved to src/agent-steps.ts, so that
// src/graph-agent.ts can build the same loop with LangGraph from the same parts. What is left here is the loop:
// a plain `while` that decides after each half whether to go on or to stop, and why.

import type { Message } from './llm';
import { askModel, finishRun, overBudget, runCalls, startRun, type AgentArgs, type AgentResult, type RunCounters } from './agent-steps';

// These used to be defined in this file. Other files still import them from here, so they stay available.
export { DEFAULT_LIMITS, type AgentLimits, type AgentResult, type StopReason } from './agent-steps';

export async function runAgent(args: AgentArgs): Promise<AgentResult> {
  const ctx = startRun(args); // final limits, the stuck guard, and the first line of the trace

  // The conversation so far. It starts with the task and grows with every step.
  const messages: Message[] = [{ role: 'user', content: args.task }];

  // Counters for the result.
  const counters: RunCounters = { steps: 0, inputTokens: 0, outputTokens: 0, finalText: '' };

  // THE LOOP. It can only run while we are below the step limit.
  while (counters.steps < ctx.limits.maxSteps) {
    counters.steps++;

    // 1. Ask the model what to do next (see askModel in src/agent-steps.ts).
    const turn = await askModel(ctx, counters.steps, messages);
    counters.inputTokens += turn.usage.inputTokens;
    counters.outputTokens += turn.usage.outputTokens;
    counters.finalText = turn.finalText;

    // 2. No tool requested (and the reply was not cut off) = the model is finished. The normal ending.
    if (turn.done) return finishRun(ctx, counters, 'done');

    // 3. Add the model's answer to the conversation, so the next call sees what it asked for.
    messages.push({ role: 'assistant', content: turn.content });

    // 4. Run every requested tool (see runCalls). The stuck guard can end the run in the middle of the calls.
    const { message, stuck } = await runCalls(ctx, counters.steps, turn.calls, turn.cutOff);
    if (stuck) return finishRun(ctx, counters, 'repeated_call');

    // 5. Give the results back to the model as the next "user" message.
    messages.push(message);

    // 6. Safety: out of token budget? Stop now, before the NEXT model call, which is the only thing that costs tokens.
    if (overBudget(ctx, counters)) return finishRun(ctx, counters, 'token_budget');
  }

  // We left the loop because we ran out of steps.
  return finishRun(ctx, counters, 'max_steps');
}
