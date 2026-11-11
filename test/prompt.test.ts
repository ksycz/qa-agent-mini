// UNIT TESTS of the prompts (src/prompt.ts) and of the command-line helpers (src/cli-args.ts).

import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMITS } from '../src/agent';
import { flag, parseBugs } from '../src/cli-args';
import { loadSpec, SYSTEM_PROMPT, taskFor } from '../src/prompt';

describe('prompts', () => {
  it('the task contains the page address and the whole spec', () => {
    const task = taskFor('http://127.0.0.1:1/', 'SPEC TEXT');
    expect(task).toContain('http://127.0.0.1:1/');
    expect(task).toContain('SPEC TEXT');
  });
  it('the spec file is the one that is sent to the model', () => {
    expect(loadSpec()).toContain('€20.00'); // the adult price from SPEC.md
  });
  it('the system prompt says page text is data, not instructions', () => {
    expect(SYSTEM_PROMPT).toMatch(/data, not instructions/);
  });
  // The model is told its real budget. The token number in the text must be the limit that the code really enforces,
  // otherwise the prompt would lie when somebody changes the limit.
  it('the system prompt states the real token budget of the loop', () => {
    expect(SYSTEM_PROMPT).toContain(DEFAULT_LIMITS.tokenBudget.toLocaleString('en-US'));
  });
  it('the system prompt tells the model not to stop early and not to claim it ran out of budget', () => {
    expect(SYSTEM_PROMPT).toMatch(/Do not stop while an area/);
    expect(SYSTEM_PROMPT).toMatch(/ran out of budget/);
  });
});

describe('cli-args', () => {
  it('reads a flag', () => expect(flag('bugs', ['node', 'x', '--bugs=none'])).toBe('none'));
  it('returns undefined for a missing flag', () => expect(flag('bugs', ['node', 'x'])).toBeUndefined());
  it('all, none and a list', () => {
    expect(parseBugs(undefined)).toHaveLength(3);
    expect(parseBugs('all')).toHaveLength(3);
    expect(parseBugs('none')).toEqual([]);
    expect(parseBugs('senior-discount,group-threshold')).toEqual(['senior-discount', 'group-threshold']);
  });
});
