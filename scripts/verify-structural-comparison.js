'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Worker}=require('../src/worker');
const {structuralRegion,validateReference}=require('../src/research');
const {validateProject}=require('../src/project');
(async()=>{
 const root=path.resolve(__dirname,'..'),file=process.argv[2],p=validateProject(JSON.parse(fs.readFileSync(file,'utf8')));
 const fixed=p.structures.find(s=>s.origin==='experimental'),moving=p.structures.find(s=>s.origin==='predicted');
 const record=p.records.find(r=>r.role==='heavy'),matched=[];
 for(const residue of moving.residues.filter(r=>r.recordId===record.id)){
  const reference=fixed.residues.find(r=>r.recordId===record.id&&r.index0===residue.index0&&r.modelId===0);
  if(!reference)continue;
  const a=reference.atomIndices.map(i=>fixed.atoms[i]).find(a=>a.atom==='CA'),b=residue.atomIndices.map(i=>moving.atoms[i]).find(a=>a.atom==='CA');
  if(a&&b)matched.push({index0:residue.index0,fixed:[a.x,a.y,a.z],moving:[b.x,b.y,b.z]});
 }
 const fitRegion=structuralRegion(record,'framework'),evaluationRegion=structuralRegion(record,'cdr3');
 const filter=region=>matched.filter(p=>region.ranges.some(r=>p.index0>=r.start0&&p.index0<r.end0)),fit=filter(fitRegion),evaluation=filter(evaluationRegion);
 assert.ok(fit.length>60);assert.equal(evaluation.length,13);
 const worker=new Worker(path.join(root,'.venv','Scripts','python.exe'),root);
 try{
  const result=await worker.call('structure.superpose',{fixed:fit.map(p=>p.fixed),moving:fit.map(p=>p.moving),evaluateFixed:evaluation.map(p=>p.fixed),evaluateMoving:evaluation.map(p=>p.moving)});
  assert.ok(Number.isFinite(result.evaluationRmsd));
  p.view={...p.view,tab:'Structure',structureId:fixed.id,superposition:{...result,fixedId:fixed.id,movingId:moving.id,recordId:record.id,fitRegion,evaluationRegion,fitIndices:fit.map(p=>p.index0),evaluationIndices:evaluation.map(p=>p.index0),atomSet:'Cα',missingPolicy:'exclude residues without corresponding Cα in both structures'}};
  p.references=require('../references/tap2-populations.json').map(validateReference);
  fs.writeFileSync(file,JSON.stringify(validateProject(p),null,2));
  console.log(JSON.stringify({fitCount:result.fitCount,fitRmsd:result.fitRmsd,evaluationCount:result.evaluationCount,evaluationRmsd:result.evaluationRmsd,note:'One integration example, not an independent prediction accuracy benchmark.'}));
 }finally{worker.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
