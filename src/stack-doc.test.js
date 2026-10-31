import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Keeps docs/stack.md honest: every installed package must be listed (and nothing else),
// and the documented major version must match what is installed.
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const pkg = JSON.parse(read('../package.json'));
const doc = read('../docs/stack.md');

const block = doc.split('<!-- installed:start -->')[1]?.split('<!-- installed:end -->')[0] ?? '';
const rows = [...block.matchAll(/^\|\s*`([^`]+)`\s*\|\s*([^|\s]+)\s*\|/gm)].map((m) => ({
  name: m[1],
  version: m[2],
}));
const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).sort();

describe('docs/stack.md', () => {
  it('has an installed-packages section', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('lists exactly the packages in package.json', () => {
    const documented = rows.map((r) => r.name).sort();
    const missing = declared.filter((n) => !documented.includes(n));
    const extra = documented.filter((n) => !declared.includes(n));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it.each(rows.map((r) => [r.name, r.version]))(
    '%s documents the installed major (%s)',
    (name, v) => {
      const installed = JSON.parse(read(`../node_modules/${name}/package.json`)).version;
      expect(v.split('.')[0]).toBe(installed.split('.')[0]);
    },
  );
});
