'use strict';
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
function run(command,args,log,signal){return new Promise((resolve,reject)=>{const child=spawn(command,args,{windowsHide:true,stdio:['ignore','pipe','pipe'],signal});child.stdout.on('data',x=>log(x.toString()));child.stderr.on('data',x=>log(x.toString()));child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Runtime setup exited with code '+code+'. See the Antibody Inspection output channel.')));});}
async function installRuntime(storage,root,log,signal){
  if(!storage)throw new Error('Extension storage is unavailable.');
  fs.mkdirSync(storage,{recursive:true});const target=path.join(storage,'runtime');
  const windows=process.platform==='win32';
  await run(windows?'py':'python3',windows?['-3.12','-m','venv',target]:['-m','venv',target],log,signal);
  const python=path.join(target,windows?'Scripts/python.exe':'bin/python');
  const requirements = windows ? 'requirements-lock-windows-py312.txt' : 'requirements.txt';
  await run(python,['-m','pip','install','--disable-pip-version-check','-r',path.join(root,'worker',requirements)],log,signal);
  await run(python,['-c','import anarcii, Bio, gemmi, torch, numpy, promb'],log,signal);
  fs.writeFileSync(path.join(target,'ready.json'),JSON.stringify({version:'0.3.0',installedAt:new Date().toISOString()}));
  return python;
}
async function preparePrediction(python,root,directory,kind,log,signal){
  if(!['antibody','nanobody'].includes(kind))throw new Error('Choose Fv or VHH.');
  const requirements=process.platform==='win32'?'requirements-prediction-lock-windows-py312.txt':'requirements-prediction.txt';
  await run(python,['-m','pip','install','--disable-pip-version-check','-r',path.join(root,'worker',requirements)],log,signal);
  await run(python,['-u',path.join(root,'worker','models.py'),directory,kind],log,signal);
}
module.exports={installRuntime,preparePrediction};
