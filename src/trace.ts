// THE TRACE: a written record of everything the agent did.
//
// When an agent does something strange, the first question is "what exactly happened?".
// Without a record you can only guess. The trace answers it: every model answer, every tool call,
// every error and the reason why the run stopped, each with a timestamp.
//
// The file format is JSONL: one JSON object per line. It is easy to read, to search with grep,
// and to process later (the eval in step 6 reads these numbers).

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// All the agent needs from a trace: a way to write one event.
export interface Trace {
  event(type: string, data: Record<string, unknown>): void;
}

// A trace that keeps events in memory. Used in tests to check what the agent wrote.
export function memoryTrace(): Trace & { events: Array<{ type: string; data: Record<string, unknown> }> } {
  const events: Array<{ type: string; data: Record<string, unknown> }> = [];
  return { events, event: (type, data) => void events.push({ type, data }) };
}

// A trace that appends every event as one line to a file, for example runs/<time>/trace.jsonl.
export function fileTrace(path: string): Trace {
  mkdirSync(dirname(path), { recursive: true }); // create the folder if it does not exist yet
  return {
    event(type, data) {
      appendFileSync(path, JSON.stringify({ t: new Date().toISOString(), type, ...data }) + '\n');
    },
  };
}
