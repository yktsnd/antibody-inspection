'use strict';
const vscode = require('vscode');
const { parseFasta } = require('./fasta');
const { render } = require('./view');

function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('antibodyInspection.open', () => {
    const panel = vscode.window.createWebviewPanel('antibodyInspection', 'Antibody Inspection', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
    panel.webview.html = render(panel.webview.cspSource);
    panel.webview.onDidReceiveMessage(async message => {
      if (message.type !== 'open') return;
      const files = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'FASTA': ['fasta', 'fa', 'faa', 'txt'] } });
      if (!files || !files.length) return;
      try {
        const bytes = await vscode.workspace.fs.readFile(files[0]);
        const records = parseFasta(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        await panel.webview.postMessage({ type: 'records', records });
      } catch (error) {
        vscode.window.showErrorMessage(`Could not open FASTA: ${error.message}`);
      }
    }, undefined, context.subscriptions);
  }));
}
module.exports = { activate };
