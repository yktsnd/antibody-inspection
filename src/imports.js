'use strict';
const { newProject, validateProject } = require('./project');
const crypto = require('node:crypto');
function table(text, delimiter) {
  const rows = []; let row = [], value = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else if (quoted || !value) quoted = !quoted; else throw new Error('Unexpected quote in table.'); }
    else if (!quoted && (c === delimiter || c === '\n' || c === '\r')) {
      row.push(value); value = '';
      if (c !== delimiter) { if (row.some(v => v.trim())) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else value += c;
  }
  if (quoted) throw new Error('Unclosed quoted field.');
  row.push(value); if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('A header and at least one data row are required.');
  const headers = rows.shift().map(v => v.trim());
  if (new Set(headers).size !== headers.length) throw new Error('Duplicate column names.');
  return { headers, rows: rows.map((r, i) => { if (r.length !== headers.length) throw new Error(`Row ${i + 2}: expected ${headers.length} columns, found ${r.length}.`); return Object.fromEntries(headers.map((h,j) => [h,r[j]])); }) };
}
function importSequences(text, options = {}) {
  let p;
  if (text.trimStart().startsWith('>')) p = newProject(text);
  else {
    const t = table(text, options.delimiter || (text.split(/\r?\n/)[0].includes('\t') ? '\t' : ','));
    const sequenceColumn = options.sequenceColumn || t.headers.find(h => /^(sequence|sequence_aa|amino_acid|aa|protein)$/i.test(h));
    const nameColumn = options.nameColumn || t.headers.find(h => /^(name|id|sequence_id)$/i.test(h));
    if (!sequenceColumn || !t.headers.includes(sequenceColumn)) throw new Error('Choose a sequence column.');
    p = newProject(t.rows.map((r,i) => `>${String(r[nameColumn] || `Sequence ${i + 1}`).replace(/[\r\n>]/g,' ')}\n${r[sequenceColumn]}`).join('\n'));
    p.importSource = { type: 'table', raw: text, sequenceColumn, nameColumn: nameColumn || null, digest: crypto.createHash('sha256').update(text).digest('hex') };
    p.records.forEach((r,i) => { r.metadata = t.rows[i]; r.construct = t.rows[i].construct_id || ''; r.role = t.rows[i].chain_role || 'unknown'; });
  }
  p.records.forEach(r => { r.alphabet = options.alphabet || (/^[ACGTUNRYKMSWBDHV]+$/i.test(r.sequence) ? 'unresolved' : 'protein'); });
  return validateProject(p);
}
function previewSequences(text){
  if(Buffer.byteLength(text,'utf8')>64*1024*1024)throw new Error('File exceeds 64 MiB.');
  if(text.trimStart().startsWith('>')){const p=importSequences(text);return {format:'fasta',count:p.records.length,headers:['name','sequence'],rows:p.records.slice(0,5).map(r=>({name:r.name,sequence:r.sequence})),sequenceColumn:'sequence',nameColumn:'name'};}
  const t=table(text,text.split(/\r?\n/)[0].includes('\t')?'\t':',');
  return {format:'table',count:t.rows.length,headers:t.headers,rows:t.rows.slice(0,5),sequenceColumn:t.headers.find(h=>/^(sequence|sequence_aa|amino_acid|aa|protein)$/i.test(h))||'',nameColumn:t.headers.find(h=>/^(name|id|sequence_id)$/i.test(h))||''};
}
function importMeasurements(text, project) {
  const { rows } = table(text, text.split(/\r?\n/)[0].includes('\t') ? '\t' : ',');
  return rows.map((row,i) => {
    const matches = project.records.filter(r => r.id === row.sequence_id || r.name === row.sequence_id);
    if (matches.length !== 1) throw new Error(`Row ${i + 2}: sequence_id must identify exactly one sequence.`);
    if (!row.endpoint || !row.unit || !row.specimen_id || !row.source) throw new Error(`Row ${i + 2}: endpoint, unit, specimen_id and source are required.`);
    const match = String(row.value).trim().match(/^(<=|>=|<|>|=)?\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)$/i);
    if (!match || !Number.isFinite(Number(match[2]))) throw new Error(`Row ${i + 2}: invalid measurement value.`);
    return { ...row, id: crypto.randomUUID(), recordId: matches[0].id, evidenceKind: 'experimental', operator: { '<':'lt','>':'gt','<=':'le','>=':'ge','=':'eq' }[match[1] || '='], value: Number(match[2]), rawValue: row.value,
      condition: Object.fromEntries(['temperature','pH','buffer','concentration','method','antigen','lot','replicate'].map(k => [k,row[k] || 'unknown'])) };
  });
}
module.exports = { table, importSequences, importMeasurements, previewSequences };
