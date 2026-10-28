'use strict';

function parseFasta(text) {
  const records = [];
  let current = null;
  for (const [index, raw] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('>')) {
      if (current) records.push(current);
      const name = line.slice(1).trim();
      if (!name) throw new Error(`Empty FASTA header at line ${index + 1}.`);
      current = { name, sequence: '' };
    } else {
      if (!current) throw new Error(`Sequence before FASTA header at line ${index + 1}.`);
      const sequence = line.replace(/\s+/g, '').toUpperCase();
      if (!/^[A-Z*.-]+$/.test(sequence)) throw new Error(`Invalid characters at line ${index + 1}.`);
      current.sequence += sequence;
    }
  }
  if (current) records.push(current);
  if (!records.length || records.some(r => !r.sequence)) throw new Error('FASTA must contain at least one non-empty sequence per header.');
  return records.map((r, index) => ({ ...r, id: `sequence-${index + 1}`, length: r.sequence.length, interpretation: 'Unassigned' }));
}
module.exports = { parseFasta };
