'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {table,importSequences,importMeasurements}=require('../src/imports');
const {digest,numberedAlignment,mapStructure,validateReference,comparison,structuralRegion}=require('../src/research');
const {validateProject}=require('../src/project');
test('CSV preserves quoted names, original data and explicit construct relationships',()=>{
 const raw='name,sequence,construct_id,chain_role\r\n"Chain, A",ACDEFG,ab1,heavy\r\nChain B,ACDFG,ab1,light\r\n';
 const p=importSequences(raw,{alphabet:'protein'});
 assert.equal(p.records[0].name,'Chain, A');assert.equal(p.records[1].construct,'ab1');assert.equal(p.importSource.raw,raw);
 assert.equal(validateProject(JSON.parse(JSON.stringify(p))).records.length,2);
 assert.throws(()=>table('a,a\n1,2',','),/Duplicate/);assert.throws(()=>table('a,b\n1',','),/columns/);
});
test('structural fit and evaluation regions remain independent and reject missing selections',()=>{
 const record={length:12,analysis:{domains:[{regions:[{kind:'FR1',start0:0,end0:3},{kind:'CDR1',start0:3,end0:5},{kind:'FR2',start0:5,end0:8},{kind:'CDR3',start0:8,end0:12}]}]}};
 assert.deepEqual(structuralRegion(record,'framework').ranges,[{start0:0,end0:3},{start0:5,end0:8}]);
 assert.deepEqual(structuralRegion(record,'cdr3').ranges,[{start0:8,end0:12}]);
 assert.throws(()=>structuralRegion(record,'selection'),/Select/);
 assert.throws(()=>structuralRegion(record,'selection',{start0:0,end0:13}),/valid/);
 assert.throws(()=>structuralRegion({length:12},'cdr3'),/Analyze/);
});
test('nucleotide ambiguity does not silently run as protein',()=>{
 assert.equal(importSequences('>x\nACGTACGT').records[0].alphabet,'unresolved');
 assert.equal(importSequences('>x\nACGTACGT',{alphabet:'protein'}).records[0].alphabet,'protein');
});
test('measurement operators, duplicate names, provenance and conditions remain distinct',()=>{
 const p=importSequences('>A\nACDEF\n>B\nACDEG');
 const rows=importMeasurements('sequence_id,specimen_id,endpoint,value,unit,source,method,id,recordId,evidenceKind\nA,lot1,KD,<5,nM,paper,SPR,spoof,spoof,computed\nA,lot2,EC50,7,nM,paper,ELISA,spoof,spoof,computed',p);
 assert.equal(rows[0].operator,'lt');assert.equal(rows[0].rawValue,'<5');assert.equal(rows[0].condition.temperature,'unknown');
 assert.equal(rows[0].recordId,p.records[0].id);assert.equal(rows[0].evidenceKind,'experimental');assert.notEqual(rows[0].id,'spoof');assert.notEqual(rows[0].specimen_id,rows[1].specimen_id);
 assert.throws(()=>importMeasurements('sequence_id,specimen_id,endpoint,value,unit,source\nA,s,KD,4,nM,p',importSequences('>A\nACDEF\n>A\nACDEG')),/exactly one/);
});
function record(id,type,residues){return {id,name:id,analysis:{domains:[{chainType:type,residues}]}};}
test('antibody alignment preserves insertion order, original indices and denominators',()=>{
 const a=record('a','H',[{position:111,insertion:'',aa:'A',index0:0},{position:111,insertion:'A',aa:'G',index0:1},{position:112,insertion:'A',aa:'S',index0:2},{position:112,insertion:'',aa:'T',index0:3}]);
 const b=record('b','H',[{position:111,insertion:'',aa:'A',index0:8},{position:112,insertion:'',aa:'V',index0:9}]);
 const out=numberedAlignment([a,b]);assert.deepEqual(out.columns.map(x=>x.key),['111:','111:A','112:A','112:']);assert.equal(out.rows[1].residues[1],null);assert.equal(out.rows[1].residues[0].index0,8);assert.equal(out.frequencies[1].n,1);assert.equal(out.frequencies[1].missing,1);assert.equal(out.frequencies[3].entropy,1);
 assert.throws(()=>numberedAlignment([a,record('l','K',[])]),/homologous/);
});
test('reference protocol compatibility and rank percentile do not depend on bins',()=>{
 const pack=validateReference({id:'r',version:'1',source:'paper',license:'CC0',protocol:'p1',unit:'x',metric:'m',denominator:'Fv',exclusions:'none',duplicateRule:'retained',values:[1,2,2,3,null]});
 assert.equal(comparison(2,{metric:'m',unit:'x',protocol:'p1'},pack).percentile,50);
 assert.equal(comparison(2,{metric:'m',unit:'x',protocol:'p2'},pack).state,'contextual');
 assert.equal(comparison(2,{metric:'other',unit:'x',protocol:'p1'},pack).percentile,null);
 assert.throws(()=>validateReference({...pack,evidenceKind:'synthetic'}),/Synthetic/);
 assert.equal(validateReference(pack).digest,pack.digest);
 assert.throws(()=>validateReference({...pack,values:[1,2,3]}),/digest/);
});
test('published TAP packs preserve numeric populations and independent metrics',()=>{
 const packs=require('../references/tap2-populations.json').map(validateReference);
 assert.equal(packs.length,10);
 for(const p of packs){assert.equal(p.values.length,p.cohort==='CSTall'?664:79759);assert.equal(p.missing,0);assert.equal(p.sourceWorkbookDigest.length,64);}
 const clinical=packs.find(p=>p.cohort==='CSTall'&&p.metric==='TAP.PSH');
 assert.equal(clinical.values[0],121.4981);
 const project=importSequences('>A\nACDEF');project.references=[{...clinical,values:[NaN]}];
 assert.throws(()=>validateProject(project),/finite/);
});
test('structure mapping refuses ambiguous duplicate-sequence identities',()=>{
 const p=importSequences('>a\nACDEF\n>b\nACDEF');
 const s={residues:[...'ACDEF'].map((aa,i)=>({id:String(i),aa})),chains:[{residueIds:['0','1','2','3','4']}]};
 const mapped=mapStructure(s,p.records);assert.equal(mapped.chains[0].recordId,undefined);assert.equal(mapped.chains[0].candidates.length,2);
});
test('stale analysis cannot be represented as matching a changed input',()=>{
 const p=importSequences('>a\nACDEF');p.records[0].analysis={inputDigest:'wrong',domains:[]};
 assert.throws(()=>validateProject(p),/does not match/);
});

