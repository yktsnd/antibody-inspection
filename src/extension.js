'use strict';
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const { newProject, validateProject, addAnnotation, removeAnnotation, setNote, MAX_BYTES } = require('./project');
const { render } = require('./view');
const { align, quality } = require('./alignment');
function activate(context) {
  let panel;
  context.subscriptions.push(vscode.commands.registerCommand('antibodyInspection.open', () => {
    if (vscode.env.remoteName) { vscode.window.showErrorMessage('Antibody Inspection requires a local VS Code window.'); return; }
    if (panel) { panel.reveal(); return; }
    panel = vscode.window.createWebviewPanel('antibodyInspection', 'Antibody Inspection', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] });
    const currentPanel = panel;
    let project = null, projectUri = null, dirty = false, queue = Promise.resolve();
    const status = () => { currentPanel.title = 'Antibody Inspection' + (dirty ? ' •' : ''); return currentPanel.webview.postMessage({ type: 'dirty', dirty }); };
    const publish = () => { currentPanel.title = 'Antibody Inspection' + (dirty ? ' •' : ''); return currentPanel.webview.postMessage({ type: 'project', project, selected: project?.view?.selectedRecordId, dirty, quality: project ? quality(project.records) : [] }); };
    currentPanel.onDidDispose(() => { panel = undefined; }, undefined, context.subscriptions);
    currentPanel.webview.html = render(currentPanel.webview.cspSource);
    async function receive(message) {
      try {
        if (message.type === 'ready') { await publish(); return; }
        if (['import', 'openProject', 'demo'].includes(message.type)) {
          if (dirty && await vscode.window.showWarningMessage('Discard unsaved changes? Save the project first to keep them.', { modal: true }, 'Discard') !== 'Discard') return;
          let next, file;
          if (message.type === 'demo') next = newProject(fs.readFileSync(path.join(context.extensionPath, 'examples/synthetic.fasta'), 'utf8'));
          else {
            const files = await vscode.window.showOpenDialog({ canSelectMany: false, filters: message.type === 'import' ? { FASTA: ['fasta', 'fa', 'faa', 'txt'] } : { 'Inspection project': ['json'] } });
            if (!files?.length) return;
            file = files[0];
            if (file.scheme !== 'file') throw new Error('Choose a local file.');
            if ((await vscode.workspace.fs.stat(file)).size > MAX_BYTES) throw new Error('File exceeds the 10 MiB limit.');
            const text = new TextDecoder('utf-8', { fatal: true }).decode(await vscode.workspace.fs.readFile(file));
            next = message.type === 'import' ? newProject(text) : validateProject(JSON.parse(text));
          }
          project = next; project.view ||= { selectedRecordId: project.records[0].id };
          projectUri = message.type === 'openProject' ? file : null; dirty = message.type !== 'openProject'; await publish(); return;
        }
        if (!project) return;
        const record = project.records.find(r => r.id === message.recordId);
        if (message.type === 'select') {
          if (!record) throw new Error('Sequence not found.');
          project.view = { selectedRecordId: record.id }; dirty = true; await publish(); return;
        }
        if (message.type === 'setView') {
          if (!record) throw new Error('Sequence not found.');
          const view = { ...project.view, ...message.view, selectedRecordId: record.id };
          validateProject({ ...project, view }); project.view = view; dirty = true; await status(); return;
        }
        if (message.type === 'compare') {
          const reference = project.records.find(r => r.id === message.referenceId);
          if (!reference || !record) throw new Error('Select two sequences for comparison.');
          await currentPanel.webview.postMessage({ type: 'comparison', referenceId: reference.id, recordId: record.id, result: align(reference.sequence, record.sequence) }); return;
        }
        if (message.type === 'setNote') { project = setNote(project, message.recordId, message.note); dirty = true; await status(); return; }
        if (message.type === 'addAnnotation') { project = addAnnotation(project, message.recordId, message.annotation); dirty = true; await publish(); return; }
        if (message.type === 'removeAnnotation') {
          project = removeAnnotation(project, message.recordId, message.id);
          if (project.view?.annotationId === message.id) delete project.view.annotationId;
          dirty = true; await publish(); return;
        }
        if (message.type === 'save' || message.type === 'saveAs') {
          const uri = message.type === 'saveAs' || !projectUri ? await vscode.window.showSaveDialog({ filters: { 'Inspection project': ['json'] }, saveLabel: 'Save project' }) : projectUri;
          if (!uri) return;
          if (uri.scheme !== 'file') throw new Error('Choose a local file.');
          validateProject(project);
          await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(project, null, 2), 'utf8'));
          projectUri = uri; dirty = false; await status();
        }
      } catch (error) { vscode.window.showErrorMessage(`Antibody Inspection: ${error.message}`); }
    }
    currentPanel.webview.onDidReceiveMessage(message => { queue = queue.then(() => receive(message)); return queue; }, undefined, context.subscriptions);
  }));
}
module.exports = { activate };
