'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } = require('@vscode/test-electron');
(async () => {
  const version = '1.85.2';
  const vscodeExecutablePath = await downloadAndUnzipVSCode(version);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'antibody-install-'));
  const vsix = path.resolve(process.argv[2] || `antibody-inspection-${require('../package.json').version}.vsix`);
  const [cli, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
  const args = ['--no-sandbox', '--user-data-dir', path.join(profile, 'user'), '--extensions-dir', path.join(profile, 'extensions')];
  try {
    execFileSync(cli, [...cliArgs, ...args, '--install-extension', vsix, '--force'], { stdio: 'inherit' });
    await runTests({ vscodeExecutablePath, extensionDevelopmentPath: path.resolve(__dirname, '../test/host'), extensionTestsPath: path.resolve(__dirname, '../test/electron/index'), launchArgs: [...args, '--disable-gpu', '--disable-workspace-trust'], extensionTestsEnv: { EXPECTED_EXTENSION_VERSION: require('../package.json').version } });
  } finally { fs.rmSync(profile, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exit(1); });
