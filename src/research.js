'use strict';
const crypto = require('node:crypto');
const { align } = require('./alignment');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
function numberedAlignment(records, domainIndex = 0) {
  const domains = records.map(r => r.analysis?.domains?.[domainIndex]);
  if (domains.some(d => !d)) throw new Error('Analyze all selected sequences before antibody alignment.');
  const classes = domains.map(d => d.chainType === 'H' ? 'H' : ['K','L'].includes(d.chainType) ? 'L' : d.chainType);
  if (new Set(classes).size !== 1) throw new Error('Compare homologous domains: heavy and light domains cannot share this alignment.');
  const keys = new Map();
  domains.forEach(d => d.residues.forEach(r => keys.set(`${r.position}:${r.insertion}`, { position:r.position, insertion:r.insertion })));
  const columns = [...keys.entries()].sort((a,b) => a[1].position - b[1].position || ((a[1].position === 112 ? -1 : 1) * a[1].insertion.localeCompare(b[1].insertion))).map(([key,value]) => ({ key,...value }));
  const rows = records.map((r,i) => ({ id:r.id, name:r.name, residues: columns.map(c => domains[i].residues.find(x => `${x.position}:${x.insertion}` === c.key) || null) }));
  const frequencies = columns.map((_,i) => {
    const counts = {}; let missing = 0;
    rows.forEach(r => { const aa = r.residues[i]?.aa; if (aa) counts[aa] = (counts[aa] || 0) + 1; else missing++; });
    const n = rows.length - missing;
    return { counts, n, missing, entropy: -Object.values(counts).reduce((sum,c) => sum + (c/n) * Math.log2(c/n),0) };
  });
  return { columns, rows, frequencies, scheme:'IMGT', denominator:'input records; duplicates retained; gaps excluded from residue frequencies', domainIndex };
}
function mapStructure(structure, records) {
  const byId = new Map(structure.residues.map(r => [r.id,r]));
  for (const chain of structure.chains) {
    const residues = chain.residueIds.map(id => byId.get(id));
    const seq = residues.map(r => r.aa).join('');
    const candidates = [];
    for (const record of records) {
      if ((seq.length + 1) * (record.length + 1) > 2000000 || /[^A-Z]/.test(record.sequence)) continue;
      const result = align(record.sequence, seq);
      const mapped = result.columns.filter(c => c.referencePosition && c.queryPosition);
      const matches = mapped.filter(c => c.reference === c.query).length;
      candidates.push({ recordId:record.id, identity: mapped.length ? matches/mapped.length : 0, coverage: matches/seq.length, columns:result.columns });
    }
    candidates.sort((a,b) => b.coverage - a.coverage || b.identity - a.identity);
    chain.candidates = candidates.map(({columns,...r}) => r);
    const best = candidates[0];
    if (best && best.identity >= .95 && best.coverage >= .95 && (!candidates[1] || best.coverage > candidates[1].coverage)) {
      chain.recordId = best.recordId; chain.mappingEvidence = 'computed sequence alignment; identity and coverage >=95%; unique best match';
      best.columns.forEach(c => { if (c.queryPosition && c.referencePosition) { const r = residues[c.queryPosition - 1]; r.recordId = best.recordId; r.index0 = c.referencePosition - 1; } });
    }
  }
  return structure;
}
function validateReference(pack) {
  for (const key of ['id','version','source','license','protocol','unit','metric','denominator','exclusions','duplicateRule']) if (typeof pack[key] !== 'string' || !pack[key]) throw new Error('Reference pack requires ' + key + '.');
  if (!Array.isArray(pack.values) || !pack.values.length || pack.values.some(v => v !== null && !Number.isFinite(v))) throw new Error('Reference values must be finite numbers or null.');
  if (pack.evidenceKind === 'synthetic') throw new Error('Synthetic data cannot be imported as a scientific reference population.');
  const {digest: suppliedDigest,missing: ignoredMissing,...source}=pack;
  const actualDigest=digest(JSON.stringify(source));
  if(suppliedDigest&&suppliedDigest!==actualDigest)throw new Error('Reference population digest does not match its retained values and metadata.');
  return { ...source, digest:actualDigest, missing:pack.values.filter(v => v === null).length };
}
function comparison(value, context, pack) {
  const values = pack.values.filter(v => v !== null).sort((a,b) => a-b);
  const state = context.metric !== pack.metric || context.unit !== pack.unit ? 'incompatible' : context.protocol === pack.protocol ? 'exact' : 'contextual';
  return { state, n:values.length, percentile: state === 'incompatible' || !values.length || !Number.isFinite(value) ? null : 100 * (values.filter(v => v < value).length + .5 * values.filter(v => v === value).length)/values.length };
}
function structuralRegion(record, scope, selection) {
  if(scope==='all')return {scope,label:'all mapped residues of selected sequence',ranges:[{start0:0,end0:record.length}]};
  if(scope==='selection'){
    if(!selection||!Number.isInteger(selection.start0)||!Number.isInteger(selection.end0)||selection.start0<0||selection.end0>record.length||selection.start0>=selection.end0)throw new Error('Select a valid sequence range for this comparison region.');
    return {scope,label:'selected input range',ranges:[{start0:selection.start0,end0:selection.end0}]};
  }
  if(!['framework','cdrs','cdr3'].includes(scope))throw new Error('Unknown structural comparison region.');
  const regions=(record.analysis?.domains||[]).flatMap(d=>d.regions||[]).filter(r=>scope==='framework'?r.kind.startsWith('FR'):scope==='cdr3'?r.kind==='CDR3':r.kind.startsWith('CDR'));
  if(!regions.length)throw new Error('Analyze antibody domains before using numbered comparison regions.');
  return {scope,label:'IMGT '+scope+' across numbered domains',ranges:regions.map(r=>({start0:r.start0,end0:r.end0}))};
}
module.exports = { digest, numberedAlignment, mapStructure, validateReference, comparison, structuralRegion };
