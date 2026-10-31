'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function host() {
  let open, receive, saved, nextFile, saveResolve;
  const posted = [];
  const panel = { title: '', reveal() {}, onDidDispose() {}, webview: { cspSource: 'vscode-webview:', postMessage: async m => posted.push(structuredClone(m)), onDidReceiveMessage: fn => { receive = fn; } } };
  const vscode = {
    env: {}, ViewColumn: { One: 1 }, commands: { registerCommand: (name, fn) => { if(name==='antibodyInspection.open')open = fn; } },
    window: { createWebviewPanel: () => panel, showErrorMessage: message => { throw new Error(message); }, showWarningMessage: async () => 'Discard', showOpenDialog: async () => [nextFile], showSaveDialog: async () => saveResolve ? new Promise(resolve => { saveResolve(resolve); }) : { scheme: 'file', path: '/saved.json' } },
    workspace: { fs: { stat: async () => ({ size: Buffer.byteLength(saved) }), readFile: async () => Buffer.from(saved), writeFile: async (_, data) => { saved = data.toString(); } } },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/extension.js'), 'utf8'), { module, Buffer, TextDecoder, structuredClone, AbortController, setTimeout, clearTimeout, require: name => name === 'vscode' ? vscode : name.startsWith('.') ? require('../src/' + name.slice(2)) : require(name) });
  module.exports.activate({ subscriptions: [], extensionPath: path.join(__dirname, '..') });
  open();
  return { send: m => receive(m), posted, get saved() { return saved; }, set nextFile(file) { nextFile = file; }, set saveGate(fn) { saveResolve = fn; } };
}
test('newcomer example, typed note, range, linked saved view and reopen survive host round trip', async () => {
  const h = host(); await h.send({ type: 'demo' });
  const initial = h.posted.at(-1).project;
  assert.equal(initial.records.length, 3); assert.match(initial.records[0].name, /SYNTHETIC/);
  const [a, b] = initial.records;
  await h.send({ type: 'setNote', recordId: a.id, note: 'Typed without Apply' });
  await h.send({ type: 'addAnnotation', recordId: a.id, annotation: { kind: 'other', start: 5, end: 10, definition: 'teaching range only' } });
  const range = h.posted.at(-1).project.records[0].annotations[0];
  await h.send({ type: 'setView', recordId: a.id, view: { annotationId: range.id, referenceId: b.id } });
  await h.send({ type: 'save' });
  const persisted = JSON.parse(h.saved);
  assert.equal(persisted.records[0].note, 'Typed without Apply');
  assert.deepEqual(persisted.view, { selectedRecordId: a.id, annotationId: range.id, referenceId: b.id });
  h.nextFile = { scheme: 'file', path: '/saved.json' }; await h.send({ type: 'openProject' });
  assert.deepEqual(h.posted.at(-1).project, persisted);
  await h.send({ type: 'compare', recordId: b.id, referenceId: a.id });
  const inserted = h.posted.at(-1).result.columns.find(c => c.referencePosition === null);
  assert.equal(inserted.queryPosition, 11);
});
test('queued Save and sequence switch keep delayed note mutation attached to its original record', async () => {
  const h = host(); await h.send({ type: 'demo' });
  const [a, b] = h.posted.at(-1).project.records;
  let releaseDialog; h.saveGate = resolve => { releaseDialog = resolve; };
  const save = h.send({ type: 'save' });
  await new Promise(resolve => setImmediate(resolve));
  const select = h.send({ type: 'select', recordId: b.id });
  const note = h.send({ type: 'setNote', recordId: a.id, note: 'Belongs to A' });
  releaseDialog({ scheme: 'file', path: '/saved.json' }); await Promise.all([save, select, note]);
  h.saveGate = null; await h.send({ type: 'save' });
  const persisted = JSON.parse(h.saved);
  assert.equal(persisted.records[0].note, 'Belongs to A'); assert.equal(persisted.records[1].note, '');
  assert.equal(persisted.view.selectedRecordId, b.id);
});

test('observation range can be restored after its manual annotation is removed',async()=>{
  const h=host();await h.send({type:'demo'});const a=h.posted.at(-1).project.records[0];
  await h.send({type:'addAnnotation',recordId:a.id,annotation:{kind:'other',start:2,end:4,definition:'observed region'}});
  const annotation=h.posted.at(-1).project.records[0].annotations[0];
  await h.send({type:'setView',recordId:a.id,view:{annotationId:annotation.id,selection:{start0:1,end0:4,label:'observed region',evidence:'user'}}});
  await h.send({type:'snapshot',name:'before removal'});const snapshot=h.posted.at(-1).project.snapshots[0];
  await h.send({type:'removeAnnotation',recordId:a.id,id:annotation.id});
  await h.send({type:'restoreSnapshot',id:snapshot.id});await h.send({type:'save'});
  const saved=JSON.parse(h.saved);assert.equal(saved.view.annotationId,undefined);assert.deepEqual(saved.view.selection,snapshot.view.selection);assert.equal(saved.snapshots.length,1);
});

test('offline research demo opens without a runtime and every guided observation survives save',async()=>{
 const h=host();await h.send({type:'researchDemo'});
 const p=h.posted.at(-1).project;assert.equal(p.demo.steps.length,7);assert.equal(p.structures.length,2);
 assert.ok(p.records.some(r=>r.germline?.domains.length));
 for(let index=0;index<p.demo.steps.length;index++){
  await h.send({type:'demoStep',index});await h.send({type:'save'});
  const saved=JSON.parse(h.saved);assert.equal(saved.view.demoStep,index);assert.equal(saved.view.tab,p.demo.steps[index].view.tab);
 }
});

test('import preview preserves the active project until explicit column mapping is committed',async()=>{
 const h=host();await h.send({type:'previewText',text:'sample,peptide,lot\nAlpha,EVQLV,one\nBeta,EVQLV,two'});
 const preview=h.posted.at(-1);assert.equal(preview.type,'importPreview');assert.equal(preview.preview.count,2);
 assert.deepEqual(preview.preview.headers,['sample','peptide','lot']);assert.equal(preview.preview.sequenceColumn,'');
 assert.equal(h.posted.some(m=>m.type==='project'),false);
 await h.send({type:'confirmImport',id:preview.id,options:{nameColumn:'sample',sequenceColumn:'peptide',alphabet:'protein'}});
 const p=h.posted.at(-1).project;assert.equal(p.records.length,2);assert.notEqual(p.records[0].id,p.records[1].id);assert.equal(p.records[1].metadata.lot,'two');assert.match(p.importSource.raw,/sample,peptide,lot/);
});

test('restoring a guided observation also restores its tour step',async()=>{
 const h=host();await h.send({type:'researchDemo'});const p=h.posted.at(-1).project;
 await h.send({type:'restoreSnapshot',id:p.snapshots[4].id});
 assert.equal(h.posted.at(-1).project.view.demoStep,4);assert.equal(h.posted.at(-1).project.view.tab,'Structure');
});
