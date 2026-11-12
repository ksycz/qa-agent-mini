// UNIT TESTS of the skills (src/skills.ts) and of the skill we ship (skills/boundary-value-testing).
// They use small temporary folders. No model, no browser, no network.

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { folderSkillStore, parseSkill, skillMenu } from '../src/skills';

// Makes a temporary skills folder. `skills` = folder name -> text of its SKILL.md.
function skillsDir(skills: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'skills-'));
  for (const [name, text] of Object.entries(skills)) {
    mkdirSync(join(dir, name));
    writeFileSync(join(dir, name, 'SKILL.md'), text);
  }
  return dir;
}
const skillText = (name: string, description: string, body: string) => `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n${body}\n`;

describe('parseSkill', () => {
  it('reads the name, the description and the text after the header', () => {
    const s = parseSkill(skillText('demo', 'A demo.', 'Do the demo.'), 'x');
    expect(s).toEqual({ name: 'demo', description: 'A demo.', body: '# demo\nDo the demo.' });
  });
  it('refuses a file without a header or without a description', () => {
    expect(() => parseSkill('no header here', 'a/SKILL.md')).toThrow(/a\/SKILL.md.*header/);
    expect(() => parseSkill('---\nname: demo\n---\ntext', 'a/SKILL.md')).toThrow(/description/);
  });
});

describe('folderSkillStore', () => {
  it('lists the skills (name and description only) and loads the full text of one', () => {
    const store = folderSkillStore(skillsDir({ alpha: skillText('alpha', 'First.', 'ALPHA TEXT'), beta: skillText('beta', 'Second.', 'BETA TEXT') }));
    expect(store.list()).toEqual([{ name: 'alpha', description: 'First.' }, { name: 'beta', description: 'Second.' }]);
    expect(store.load('alpha')).toBe('Skill: alpha\n\n# alpha\nALPHA TEXT');
    expect(JSON.stringify(store.list())).not.toContain('ALPHA TEXT'); // the menu never holds the body
  });

  it('accepts only names that it found itself: a path is not a name', () => {
    const store = folderSkillStore(skillsDir({ alpha: skillText('alpha', 'First.', 'x') }));
    for (const bad of ['../SPEC', '../../etc/passwd', 'alpha/SKILL.md', '/etc/passwd', '', 'ALPHA', 'nope']) {
      expect(() => store.load(bad), bad).toThrow(/Unknown skill/);
    }
    expect(() => store.load('nope')).toThrow(/Available skills: alpha/); // the error helps the model choose
  });

  it('fails early when the name in the header is not the name of the folder', () => {
    expect(() => folderSkillStore(skillsDir({ alpha: skillText('other', 'D.', 'x') }))).toThrow(/must be the same as the folder/);
  });

  it('a missing folder means no skills', () => {
    expect(folderSkillStore(join(tmpdir(), 'no-such-skills-folder')).list()).toEqual([]);
  });
});

describe('skillMenu', () => {
  it('writes one line per skill, and nothing when there are none', () => {
    expect(skillMenu([{ name: 'a', description: 'A.' }, { name: 'b', description: 'B.' }])).toBe('- a: A.\n- b: B.');
    expect(skillMenu([])).toBe('');
  });
});

// The skill we ship. It must be short (it is paid for at every later step) and GENERAL.
describe('skills/boundary-value-testing', () => {
  const store = folderSkillStore(); // the real skills/ folder
  const text = store.load('boundary-value-testing');

  it('exists, with a description for the menu', () => {
    expect(store.list().map((s) => s.name)).toContain('boundary-value-testing');
    expect(store.list().find((s) => s.name === 'boundary-value-testing')?.description.length).toBeGreaterThan(20);
  });
  it('is short', () => expect(text.length).toBeLessThan(2000));
  // The skill must not give away our planted bugs or the values of our page, or the eval would measure the leak and not the skill.
  it('is general: no mention of our page, the planted bugs or their numbers', () => {
    expect(text).not.toMatch(/senior|group|discount|visitor|ticket|€/i);
    const withoutListNumbers = text.replace(/^\d+\.\s/gm, ''); // "1. ", "2. " ... are only the numbering of the steps
    expect(withoutListNumbers).not.toMatch(/\b(5|6|7|8|9|10|11|17|18|64|65|120|121)\b/); // the numbers of our spec (the example uses 49 to 501)
  });
});
