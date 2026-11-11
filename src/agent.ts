// THE AGENT LOOP. This is the heart of an agent, and it is surprisingly small.
//
// The idea in plain words:
//   1. Give the model the task and the menu of tools.
//   2. The model answers. If it asks for tools, WE run them and give the results back. Go to 2.
//   3. If the model answers without asking for a tool, it is finished (unless its answer was cut off).
//
// The model only decides what to do next. Our code does everything else, and it enforces LIMITS,
// because a loop that talks to a paid model must never be able to run forever.

import type { LlmClient, Message, ToolResultBlock, ToolUseBlock } from './llm';
import { TOOL_DEFS, runTool, type Issue, type ToolContext } from './tools';
import { createStuckGuard, STUCK_WARNING } from './stuck-guard';
import { trimOldSnapshots } from './trim-snapshots';
import type { Trace } from './trace';

// The text of the page right now. The stuck guard compares it before and after a call to see if anything changed.
// Before the first page is opened there is nothing to read, so an error simply means "no page yet".
async function pageText(tools: ToolContext): Promise<string> {
  try {
    return await tools.browser.snapshot();
  } catch {
    return '';
  }
}

// What the model is told after a reply was cut off by the length limit (issue #18).
const CUT_OFF_NOTICE =
  'Your last reply was cut off by the length limit, so its last call was not run. Send fewer calls at a time and keep the text short.';

// The hard limits. All of them are checked by our code, not requested politely in the prompt.
export type AgentLimits = {
  maxSteps: number; // at most this many calls to the model
  tokenBudget: number; // stop when input + output tokens together exceed this
  maxTokensPerReply: number; // the longest single answer we accept from the model
  maxToolResultChars: number; // a tool result longer than this is cut (saves tokens)
  maxRepeatedCalls: number; // the same call, result and page this many times in a row: first a warning, then a stop
};

export const DEFAULT_LIMITS: AgentLimits = {
  maxSteps: 25,
  tokenBudget: 80_000,
  maxTokensPerReply: 1000,
  maxToolResultChars: 6000,
  maxRepeatedCalls: 3,
};

// Why the loop ended. 'done' is the only happy ending: the model decided it was finished.
export type StopReason = 'done' | 'max_steps' | 'token_budget' | 'repeated_call';

// What the loop returns: the problems found, and numbers to measure the run (used by the eval later).
export type AgentResult = {
  issues: Issue[];
  steps: number;
  inputTokens: number;
  outputTokens: number;
  stopReason: StopReason;
  finalText: string; // the last thing the model said (usually a short summary)
};

