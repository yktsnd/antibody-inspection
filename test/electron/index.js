'use strict';
const assert = require('node:assert/strict');
const vscode = require('vscode');
async function run() {
  const extension = vscode.extensions.getExtension('yktsnd.antibody-inspection');
  assert.ok(extension, 'extension discovered');
  assert.equal(extension.packageJSON.version, process.env.EXPECTED_EXTENSION_VERSION);
  assert.ok(!extension.extensionPath.includes('test/host'), 'test the installed package, not a development copy');
  assert.ok(require('node:fs').existsSync(require('node:path').join(extension.extensionPath, 'examples/synthetic.fasta')), 'synthetic example packaged');
  await extension.activate();
  const commands = await vscode.commands.getCommands();
  assert.ok(commands.includes('antibodyInspection.open'), 'command registered');
  await vscode.commands.executeCommand('antibodyInspection.open');
  const deadline = Date.now() + 10000;
  while (!vscode.window.tabGroups.all.flatMap(g => g.tabs).some(tab => tab.label === 'Antibody Inspection') && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(vscode.window.tabGroups.all.flatMap(g => g.tabs).some(tab => tab.label === 'Antibody Inspection'), 'inspection webview opened');
  console.log('Extension host smoke test passed: activation, command registration, webview opening.');
}
module.exports = { run };
