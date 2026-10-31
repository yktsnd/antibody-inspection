'use strict';
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
class Worker {
  constructor(python, root, log = () => {}, modelDirectory) { this.python = python; this.root = root; this.log = log; this.modelDirectory=modelDirectory; this.pending = new Map(); this.serial = 0; }
  start() {
    if (this.process) return;
    const child = spawn(this.python, ['-u', path.join(this.root, 'worker', 'engine.py')], { windowsHide: true, stdio: ['pipe','pipe','pipe'], env: { ...process.env, PYTHONUTF8: '1',...(this.modelDirectory?{ANTIBODY_MODEL_DIR:this.modelDirectory,ANTIBODY_CACHE_DIR:path.join(path.dirname(this.modelDirectory),'cache')}:{}) } });
    this.process = child; let buffer = '';
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > 64 * 1024 * 1024) { this.cancel('Worker output exceeds 64 MiB.'); return; }
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0,end); buffer = buffer.slice(end + 1);
        try { const msg = JSON.parse(line); const p = this.pending.get(msg.id); if (!p) continue; this.pending.delete(msg.id); clearTimeout(p.timer); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); }
        catch (error) { this.cancel('Worker protocol error: ' + error.message); }
      }
    });
    child.stderr.on('data', text => this.log(text));
    child.on('error', error => { if (this.process === child) { this.process = null; this.fail(error); } });
    child.on('exit', code => { if (this.process === child) { this.process = null; this.fail(new Error('Analysis process exited (' + code + ').')); } });
  }
  call(method, params = {}) {
    this.start(); const id = ++this.serial;
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => this.cancel('Analysis exceeded the 10 minute limit.'), 600000);
      this.pending.set(id, { resolve,reject,timer });
      this.process.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n', error => { if (error) this.fail(error); });
    });
  }
  fail(error) { for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); } this.pending.clear(); }
  cancel(reason = 'Cancelled') { const child = this.process; this.process = null; child?.kill(); this.fail(new Error(reason)); }
  dispose() { this.cancel(); }
}
function findPython(root, configured, storage) {
  const installed = storage && fs.existsSync(path.join(storage,'runtime','ready.json'));
  const candidates = [configured, installed && path.join(storage,'runtime', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'), path.join(root,'.venv',process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')].filter(Boolean);
  return candidates.find(p => fs.existsSync(p)) || null;
}
module.exports = { Worker, findPython };