export async function runAgent(args: {
  llm: LlmClient; // the brain: a fake in tests, a real model later
  tools: ToolContext; // the hands from step 2 (browser, allowed hosts, ...)
  system: string; // standing instructions for the model
  task: string; // what to do right now
  limits?: Partial<AgentLimits>; // override some of the default limits
  log?: (line: string) => void; // optional: print what happens (used by the demo)
  trace?: Trace; // optional: record every event to a file (see src/trace.ts)
  info?: Record<string, unknown>; // optional: facts about this run for the trace (for example the model and the bugs)
}): Promise<AgentResult> {
  const { llm, tools, system, task, log, trace, info } = args;
  const limits = { ...DEFAULT_LIMITS, ...args.limits };

  // First line of the trace: what the agent was given. This answers "what was it told?" when debugging.
  trace?.event('start', { run: info, system, task, limits }); // `run` = who and what (model, bugs); the rest = what the agent was told

  // The conversation so far. It starts with the task and grows with every step.
  const messages: Message[] = [{ role: 'user', content: task }];

  // Counters for the result.
  let inputTokens = 0;
  let outputTokens = 0;
  let steps = 0;
  let finalText = '';

  // For the "stuck" detection (see src/stuck-guard.ts): it remembers the last calls and warns before it stops.
  const guard = createStuckGuard(limits.maxRepeatedCalls);

  // Small helper: build the result when we stop, for whatever reason.
  const finish = (stopReason: StopReason): AgentResult => {
    trace?.event('stop', { stopReason, steps, inputTokens, outputTokens, issues: tools.issues.length });
    log?.(`STOP: ${stopReason} after ${steps} step(s), tokens in/out: ${inputTokens}/${outputTokens}`);
    return { issues: tools.issues, steps, inputTokens, outputTokens, stopReason, finalText };
  };

  // THE LOOP. It can only run while we are below the step limit.
  while (steps < limits.maxSteps) {
    steps++;

    // 1. Ask the model what to do next. It sees the whole conversation so far, except that old page snapshots are
    // replaced by a short note (src/trim-snapshots.ts), because every old snapshot would be paid for again in every step.
    const reply = await llm.complete({ system, tools: TOOL_DEFS, messages: trimOldSnapshots(messages), maxTokens: limits.maxTokensPerReply });
    inputTokens += reply.usage.inputTokens;
    outputTokens += reply.usage.outputTokens;

    // Write the model's whole answer and its token usage to the trace.
    // stopReason and blockTypes say WHY the answer ended and what the API really returned (also blocks we drop).
    trace?.event('model_reply', {
      step: steps,
      usage: reply.usage,
      stopReason: reply.stopReason,
      blockTypes: reply.blockTypes,
      content: reply.content,
    });
    // A cut-off answer may end with an incomplete tool call: see step 2 below.
    if (reply.stopReason === 'max_tokens') log?.(`step ${steps}: the reply was cut off by the length limit (max_tokens)`);

    // Remember the text part of the answer, and find the tool requests in it.
    finalText = reply.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
    let content = reply.content;
    let calls = content.filter((b): b is ToolUseBlock => b.type === 'tool_use');

    // 2. A reply cut off by the length limit (issue #18) is NOT "the model is finished", and its LAST call may be
    // half written. We do not run that call. We drop it from the conversation too, because the API wants a result
    // for every call in it. The model is told what happened further down.
    const cutOff = reply.stopReason === 'max_tokens';
    if (cutOff && calls.length > 0) {
      const halfCall = calls[calls.length - 1];
      content = content.filter((b) => b !== halfCall);
      calls = calls.slice(0, -1);
    }
    if (content.length === 0) content = [{ type: 'text', text: '(reply cut off)' }]; // the API refuses an empty message

    // 3. No tool requested = the model considers itself finished. This is the normal ending.
    // (Not when the reply was cut off: then the model had no chance to finish.)
    if (calls.length === 0 && !cutOff) {
      log?.(`step ${steps}: model says: ${finalText}`);
      return finish('done');
    }

    // 4. Add the model's answer to the conversation, so the next call sees what it asked for.
    messages.push({ role: 'assistant', content });

    // 5. Run every requested tool and collect the answers.
    const results: ToolResultBlock[] = [];
    let stuck = false; // set when the stuck guard says the run must end
    for (const call of calls) {
      log?.(`step ${steps}: model asks ${call.name} ${JSON.stringify(call.input)}`);

      // 5a. Run the tool. A failing tool does NOT crash the loop: we turn the error into text and mark it
      // as an error. The model can read it and try something else. This is how agents recover.
      let content: string;
      let isError = false;
      try {
        const out = await runTool(tools, call.name, call.input);
        // Cut very long results so they do not eat the token budget.
        content = out.length > limits.maxToolResultChars ? out.slice(0, limits.maxToolResultChars) : out;
      } catch (e) {
        // A tool failed (blocked host, missing element, bad arguments...).
        content = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
        isError = true;
      }

      // 5b. Stuck detection. It needs the result AND the page after the call, so it runs only now
      // (in step 3 it ran before the tool and could not tell "same click, page changed" from "same click, nothing happened").
      const verdict = guard.check(steps, call.name + JSON.stringify(call.input), content, await pageText(tools));
      if (verdict === 'warn') content += `\n${STUCK_WARNING}`; // the model reads this in its next step
      if (verdict === 'stop') stuck = true;

      // 5c. Record what the model will see. The trace gets the whole result (already limited by
      // maxToolResultChars, warning included), not a shortened copy: the trace is the main tool for debugging.
      results.push({ type: 'tool_result', tool_use_id: call.id, content, ...(isError ? { is_error: true } : {}) });
      if (isError) trace?.event('tool_error', { step: steps, name: call.name, input: call.input, error: content });
      else trace?.event('tool_call', { step: steps, name: call.name, input: call.input, result: content });
      log?.(isError ? `         ${content.split('\n')[0]}` : `         result: ${content.split('\n')[0]}${content.includes('\n') ? ' ...' : ''}`);

      if (stuck) return finish('repeated_call');
    }

    // 6. Give the results back to the model as the next "user" message. After a cut-off reply, the model also gets the notice.
    messages.push({ role: 'user', content: cutOff ? [...results, { type: 'text', text: CUT_OFF_NOTICE }] : results });

    // 7. Safety: out of token budget? Stop now, before the NEXT model call, which is the only thing that costs tokens.
    // This check comes after the tools ran on purpose: running a tool is free, and a report_issue in the reply
    // that went over the budget (issue #20) must not be thrown away.
    if (inputTokens + outputTokens > limits.tokenBudget) return finish('token_budget');
  }

  // We left the loop because we ran out of steps.
  return finish('max_steps');
}
