'use strict';
// Installed Details sanitizes local/data image URLs. Keep public README images
// unchanged, and provide the interactive demo plus bundled text guides locally.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function bundledReadme() {
  const entries = new Map([['README.md', { anchor: '', title: 'README' }]]);
  const sections = [];
  function resolveLocal(from, target) {
    const name = path.posix.normalize(path.posix.join(path.posix.dirname(from), target.split('#')[0]));
    if (name.startsWith('../') || path.isAbsolute(name)) throw new Error(`Outside documentation root: ${target}`);
    if (!fs.statSync(path.join(root, name)).isFile()) throw new Error(`Missing documentation: ${name}`);
    return name;
  }
  for (const [name, info] of entries) {
    if (entries.size > 80) throw new Error('Unexpected documentation graph size');
    let body = fs.readFileSync(path.join(root, name), 'utf8');
    if (name.endsWith('.md')) {
      body = body.replace(/(!?)\[([^\]]*)\]\(([^\s)]+)\)/g, (whole, image, label, target) => {
        if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(target)) return whole;
        const local = resolveLocal(name, target);
        if (image) {
          if (!local.endsWith('.png')) throw new Error(`Unsupported embedded image: ${local}`);
          return '**Explore the structure in 3D:** run **Antibody Inspection: Explore Guided Demo** from the Command Palette, then choose the structure observation.';
        }
        if (!entries.has(local)) {
          const heading = `Guide ${entries.size}: ${label}`;
          entries.set(local, { anchor: heading.toLowerCase().replace(/[^\w -]/g, '').replaceAll(' ', '-'), title: label, heading });
        }
        return `[${label}](#${entries.get(local).anchor})`;
      });
    } else body = '```json\n' + body + '\n```';
    body = body.replace(/\*Actual application export:[\s\S]*?\*\s*\n/, '');
    sections.push(info.anchor ? `\n\n---\n\n## ${info.heading}\n\n${body}` : body);
  }
  return sections.join('');
}
if (require.main === module) {
  process.chdir(root);
  const readmePath = 'work/package/README.md';
  fs.mkdirSync(path.dirname(readmePath), { recursive: true });
  fs.writeFileSync(readmePath, bundledReadme());
  const ignorePath = 'work/package/vscodeignore';
  fs.writeFileSync(ignorePath, fs.readFileSync('.vscodeignore', 'utf8') + '\nREADME.md\n');
  execFileSync(process.execPath, [require.resolve('@vscode/vsce/vsce'), 'package', '--no-dependencies', '--no-rewrite-relative-links', '--readme-path', readmePath, '--ignoreFile', ignorePath], { stdio: 'inherit' });
}
module.exports = { bundledReadme };
