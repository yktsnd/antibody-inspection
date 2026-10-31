'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Worker}=require('../src/worker');
const {validateProject}=require('../src/project');
(async()=>{
 const root=path.resolve(__dirname,'..'),input=process.argv[2];if(!input)throw new Error('Supply the validated Herceptin project with experimental and predicted structures.');
 const p=validateProject(JSON.parse(fs.readFileSync(input,'utf8'))),heavy=p.records.find(r=>r.role==='heavy'),experimental=p.structures.find(s=>s.origin==='experimental'),predicted=p.structures.find(s=>s.origin==='predicted');
 if(!heavy||!experimental||!predicted)throw new Error('Demo needs actual numbered heavy chain, experimental and predicted coordinates.');
 const worker=new Worker(path.join(root,'.venv','Scripts','python.exe'),root,s=>process.stderr.write(s));
 try{for(const record of p.records.filter(r=>r.analysis?.domains?.length)){record.analysis=await worker.call('analysis.sequence',{sequence:record.sequence});record.germline=await worker.call('analysis.germline',{sequence:record.sequence,domains:record.analysis.domains,species:'human'});}
 predicted.surfaceProfile={...await worker.call('structure.surfaceProfile',{atoms:predicted.atoms,chains:[...new Set(predicted.atoms.map(a=>a.chain))]}),structureDigest:predicted.digest};
 }finally{worker.dispose();}
 p.entities=[{id:'pdb-1n8z',kind:'source',name:'PDB 1N8Z',uri:'https://www.rcsb.org/structure/1N8Z',citation:'Cho et al. (2003), doi:10.1038/nature01392',license:'wwPDB data policy',evidenceKind:'curated'},
 {id:'herceptin-fab',kind:'construct',name:'Herceptin Fab',format:'Fab',sourceId:'pdb-1n8z',members:p.records.filter(r=>['heavy','light'].includes(r.role)).map(r=>({copyId:r.role+'-1',sequenceId:r.id,label:r.role+' chain'})),evidenceKind:'curated'},
 {id:'her2-ectodomain',kind:'antigen',name:'HER2 extracellular domain in 1N8Z',species:'Homo sapiens',modifications:'Deposited polymer construct; coordinate model includes missing residues. See source for crystallization and modifications.',sequenceIds:p.records.filter(r=>r.role==='antigen').map(r=>r.id),sourceId:'pdb-1n8z',evidenceKind:'curated'}];
 const base={constructId:'herceptin-fab',selectedRecordId:heavy.id,structureId:experimental.id,selection:p.view.selection,selectedTargets:p.view.selectedTargets};
 const steps=[
  {title:'Understand the Fab',description:'Follow the heavy and light variable/constant domains. Select Fv or Fab to see their actual sequence ranges.',view:{...base,tab:'Map'}},
  {title:'Inspect heavy-chain CDR3',description:'Read IMGT positions and original input coordinates. Compare human germline reference candidates below the alignment controls.',view:{...base,tab:'Sequence'}},
  {title:'See the experimental complex',description:'PDB 1N8Z contains the Herceptin Fab bound to HER2. The selected CDR3 is highlighted; contacts use a stated distance threshold.',view:{...base,tab:'Structure'}},
  {title:'Compare a local prediction',description:'The gold model is the computed Fv. Fit: 91 heavy-chain framework Cα pairs. Evaluation: 13 CDR3 pairs. The antigen is absent from the predicted model.',view:{...base,tab:'Structure',superposition:p.view.superposition}},
  {title:'Inspect the local surface profile',description:'Explore the computed Fv hydrophobic and charged-residue surface areas and connected patches. These independent descriptors are not TAP scores or pass/fail thresholds.',view:{...base,structureId:predicted.id,tab:'Structure'}},
  {title:'Explore human-reference similarity',description:'Inspect OASis peptide matches and select a published TAP reference metric. Published populations are separate from uncomputed candidate TAP scores.',view:{...base,tab:'Distributions',referenceMetric:'TAP.PSH'}},
  {title:'Keep the evidence',description:'Read source records, add an observation, and save your own copy. The original public-data example stays unchanged.',view:{...base,tab:'Evidence'}}
 ];
 p.demo={id:'herceptin-1n8z',title:'Herceptin Fab × HER2',description:'Real deposited coordinates and sequences; locally computed analysis and prediction. All results are precomputed for offline exploration.',steps};
 p.snapshots=steps.map((s,index)=>({id:crypto.randomUUID(),name:s.title,date:new Date().toISOString(),view:{...s.view,demoStep:index},digests:p.records.map(r=>({id:r.id,digest:crypto.createHash('sha256').update(r.sequence).digest('hex')}))}));
 p.view={...steps[0].view,demoStep:0};
 fs.writeFileSync(path.join(root,'examples/research-demo.inspection.json'),JSON.stringify(validateProject(p)));
 console.log('Built offline demo with '+steps.length+' guided observations.');
})().catch(e=>{console.error(e);process.exitCode=1;});
