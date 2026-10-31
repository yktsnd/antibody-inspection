'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { render } = require('../src/view');
const { newProject } = require('../src/project');

test('Fab selection excludes Fc constant domains and retains both chain identities',()=>{
  const sent=[];
  const dom=new JSDOM(render('vscode-webview:'),{runScripts:'dangerously',beforeParse(window){window.acquireVsCodeApi=()=>({postMessage:m=>sent.push(m)});}});
  const p=newProject('>H\nACDEFGHIKL\n>L\nACDEFGHIKL');
  p.records.forEach((r,i)=>{r.construct='paired';r.analysis={domains:[{chainType:i?'K':'H',start0:0,end0:2,residues:[],regions:[]}],constantDomains:(i?['CL']:['CH1','CH2','CH3']).map((kind,j)=>({kind,start0:2+j*2,end0:4+j*2,alternatives:[],identity:1,coverage:1}))};});
  dom.window.dispatchEvent(new dom.window.MessageEvent('message',{data:{type:'project',project:p,selected:p.records[0].id,dirty:false}}));
  [...dom.window.document.querySelectorAll('#moleculeMap button')].find(b=>b.textContent.startsWith('Fab ·')).click();
  const targets=sent.findLast(m=>m.view?.selectedTargets)?.view.selectedTargets;
  assert.deepEqual(Array.from(targets,t=>t.label),['H','CH1','K','CL']);
  assert.equal(new Set(targets.map(t=>t.recordId)).size,2);
  dom.window.close();
});
test('reference comparison filters by metric and shares the axis across populations',()=>{
 const sent=[],dom=new JSDOM(render('vscode-webview:'),{runScripts:'dangerously',beforeParse(w){w.acquireVsCodeApi=()=>({postMessage:m=>sent.push(m)});}}),w=dom.window,d=w.document;
 const p=newProject('>H\nACDEF');p.references=[{id:'clinical',metric:'TAP.PSH',unit:'score',values:[1,2]},{id:'natural',metric:'TAP.PSH',unit:'score',values:[3,4]},{id:'charge',metric:'TAP.PPC',unit:'score',values:[0,1]}];
 w.dispatchEvent(new w.MessageEvent('message',{data:{type:'project',project:p,selected:p.records[0].id}}));
 assert.equal(d.querySelectorAll('#references .panel').length,2);
 assert.deepEqual([...d.querySelectorAll('#references .histogram small')].map(n=>n.textContent),['1.00 — 4.00 · n=2','1.00 — 4.00 · n=2']);
 d.getElementById('referenceMetric').value='TAP.PPC';d.getElementById('referenceMetric').dispatchEvent(new w.Event('change'));
 assert.equal(d.querySelectorAll('#references .panel').length,1);assert.equal(sent.at(-1).view.referenceMetric,'TAP.PPC');w.close();
});
test('webview renders hostile names as text, selects ranges and sends comparison', () => {
  const sent = [];
  const dom = new JSDOM(render('vscode-webview:'), { runScripts: 'dangerously', beforeParse(window) { window.acquireVsCodeApi = () => ({ postMessage: m => sent.push(m) }); } });
  const { window } = dom; const document = window.document;
  const project = newProject('><img src=x onerror=alert(1)>\nACDE\n>Second\nACFDE');
  project.records[0].annotations.push({id:'region1',kind:'CDR1',start:2,end:3,definition:'manual',evidence:'user'});
  window.dispatchEvent(new window.MessageEvent('message', { data: { type:'project',project,selected:project.records[0].id,dirty:true,quality:[] } }));
  assert.equal(document.querySelectorAll('img').length,0);
  assert.equal(document.getElementById('name').textContent,project.records[0].name);
  document.querySelector('#regions button').click();
  assert.equal(document.querySelectorAll('#sequence .selected').length,2);
  document.getElementById('reference').value = project.records[1].id;
  document.getElementById('compare').click();
  assert.equal(sent.at(-1).referenceId,project.records[1].id);
  assert.equal(sent.at(-1).recordId,project.records[0].id);
  document.getElementById('save').click(); assert.equal(sent.at(-1).type,'save');
  assert.match(document.getElementById('status').textContent,/Unsaved changes/);
  window.close();
});
test('typed notes send explicit record identity without Apply and alignment columns map insertions', () => {
  const sent = [];
  const dom = new JSDOM(render('vscode-webview:'), { runScripts: 'dangerously', beforeParse(window) { window.acquireVsCodeApi = () => ({ postMessage: m => sent.push(m) }); } });
  const { window } = dom; const document = window.document;
  document.getElementById('demo').click(); assert.equal(sent.at(-1).type, 'demo');
  const project = newProject('>Ref\nACDE\n>Variant\nACFDE'); const selected = project.records[1].id;
  window.dispatchEvent(new window.MessageEvent('message', { data: { type: 'project', project, selected, dirty: false } }));
  const textarea = document.getElementById('note'); textarea.value = 'Keep this observation'; textarea.dispatchEvent(new window.Event('input'));
  assert.deepEqual(JSON.parse(JSON.stringify(sent.at(-1))), { type: 'setNote', recordId: selected, note: 'Keep this observation' });
  window.dispatchEvent(new window.MessageEvent('message', { data: { type: 'dirty', dirty: true } }));
  assert.equal(textarea.value, 'Keep this observation');
  window.dispatchEvent(new window.MessageEvent('message', { data: { type: 'comparison', referenceId: project.records[0].id, recordId: selected, result: require('../src/alignment').align('ACDE', 'ACFDE') } }));
  document.querySelectorAll('.column')[2].click();
  assert.match(document.getElementById('focus').textContent, /reference input position gap · selected input position 3/);
  assert.equal(document.querySelector('#sequence .selected').dataset.pos, '3');
  window.close();
});

