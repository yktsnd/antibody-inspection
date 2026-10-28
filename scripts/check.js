'use strict';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
for (const directory of ['src', 'scripts', 'test']) {
  for (const entry of fs.readdirSync(directory, { recursive: true })) {
    if (entry.endsWith('.js')) execFileSync(process.execPath, ['--check', `${directory}/${entry}`], { stdio: 'inherit' });
  }
}
