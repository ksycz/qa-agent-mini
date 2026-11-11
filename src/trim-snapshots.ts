// TRIMMING OLD PAGE SNAPSHOTS. Saves input tokens.
//
// Why: every step sends the WHOLE conversation to the model again, so every old page snapshot is paid for again in every later step.
// The model only needs the page as it is NOW, and the newest snapshot shows that. So the model sees only the newest snapshot
// in full; older ones are replaced by a short note. The model can always call `snapshot` again.
//
// Our own list of messages is NOT changed (we send a copy), so nothing is lost for debugging.

import type { Message } from './llm';

export const SNAPSHOT_REMOVED = '(older page snapshot removed to save tokens; call snapshot to see the page)';

export function trimOldSnapshots(messages: Message[]): Message[] {
  // 1. Which tool calls were calls to "snapshot"? (A result only knows the id of its call, not the name of the tool.)
  const snapshotCalls = new Set<string>();
  for (const m of messages) {
    if (m.role !== 'assistant' || typeof m.content === 'string') continue;
    for (const b of m.content) if (b.type === 'tool_use' && b.name === 'snapshot') snapshotCalls.add(b.id);
  }

  // 2. Which snapshot result is the newest? The last one in the conversation.
  let newest: string | undefined;
  for (const m of messages) {
    if (m.role !== 'user' || typeof m.content === 'string') continue;
    for (const b of m.content) if (b.type === 'tool_result' && snapshotCalls.has(b.tool_use_id)) newest = b.tool_use_id;
  }

  // 3. Make a copy in which every older snapshot result is replaced. (Errors are kept: they are short and useful.)
  return messages.map((m) => {
    if (m.role !== 'user' || typeof m.content === 'string') return m;
    return {
      ...m,
      content: m.content.map((b) =>
        b.type === 'tool_result' && snapshotCalls.has(b.tool_use_id) && b.tool_use_id !== newest && !b.is_error ? { ...b, content: SNAPSHOT_REMOVED } : b,
      ),
    };
  });
}
