// TRANSLATION between our own message format (src/llm.ts) and LangChain's message classes (step 20b).
//
// Why: the LangGraph version of the loop (src/graph-agent.ts) keeps the conversation in its state, and LangGraph's
// tools (LangGraph Studio among them) expect it there as LangChain messages in a field called `messages`. So the graph
// stores LangChain messages, and translates them back to our format right before the model is asked (askModel).
// (Studio's Chat mode still does not offer itself for this graph, nor for the plain example from the LangGraph docs:
// see docs/STEPS.md, step 20b. Its Graph mode shows the messages in the state of every node.)
//
// The rule that matters: there and back again must give EXACTLY what went in. Otherwise the model would see a
// different conversation in the LangGraph version, and the comparison in step 21 would not be fair.
// test/langchain-messages.test.ts checks this on real conversations.
//
// How one of our messages becomes LangChain messages:
//   user, text (the task)             -> HumanMessage
//   assistant (text and tool calls)   -> AIMessage. Its content keeps our blocks as they are (same order), and
//                                        `tool_calls` lists the calls again, because that is what Studio shows.
//   user, tool results                -> one ToolMessage per result (status 'error' for a failed tool)
//   user, the cut-off notice after the tool results -> a HumanMessage right after those ToolMessages

import { AIMessage, HumanMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages';
import type { Message, TextBlock, ToolResultBlock, ToolUseBlock } from './llm';

export function toLangChain(messages: Message[]): BaseMessage[] {
  return messages.flatMap((m): BaseMessage[] => {
    if (m.role === 'assistant') {
      const blocks = typeof m.content === 'string' ? [{ type: 'text' as const, text: m.content }] : m.content;
      const calls = blocks.filter((b): b is ToolUseBlock => b.type === 'tool_use');
      return [new AIMessage({ content: blocks as never, tool_calls: calls.map((c) => ({ id: c.id, name: c.name, args: c.input, type: 'tool_call' as const })) })];
    }
    // A user message: the task (a string), or tool results that may end with the cut-off notice (a text block).
    if (typeof m.content === 'string') return [new HumanMessage(m.content)];
    return m.content.map((b) =>
      b.type === 'tool_result'
        ? new ToolMessage({ content: b.content, tool_call_id: b.tool_use_id, status: b.is_error ? 'error' : 'success' })
        : new HumanMessage((b as TextBlock).text),
    );
  });
}

export function fromLangChain(messages: BaseMessage[]): Message[] {
  const out: Message[] = [];
  let previous: BaseMessage | undefined;
  for (const m of messages) {
    const type = m.getType(); // 'human', 'ai' or 'tool'
    if (type === 'ai') {
      // Our blocks were kept as they were, so they come back unchanged.
      out.push({ role: 'assistant', content: m.content as Array<TextBlock | ToolUseBlock> });
    } else if (type === 'tool') {
      const t = m as ToolMessage;
      const result: ToolResultBlock = { type: 'tool_result', tool_use_id: t.tool_call_id, content: String(t.content), ...(t.status === 'error' ? { is_error: true } : {}) };
      // Several ToolMessages in a row were ONE user message of ours: put them back together.
      if (previous?.getType() === 'tool') (out[out.length - 1].content as ToolResultBlock[]).push(result);
      else out.push({ role: 'user', content: [result] });
    } else if (type === 'human' && previous?.getType() === 'tool') {
      // Text right after tool results is the cut-off notice: it was the last block of the same user message.
      (out[out.length - 1].content as Array<ToolResultBlock | TextBlock>).push({ type: 'text', text: String(m.content) });
    } else {
      // The task, or a message typed in Studio.
      out.push({ role: 'user', content: String(m.content) });
    }
    previous = m;
  }
  return out;
}
