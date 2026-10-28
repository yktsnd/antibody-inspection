'use strict';
const path = require('node:path');
const { runTests } = require('@vscode/test-electron');
runTests({
  version: '1.85.2',
  extensionDevelopmentPath: path.resolve(__dirname, '..'),
  extensionTestsPath: path.resolve(__dirname, '../test/electron/index'),
  launchArgs: ['--no-sandbox', '--disable-gpu', '--disable-workspace-trust'],
}).catch(error => { console.error(error); process.exit(1); });
