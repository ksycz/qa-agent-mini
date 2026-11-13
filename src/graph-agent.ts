// THE SAME AGENT LOOP, BUILT WITH LANGGRAPH (step 20).
//
// src/agent.ts is a plain `while` loop. This file builds the same loop as a GRAPH, with LangGraph.js:
//
//   START ──► model ──(asked for tools)──► tools ──(go on)──► model ──► ...
//               │                            │
//               └──(finished)──► END ◄──(stop: stuck, budget, step limit)
//
// Words LangGraph uses, in plain English:
//   STATE   the data the graph carries from node to node: here the conversation and the counters.
//   NODE    a function that reads the state and returns the parts of it that change. We have two:
//             `model`  asks the model (askModel from src/agent-steps.ts)
//             `tools`  runs the tools it asked for (runCalls from src/agent-steps.ts)
//   EDGE    which node runs next. A CONDITIONAL edge is a small function that looks at the state and decides.
//   REDUCER how a node's answer is merged into the state. For the conversation we ADD the new messages to the
//           old ones; for a counter the new value simply REPLACES the old one.
//
// What LangGraph does here: it runs the nodes in the right order and carries the state between them.
// What it does NOT do: the limits. They stay in our code, exactly as in src/agent.ts, so the model cannot get past
// them however the graph is built. The model, the tools, the stuck guard and the trace are shared with src/agent.ts,
// so the only difference between the two versions is the loop. Step 21 measures whether that changes anything.

import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { fromLangChain, toLangChain } from './langchain-messages';
import {
  askModel,
  finishRun,
  overBudget,
  runCalls,
  startRun,
  type AgentArgs,
  type AgentResult,
  type ModelTurn,
  type RunContext,
  type StopReason,
} from './agent-steps';

// A state field whose new value simply REPLACES the old one, with a starting value. The starting values mean
// that a run can begin with only a message (this is what LangGraph Studio sends, step 20b).
function replaced<T>(start: T) {
  return Annotation<T>({ reducer: (_old, next) => next, default: () => start });
}

// THE STATE: what the graph carries from one node to the next.
const AgentState = Annotation.Root({
  // The conversation, as LangChain messages (step 20b), so that LangGraph Studio can show it as a chat.
  // Its reducer ADDS: a node returns only its new messages, LangGraph puts them at the end.
  // The model still gets our own format: see src/langchain-messages.ts.
  ...MessagesAnnotation.spec,
  steps: replaced(0), // how many times the model was asked
  inputTokens: replaced(0),
  outputTokens: replaced(0),
  finalText: replaced(''), // the text part of the model's last answer
  turn: replaced<ModelTurn | null>(null), // the last answer of the model, handed from `model` to `tools`
  stopReason: replaced<StopReason | null>(null), // set by a node when the run must end; null = go on
});
type State = typeof AgentState.State;

// Builds the graph. The things that are not data (the model client, the browser, the trace, the stuck guard)
// are not put into the state: the nodes simply use them from `ctx`. Exported for LangGraph Studio (src/studio.ts).
export function buildGraph(ctx: RunContext) {
  // NODE `model`: ask the model what to do next.
  const model = async (s: State): Promise<Partial<State>> => {
    const step = s.steps + 1;
    const turn = await askModel(ctx, step, fromLangChain(s.messages)); // back to our format: the model sees what the hand-written loop would send
    const update: Partial<State> = {
      steps: step,
      inputTokens: s.inputTokens + turn.usage.inputTokens,
      outputTokens: s.outputTokens + turn.usage.outputTokens,
      finalText: turn.finalText,
      turn,
      stopReason: null, // a new question in Studio continues a finished conversation, so the old reason is cleared
    };
    // The answer goes into the conversation (the reducer adds it at the end). Also the last one, when the model is
    // finished: no model reads it any more, but LangGraph Studio shows the conversation, and the summary belongs in it.
    const answer = toLangChain([{ role: 'assistant', content: turn.content }]);
    // No tool requested = the model is finished. The normal ending.
    if (turn.done) return { ...update, messages: answer, stopReason: 'done' };
    return { ...update, messages: answer };
  };

  // NODE `tools`: run the tools the model asked for, then check the limits that are checked after the tools.
  const tools = async (s: State): Promise<Partial<State>> => {
    const turn = s.turn as ModelTurn; // always set: `tools` only runs after `model` asked for tools
    const { message, stuck } = await runCalls(ctx, s.steps, turn.calls, turn.cutOff);
    if (stuck) return { stopReason: 'repeated_call' };
    const counters = { steps: s.steps, inputTokens: s.inputTokens, outputTokens: s.outputTokens, finalText: s.finalText };
    // Out of token budget: stop before the NEXT model call. The results are still added, like in src/agent.ts.
    if (overBudget(ctx, counters)) return { messages: toLangChain([message]), stopReason: 'token_budget' };
    return { messages: toLangChain([message]) };
  };

  // CONDITIONAL EDGE: may the model be asked again? This is the condition of the `while` in src/agent.ts.
  const nextAfterTools = (s: State) => (s.stopReason ? END : s.steps < ctx.limits.maxSteps ? 'model' : END);
  // CONDITIONAL EDGE after `model`: finished, or on to the tools.
  const nextAfterModel = (s: State) => (s.stopReason ? END : 'tools');

  return new StateGraph(AgentState)
    .addNode('model', model)
    .addNode('tools', tools)
    .addConditionalEdges(START, (s: State) => (s.steps < ctx.limits.maxSteps ? 'model' : END), ['model', END])
    .addConditionalEdges('model', nextAfterModel, ['tools', END])
    .addConditionalEdges('tools', nextAfterTools, ['model', END])
    .compile()
    // LangGraph has a safety limit of its own: by default a graph may run at most 25 nodes, then it throws an error.
    // One step of our agent runs two nodes (`model` and `tools`), so the default would stop a run at about step 12,
    // long before our own limit of 25 steps. We set it just above our limit: OUR step limit always ends the run
    // first, and LangGraph's limit is only a second net that should never be reached. It is set on the graph itself,
    // not on one call, so it also holds when LangGraph Studio runs the graph (step 20b).
    .withConfig({ recursionLimit: 2 * ctx.limits.maxSteps + 2 });
}

// Same arguments and same result as runAgent in src/agent.ts, so a caller can switch between the two.
export async function runGraphAgent(args: AgentArgs): Promise<AgentResult> {
  const ctx = startRun(args); // final limits, the stuck guard, and the first line of the trace (shared with src/agent.ts)
  const graph = buildGraph(ctx);

  // The run starts with only the task; every other field of the state starts at its default (0, '' or null).
  const final = await graph.invoke({ messages: toLangChain([{ role: 'user', content: args.task }]) });

  // The graph ended. If no node set a reason, it ended because the step limit was reached (the edge sent it to END).
  const counters = { steps: final.steps, inputTokens: final.inputTokens, outputTokens: final.outputTokens, finalText: final.finalText };
  return finishRun(ctx, counters, final.stopReason ?? 'max_steps');
}

// For the README and for curious readers: the graph as a Mermaid diagram (text that GitHub draws as a picture).
// The graph does not need a real run to be drawn, so the context here is empty.
export function graphAsMermaid(): string {
  return buildGraph(startRun({ llm: null as never, tools: null as never, system: '', task: '' })).getGraph().drawMermaid();
}
