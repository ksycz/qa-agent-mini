// SKILLS (step 8). A skill is a short guide for one kind of work, written as a text file the agent can read when it needs it.
//
// Why not put every guide into the system prompt? The system prompt is paid for again at EVERY step. With skills the prompt holds only
// a menu (the name and one sentence of each skill). The agent loads the full text of a skill with the tool `load_skill`, only when it fits.
// This idea is called "progressive disclosure": show a little first, the details on request.
//
// A skill lives in its own folder: skills/<name>/SKILL.md. The file starts with a small header between two "---" lines:
//   ---
//   name: boundary-value-testing
//   description: One sentence that says when to use it.
//   ---
// and then the text of the skill.
//
// Safety in code: the model only gives us a NAME. We never build a file path from the text the model wrote;
// we accept only names that we found ourselves in the skills folder (see `load` below).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type SkillInfo = { name: string; description: string };

// What the tools need from skills. Tests pass a fake one, the real one reads a folder.
export interface SkillStore {
  list(): SkillInfo[]; // the menu
  load(name: string): string; // the full text of one skill; throws an error the model can read
}

// A store with no skills. For demos and tests that do not use skills.
export const NO_SKILLS: SkillStore = {
  list: () => [],
  load: (name) => {
    throw new Error(`Unknown skill "${name}". Available skills: none`);
  },
};

// Reads the header of a SKILL.md. Returns the name, the description and the text after the header.
export function parseSkill(text: string, where: string): SkillInfo & { body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${where}: the file must start with a header between two "---" lines`);
  const field = (key: string) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(match[1])?.[1].trim();
  const name = field('name');
  const description = field('description');
  if (!name || !description) throw new Error(`${where}: the header needs "name:" and "description:"`);
  return { name, description, body: match[2].trim() };
}

// The real store: every sub-folder of `dir` that has a SKILL.md is a skill.
export function folderSkillStore(dir = 'skills'): SkillStore {
  // Reads all skills once when the store is made. A broken skill file fails here, early, with its path in the message.
  const skills = new Map<string, SkillInfo & { body: string }>();
  if (existsSync(dir)) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name, 'SKILL.md');
      if (!entry.isDirectory() || !existsSync(file)) continue;
      const skill = parseSkill(readFileSync(file, 'utf8'), file);
      // The name in the header must be the name of the folder, so the two can never disagree.
      if (skill.name !== entry.name) throw new Error(`${file}: the name "${skill.name}" must be the same as the folder "${entry.name}"`);
      skills.set(skill.name, skill);
    }
  }
  return {
    list: () => [...skills.values()].map(({ name, description }) => ({ name, description })),
    load(name) {
      // Only a name that we found in the folder is accepted. "../SPEC" or "/etc/passwd" are simply not in the map.
      const skill = skills.get(name);
      if (!skill) {
        const names = [...skills.keys()].join(', ') || 'none';
        throw new Error(`Unknown skill "${name}". Available skills: ${names}`);
      }
      return `Skill: ${skill.name}\n\n${skill.body}`;
    },
  };
}

// The menu for the system prompt: one line per skill. Empty text when there are no skills.
export function skillMenu(skills: SkillInfo[]): string {
  if (skills.length === 0) return '';
  return skills.map((s) => `- ${s.name}: ${s.description}`).join('\n');
}
