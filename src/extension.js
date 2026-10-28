'use strict';
const vscode = require('vscode');
const { newProject, validateProject, addAnnotation, removeAnnotation, setNote, MAX_BYTES } = require('./project');
const { render } = require('./view');
const { align, quality } = require('./alignment');
function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('antibodyInspection.open', () => {
    if (vscode.env.remoteName) { vscode.window.showErrorMessage('Antibody Inspection requires a local VS Code window.'); return; }
    const panel = vscode.window.createWebviewPanel('antibodyInspection', 'Antibody Inspection', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
    let project = null, selected = null, projectUri = null, dirty = false;
    const publish = () => panel.webview.postMessage({ type: 'project', project, selected, dirty, quality: project ? quality(project.records) : [] });
    panel.webview.html = render(panel.webview.cspSource);
    panel.webview.onDidReceiveMessage(async message => {
      try {
        if (message.type === 'ready') { await publish(); return; }
        if (message.type === 'select') { selected = project?.records.some(r => r.id === message.id) ? message.id : selected; await publish(); return; }
        if (message.type === 'import' || message.type === 'openProject') {
          if (dirty && await vscode.window.showWarningMessage('Discard unsaved changes?', { modal: true }, 'Discard') !== 'Discard') return;
          const files = await vscode.window.showOpenDialog({ canSelectMany: false, filters: message.type === 'import' ? { FASTA: ['fasta', 'fa', 'faa', 'txt'] } : { 'Inspection project': ['json'] } });
          if (!files?.length) return;
          const file = files[0];
          if (file.scheme !== 'file') throw new Error('Choose a local file.');
          const stat = await vscode.workspace.fs.stat(file);
          if (stat.size > MAX_BYTES) throw new Error('File exceeds the 10 MiB limit.');
          const text = new TextDecoder('utf-8', { fatal: true }).decode(await vscode.workspace.fs.readFile(file));
          const next = message.type === 'import' ? newProject(text) : validateProject(JSON.parse(text));
          project = next; selected = next.records[0]?.id || null; projectUri = message.type === 'openProject' ? file : null; dirty = message.type === 'import'; await publish(); return;
        }
        if (!project) return;
        if (message.type === 'compare') {
          const reference = project.records.find(r => r.id === message.referenceId);
          const query = project.records.find(r => r.id === message.recordId);
          if (!reference || !query) throw new Error('Select two sequences for comparison.');
          await panel.webview.postMessage({ type: 'comparison', referenceId: reference.id, recordId: query.id, result: align(reference.sequence, query.sequence) });
        }
        if (message.type === 'addAnnotation') { project = addAnnotation(project, selected, message.annotation); dirty = true; await publish(); }
        if (message.type === 'removeAnnotation') { project = removeAnnotation(project, selected, message.id); dirty = true; await publish(); }
        if (message.type === 'setNote') { project = setNote(project, selected, message.note); dirty = true; await publish(); }
        if (message.type === 'save' || message.type === 'saveAs') {
          const uri = message.type === 'saveAs' || !projectUri ? await vscode.window.showSaveDialog({ filters: { 'Inspection project': ['json'] }, saveLabel: 'Save project' }) : projectUri;
          if (!uri) return;
          if (uri.scheme !== 'file') throw new Error('Choose a local file.');
          validateProject(project);
          await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(project, null, 2), 'utf8'));
          projectUri = uri; dirty = false; await publish();
        }
      } catch (error) { vscode.window.showErrorMessage(`Antibody Inspection: ${error.message}`); }
    }, undefined, context.subscriptions);
  }));
}
module.exports = { activate };
