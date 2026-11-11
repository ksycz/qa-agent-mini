// A SAFETY NET for API key handling (step 6b): no file in the repo may contain something that looks like an Anthropic API key.
// The key lives only in the environment variable ANTHROPIC_API_KEY (see README). This test reads the files we commit
// (code, tests, page, documents, saved results) and fails if a key-like text is in one of them.
// No model, no browser, no network.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Collects the paths of all files below a folder (or the file itself).
function filesIn(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => filesIn(join(path, name)));
}

describe('API key handling', () => {
  it('no committed file contains an Anthropic API key', () => {
    const roots = ['src', 'test', 'target', 'results', 'README.md', 'RESULTS.md', 'CLAUDE.md', 'SPEC.md'];
    // "sk-ant-" followed by a long run of key characters. Short mentions such as "sk-ant" in a command (grep) do not match.
    const keyLike = /sk-ant-[A-Za-z0-9_-]{20,}/;
    const leaks = roots.flatMap(filesIn).filter((file) => keyLike.test(readFileSync(file, 'utf8')));
    expect(leaks).toEqual([]);
  });
});