test('saved selections and camera reject invalid ranges and references',()=>{
 const p=importSequences('>A\nACDEF\n>B\nACDEG');const a=p.records[0];
 p.view.selection={start0:1,end0:4,label:'region'};p.view.camera=[0,0,0,100,0,0,0,1];
 p.view.pins=[{recordId:p.records[1].id,start0:0,end0:2,label:'other chain'}];
 assert.doesNotThrow(()=>validateProject(p));
 assert.throws(()=>validateProject({...p,view:{...p.view,selection:{start0:0,end0:6}}}),/selection/);
 assert.throws(()=>validateProject({...p,view:{...p.view,pins:[{recordId:'missing',start0:0,end0:1}]}}),/selection/);
 assert.throws(()=>validateProject({...p,view:{...p.view,camera:[0,NaN]}}),/camera/);
});
test('saved structural comparison rejects invalid transforms and mismatched evaluation mappings',()=>{
 const p=importSequences('>A\nACDEF');
 p.structures=['fixed','moving'].map(id=>({id,raw:id,digest:digest(id),atoms:[],residues:[],chains:[]}));
 p.view.superposition={fixedId:'fixed',movingId:'moving',recordId:p.records[0].id,rotation:[[1,0,0],[0,1,0],[0,0,1]],translation:[0,0,0],fitRmsd:0,fitCount:3,evaluationRmsd:1,evaluationCount:1,fitIndices:[0,1,2],evaluationIndices:[4]};
 assert.doesNotThrow(()=>validateProject(p));
 p.view.superposition.evaluationIndices=[5];assert.throws(()=>validateProject(p),/residue mapping/);
 p.view.superposition.evaluationIndices=[4];p.view.superposition.rotation[0][0]=Infinity;assert.throws(()=>validateProject(p),/transform/);
});

test('retained structure source and coordinate mappings must survive integrity checks',()=>{
 const p=importSequences('>A\nACDEF');
 const s={id:'s',raw:'original coordinates',digest:digest('original coordinates'),atoms:[{x:1,y:2,z:3}],residues:[{recordId:p.records[0].id,index0:0,atomIndices:[0]}],chains:[]};
 p.structures=[s];p.view.structureId='s';assert.doesNotThrow(()=>validateProject(p));
 s.raw+='changed';assert.throws(()=>validateProject(p),/digest/);s.raw='original coordinates';
 s.residues[0].atomIndices=[1];assert.throws(()=>validateProject(p),/atom mapping/);
});

