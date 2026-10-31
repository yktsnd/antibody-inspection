'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } = require('@vscode/test-electron');
(async () => {
  const version = '1.85.2';
  const vscodeExecutablePath = process.env.VSCODE_EXECUTABLE_PATH || await downloadAndUnzipVSCode(version);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'antibody-install-'));
  const vsix = path.resolve(process.argv[2] || `antibody-inspection-${require('../package.json').version}.vsix`);
  const [cli, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath,{reuseMachineInstall:true});
  const args = ['--no-sandbox', '--user-data-dir', path.join(profile, 'user'), '--extensions-dir', path.join(profile, 'extensions')];
  try {
    if(process.platform==='win32') {
      const directory=path.dirname(vscodeExecutablePath);
      const candidates=[directory,...fs.readdirSync(directory,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>path.join(directory,d.name))];
      const cliScript=candidates.map(d=>path.join(d,'resources/app/out/cli.js')).find(p=>fs.existsSync(p));
      if(!cliScript)throw new Error('VS Code CLI script not found.');
      execFileSync(vscodeExecutablePath,[cliScript,...args,'--install-extension',vsix,'--force'],{stdio:'inherit',windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}});
    } else execFileSync(cli, [...cliArgs, ...args, '--install-extension', vsix, '--force'], { stdio: 'inherit' });
    await runTests({ vscodeExecutablePath, extensionDevelopmentPath: path.resolve(__dirname, '../test/host'), extensionTestsPath: path.resolve(__dirname, '../test/electron/index'), launchArgs: [...args, '--disable-gpu', '--disable-workspace-trust'], extensionTestsEnv: { EXPECTED_EXTENSION_VERSION: require('../package.json').version } });
  } finally {
    if(!path.resolve(profile).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(profile).startsWith('antibody-install-'))throw new Error('Unexpected test cleanup path.');
    fs.rmSync(profile, { recursive: true, force: true,maxRetries:5,retryDelay:300 });
  }
})().catch(error => { console.error(error); process.exit(1); });
