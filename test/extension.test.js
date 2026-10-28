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
    env: {}, ViewColumn: { One: 1 }, commands: { registerCommand: (_, fn) => { open = fn; } },
    window: { createWebviewPanel: () => panel, showErrorMessage: message => { throw new Error(message); }, showWarningMessage: async () => 'Discard', showOpenDialog: async () => [nextFile], showSaveDialog: async () => saveResolve ? new Promise(resolve => { saveResolve(resolve); }) : { scheme: 'file', path: '/saved.json' } },
    workspace: { fs: { stat: async () => ({ size: Buffer.byteLength(saved) }), readFile: async () => Buffer.from(saved), writeFile: async (_, data) => { saved = data.toString(); } } },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/extension.js'), 'utf8'), { module, Buffer, TextDecoder, require: name => name === 'vscode' ? vscode : name.startsWith('.') ? require('../src/' + name.slice(2)) : require(name) });
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
