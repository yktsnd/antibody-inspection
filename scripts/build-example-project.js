'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Worker}=require('../src/worker');
const {importSequences}=require('../src/imports');
const {mapStructure}=require('../src/research');
const {validateProject}=require('../src/project');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const destination=process.argv[2];
 if(!destination)throw new Error('Specify an output JSON path.');
 const python=process.env.ANTIBODY_PYTHON||path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
 const worker=new Worker(python,root,s=>process.stderr.write(s));
 try{
  const p=importSequences(fs.readFileSync(path.join(root,'examples/antibodies.fasta'),'utf8'),{alphabet:'protein'});
  p.records.forEach((r,i)=>{r.role=['light','heavy','antigen'][i];r.construct=i<2?'1N8Z Herceptin Fab':'1N8Z HER2';});
  p.sources=[{name:'PDB 1N8Z',kind:'deposited polymer entities and experimental coordinates',uri:'https://www.rcsb.org/structure/1N8Z',citation:'Cho et al. (2003), doi:10.1038/nature01392'}];
  for(const record of p.records.slice(0,2))record.analysis=await worker.call('analysis.sequence',{sequence:record.sequence,pH:7.4});
  for(const record of p.records.slice(0,2))record.humanness=await worker.call('analysis.humanness',{sequence:record.sequence,domains:record.analysis.domains});
  const raw=fs.readFileSync(path.join(root,'examples/1N8Z.cif'),'utf8');
  const s={id:crypto.randomUUID(),name:'1N8Z.cif',raw,format:'cif',...mapStructure(await worker.call('structure.parse',{text:raw,format:'cif',origin:'experimental',qualityField:'B-factor'}),p.records)};
  s.contacts=await worker.call('structure.contacts',{atoms:s.atoms,chainA:'B',chainB:'C',cutoff:4.5,modelId:0});
  s.sasa=await worker.call('structure.sasa',{atoms:s.atoms,chainA:'B',chainB:'C',probeRadius:1.4,points:300,modelId:0});
  p.structures=[s];
  const heavy=p.records[1],cdr=heavy.analysis.domains[0].regions.find(r=>r.kind==='CDR3');
  const selection={start0:cdr.start0,end0:cdr.end0,label:'Heavy CDR3 · IMGT',evidence:'inferred'};
  p.view={selectedRecordId:heavy.id,tab:'Map',structureId:s.id,selection,selectedTargets:[{recordId:heavy.id,...selection}]};
  heavy.note='Real deposited Herceptin Fab heavy chain. Inspect IMGT CDR3 against HER2 chain C. Contact threshold: minimum protein heavy-atom distance ≤4.5 Å. Contact does not by itself establish a functional paratope.';
  p.snapshots=[{id:crypto.randomUUID(),name:'Heavy CDR3 and experimental complex',date:new Date().toISOString(),view:structuredClone(p.view),digests:p.records.map(r=>({id:r.id,digest:require('../src/research').digest(r.sequence)}))}];
  validateProject(p);fs.mkdirSync(path.dirname(path.resolve(destination)),{recursive:true});fs.writeFileSync(destination,JSON.stringify(p,null,2));
  console.log(JSON.stringify({output:destination,records:p.records.length,atoms:s.atoms.length,contacts:s.contacts.contacts.length,sasa:s.sasa.total,interface:s.sasa.interface},null,2));
 }finally{worker.dispose();}
})().catch(e=>{console.error(e);process.exit(1)});
