'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { newProject, validateProject, addAnnotation, removeAnnotation, setNote } = require('../src/project');
test('project round trip preserves original input, annotations and notes', () => {
  const raw = '>a\nac de\n>b\nFGH\n';
  let p = newProject(raw); const id = p.records[0].id;
  p = addAnnotation(p, id, { kind: 'CDR1', start: 2, end: 4, definition: 'manual example' });
  p = setNote(p, id, 'Inspect local region');
  const restored = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.source.raw, raw);
  assert.deepEqual(restored.records[0].annotations.map(a => [a.start, a.end, a.evidence]), [[2, 4, 'user']]);
  assert.equal(restored.records[0].note, 'Inspect local region');
  assert.equal(removeAnnotation(restored, id, restored.records[0].annotations[0].id).records[0].annotations.length, 0);
});
test('rejects invalid ranges, malformed provenance and altered input', () => {
  const p = newProject('>a\nACDE\n'); const id = p.records[0].id;
  for (const [start, end] of [[0, 2], [3, 2], [1, 5], [1.5, 3]]) assert.throws(() => addAnnotation(p, id, { kind: 'CDR1', start, end, definition: '' }));
  const altered = structuredClone(p); altered.records[0].sequence = 'EEEE'; assert.throws(() => validateProject(altered));
  const withRange = addAnnotation(p, id, { kind: 'CDR1', start: 1, end: 2, definition: '' });
  withRange.records[0].annotations[0].evidence = 'computed'; assert.throws(() => validateProject(withRange));
});
test('rejects an import whose retained original plus normalized records cannot be saved', () => {
  assert.throws(() => newProject('>large\n' + 'A'.repeat(6 * 1024 * 1024)), /including original input/);
});
