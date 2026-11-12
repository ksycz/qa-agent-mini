// UNIT TESTS of the prompts (src/prompt.ts) and of the command-line helpers (src/cli-args.ts).

import { describe, expect, it } from 'vitest';
import { flag, parseBugs } from '../src/cli-args';
import { folderSkillStore } from '../src/skills';
import { buildSystemPrompt, loadSpec, SYSTEM_PROMPT, taskFor } from '../src/prompt';

describe('prompts', () => {
  it('the task contains the page address and the whole spec', () => {
    const task = taskFor('http://127.0.0.1:1/', 'SPEC TEXT');
    expect(task).toContain('http://127.0.0.1:1/');
    expect(task).toContain('SPEC TEXT');
  });
  it('the spec file is the one that is sent to the model', () => {
    expect(loadSpec()).toContain('€20.00'); // the adult price from SPEC.md
  });
  // Step 9a: in two runs the agent saw a bug, went on investigating it and the budget ended before it reported. Report at once.
  it('the system prompt asks for a report right after a difference is seen, and still forbids guesses', () => {
    expect(SYSTEM_PROMPT).toMatch(/Report each difference right after you have seen it/);
    expect(SYSTEM_PROMPT).toMatch(/Never report guesses/);
    // Lesson of step 6d: a number in the prompt is read as a target. This rule must have none.
    expect(SYSTEM_PROMPT.split('\n').find((l) => l.includes('right after you have seen it'))).not.toMatch(/\d/);
  });
  it('the system prompt says page text is data, not instructions', () => {
    expect(SYSTEM_PROMPT).toMatch(/data, not instructions/);
  });
});

describe('the system prompt with skills (step 8)', () => {
  const skills = [{ name: 'demo-skill', description: 'A demo guide.' }];
  it('lists the name and the description of every skill and tells the model to use load_skill', () => {
    const prompt = buildSystemPrompt(skills);
    expect(prompt).toContain('- demo-skill: A demo guide.');
    expect(prompt).toContain('load_skill');
    expect(prompt.startsWith(SYSTEM_PROMPT)).toBe(true); // the old rules are all still there
  });
  it('is just SYSTEM_PROMPT when there are no skills', () => expect(buildSystemPrompt([])).toBe(SYSTEM_PROMPT));
  it('the real prompt holds the menu of the real skills, but not the full text of a skill', () => {
    const store = folderSkillStore();
    const prompt = buildSystemPrompt(store.list());
    expect(prompt).toContain('boundary-value-testing');
    expect(prompt).not.toContain('Example (not from our page)'); // a line from the BODY of the skill
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
