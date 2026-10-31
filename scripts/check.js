'use strict';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
for (const directory of ['src', 'scripts', 'test', 'media']) {
  for (const entry of fs.readdirSync(directory, { recursive: true })) {
    if (entry.endsWith('.js') && !entry.includes('3Dmol')) execFileSync(process.execPath, ['--check', `${directory}/${entry}`], { stdio: 'inherit' });
  }
}
