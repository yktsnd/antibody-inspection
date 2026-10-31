'use strict';
const vscode = require('vscode');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { newProject, validateProject, addAnnotation, removeAnnotation, setNote, MAX_BYTES } = require('./project');
const { importSequences, importMeasurements, previewSequences } = require('./imports');
const { Worker, findPython } = require('./worker');
const { digest, numberedAlignment, mapStructure, validateReference, structuralRegion } = require('./research');
const { render } = require('./view');
const { align, quality } = require('./alignment');
const { installRuntime,preparePrediction } = require('./runtime');
function activate(context) {
  let panel, worker, pendingDemo=false;
  const storage = context.globalStorageUri?.fsPath;
  const log = vscode.window.createOutputChannel?.('Antibody Inspection');
  function getWorker() {
    if (worker) return worker;
    const python = findPython(context.extensionPath,vscode.workspace.getConfiguration?.('antibodyInspection').get('pythonPath'),storage);
    if (!python) throw new Error('Local analysis runtime is not installed. Open Analysis runtime to choose a Python runtime with ANARCII and Biopython.');
    worker = new Worker(python,context.extensionPath,text => log?.append(text),storage&&path.join(storage,'models')); context.subscriptions.push(worker); return worker;
  }
  const open = () => {
    if (vscode.env.remoteName) { vscode.window.showErrorMessage('Open a local VS Code window to keep this project on your computer.'); return; }
    if (panel) { panel.reveal(); return; }
    const root = vscode.Uri?.file(path.join(context.extensionPath,'media'));
    panel = vscode.window.createWebviewPanel('antibodyInspection','Antibody Inspection',vscode.ViewColumn.One,{enableScripts:true,retainContextWhenHidden:true,localResourceRoots:root ? [root] : []});
    const current = panel;
    let pendingImport=null;
    let project = null, projectUri = null, dirty = false, queue = Promise.resolve(), attempt = 0, busy = false, backupTimer, runtimeController;
    const recovery = storage && path.join(storage,'recovery.json');
    if (recovery && fs.existsSync(recovery)) {
      try { const saved = JSON.parse(fs.readFileSync(recovery,'utf8')); project = validateProject(saved.project); projectUri = saved.path ? vscode.Uri.file(saved.path) : null; dirty = saved.dirty; } catch (e) { log?.appendLine('Recovery could not be loaded: ' + e.message); }
    }
    const post = message => current.webview.postMessage(message);
    function backup() {
      if (!recovery || !project) return;
      fs.mkdirSync(storage,{recursive:true}); const temp = recovery + '.tmp'; fs.writeFileSync(temp,JSON.stringify({project,dirty,path:projectUri?.fsPath || null})); fs.renameSync(temp,recovery);
    }
    const changed = () => { dirty = true; clearTimeout(backupTimer); backupTimer = setTimeout(() => { try { backup(); } catch(e) { log?.appendLine(e.message); } },350); };
    const status = () => { current.title = 'Antibody Inspection' + (dirty ? ' •' : ''); return post({type:'dirty',dirty}); };
    const publish = () => { current.title = 'Antibody Inspection' + (dirty ? ' •' : ''); return post({type:'project',project,selected:project?.view?.selectedRecordId,dirty,quality:project ? quality(project.records) : []}); };
    current.onDidDispose(() => { clearTimeout(backupTimer); try { backup(); } catch(e) { log?.appendLine(e.message); } attempt++; runtimeController?.abort(); worker?.cancel(); busy = false; panel = undefined; },undefined,context.subscriptions);
    const library = root && current.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath,'media','3Dmol-min.js'))).toString();
    current.webview.html = render(current.webview.cspSource,library);
    async function readLocal(filters) {
      const files = await vscode.window.showOpenDialog({canSelectMany:false,filters}); if (!files?.length) return null;
      const file = files[0]; if (file.scheme !== 'file') throw new Error('Choose a local file.');
      if ((await vscode.workspace.fs.stat(file)).size > MAX_BYTES) throw new Error('File exceeds 64 MiB.');
      return {file,text:new TextDecoder('utf-8',{fatal:true}).decode(await vscode.workspace.fs.readFile(file))};
    }
    async function background(label, action) {
      if (busy) { await post({type:'error',text:'An analysis is running. Cancel it or wait.'}); return; }
      busy = true; const run = ++attempt;
      await post({type:'job',status:'running',label});
      try { await action(run); if (run === attempt) { changed(); await publish(); await post({type:'job',status:'succeeded',label:label + ' complete'}); } }
      catch(e) { if (run === attempt) await post({type:'job',status:'failed',label:e.message}); log?.appendLine(e.stack || e.message); }
      finally { if (run === attempt) busy = false; }
    }
    async function receive(m) {
      try {
        if (!m || typeof m.type !== 'string') return;
        if (m.type === 'ready') { await publish(); if(pendingDemo){pendingDemo=false;await receive({type:'researchDemo'});} return; }
        if (m.type === 'cancel') { attempt++; runtimeController?.abort(); worker?.cancel(); busy = false; await post({type:'job',status:'cancelled',label:'Cancelled; completed results retained'}); return; }
        if (m.type === 'runtime') { try { await post({type:'diagnostics',result:await getWorker().call('engine.describe')}); } catch(e) { await post({type:'diagnostics',result:{error:e.message}}); } return; }
        if (m.type === 'installRuntime') {
          if (busy) throw new Error('Wait for the current analysis before installing a runtime.');
          busy = true; const run = ++attempt; runtimeController = new AbortController();
          await post({type:'job',status:'running',label:'Installing local analysis runtime…'});
          void (async()=>{
            try { await installRuntime(storage,context.extensionPath,text=>log?.append(text),runtimeController.signal); if(run!==attempt)return; worker?.dispose(); worker=null; await receive({type:'runtime'}); await post({type:'job',status:'succeeded',label:'Analysis runtime ready'}); }
            catch(e){if(run===attempt)await post({type:'job',status:'failed',label:e.message});}
            finally{if(run===attempt){busy=false;runtimeController=null;}}
          })();return;
        }
        if (m.type === 'chooseRuntime') {
          const files = await vscode.window.showOpenDialog({canSelectMany:false,filters:{Python:process.platform === 'win32' ? ['exe'] : ['*']}});
          if (files?.length) { worker?.dispose(); worker = null; await vscode.workspace.getConfiguration('antibodyInspection').update('pythonPath',files[0].fsPath,vscode.ConfigurationTarget.Global); await receive({type:'runtime'}); } return;
        }
        if(m.type==='preparePrediction'){
          if(busy)throw new Error('Wait for the current job or cancel it.');
          const python=getWorker().python;
          busy=true;const run=++attempt;runtimeController=new AbortController();
          await post({type:'job',status:'running',label:'Preparing prediction runtime and models (~704 MB per format)…'});
          void(async()=>{try{
            worker?.dispose();worker=null;
            await preparePrediction(python,context.extensionPath,path.join(storage,'models'),m.kind,text=>{
              log?.append(text);
              const progress=text.match(/(?:antibody|nanobody)_model_(\d): (\d+ MiB|verified)/g)?.at(-1);
              if(progress&&run===attempt)void post({type:'job',status:'running',label:'Preparing '+(m.kind==='antibody'?'Fv':'VHH')+' · '+progress.replace(/(?:antibody|nanobody)_model_/,'model ')});
            },runtimeController.signal);
            if(run===attempt)await post({type:'job',status:'succeeded',label:'Prediction models verified; offline prediction is ready'});
          }catch(e){if(run===attempt)await post({type:'job',status:'failed',label:e.message});}finally{if(run===attempt){busy=false;runtimeController=null;}}})();return;
        }
        if(m.type==='previewFile'||m.type==='previewText'){
          const input=m.type==='previewFile'?await readLocal({Sequences:['fasta','fa','faa','txt','csv','tsv']}):{text:String(m.text||'')};if(!input)return;
          const preview=previewSequences(input.text);pendingImport={text:input.text,id:crypto.randomUUID()};await post({type:'importPreview',preview,id:pendingImport.id});return;
        }
        if(m.type==='confirmImport'){
          if(!pendingImport||pendingImport.id!==m.id)throw new Error('Import preview expired. Preview the input again.');
          await receive({type:'paste',text:pendingImport.text,options:m.options||{}});return;
        }
        if (['import','openProject' ,'demo','researchDemo','paste'].includes(m.type)) {
          if (dirty && await vscode.window.showWarningMessage('Replace this project? Save first to keep your current work.',{modal:true},'Replace') !== 'Replace') return;
          let next, file;
          if(m.type==='researchDemo')next=validateProject(JSON.parse(fs.readFileSync(path.join(context.extensionPath,'examples/research-demo.inspection.json'),'utf8')));
          else if (m.type === 'demo') next = importSequences(fs.readFileSync(path.join(context.extensionPath,'examples','synthetic.fasta'),'utf8'),{alphabet:'protein'});
          else if (m.type === 'paste') next = importSequences(String(m.text || ''),m.options || {});
          else { const input = await readLocal(m.type === 'openProject' ? {'Inspection project':['json']} : {Sequences:['fasta','fa','faa','txt','csv','tsv']}); if (!input) return; file = input.file; next = m.type === 'openProject' ? validateProject(JSON.parse(input.text)) : importSequences(input.text); }
          if (busy) { attempt++; runtimeController?.abort(); worker?.cancel(); busy = false; }
          project = next; project.view ||= {selectedRecordId:project.records[0].id}; projectUri = m.type === 'openProject' ? file : null; dirty = m.type !== 'openProject'; backup(); await post({type:'job',status:'idle',label:''}); await publish(); return;
        }
        if (!project) return;
        const record = project.records.find(r => r.id === m.recordId);
        if(m.type==='demoStep'){
          const step=project.demo?.steps?.[m.index];if(!step)throw new Error('Demo observation not found.');
          project.view={...structuredClone(step.view),demoStep:m.index};changed();await publish();return;
        }
        if(m.type==='regionSearch'){
          if(!record)throw new Error('Select a source sequence.');const range=project.view.selection;if(!range)throw new Error('Select a sequence region first.');
          const query=record.sequence.slice(range.start0,range.end0);void background('Searching the selected sequence region',async run=>{
            const result=await getWorker().call('analysis.regionSearch',{query,records:project.records.map(r=>({id:r.id,name:r.name,sequence:r.sequence}))});if(run===attempt){project.regionSearch={...result,recordId:record.id,range};await post({type:'regionSearchResult',result:project.regionSearch});}
          });return;
        }
        if(m.type==='germline'){
          if(!record?.analysis?.domains?.length)throw new Error('Analyze variable domains before comparing germline references.');
          void background('Comparing amino-acid germline references',async run=>{
            const result=await getWorker().call('analysis.germline',{sequence:record.sequence,domains:record.analysis.domains,species:m.species});
            if(run===attempt){const current=project.records.find(r=>r.id===record.id);if(current)current.germline=result;}
          });return;
        }
        if (m.type === 'select') {
          if (!record) throw new Error('Sequence not found.');
          const view = {...project.view,selectedRecordId:record.id}; delete view.annotationId; delete view.selection; delete view.selectedTargets;
          if(m.selection){view.selection=m.selection;view.selectedTargets=[{...m.selection,recordId:record.id}];}
          validateProject({...project,view}); project.view=view; changed(); await publish(); return;
        }
        if (m.type === 'setView') { if (!record) throw new Error('Sequence not found.'); const view = {...project.view,...m.view,selectedRecordId:record.id}; validateProject({...project,view}); project.view = view; changed(); await status(); return; }
        if (m.type === 'setNote') { if (!record || typeof m.note !== 'string' || m.note.length > 20000) throw new Error('Invalid note.'); record.note = m.note; changed(); await status(); return; }
        if (m.type === 'addAnnotation' || m.type === 'removeAnnotation') { Object.assign(project,m.type === 'addAnnotation' ? addAnnotation(project,m.recordId,m.annotation) : removeAnnotation(project,m.recordId,m.id)); changed(); await publish(); return; }
        if(m.type==='saveEntity'){project.entities=require('./entities').upsertEntity(project,m.entity);changed();await publish();await post({type:'entitySaved',id:project.entities.at(-1).id});return;}
        if (m.type === 'metadata') {
          if (!record) throw new Error('Select a sequence.');
          for (const key of ['construct','role','alphabet','isotype','origin','specificity']) if (typeof m[key] === 'string') record[key] = m[key].slice(0,500);
          changed(); await publish(); return;
        }
        if (m.type === 'analyze') {
          const targets = m.all ? project.records.filter(r => r.role !== 'antigen' && (!r.analysis || r.analysis.status !== 'succeeded')) : [record];
          if (!targets.length || targets.some(r => !r)) throw new Error('Select a sequence to analyze.');
          void background('Numbering and properties',async run => {
            for (let i = 0; i < targets.length; i++) {
              if (run !== attempt) return; const r = targets[i];
              await post({type:'job',status:'running',label:`Analyzing ${r.name} · ${i+1}/${targets.length}`});
              if (r.alphabet && r.alphabet !== 'protein') { r.analysisError = 'Choose Protein or translate a reading frame before analysis.'; continue; }
              try {
                const result = await getWorker().call('analysis.sequence',{sequence:r.sequence,pH:7.4}); if (run !== attempt) return;
                const currentRecord = project.records.find(x => x.id === r.id && x.sequence === r.sequence);
                if (currentRecord) { currentRecord.analysis = result; delete currentRecord.analysisError; changed(); await publish(); }
              } catch(e) { if (run !== attempt) return; const currentRecord = project.records.find(x => x.id === r.id); if (currentRecord) currentRecord.analysisError = e.message; }
            }
          }); return;
        }
        if (m.type === 'translate') {
          if (!record) throw new Error('Select a nucleotide sequence.');
          void background('Translation',async run => {
            const result = await getWorker().call('sequence.translate',{sequence:record.sequence,frame:Number(m.frame)}); if (run !== attempt) return;
            const derived = newProject(`>${record.name} | frame ${result.frame}\n${result.sequence}`).records[0]; derived.alphabet = 'protein'; derived.translation = {...result,parentId:record.id};
            project.records.push(derived); project.source.raw += `\n>${derived.name}\n${derived.sequence}\n`; project.view.selectedRecordId = derived.id;
            delete project.view.annotationId; delete project.view.selection; delete project.view.selectedTargets;
          }); return;
        }
        if (m.type === 'humanness') {
          if(!record?.analysis?.domains?.length)throw new Error('Analyze the antibody sequence before evaluating humanness.');
          void background('Evaluating OASis peptide identity',async run=>{
            const result=await getWorker().call('analysis.humanness',{sequence:record.sequence,domains:record.analysis.domains});
            if(run===attempt){const currentRecord=project.records.find(r=>r.id===record.id);if(currentRecord)currentRecord.humanness=result;}
          });return;
        }
        if (m.type === 'compare') { const reference = project.records.find(r => r.id === m.referenceId); if (!reference || !record) throw new Error('Select two sequences.'); await post({type:'comparison',referenceId:reference.id,recordId:record.id,result:align(reference.sequence,record.sequence)}); return; }
        if (m.type === 'numberedAlignment') { const rows = (m.ids || []).map(id => project.records.find(r => r.id === id)); if (rows.length < 2 || rows.some(r => !r)) throw new Error('Select at least two sequences.'); await post({type:'numberedAlignment',result:numberedAlignment(rows,Number(m.domainIndex || 0))}); return; }
        if(m.type==='expandAssembly'){
          const original=project.structures?.find(s=>s.id===m.structureId);if(!original)throw new Error('Select a deposited structure.');
          if(!original.availableAssemblies?.includes(m.assemblyId))throw new Error('Select an assembly from the source.');
          void background('Expanding deposited biological assembly',async run=>{
            const result=await getWorker().call('structure.parse',{text:original.raw,format:original.format,origin:original.origin,qualityField:original.qualityField,assemblyId:m.assemblyId});if(run!==attempt)return;
            const s={id:crypto.randomUUID(),name:original.name+' · assembly '+m.assemblyId,format:original.format,raw:original.raw,...mapStructure(result,project.records)};
            const candidate={...project,structures:[...(project.structures||[]),s],view:{...project.view,structureId:s.id,camera:undefined,superposition:undefined}};
            validateProject(candidate);project.structures=candidate.structures;project.view=candidate.view;
          });return;
        }
        if (m.type === 'importStructure'  || m.type === 'exampleStructure') {
          const input = m.type === 'exampleStructure' ? {file:{fsPath:path.join(context.extensionPath,'examples','1N8Z.cif')},text:fs.readFileSync(path.join(context.extensionPath,'examples','1N8Z.cif'),'utf8')} : await readLocal({Structure:['pdb','cif','mmcif']}); if (!input) return;
          const format = /\.pdb$/i.test(input.file.fsPath) ? 'pdb' : 'cif';
          void background('Reading structure',async run => {
            const result = await getWorker().call('structure.parse',{text:input.text,format,origin:m.type === 'exampleStructure' ? 'experimental' : m.origin || 'unknown',qualityField:m.qualityField || 'B-factor'}); if (run !== attempt) return;
            const s = {id:crypto.randomUUID(),name:path.basename(input.file.fsPath),format,raw:input.text,...mapStructure(result,project.records)};
            const candidate={...project,structures:[...(project.structures||[]),s],view:{...project.view,structureId:s.id,tab:'Structure'}};
            validateProject(candidate); project.structures=candidate.structures; project.view=candidate.view;
          }); return;
        }
        if (m.type === 'contacts') {
          const s = project.structures?.find(s => s.id === m.structureId); if (!s) throw new Error('Import a structure first.');
          void background('Calculating contacts',async run => { const result = await getWorker().call('structure.contacts',{atoms:s.atoms,chainA:m.chainA,chainB:m.chainB,cutoff:m.cutoff,modelId:m.modelId || 0}); if (run === attempt) { const currentStructure = project.structures.find(x=>x.id===s.id); if(currentStructure) currentStructure.contacts = result; await post({type:'contacts',result}); } }); return;
        }
        if(m.type==='predictStructure'){
          if(!record)throw new Error('Select the construct to model.');
          if(!['antibody','nanobody'].includes(m.kind))throw new Error('Choose Fv or VHH.');
          const group=record.construct?project.records.filter(r=>r.construct===record.construct):[record];
          const domains=group.flatMap(r=>(r.analysis?.domains||[]).map(domain=>({recordId:r.id,sequence:r.sequence,domain})));
          const heavy=domains.filter(x=>x.domain.chainType==='H'),light=domains.filter(x=>['K','L'].includes(x.domain.chainType));
          if(heavy.length!==1||(m.kind==='antibody'&&light.length!==1))throw new Error('Prediction needs exactly one numbered heavy domain and, for Fv, one light domain in the explicitly grouped construct.');
          const chains=m.kind==='antibody'?{H:heavy[0],L:light[0]}:{H:heavy[0]};
          void background('Predicting '+(m.kind==='antibody'?'Fv':'VHH')+' locally',async run=>{
            const result=await getWorker().call('structure.predict',{kind:m.kind,chains});if(run!==attempt)return;
            const parsed=await getWorker().call('structure.parse',{text:result.text,format:'pdb',origin:'predicted',qualityField:result.provenance.qualityField});if(run!==attempt)return;
            for(const chain of parsed.chains){
              const source=result.sourceResidues[chain.authAsymId];if(!source)continue;
              const residues=parsed.residues.filter(r=>r.authAsymId===chain.authAsymId&&r.modelId===0);
              if(residues.length!==source.indices.length)throw new Error('Predicted residue mapping is incomplete.');
              chain.recordId=source.recordId;chain.mappingEvidence='explicit prediction input, validated sequence round trip';
              residues.forEach((r,i)=>{r.recordId=source.recordId;r.index0=source.indices[i];});
            }
            const s={...parsed,id:crypto.randomUUID(),name:result.provenance.method+' · '+(record.construct||record.name),format:'pdb',raw:result.text,prediction:result.provenance,predictionInputs:result.sourceResidues};
            const candidate={...project,structures:[...(project.structures||[]),s],view:{...project.view,structureId:s.id,tab:'Structure'}};
            validateProject(candidate);project.structures=candidate.structures;project.view=candidate.view;
          });return;
        }
        if(m.type==='surfaceProfile'){
          const s=project.structures?.find(s=>s.id===m.structureId);if(!s)throw new Error('Import a structure first.');
          void background('Calculating local surface profile',async run=>{
            const result=await getWorker().call('structure.surfaceProfile',{atoms:s.atoms,chains:m.chains});
            if(run===attempt){const current=project.structures.find(x=>x.id===s.id);if(current)current.surfaceProfile={...result,structureDigest:s.digest};}
          });return;
        }
        if (m.type === 'sasa') {
          const s = project.structures?.find(s => s.id === m.structureId); if (!s) throw new Error('Import a structure first.');
          void background('Calculating solvent-accessible surface',async run => {
            const result = await getWorker().call('structure.sasa',{atoms:s.atoms,chainA:m.chainA,chainB:m.chainB,modelId:m.modelId || 0,probeRadius:1.4,points:300});
            if (run === attempt) { const current = project.structures.find(x=>x.id===s.id); if (current) current.sasa = result; }
          }); return;
        }
        if (m.type === 'superpose') {
          const fixed = project.structures?.find(s=>s.id===m.fixedId), moving = project.structures?.find(s=>s.id===m.movingId);
          if (!fixed || !moving || fixed.id === moving.id) throw new Error('Import two different structures.');
          for(const structure of [fixed,moving]) {
            const positions=structure.residues.filter(r=>r.recordId===m.recordId&&r.modelId===0).map(r=>r.index0);
            if(new Set(positions).size!==positions.length)throw new Error('Multiple chain copies map to this sequence. Explicit copy selection is required before superposition.');
          }
          const matched = [];
          for (const residue of moving.residues.filter(r=>r.recordId===m.recordId && r.modelId===0)) {
            const match = fixed.residues.find(r=>r.recordId===residue.recordId && r.index0===residue.index0 && r.modelId===0);
            if (!match) continue;
            const fa = match.atomIndices.map(i=>fixed.atoms[i]).find(a=>a.atom==='CA'), ma = residue.atomIndices.map(i=>moving.atoms[i]).find(a=>a.atom==='CA');
            if (fa && ma) matched.push({index0:residue.index0,fixed:[fa.x,fa.y,fa.z],moving:[ma.x,ma.y,ma.z]});
          }
          const fitRegion=structuralRegion(record,m.fitScope||(m.selection?'selection':'all'),m.selection),evaluationRegion=structuralRegion(record,m.evaluationScope||'all',m.selection);
          const inRegion=(p,region)=>region.ranges.some(r=>p.index0>=r.start0&&p.index0<r.end0);
          const fit=matched.filter(p=>inRegion(p,fitRegion)),evaluation=matched.filter(p=>inRegion(p,evaluationRegion));
          if(fit.length<3||!evaluation.length)throw new Error('The fit needs at least three matched Cα atoms and evaluation needs at least one. Missing coordinates are excluded.');
          void background('Superposing corresponding Cα atoms',async run=>{
            const result = await getWorker().call('structure.superpose',{fixed:fit.map(p=>p.fixed),moving:fit.map(p=>p.moving),evaluateFixed:evaluation.map(p=>p.fixed),evaluateMoving:evaluation.map(p=>p.moving)});
            if(run===attempt){project.view.superposition={...result,fixedId:fixed.id,movingId:moving.id,recordId:m.recordId,fitRegion,evaluationRegion,fitIndices:fit.map(p=>p.index0),evaluationIndices:evaluation.map(p=>p.index0),atomSet:'Cα',missingPolicy:'exclude residues without corresponding Cα in both structures'};}
          });return;
        }
        if (m.type === 'exportImage') {
          if (typeof m.data !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(m.data) || m.data.length > 20*1024*1024) throw new Error('Invalid PNG export.');
          const uri = await vscode.window.showSaveDialog({filters:{PNG:['png']},saveLabel:'Export structure image'}); if (!uri) return; if(uri.scheme!=='file')throw new Error('Choose a local file.');
          await vscode.workspace.fs.writeFile(uri,Buffer.from(m.data.split(',')[1],'base64'));
          const metadataUri = vscode.Uri.file(uri.fsPath+'.json');
          await vscode.workspace.fs.writeFile(metadataUri,Buffer.from(JSON.stringify({view:project.view,structureId:m.structureId,selection:project.view.selection,rendering:'3Dmol.js 2.5.3',exportedAt:new Date().toISOString()},null,2)));return;
        }
        if (m.type === 'importMeasurements') { const input = await readLocal({Measurements:['csv','tsv']}); if (!input) return; (project.observations ||= []).push(...importMeasurements(input.text,project)); (project.sources ||= []).push({id:crypto.randomUUID(),name:path.basename(input.file.fsPath),raw:input.text,digest:digest(input.text),kind:'measurement table'}); changed(); await publish(); return; }
        if (m.type === 'loadTapReferences') {
          const packs=JSON.parse(fs.readFileSync(path.join(context.extensionPath,'references','tap2-populations.json'),'utf8')).map(validateReference);
          const existing=project.references||[];
          project.references=[...existing.filter(p=>!packs.some(q=>q.id===p.id)),...packs];
          changed();await publish();return;
        }
        if (m.type === 'importReference') { const input = await readLocal({'Reference pack':['json']}); if (!input) return; const parsed=JSON.parse(input.text),packs=(Array.isArray(parsed)?parsed:[parsed]).map(validateReference); (project.references ||= []).push(...packs); changed(); await publish(); return; }
        if (m.type === 'snapshot') { (project.snapshots ||= []).push({id:crypto.randomUUID(),name:String(m.name || 'Observation'),date:new Date().toISOString(),view:structuredClone(project.view),digests:project.records.map(r => ({id:r.id,digest:digest(r.sequence)}))}); changed(); await publish(); return; }
        if (m.type === 'restoreSnapshot') {
          const s = project.snapshots?.find(s => s.id === m.id); if (!s) throw new Error('Snapshot not found.');
          const view = structuredClone(s.view), target=project.records.find(r=>r.id===view.selectedRecordId);
          if(view.annotationId&&!target?.annotations.some(a=>a.id===view.annotationId))delete view.annotationId;
          validateProject({...project,view}); project.view=view; changed(); await publish(); return;
        }
        if(m.type==='exportTable'){
          const output=require('./exports').exportTable(project,m.kind);
          const uri=await vscode.window.showSaveDialog({filters:{'CSV table':['csv']},saveLabel:'Export table'});if(!uri)return;if(uri.scheme!=='file')throw new Error('Choose a local file.');
          await vscode.workspace.fs.writeFile(uri,Buffer.from(output));await post({type:'notice',text:'Table exported with IDs, units and calculation conditions.'});return;
        }
        if (m.type === 'export') {
          const uri = await vscode.window.showSaveDialog({filters:m.format === 'fasta' ? {FASTA:['fasta']} : {'Analysis report':['json']},saveLabel:'Export'}); if (!uri) return; if (uri.scheme !== 'file') throw new Error('Choose a local file.');
          const output = m.format === 'fasta' ? project.records.map(r => `>${r.name}\n${r.sequence}`).join('\n') : JSON.stringify({exportedAt:new Date().toISOString(),selection:project.view,records:project.records,observations:project.observations,references:project.references,entities:project.entities,structureProfiles:(project.structures||[]).filter(s=>s.surfaceProfile).map(s=>({id:s.id,name:s.name,digest:s.digest,result:s.surfaceProfile})),sources:project.sources,importSource:project.importSource},null,2);
          await vscode.workspace.fs.writeFile(uri,Buffer.from(output)); await post({type:'notice',text:'Export complete'}); return;
        }
        if (m.type === 'save' || m.type === 'saveAs') {
          const uri = m.type === 'saveAs' || !projectUri ? await vscode.window.showSaveDialog({filters:{'Inspection project':['json']},saveLabel:'Save project'}) : projectUri; if (!uri) return;
          if (uri.scheme !== 'file') throw new Error('Choose a local file.'); validateProject(project); await vscode.workspace.fs.writeFile(uri,Buffer.from(JSON.stringify(project,null,2))); projectUri = uri; dirty = false; backup(); await status();
        }
      } catch(error) { await post({type:'error',text:error.message}); vscode.window.showErrorMessage(`Antibody Inspection: ${error.message}`); }
    }
    current.webview.onDidReceiveMessage(m => { queue = queue.then(() => receive(m)).catch(e => log?.appendLine(e.message)); return queue; },undefined,context.subscriptions);
  };
  context.subscriptions.push(vscode.commands.registerCommand('antibodyInspection.open',open));
  context.subscriptions.push(vscode.commands.registerCommand('antibodyInspection.openDemo',()=>{if(panel){panel.reveal();void panel.webview.postMessage({type:'requestDemo'});}else{pendingDemo=true;open();}}));
  if(vscode.window.registerTreeDataProvider)context.subscriptions.push(vscode.window.registerTreeDataProvider('antibodyInspection.launcher',{getChildren:()=>[],getTreeItem:item=>item}));
}
module.exports = { activate };