test('guided demo navigation is visible and sends explicit step changes',()=>{
 const sent=[],dom=new JSDOM(render('vscode-webview:'),{runScripts:'dangerously',beforeParse(w){w.acquireVsCodeApi=()=>({postMessage:m=>sent.push(m)});}});
 const p=newProject('>H\nACDEF');p.demo={steps:[{title:'First observation',description:'Inspect the sequence',view:p.view},{title:'Second observation',description:'Inspect evidence',view:p.view}]};
 dom.window.dispatchEvent(new dom.window.MessageEvent('message',{data:{type:'project',project:p,selected:p.records[0].id}}));
 const guide=dom.window.document.getElementById('demoGuide');assert.equal(guide.hidden,false);assert.match(guide.textContent,/First observation/);
 guide.querySelector('button.primary').click();assert.equal(sent.at(-1).type,'demoStep');assert.equal(sent.at(-1).index,1);dom.window.close();
});

test('numbering and CDR definition choices independently update residue labels and extracted ranges',()=>{
 const dom=new JSDOM(render('vscode-webview:'),{runScripts:'dangerously',beforeParse(w){w.acquireVsCodeApi=()=>({postMessage:()=>{}});}});
 const p=newProject('>H\nACDEF'),r=p.records[0];const mk=(definition,start)=>({chainType:'H',start0:0,end0:5,residues:[...r.sequence].map((aa,index0)=>({aa,index0,position:index0+(definition==='IMGT'?27:31),insertion:'',region:'CDR1'})),regions:[{kind:'CDR1',start0:start,end0:5,sequence:r.sequence.slice(start),definition}]});
 r.analysis={domains:[mk('IMGT',0)],numberingVariants:{kabat:[mk('Kabat',2)]}};
 dom.window.dispatchEvent(new dom.window.MessageEvent('message',{data:{type:'project',project:p,selected:r.id}}));const d=dom.window.document;
 d.getElementById('cdrDefinition').value='Kabat';d.getElementById('cdrDefinition').dispatchEvent(new dom.window.Event('change'));
 assert.match(d.getElementById('cdrTable').textContent,/DEF/);assert.equal(d.querySelector('#sequence .number').textContent,'27');
 d.getElementById('numberingScheme').value='kabat';d.getElementById('numberingScheme').dispatchEvent(new dom.window.Event('change'));
 assert.equal(d.querySelector('#sequence .number').textContent,'31');assert.match(d.getElementById('cdrTable').textContent,/DEF/);dom.window.close();
});
