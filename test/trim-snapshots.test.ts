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
    { role: 'assistant', content: [{ type: 'tool_use', id: 's3', name: 'snapshot', input: {} }, { type: 'tool_use', id: 's4', name: 'snapshot', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 's3', content: 'PAGE THREE' }, { type: 'tool_result', tool_use_id: 's4', content: 'PAGE FOUR' }] },
  ];
}

describe('trimOldSnapshots', () => {
  it('replaces the snapshot results of older rounds and keeps ALL snapshots of the latest round', () => {
    const text = JSON.stringify(trimOldSnapshots(conversation()));
    expect(text).not.toContain('PAGE ONE');
    expect(text).not.toContain('PAGE TWO');
    expect(text).toContain('PAGE THREE'); // two snapshots in the latest round: the model has not read either of them yet
    expect(text).toContain('PAGE FOUR');
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

  it('does nothing when the only snapshots are in the latest round, or there are none', () => {
    const one = conversation().slice(0, 3); // only PAGE ONE, and it is in the latest round
    expect(trimOldSnapshots(one)).toEqual(one);
    expect(trimOldSnapshots([{ role: 'user', content: 'task' }])).toEqual([{ role: 'user', content: 'task' }]);
  });

  // Step 6f: the result of add_visitors holds a status text and a page. Old pages are cut, the status text stays.
  it('cuts the page inside OLD add_visitors results, keeps their status text, and leaves the latest round whole', () => {
    const result = (status: string, page: string) => `${status}\nPage now:\n${page}`;
    const messages: Message[] = [
      { role: 'user', content: 'task' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'v1', name: 'add_visitors', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'v1', content: result('Added 3 of 3 visitors.', 'OLD PAGE') }] },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'v2', name: 'add_visitors', input: {} }, { type: 'tool_use', id: 'v3', name: 'add_visitors', input: {} }] },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'v2', content: result('Stopped after age 30 (3 of 3). The page says: Maximum 10 tickets per order.', 'NEW PAGE A') },
          { type: 'tool_result', tool_use_id: 'v3', content: 'ERROR: "-1" is not a whole number', is_error: true },
        ],
      },
    ];
    const text = JSON.stringify(trimOldSnapshots(messages));
    expect(text).not.toContain('OLD PAGE');
    expect(text).toContain('Added 3 of 3 visitors.'); // the status text of the old result stays
    expect(text).toContain(SNAPSHOT_REMOVED);
    expect(text).toContain('NEW PAGE A'); // latest round: untouched
    expect(text).toContain('Maximum 10 tickets per order.');
    expect(text).toContain('is not a whole number'); // errors stay
    expect(JSON.stringify(messages)).toContain('OLD PAGE'); // the original is not changed
  });

  it('leaves an old add_visitors result without the marker line as it is', () => {
    const messages: Message[] = [
      { role: 'user', content: 'task' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'v1', name: 'add_visitors', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'v1', content: 'something else' }] },
      { role: 'assistant', content: [{ type: 'tool_use', id: 's1', name: 'snapshot', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 's1', content: 'PAGE' }] },
    ];
    expect(JSON.stringify(trimOldSnapshots(messages))).toContain('something else');
  });
});
