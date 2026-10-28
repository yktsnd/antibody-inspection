'use strict';
// Needleman-Wunsch global alignment. This is a generic sequence comparison,
// not antibody numbering. Scores: match +1, mismatch -1, gap -1.
function align(reference, query) {
  if (!/^[A-Z]+$/.test(reference) || !/^[A-Z]+$/.test(query)) throw new Error('Comparison requires non-empty, ungapped letter sequences.');
  const rows = reference.length + 1, cols = query.length + 1;
  if (rows * cols > 2000000) throw new Error('Comparison exceeds the two-million-cell limit.');
  const scores = new Int32Array(rows * cols);
  const index = (i, j) => i * cols + j;
  for (let i = 0; i < rows; i++) scores[index(i, 0)] = -i;
  for (let j = 0; j < cols; j++) scores[index(0, j)] = -j;
  for (let i = 1; i < rows; i++) for (let j = 1; j < cols; j++) scores[index(i, j)] = Math.max(scores[index(i - 1, j - 1)] + (reference[i - 1] === query[j - 1] ? 1 : -1), scores[index(i - 1, j)] - 1, scores[index(i, j - 1)] - 1);
  let i = reference.length, j = query.length;
  const columns = [];
  while (i || j) {
    if (i && j && scores[index(i, j)] === scores[index(i - 1, j - 1)] + (reference[i - 1] === query[j - 1] ? 1 : -1)) { columns.push({ reference: reference[--i], query: query[--j], referencePosition: i + 1, queryPosition: j + 1 }); }
    else if (i && scores[index(i, j)] === scores[index(i - 1, j)] - 1) { columns.push({ reference: reference[--i], query: '-', referencePosition: i + 1, queryPosition: null }); }
    else { columns.push({ reference: '-', query: query[--j], referencePosition: null, queryPosition: j + 1 }); }
  }
  columns.reverse();
  return { method: 'Needleman-Wunsch', scores: { match: 1, mismatch: -1, gap: -1 }, score: scores[index(rows - 1, cols - 1)], columns };
}
function quality(records) {
  const seen = new Map();
  return records.map(r => {
    const duplicateOf = seen.get(r.sequence) || null;
    if (!duplicateOf) seen.set(r.sequence, r.id);
    return { id: r.id, duplicateOf, ambiguous: (r.sequence.match(/[BXZJ]/g) || []).length, gaps: (r.sequence.match(/[-.]/g) || []).length, stops: (r.sequence.match(/\*/g) || []).length, alphabet: /^[ACGTUNRYKMSWBDHV]+$/.test(r.sequence) ? 'Ambiguous: nucleotide or amino-acid alphabet' : 'Unassigned amino-acid-like input' };
  });
}
module.exports = { align, quality };
