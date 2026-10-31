'use strict';
// Explicit integration test: requires prepared official weights, never downloads.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {Worker}=require('../src/worker');
const {validateProject}=require('../src/project');
(async()=>{
 const root=path.resolve(__dirname,'..'),input=process.argv[2],output=process.argv[3],kind=process.argv[4]||'antibody';
 if(!input||!output||!process.env.ANTIBODY_MODEL_DIR)throw new Error('Usage: ANTIBODY_MODEL_DIR=... node scripts/verify-prediction.js input.inspection.json output.inspection.json');
 const project=validateProject(JSON.parse(fs.readFileSync(input,'utf8')));
 const chains={};
 for(const record of project.records)for(const domain of record.analysis?.domains||[]){const chain=domain.chainType==='H'?'H':'L';assert.ok(!chains[chain],'Example must have exactly one domain per chain');chains[chain]={recordId:record.id,sequence:record.sequence,domain};}
 const worker=new Worker(process.env.ANTIBODY_PYTHON||path.join(root,'.venv','Scripts','python.exe'),root,s=>process.stderr.write(s),process.env.ANTIBODY_MODEL_DIR);
 try{
  const start=Date.now(),result=await worker.call('structure.predict',{kind,chains});
  assert.equal(result.provenance.ensembleSize,4);assert.equal(result.provenance.scope,kind==='antibody'?'Fv only':'VHH only');
  assert.equal(result.provenance.refinementStatus,'succeeded');
  const parsed=await worker.call('structure.parse',{text:result.text,format:'pdb',origin:'predicted',qualityField:result.provenance.qualityField});
  assert.equal(parsed.chains.length,kind==='antibody'?2:1);
  for(const chain of parsed.chains){
   const source=result.sourceResidues[chain.authAsymId],record=project.records.find(r=>r.id===source.recordId);
   const residues=parsed.residues.filter(r=>r.authAsymId===chain.authAsymId);
   assert.equal(residues.length,source.indices.length);
   residues.forEach((r,i)=>{assert.equal(r.aa,record.sequence[source.indices[i]]);r.recordId=source.recordId;r.index0=source.indices[i];});
   chain.recordId=source.recordId;chain.mappingEvidence='explicit prediction input, validated sequence round trip';
  }
  const structure={...parsed,id:crypto.randomUUID(),name:result.provenance.method+' prediction',format:'pdb',raw:result.text,prediction:result.provenance,predictionInputs:result.sourceResidues};
  (project.structures||=[]).push(structure);project.view.structureId=structure.id;project.view.tab='Structure';
  const serialized=JSON.stringify(validateProject(project),null,2);validateProject(JSON.parse(serialized));
  fs.writeFileSync(output,serialized);fs.writeFileSync(output.replace(/\.inspection\.json$/,'.predicted.pdb'),result.text);
  console.log(JSON.stringify({seconds:(Date.now()-start)/1000,residues:parsed.residues.length,atoms:parsed.atoms.length,refinement:result.provenance.refinementStatus,weights:result.provenance.modelWeights,output},null,2));
 }finally{worker.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});
