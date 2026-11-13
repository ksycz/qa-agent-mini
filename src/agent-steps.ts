// THE TWO HALVES OF ONE ROUND of the agent, shared by both versions of the loop (step 20).
//
// One round of an agent is always the same two things:
//   1. askModel:  ask the model what to do next.
//   2. runCalls:  run the tools it asked for, and turn the results into the next message.
// WHAT HAPPENS BETWEEN the rounds (go on? stop? why?) is the loop, and we have it twice:
//   src/agent.ts        a plain `while` loop, written by hand (steps 3 to 19)
//   src/graph-agent.ts  the same loop as a LangGraph graph (step 20)
// Both call the functions in this file, so the only difference between the two versions is the loop itself.
// That is what makes their comparison in step 21 fair.
//
// The code here was moved from src/agent.ts without changing what it does; test/agent.test.ts checks both versions.

import type { LlmClient, Message, TextBlock, ToolResultBlock, ToolUseBlock } from './llm';
import { TOOL_DEFS, runTool, type Issue, type ToolContext } from './tools';
import { createStuckGuard, STUCK_WARNING } from './stuck-guard';
import { trimOldSnapshots } from './trim-snapshots';
import type { Trace } from './trace';

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
  tokenBudget: 120_000, // was 80_000 until step 11; RESULTS.md says whether the higher number helped
  maxTokensPerReply: 1000,
  maxToolResultChars: 6000,
  maxRepeatedCalls: 3,
};

// Why the loop ended. 'done' is the only happy ending: the model decided it was finished.
export type StopReason = 'done' | 'max_steps' | 'token_budget' | 'repeated_call';

// What the loop returns: the problems found, and numbers to measure the run (used by the eval).
export type AgentResult = {
  issues: Issue[];
  steps: number;
  inputTokens: number;
  outputTokens: number;
  stopReason: StopReason;
  finalText: string; // the last thing the model said (usually a short summary)
};

// What both loops are given. The same object for both versions, so a caller can switch between them.
export type AgentArgs = {
  llm: LlmClient; // the brain: a fake in tests, a real model in a real run
  tools: ToolContext; // the hands from step 2 (browser, allowed hosts, ...)
  system: string; // standing instructions for the model
  task: string; // what to do right now
  limits?: Partial<AgentLimits>; // override some of the default limits
  log?: (line: string) => void; // optional: print what happens (used by the demo)
  trace?: Trace; // optional: record every event to a file (see src/trace.ts)
  info?: Record<string, unknown>; // optional: facts about this run for the trace (for example the model and the bugs)
};

// Everything one run needs that does NOT change from round to round: the inputs, the final limits and the stuck guard.
export type RunContext = Omit<AgentArgs, 'limits'> & { limits: AgentLimits; guard: ReturnType<typeof createStuckGuard> };

// Prepares a run: fills in the default limits, creates the stuck guard, and writes the first line of the trace.
export function startRun(args: AgentArgs): RunContext {
  const limits = { ...DEFAULT_LIMITS, ...args.limits };
  // First line of the trace: what the agent was given. This answers "what was it told?" when debugging.
  args.trace?.event('start', { run: args.info, system: args.system, task: args.task, limits }); // `run` = who and what (model, bugs); the rest = what the agent was told
  // For the "stuck" detection (see src/stuck-guard.ts): it remembers the last calls and warns before it stops.
  return { ...args, limits, guard: createStuckGuard(limits.maxRepeatedCalls) };
}

// The numbers a run keeps counting while it goes.
export type RunCounters = { steps: number; inputTokens: number; outputTokens: number; finalText: string };

// Ends a run, for whatever reason: writes the last line of the trace and builds the result.
export function finishRun(ctx: RunContext, counters: RunCounters, stopReason: StopReason): AgentResult {
  const { steps, inputTokens, outputTokens, finalText } = counters;
  ctx.trace?.event('stop', { stopReason, steps, inputTokens, outputTokens, issues: ctx.tools.issues.length });
  ctx.log?.(`STOP: ${stopReason} after ${steps} step(s), tokens in/out: ${inputTokens}/${outputTokens}`);
  return { issues: ctx.tools.issues, steps, inputTokens, outputTokens, stopReason, finalText };
}

// What the model is told after a reply was cut off by the length limit (issue #18).
const CUT_OFF_NOTICE =
  'Your last reply was cut off by the length limit, so its last call was not run. Send fewer calls at a time and keep the text short.';

// The text of the page right now. The stuck guard compares it before and after a call to see if anything changed.
// Before the first page is opened there is nothing to read, so an error simply means "no page yet".
async function pageText(tools: ToolContext): Promise<string> {
  try {
    return await tools.browser.snapshot();
  } catch {
    return '';
  }
}

// What one answer of the model means for the loop.
export type ModelTurn = {
  done: boolean; // true = the model is finished (no tool requested, and the reply was not cut off)
  cutOff: boolean; // the reply was cut off by the length limit
  content: Array<TextBlock | ToolUseBlock>; // the answer as it goes into the conversation (a half-written last call removed)
  calls: ToolUseBlock[]; // the tool requests we will run
  finalText: string; // the text part of the answer
  usage: { inputTokens: number; outputTokens: number };
};

