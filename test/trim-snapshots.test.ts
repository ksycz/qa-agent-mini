// UNIT TESTS of src/trim-snapshots.ts: old page snapshots are removed from what the model sees, the newest one stays.
// No model, no browser, no network.

import { describe, expect, it } from 'vitest';
import type { Message } from '../src/llm';
import { SNAPSHOT_REMOVED, trimOldSnapshots } from '../src/trim-snapshots';

// A conversation like the real one: the task, then rounds of "assistant asks for tools" and "user gives the results".
function conversation(): Message[] {
  return [
    { role: 'user', content: 'task' },
    { role: 'assistant', content: [{ type: 'tool_use', id: 'a1', name: 'click', input: {} }, { type: 'tool_use', id: 's1', name: 'snapshot', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a1', content: 'Clicked.' }, { type: 'tool_result', tool_use_id: 's1', content: 'PAGE ONE' }] },
    { role: 'assistant', content: [{ type: 'tool_use', id: 's2', name: 'snapshot', input: {} }, { type: 'tool_use', id: 'e1', name: 'click', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 's2', content: 'PAGE TWO' }, { type: 'tool_result', tool_use_id: 'e1', content: 'ERROR: no such element', is_error: true }] },
    { role: 'assistant', content: [{ type: 'tool_use', id: 's3', name: 'snapshot', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 's3', content: 'PAGE THREE' }] },
  ];
}

describe('trimOldSnapshots', () => {
  it('replaces every snapshot result except the newest', () => {
    const text = JSON.stringify(trimOldSnapshots(conversation()));
    expect(text).not.toContain('PAGE ONE');
    expect(text).not.toContain('PAGE TWO');
    expect(text).toContain('PAGE THREE');
    expect(text.split(SNAPSHOT_REMOVED).length - 1).toBe(2);
  });

  it('keeps results of other tools, errors, the model\'s own messages and the task', () => {
    const text = JSON.stringify(trimOldSnapshots(conversation()));
    expect(text).toContain('Clicked.');
    expect(text).toContain('ERROR: no such element');
    expect(text).toContain('"name":"snapshot"'); // the model still sees that it asked for a snapshot
    expect(text).toContain('task');
  });

  it('does not change the original conversation (it returns a copy)', () => {
    const original = conversation();
    trimOldSnapshots(original);
    expect(JSON.stringify(original)).toContain('PAGE ONE');
    expect(JSON.stringify(original)).not.toContain(SNAPSHOT_REMOVED);
  });

  it('does nothing when there is only one snapshot or none', () => {
    const one = conversation().slice(0, 3); // only PAGE ONE, so it is the newest
    expect(trimOldSnapshots(one)).toEqual(one);
    expect(trimOldSnapshots([{ role: 'user', content: 'task' }])).toEqual([{ role: 'user', content: 'task' }]);
  });
});
