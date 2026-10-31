'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bundledReadme } = require('../scripts/package-local');
test('local Details documentation contains resolvable guide anchors and no unsupported images', () => {
  const original = fs.readFileSync('README.md', 'utf8');
  const local = bundledReadme();
  assert.ok(original.includes('](docs/media/herceptin-fv.png)'));
  assert.equal(fs.readFileSync('README.md', 'utf8'), original);
  assert.ok(local.includes('Explore Guided Demo'));
  assert.ok(!/!\[[^\]]*\]\(/.test(local));
  const anchors = new Set([...local.matchAll(/^#+ (.+)$/gm)].map(m => m[1].toLowerCase().replace(/[^\w -]/g, '').replaceAll(' ', '-')));
  for (const match of local.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
    const target = match[1];
    if (target.startsWith('#')) assert.ok(anchors.has(target.slice(1)), `Missing documentation anchor: ${target}`);
    else assert.match(target, /^https?:\/\//, `Unresolved local documentation link: ${target}`);
  }
});