// HALF 1 OF A ROUND: ask the model what to do next. `step` is the number of this round (1, 2, ...).
export async function askModel(ctx: RunContext, step: number, messages: Message[]): Promise<ModelTurn> {
  const { llm, system, limits, log, trace } = ctx;

  // Ask the model. It sees the whole conversation so far, except that old page snapshots are replaced by
  // a short note (src/trim-snapshots.ts), because every old snapshot would be paid for again in every step.
  const askedAt = Date.now(); // step 17: how long the model takes to answer (latency)
  const reply = await llm.complete({ system, tools: TOOL_DEFS, messages: trimOldSnapshots(messages), maxTokens: limits.maxTokensPerReply });
  const durationMs = Date.now() - askedAt;

  // Write the model's whole answer and its token usage to the trace.
  // stopReason and blockTypes say WHY the answer ended and what the API really returned (also blocks we drop).
  trace?.event('model_reply', {
    step,
    durationMs, // step 17: the time this one call to the model took
    usage: reply.usage,
    stopReason: reply.stopReason,
    blockTypes: reply.blockTypes,
    content: reply.content,
  });
  // A cut-off answer may end with an incomplete tool call: see below.
  if (reply.stopReason === 'max_tokens') log?.(`step ${step}: the reply was cut off by the length limit (max_tokens)`);

  // Remember the text part of the answer, and find the tool requests in it.
  const finalText = reply.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
  let content = reply.content;
  let calls = content.filter((b): b is ToolUseBlock => b.type === 'tool_use');

  // A reply cut off by the length limit (issue #18) is NOT "the model is finished", and its LAST call may be
  // half written. We do not run that call. We drop it from the conversation too, because the API wants a result
  // for every call in it. The model is told what happened (see runCalls).
  const cutOff = reply.stopReason === 'max_tokens';
  if (cutOff && calls.length > 0) {
    const halfCall = calls[calls.length - 1];
    content = content.filter((b) => b !== halfCall);
    calls = calls.slice(0, -1);
  }
  if (content.length === 0) content = [{ type: 'text', text: '(reply cut off)' }]; // the API refuses an empty message

  // No tool requested = the model considers itself finished. This is the normal ending.
  // (Not when the reply was cut off: then the model had no chance to finish.)
  const done = calls.length === 0 && !cutOff;
  if (done) log?.(`step ${step}: model says: ${finalText}`);

  return { done, cutOff, content, calls, finalText, usage: reply.usage };
}

// HALF 2 OF A ROUND: run every requested tool. Gives back the next "user" message for the conversation,
// and `stuck: true` when the stuck guard says the run must end (then the rest of the calls is not run).
export async function runCalls(ctx: RunContext, step: number, calls: ToolUseBlock[], cutOff: boolean): Promise<{ message: Message; stuck: boolean }> {
  const { tools, limits, log, trace, guard } = ctx;
  const results: ToolResultBlock[] = [];

  for (const call of calls) {
    log?.(`step ${step}: model asks ${call.name} ${JSON.stringify(call.input)}`);

    // a. Run the tool. A failing tool does NOT crash the loop: we turn the error into text and mark it
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

    // b. Stuck detection. It needs the result AND the page after the call, so it runs only now
    // (in step 3 it ran before the tool and could not tell "same click, page changed" from "same click, nothing happened").
    const verdict = guard.check(step, call.name + JSON.stringify(call.input), content, await pageText(tools));
    if (verdict === 'warn') content += `\n${STUCK_WARNING}`; // the model reads this in its next step

    // c. Record what the model will see. The trace gets the whole result (already limited by
    // maxToolResultChars, warning included), not a shortened copy: the trace is the main tool for debugging.
    results.push({ type: 'tool_result', tool_use_id: call.id, content, ...(isError ? { is_error: true } : {}) });
    if (isError) trace?.event('tool_error', { step, name: call.name, input: call.input, error: content });
    else trace?.event('tool_call', { step, name: call.name, input: call.input, result: content });
    log?.(isError ? `         ${content.split('\n')[0]}` : `         result: ${content.split('\n')[0]}${content.includes('\n') ? ' ...' : ''}`);

    if (verdict === 'stop') return { message: { role: 'user', content: results }, stuck: true };
  }

  // The results go back to the model as the next "user" message. After a cut-off reply, the model also gets the notice.
  return { message: { role: 'user', content: cutOff ? [...results, { type: 'text', text: CUT_OFF_NOTICE }] : results }, stuck: false };
}

// Is the run out of token budget? Checked after the tools ran, on purpose: running a tool is free, and a
// report_issue in the reply that went over the budget (issue #20) must not be thrown away.
export function overBudget(ctx: RunContext, counters: RunCounters): boolean {
  return counters.inputTokens + counters.outputTokens > ctx.limits.tokenBudget;
}
