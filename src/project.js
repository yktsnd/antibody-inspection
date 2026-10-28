'use strict';
const crypto = require('crypto');
const { parseFasta } = require('./fasta');
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ['CDR1', 'CDR2', 'CDR3', 'FR1', 'FR2', 'FR3', 'FR4', 'domain', 'other'];
function newProject(text) {
  if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) throw new Error('File exceeds the 10 MiB import limit.');
  const records = parseFasta(text).map(r => ({ ...r, id: crypto.randomUUID(), annotations: [], note: '' }));
  return { format: 'antibody-inspection', version: 1, source: { type: 'fasta', raw: text }, records };
}
function validateProject(project) {
  if (!project || project.format !== 'antibody-inspection' || project.version !== 1 || !project.source || project.source.type !== 'fasta' || typeof project.source.raw !== 'string' || !Array.isArray(project.records)) throw new Error('Invalid or unsupported project format.');
  if (Buffer.byteLength(JSON.stringify(project), 'utf8') > MAX_BYTES) throw new Error('Project exceeds the 10 MiB limit.');
  const parsed = parseFasta(project.source.raw);
  if (parsed.length !== project.records.length) throw new Error('Original FASTA and project records differ.');
  const ids = new Set();
  for (const [i, record] of project.records.entries()) {
    if (!record || typeof record.id !== 'string' || !record.id || ids.has(record.id) || record.name !== parsed[i].name || record.sequence !== parsed[i].sequence || record.length !== record.sequence.length || !Array.isArray(record.annotations) || typeof record.note !== 'string') throw new Error('Invalid sequence record or mismatched original FASTA.');
    ids.add(record.id);
    const annotationIds = new Set();
    for (const annotation of record.annotations) {
      if (!annotation || typeof annotation.id !== 'string' || !annotation.id || annotationIds.has(annotation.id) || !TYPES.includes(annotation.kind) || !Number.isInteger(annotation.start) || !Number.isInteger(annotation.end) || annotation.start < 1 || annotation.end < annotation.start || annotation.end > record.length || annotation.evidence !== 'user' || typeof annotation.definition !== 'string') throw new Error('Invalid annotation.');
      annotationIds.add(annotation.id);
    }
  }
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
  return validateProject(copy);
}
module.exports = { newProject, validateProject, addAnnotation, removeAnnotation, setNote, MAX_BYTES };
