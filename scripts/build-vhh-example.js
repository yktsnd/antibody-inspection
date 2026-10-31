'use strict';
const fs=require('node:fs'),path=require('node:path');
const {Worker}=require('../src/worker');
const {importSequences}=require('../src/imports');
const {validateProject}=require('../src/project');
(async()=>{
 const root=path.resolve(__dirname,'..'),destination=process.argv[2];
 if(!destination)throw new Error('Specify an output path.');
 const sequence='QVQLVESGGGLVQPGESLRLSCAASGSIFGIYAVHWFRMAPGKEREFTAGFGSHGSTNYAASVKGRFTMSRDNAKNTTYLQMNSLKPADTAVYYCHALIKNELGFLDYWGPGTQVTVSS';
 const p=importSequences('>ImmuneBuilder official VHH example\n'+sequence,{alphabet:'protein'}),r=p.records[0];
 r.role='heavy';r.construct='ImmuneBuilder README VHH example';
 p.sources=[{kind:'upstream example sequence',uri:'https://github.com/oxpig/ImmuneBuilder#nanobodies',name:'ImmuneBuilder NanoBodyBuilder2 README example; no experimental structure supplied'}];
 const worker=new Worker(path.join(root,'.venv','Scripts','python.exe'),root,s=>process.stderr.write(s));
 try{r.analysis=await worker.call('analysis.sequence',{sequence});fs.writeFileSync(destination,JSON.stringify(validateProject(p),null,2));}finally{worker.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
