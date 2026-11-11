// TRIMMING OLD PAGE SNAPSHOTS. Saves input tokens.
//
// Why: every step sends the WHOLE conversation to the model again, so every old page snapshot is paid for again in every later step.
// The model only needs the page as it is NOW. So the model sees in full the snapshots of the LATEST ROUND (the results of its last reply,
// which it has not read yet); the snapshots of older rounds are replaced by a short note. The model can always call `snapshot` again.
// Why a round and not "only the newest snapshot": a reply can contain several snapshots (one after each of several actions).
// The model must read all of them once. (The first version kept only the single newest one and hid the others from the model.)
//
// Since step 6f the same is done for the result of `add_visitors`: it holds a status text and a page. In older rounds only the page is cut.
//
// Our own list of messages is NOT changed (we send a copy), so nothing is lost for debugging.

import type { Message } from './llm';
import { PAGE_MARKER } from './tools';

export const SNAPSHOT_REMOVED = '(older page snapshot removed to save tokens; call snapshot to see the page)';

export function trimOldSnapshots(messages: Message[]): Message[] {
  // 1. Which tool calls were calls to "snapshot", and which to "add_visitors"? (A result only knows the id of its call, not the name of the tool.)
  const snapshotCalls = new Set<string>();
  const addVisitorsCalls = new Set<string>(); // its result is a status text plus a page snapshot (step 6f)
  for (const m of messages) {
    if (m.role !== 'assistant' || typeof m.content === 'string') continue;
    for (const b of m.content) {
      if (b.type === 'tool_use' && b.name === 'snapshot') snapshotCalls.add(b.id);
      if (b.type === 'tool_use' && b.name === 'add_visitors') addVisitorsCalls.add(b.id);
    }
  }

  // 2. Which results belong to the latest round? The last message that contains tool results.
  const latestRound = new Set<string>();
  for (const m of messages) {
    if (m.role !== 'user' || typeof m.content === 'string') continue;
    const ids = m.content.flatMap((b) => (b.type === 'tool_result' ? [b.tool_use_id] : []));
    if (ids.length > 0) {
      latestRound.clear();
      ids.forEach((id) => latestRound.add(id));
    }
  }

  // 3. Make a copy in which every snapshot result of an older round is replaced. (Errors are kept: they are short and useful.)
  //    For add_visitors we keep the status text (how many were added, what the page said) and cut only the page after the marker line.
  return messages.map((m) => {
    if (m.role !== 'user' || typeof m.content === 'string') return m;
    return {
      ...m,
      content: m.content.map((b) => {
        if (b.type !== 'tool_result' || latestRound.has(b.tool_use_id) || b.is_error) return b;
        if (snapshotCalls.has(b.tool_use_id)) return { ...b, content: SNAPSHOT_REMOVED };
        if (addVisitorsCalls.has(b.tool_use_id) && typeof b.content === 'string') {
          const at = b.content.indexOf(`\n${PAGE_MARKER}\n`);
          if (at >= 0) return { ...b, content: `${b.content.slice(0, at)}\n${PAGE_MARKER}\n${SNAPSHOT_REMOVED}` };
        }
        return b;
      }),
    };
  });
}
