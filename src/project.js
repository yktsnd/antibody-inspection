'use strict';
const crypto = require('crypto');
const { parseFasta } = require('./fasta');
const MAX_BYTES = 64 * 1024 * 1024;
const TYPES = ['CDR1', 'CDR2', 'CDR3', 'FR1', 'FR2', 'FR3', 'FR4', 'domain', 'other'];
function newProject(text) {
  if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) throw new Error('File exceeds the 64 MiB import limit.');
  const records = parseFasta(text).map(r => ({ ...r, id: crypto.randomUUID(), annotations: [], note: '' }));
  return validateProject({ format: 'antibody-inspection', version: 1, source: { type: 'fasta', raw: text }, records, view: { selectedRecordId: records[0].id } });
}
function validateProject(project) {
  if (!project || project.format !== 'antibody-inspection' || project.version !== 1 || !project.source || project.source.type !== 'fasta' || typeof project.source.raw !== 'string' || !Array.isArray(project.records)) throw new Error('Invalid or unsupported project format.');
  if (Buffer.byteLength(JSON.stringify(project), 'utf8') > MAX_BYTES) throw new Error('Project exceeds 64 MiB including structures and original inputs.');
  const parsed = parseFasta(project.source.raw);
  if (parsed.length !== project.records.length) throw new Error('Original FASTA and project records differ.');
  const ids = new Set();
  for (const [i, record] of project.records.entries()) {
    if (!record || typeof record.id !== 'string' || !record.id || ids.has(record.id) || record.name !== parsed[i].name || record.sequence !== parsed[i].sequence || record.length !== record.sequence.length || !Array.isArray(record.annotations) || (typeof record.note !== 'string' || record.note.length > 20000)) throw new Error('Invalid sequence record or mismatched original FASTA.');
    ids.add(record.id);
    if(record.germline&&record.germline.inputDigest!==crypto.createHash('sha256').update(record.sequence).digest('hex'))throw new Error('Germline comparison does not match input sequence.');
    if(record.humanness && record.humanness.inputDigest !== crypto.createHash('sha256').update(record.sequence).digest('hex'))throw new Error('Humanness result does not match input sequence.');
    if (record.analysis) {
      if (record.analysis.inputDigest !== crypto.createHash('sha256').update(record.sequence).digest('hex')) throw new Error('Analysis does not match its input sequence.');
      if (!Array.isArray(record.analysis.domains)) throw new Error('Invalid analysis domains.');
      for (const domain of [...record.analysis.domains,...Object.values(record.analysis.numberingVariants||{}).flat()]) {
        if (!Number.isInteger(domain.start0) || !Number.isInteger(domain.end0) || domain.start0 < 0 || domain.end0 > record.length || domain.start0 >= domain.end0) throw new Error('Invalid domain coordinates.');
        if (!Array.isArray(domain.residues)) throw new Error('Invalid numbered residues.');
        const numbered = new Set();
        for (const residue of domain.residues) {
          if (!Number.isInteger(residue.index0) || residue.index0 < domain.start0 || residue.index0 >= domain.end0 || record.sequence[residue.index0] !== residue.aa || numbered.has(residue.index0)) throw new Error('Numbered residue does not match original input.');
          numbered.add(residue.index0);
        }
      }
    }
    const annotationIds = new Set();
    for (const annotation of record.annotations) {
      if (!annotation || typeof annotation.id !== 'string' || !annotation.id || annotationIds.has(annotation.id) || !TYPES.includes(annotation.kind) || !Number.isInteger(annotation.start) || !Number.isInteger(annotation.end) || annotation.start < 1 || annotation.end < annotation.start || annotation.end > record.length || annotation.evidence !== 'user' || typeof annotation.definition !== 'string') throw new Error('Invalid annotation.');
      annotationIds.add(annotation.id);
    }
  }
  const structures = new Set();
  if(project.references!==undefined){
    if(!Array.isArray(project.references))throw new Error('Invalid reference population list.');
    for(const pack of project.references)require('./research').validateReference(pack);
  }
  for (const structure of project.structures || []) {
    if (!structure || typeof structure.id !== 'string' || structures.has(structure.id) || typeof structure.raw !== 'string' || structure.digest !== crypto.createHash('sha256').update(structure.raw).digest('hex') || !Array.isArray(structure.atoms) || !Array.isArray(structure.residues) || !Array.isArray(structure.chains)) throw new Error('Invalid structure or mismatched source digest.');
    structures.add(structure.id);
    for (const atom of structure.atoms) if (![atom.x,atom.y,atom.z].every(Number.isFinite)) throw new Error('Invalid atom coordinates.');
    for (const residue of structure.residues) {
      if (!Array.isArray(residue.atomIndices) || residue.atomIndices.some(i=>!Number.isInteger(i)||i<0||i>=structure.atoms.length)) throw new Error('Invalid structure atom mapping.');
      if (residue.recordId !== undefined) {
        const target = project.records.find(r=>r.id===residue.recordId);
        if (!target || !Number.isInteger(residue.index0) || residue.index0 < 0 || residue.index0 >= target.length) throw new Error('Structure mapping does not match sequence.');
      }
    }
  }
  for(const structure of project.structures||[]){
    const profile=structure.surfaceProfile;if(!profile)continue;
    if(profile.structureDigest!==structure.digest||profile.protocol!=='antibody-inspection.surface-profile/1'||!Number.isFinite(profile.totalArea)||profile.totalArea<0)throw new Error('Invalid or stale surface profile.');
    const residueIds=new Set(structure.residues.map(r=>r.id));
    for(const key of ['hydrophobic','positive','negative']){
      const group=profile.groups?.[key];
      if(!group||!['exposedArea','largestPatchArea'].every(k=>Number.isFinite(group[k])&&group[k]>=0)||!Array.isArray(group.patches))throw new Error('Invalid surface profile metrics.');
      for(const patch of group.patches)if(!Number.isFinite(patch.area)||patch.area<0||!Array.isArray(patch.residueIds)||patch.residueIds.some(id=>!residueIds.has(id)))throw new Error('Invalid surface patch mapping.');
    }
  }
  function checkRange(range, record) {
    if (!record || !range || !Number.isInteger(range.start0) || !Number.isInteger(range.end0) || range.start0 < 0 || range.end0 > record.length || range.start0 >= range.end0) throw new Error('Invalid saved residue selection.');
  }
  function checkView(view, historical = false) {
    const record = project.records.find(r => r.id === view?.selectedRecordId);
    if (!record || (view.referenceId !== undefined && !ids.has(view.referenceId)) || (!historical && view.annotationId !== undefined && !record.annotations.some(a => a.id === view.annotationId))) throw new Error('Invalid saved view.');
    if (view.selection) checkRange(view.selection,record);
    for (const target of [...(view.selectedTargets || []),...(view.pins || [])]) checkRange(target,project.records.find(r=>r.id===target.recordId));
    if (view.camera && (!Array.isArray(view.camera) || view.camera.length !== 8 || !view.camera.every(Number.isFinite))) throw new Error('Invalid saved camera.');
    if (view.structureId && !structures.has(view.structureId)) throw new Error('Saved structure is missing.');
    if(view.superposition){
      const s=view.superposition,target=project.records.find(r=>r.id===s.recordId);
      if(!target||!structures.has(s.fixedId)||!structures.has(s.movingId)||s.fixedId===s.movingId||!Array.isArray(s.rotation)||s.rotation.length!==3||s.rotation.some(row=>!Array.isArray(row)||row.length!==3||!row.every(Number.isFinite))||!Array.isArray(s.translation)||s.translation.length!==3||!s.translation.every(Number.isFinite))throw new Error('Invalid saved superposition transform or targets.');
      if(!Number.isInteger(s.fitCount)||s.fitCount<3||!Number.isFinite(s.fitRmsd)||s.fitRmsd<0||!Number.isInteger(s.evaluationCount)||s.evaluationCount<1||!Number.isFinite(s.evaluationRmsd)||s.evaluationRmsd<0)throw new Error('Invalid saved superposition statistics.');
      for(const key of ['fit','evaluation']){
        const positions=s[key+'Indices'],region=s[key+'Region'];
        if(positions&&(!Array.isArray(positions)||positions.length!==s[key+'Count']||new Set(positions).size!==positions.length||positions.some(i=>!Number.isInteger(i)||i<0||i>=target.length)))throw new Error('Invalid saved superposition residue mapping.');
        if(region?.ranges)for(const range of region.ranges)checkRange(range,target);
      }
    }
    if(view.numberingScheme&&!['imgt','kabat'].includes(view.numberingScheme))throw new Error('Unknown numbering scheme.');
    if(view.cdrDefinition&&!['IMGT','Kabat'].includes(view.cdrDefinition))throw new Error('Unknown CDR definition.');
    if (view.tab && !['Map','Sequence','Structure','Distributions','Evidence'].includes(view.tab)) throw new Error('Unknown workspace tab.');
  }
  if(project.demo){
    if(!Array.isArray(project.demo.steps)||project.demo.steps.length>30)throw new Error('Invalid guided demo.');
    for(const step of project.demo.steps){
      if(typeof step.title!=='string'||typeof step.description!=='string')throw new Error('Invalid guided demo text.');
      checkView(step.view,true);
    }
  }
  if (project.view !== undefined) checkView(project.view);
  for (const snapshot of project.snapshots || []) checkView(snapshot.view,true);
  for (const observation of project.observations || []) if (!ids.has(observation.recordId) || !Number.isFinite(observation.value) || !['eq','lt','le','gt','ge'].includes(observation.operator)) throw new Error('Invalid experimental observation.');
  if(project.regionSearch){
    const search=project.regionSearch,source=project.records.find(r=>r.id===search.recordId);checkRange(search.range,source);
    const query=source.sequence.slice(search.range.start0,search.range.end0);
    if(query!==search.query||crypto.createHash('sha256').update(query).digest('hex')!==search.inputDigest)throw new Error('Region search does not match its source.');
    for(const hit of search.hits||[]){const target=project.records.find(r=>r.id===hit.id);checkRange(hit,target);if(crypto.createHash('sha256').update(target.sequence).digest('hex')!==hit.targetDigest)throw new Error('Region search target has changed.');}
  }
  require('./entities').validateEntities(project);
  return project;
}
function addAnnotation(project, recordId, input) {
  const copy = structuredClone(validateProject(project));
  const record = copy.records.find(r => r.id === recordId);
  if (!record) throw new Error('Sequence not found.');
  record.annotations.push({ id: crypto.randomUUID(), kind: input.kind, start: input.start, end: input.end, definition: input.definition, evidence: 'user' });
  return validateProject(copy);
}
function setNote(project, recordId, note) {
  const copy = structuredClone(validateProject(project));
  const record = copy.records.find(r => r.id === recordId);
  if (!record || typeof note !== 'string' || note.length > 20000) throw new Error('Invalid note.');
  record.note = note;
  return validateProject(copy);
}
function removeAnnotation(project, recordId, annotationId) {
  const copy = structuredClone(validateProject(project));
  const record = copy.records.find(r => r.id === recordId);
  if (!record || !record.annotations.some(a => a.id === annotationId)) throw new Error('Annotation not found.');
  record.annotations = record.annotations.filter(a => a.id !== annotationId);
  if (copy.view?.annotationId === annotationId) delete copy.view.annotationId;
  return validateProject(copy);
}
module.exports = { newProject, validateProject, addAnnotation, removeAnnotation, setNote, MAX_BYTES };
