'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFasta } = require('../src/fasta');
test('imports multiple sequences and normalizes whitespace', () => {
  const records = parseFasta('>first\nac d\n>second\nXYZ\n');
  assert.deepEqual(records.map(r => [r.name, r.sequence, r.length]), [['first', 'ACD', 3], ['second', 'XYZ', 3]]);
});
test('rejects malformed inputs', () => {
  for (const value of ['ACD', '>\nACD', '>x\n', '>x\nAC1']) assert.throws(() => parseFasta(value));
});
test('preserves duplicate names and does not infer chain or species', () => {
  const records = parseFasta('>x\nACD\n>x\nEFG');
  assert.notEqual(records[0].id, records[1].id);
  assert.equal(records[0].interpretation, 'Unassigned');
});
