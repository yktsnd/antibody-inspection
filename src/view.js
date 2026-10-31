'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
function render(cspSource, library) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const css = fs.readFileSync(path.join(__dirname,'../media/workspace.css'),'utf8');
  const script = fs.readFileSync(path.join(__dirname,'../media/workspace.js'),'utf8');
  const html = fs.readFileSync(path.join(__dirname,'../media/workspace.html'),'utf8');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; worker-src blob:; connect-src 'none';"><style nonce="${nonce}">${css}</style></head><body>${html}${library ? `<script nonce="${nonce}" src="${library}"></script>` : ''}<script nonce="${nonce}">${script}</script></body></html>`;
}
module.exports = {render};
