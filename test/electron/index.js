'use strict';
const assert = require('node:assert/strict');
const vscode = require('vscode');
async function run() {
  const extension = vscode.extensions.getExtension('yktsnd.antibody-inspection');
  assert.ok(extension, 'extension discovered');
  assert.equal(extension.packageJSON.version, process.env.EXPECTED_EXTENSION_VERSION);
  assert.ok(!extension.extensionPath.includes('test/host'), 'test the installed package, not a development copy');
  assert.ok(require('node:fs').existsSync(require('node:path').join(extension.extensionPath, 'examples/synthetic.fasta')), 'synthetic example packaged');
  for(const file of ['examples/research-demo.inspection.json','worker/surface_profile.py','references/germline-aa.json','examples/antibodies.fasta','examples/1N8Z.cif','worker/engine.py','worker/requirements-lock-windows-py312.txt','references/constant-domains.json','media/3Dmol-min.js','media/workspace.js'])assert.ok(require('node:fs').existsSync(require('node:path').join(extension.extensionPath,file)),file+' packaged');
  await extension.activate();
  const commands = await vscode.commands.getCommands();
  assert.ok(commands.includes('antibodyInspection.open'), 'command registered');
  assert.ok(commands.includes('antibodyInspection.openDemo'));
  await vscode.commands.executeCommand('antibodyInspection.openDemo');
  const deadline = Date.now() + 10000;
  while (!vscode.window.tabGroups.all.flatMap(g => g.tabs).some(tab => tab.label.startsWith('Antibody Inspection')) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(vscode.window.tabGroups.all.flatMap(g => g.tabs).some(tab => tab.label.startsWith('Antibody Inspection')), 'inspection webview opened');
  console.log('Extension host smoke test passed: activation, command registration, webview opening.');
}
module.exports = { run };
