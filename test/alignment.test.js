'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { align, quality } = require('../src/alignment');
test('alignment preserves residues, coordinates and insertion mapping', () => {
  const a = align('ACDE', 'ACFDE');
  assert.equal(a.columns.map(c => c.reference).join(''), 'AC-DE');
  assert.equal(a.columns.map(c => c.query).join(''), 'ACFDE');
  assert.equal(a.columns[2].referencePosition, null);
  assert.equal(a.columns[2].queryPosition, 3);
  assert.equal(a.score, 3);
});
test('alignment rejects unsupported inputs and bounds resource use', () => {
  assert.throws(() => align('AC-D', 'ACD'));
  assert.throws(() => align('A'.repeat(1500), 'A'.repeat(1500)));
});
test('quality flags exact duplicates and unresolved alphabets without inferring type', () => {
  const q = quality([{id:'a',sequence:'ACGT'}, {id:'b',sequence:'ACGT'}, {id:'c',sequence:'XB-*'}]);
  assert.equal(q[1].duplicateOf, 'a'); assert.match(q[0].alphabet, /Ambiguous/);
  assert.deepEqual([q[2].ambiguous,q[2].gaps,q[2].stops],[2,1,1]);
});
