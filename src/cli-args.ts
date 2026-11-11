// Small helpers to read the options typed after a command, for example:
//   npm run agent -- --bugs=all --inject

// Reads one option of the form --name=value. Returns undefined when it is not there.
export function flag(name: string, argv: string[] = process.argv): string | undefined {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

// Turns the --bugs value into a list of bug names.
//   undefined or "all"  -> all three bugs
//   "none"              -> no bugs (the page is correct)
//   "a,b"               -> exactly those bugs
export function parseBugs(value: string | undefined): string[] {
  const v = value ?? 'all';
  if (v === 'none') return [];
  if (v === 'all') return ['senior-discount', 'group-threshold', 'limit-off-by-one'];
  return v.split(',').filter(Boolean);
}
