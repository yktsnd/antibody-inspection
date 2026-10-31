(() => {
'use strict';
const vscode = acquireVsCodeApi(), $ = id => document.getElementById(id);
let state=null, selectedId=null, activeTab='Map', page=0, selection=null, viewer=null, loadedStructure=null, lastAtom=null, quality=[];
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const send=(type,fields={})=>vscode.postMessage({type,recordId:selectedId,...fields});
const on=(id,fn,event='click')=>$(id).addEventListener(event,fn);
const record=()=>state?.records.find(r=>r.id===selectedId);
const button=(text,fn,cls)=>{const b=make('button',text,cls);b.addEventListener('click',fn);return b;};
const setDirty=dirty=>{$('status').textContent=dirty?'Unsaved changes · recovery enabled':state?'Saved project':'No project';};
const saveView=fields=>{if(!state)return;Object.assign(state.view,fields);send('setView',{view:fields});};
function detail(title,text){$('inspectorTitle').textContent=title;$('inspectorContent').textContent=text;}
function showTab(tab,persist=true){activeTab=tab;document.querySelectorAll('[data-pane]').forEach(n=>n.hidden=n.dataset.pane!==tab);document.querySelectorAll('[data-tab]').forEach(n=>{n.setAttribute('aria-selected',String(n.dataset.tab===tab));n.tabIndex=n.dataset.tab===tab?0:-1;});if(persist)saveView({tab});if(tab==='Structure')drawStructure();}
document.querySelector('.tabs').setAttribute('role','tablist');
 document.querySelectorAll('[data-pane]').forEach(n=>{n.id='pane-'+n.dataset.pane;n.setAttribute('role','tabpanel');n.setAttribute('aria-label',n.dataset.pane);});
 document.querySelectorAll('[data-tab]').forEach(n=>{n.setAttribute('role','tab');n.setAttribute('aria-controls','pane-'+n.dataset.tab);n.addEventListener('click',()=>showTab(n.dataset.tab));n.addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('[data-tab]')],i=tabs.indexOf(n);let target;if(event.key==='ArrowRight')target=tabs[(i+1)%tabs.length];if(event.key==='ArrowLeft')target=tabs[(i+tabs.length-1)%tabs.length];if(event.key==='Home')target=tabs[0];if(event.key==='End')target=tabs.at(-1);if(target){event.preventDefault();target.focus();showTab(target.dataset.tab);}});});
for(const id of ['openProject','save','saveAs','demo','researchDemo','runtime','chooseRuntime','cancel','importMeasurements','importReference'])on(id,()=>send(id));
on('emptyImport',()=>send('previewFile'));on('import',()=>send('previewFile'));
on('cancelImportPreview',()=>{$('importPreview').hidden=true;});
on('confirmImport',()=>send('confirmImport',{id:$('importPreview').dataset.previewId,options:{alphabet:$('previewAlphabet').value||undefined,nameColumn:$('previewName').value||undefined,sequenceColumn:$('previewSequence').value||undefined}}));
on('pasteToggle',()=>{$('pastePanel').hidden=!$('pastePanel').hidden;});
on('importText',()=>{send('previewText',{text:$('pasteText').value,options:{alphabet:$('importAlphabet').value,sequenceColumn:$('sequenceColumn').value||undefined,nameColumn:$('nameColumn').value||undefined}});});
on('analyze',()=>send('analyze'));on('analyzeAll',()=>send('analyze',{all:true}));
on('saveMetadata',()=>send('metadata',{construct:$('construct').value,role:$('role').value,alphabet:$('alphabet').value}));
on('translate',()=>send('translate',{frame:Number($('frame').value)}));
on('note',()=>{if(record())record().note=$('note').value;setDirty(true);send('setNote',{note:$('note').value});},'input');
on('search',drawList,'input');
on('snapshot',()=>send('snapshot',{name:$('snapshotName').value||'Observation'}));
on('exportTable',()=>send('exportTable',{kind:$('exportTableKind').value}));
on('exportReport',()=>send('export',{format:'json'}));on('exportFasta',()=>send('export',{format:'fasta'}));
on('annotation',e=>{e.preventDefault();if(Number($('end').value)<Number($('start').value)){notice('End must be at or after start.',true);return;}send('addAnnotation',{annotation:{kind:$('kind').value,start:Number($('start').value),end:Number($('end').value),definition:$('definition').value}});},'submit');
on('regionSearch',()=>send('regionSearch'));
on('compare',()=>send('compare',{referenceId:$('reference').value}));
on('reference',()=>saveView({referenceId:$('reference').value}),'change');
on('alignNumbered',()=>{const r=record(),domainIndex=Number($('alignmentDomain').value||0),d=r?.analysis?.domains?.[domainIndex];const isHeavy=x=>x==='H';const ids=state.records.filter(x=>x.analysis?.domains?.[domainIndex]&&isHeavy(x.analysis.domains[domainIndex].chainType)===isHeavy(d?.chainType)).map(x=>x.id);send('numberedAlignment',{ids,domainIndex});});
on('previousPage',()=>{page=Math.max(0,page-1);drawSequence();});
on('nextPage',()=>{page=Math.min(Math.ceil(record().length/300)-1,page+1);drawSequence();});
on('clearSelection',()=>{selection=null;saveView({selection:null,selectedTargets:[]});applySelection();});
on('installRuntime',()=>send('installRuntime'));
on('pin',()=>{if(!selection)return;const pins=[...(state.view.pins||[]),{...selection,recordId:selectedId}];saveView({pins});drawPins();});
for(const id of ['numberingScheme','cdrDefinition'])on(id,()=>{const r=record();if(!r?.analysis?.numberingVariants?.kabat&&$(id).value.toLowerCase()==='kabat'){notice('Analyze this sequence again to compute Kabat mappings.',true);$(id).value=id==='numberingScheme'?'imgt':'IMGT';return;}selection=null;saveView({[id]:$(id).value,selection:null,selectedTargets:[]});drawMap();drawSequence();},'change');
on('metricSelect',drawDistribution,'change');
on('humanness',()=>send('humanness'));
on('germline',()=>send('germline',{species:$('germlineSpecies').value}));
on('loadTapReferences',()=>send('loadTapReferences'));
on('referenceMetric',()=>{saveView({referenceMetric:$('referenceMetric').value});drawDistribution();},'change');
on('importStructure',()=>send('importStructure'));
on('preparePrediction',()=>send('preparePrediction',{kind:$('predictionKind').value}));
on('predictStructure',()=>send('predictStructure',{kind:$('predictionKind').value}));
on('exampleStructure',()=>send('exampleStructure'));
on('structureSelect',()=>{saveView({structureId:$('structureSelect').value});loadedStructure=null;drawStructure();},'change');
on('structureStyle',()=>{saveView({structureStyle:$('structureStyle').value});styleStructure();},'change');
on('resetStructure',()=>{viewer?.zoomTo();viewer?.render();saveCamera();});
on('focusStructure',()=>{const s=currentStructure();if(!viewer||!s)return;const targets=state.view.selectedTargets?.length?state.view.selectedTargets:selection?[{recordId:selectedId,...selection}]:[];const selected=s.residues.filter(r=>targets.some(t=>r.recordId===t.recordId&&r.index0>=t.start0&&r.index0<t.end0));const atoms=selected.flatMap(r=>r.atomIndices);if(atoms.length){viewer.zoomTo({model:0,index:atoms});viewer.render();saveCamera();}});
on('calculateContacts',()=>send('contacts',{structureId:state.view.structureId,chainA:$('chainA').value,chainB:$('chainB').value,cutoff:Number($('cutoff').value)}));
on('expandAssembly',()=>send('expandAssembly',{structureId:currentStructure()?.id,assemblyId:$('assemblyId').value}));
on('structureColor',()=>{saveView({structureColor:$('structureColor').value});styleStructure();},'change');
on('surfaceProfile',()=>send('surfaceProfile',{structureId:currentStructure()?.id,chains:[...new Set([$('chainA').value,$('chainB').value])]}));
on('calculateSasa',()=>send('sasa',{structureId:state.view.structureId,chainA:$('chainA').value,chainB:$('chainB').value}));
on('superpose',()=>send('superpose',{fixedId:state.view.structureId,movingId:$('movingStructure').value,selection,fitScope:$('fitScope').value,evaluationScope:$('evaluationScope').value}));
on('exportImage',()=>{if(viewer)send('exportImage',{data:viewer.pngURI(),structureId:state.view.structureId});});
on('inspectorToggle',()=>document.body.classList.toggle('show-inspector'));
on('collectionToggle',()=>{const open=document.body.classList.toggle('show-collection');$('collectionToggle').setAttribute('aria-expanded',String(open));});
function notice(text,error=false){$('notice').hidden=!text;$('notice').textContent=text;$('notice').classList.toggle('error',error);}
function regionSelect(start0,end0,label,evidence='user',extra='',persist=true){
 selection={start0,end0,label,evidence};if(persist)saveView({selection,selectedTargets:[{recordId:selectedId,start0,end0,label,evidence}]});
 page=Math.floor(start0/300);drawSequence();applySelection();
 $('start').value=start0+1;$('end').value=end0;
 detail(label,'Input positions '+(start0+1)+'–'+end0+'\nEvidence: '+evidence+'\n'+extra);
}
function applySelection(){
 document.querySelectorAll('#sequence [data-pos]').forEach(n=>n.classList.toggle('selected',!!selection&&Number(n.dataset.pos)>selection.start0&&Number(n.dataset.pos)<=selection.end0));
 $('selectionInfo').textContent=selection?selection.label+' · '+(selection.start0+1)+'–'+selection.end0:'No residues selected';
 $('focus').textContent=selection?selection.label+' · input positions '+(selection.start0+1)+'–'+selection.end0:'Select a residue or a region to follow its coordinates.';
 if(viewer)styleStructure();
}
function drawList(){
 $('list').replaceChildren();if(!state)return;
 const query=$('search').value.toLowerCase(),filtered=state.records.filter(r=>[r.name,r.sequence,r.note,r.construct].some(v=>String(v||'').toLowerCase().includes(query)));
 $('count').textContent=filtered.length+'/'+state.records.length;
 for(const r of filtered.slice(0,300)){
  const ds=r.analysis?.domains||[],types=ds.map(d=>d.chainType==='H'?'VH':d.chainType==='K'?'Vκ':d.chainType==='L'?'Vλ':d.chainType);
  const b=button(r.name,()=>{document.body.classList.remove('show-collection');$('collectionToggle').setAttribute('aria-expanded','false');send('select',{recordId:r.id});},'record');b.setAttribute('aria-pressed',String(r.id===selectedId));
  b.append(make('small',r.length+' aa · '+(types.join(' + ')||r.role||'unassigned')));$('list').append(b);
 }
 if(filtered.length>300)$('list').append(make('p','Showing 300; refine search.','muted'));
}
function track(r,regions){
 const t=make('div',undefined,'track');
 for(const a of regions){
  const start=a.start0??a.start-1,end=a.end0??a.end,kind=a.kind||a.chainType;
  const b=button(kind,()=>{if(r.id!==selectedId){send('select',{recordId:r.id,selection:{start0:start,end0:end,label:kind,evidence:a.evidenceKind||a.evidence||'inferred'}});return;}regionSelect(start,end,kind,a.evidenceKind||a.evidence||'inferred',a.definition||'ANARCII · IMGT');},'rangeBar '+kind);
  b.style.left=(100*start/r.length)+'%';b.style.width=(100*(end-start)/r.length)+'%';b.title=kind+' · '+(start+1)+'–'+end;t.append(b);
 }
 return t;
}
function viewDomains(r){
 const scheme=state?.view.numberingScheme||'imgt',definition=state?.view.cdrDefinition||'IMGT';
 const numbered=scheme==='kabat'?(r.analysis?.numberingVariants?.kabat||r.analysis?.domains):(r.analysis?.domains);
 const regionDomains=definition==='Kabat'?(r.analysis?.numberingVariants?.kabat||r.analysis?.domains):(r.analysis?.domains);
 return (numbered||[]).map(d=>{const match=(regionDomains||[]).find(x=>x.start0===d.start0),regions=match?.regions||d.regions;return {...d,regions,residues:d.residues.map(r=>({...r,region:regions.find(a=>r.index0>=a.start0&&r.index0<a.end0)?.kind||'unassigned'}))};});
}
function drawMap(){
 const r=record(),ds=viewDomains(r);
 $('mapSummary').replaceChildren();
 const summary=make('div',undefined,'panel');
 summary.append(make('h3',ds.length?ds.map(d=>d.chainType==='H'?'Heavy variable domain':d.chainType==='K'?'Kappa variable domain':d.chainType==='L'?'Lambda variable domain':d.chainType).join(' + '):'Sequence ready for inspection'));
 summary.append(make('p',r.analysisError||r.analysis?.reason||(ds.length?'Variable-domain boundaries and IMGT regions are inferred by ANARCII 2.0.8. Supported constant-domain matches are shown separately; other intervals remain unassigned.':'Run analysis to identify variable domains, CDRs and sequence properties.'),'muted'));
 $('mapSummary').append(summary);
 $('moleculeMap').replaceChildren();
 const constructs=(state.entities||[]).filter(e=>e.kind==='construct'&&e.members.some(m=>m.sequenceId===r.id));
 const context=constructs.find(e=>e.id===state.view.constructId)||constructs[0];$('constructContextControl').hidden=!constructs.length;$('constructContext').replaceChildren();for(const e of constructs){const o=make('option',e.name+' ['+e.id+']');o.value=e.id;$('constructContext').append(o);}if(context)$('constructContext').value=context.id;
 const group=context?context.members.map(m=>({...state.records.find(x=>x.id===m.sequenceId),copyLabel:m.label||m.copyId})):r.construct?state.records.filter(x=>x.construct===r.construct):[r];
 for(const chain of group){
  const row=make('div',undefined,'group');row.append(make('strong',chain.name+(chain.copyLabel?' · '+chain.copyLabel:'')),make('small',' · '+(chain.role||'unassigned role')));
  const domains=[...(chain.analysis?.domains||[]).map(d=>({...d,kind:d.chainType==='H'?'VH':d.chainType==='K'?'Vκ':'Vλ'})),...(chain.analysis?.constantDomains||[])];
  row.append(track(chain,domains));$('moleculeMap').append(row);
 }
 const h=group.find(x=>x.analysis?.domains?.some(d=>d.chainType==='H')),l=group.find(x=>x.analysis?.domains?.some(d=>['K','L'].includes(d.chainType)));
 if(h&&l&&h.id!==l.id&&h.analysis.domains.length===1&&l.analysis.domains.length===1){
  const concepts=make('div',undefined,'concepts');
  const choose=(label,withConstants)=>{const targets=[h,l].flatMap(chain=>[...(chain.analysis.domains||[]),...(withConstants?(chain.analysis.constantDomains||[]).filter(d=>['CH1','CL'].includes(d.kind)):[])].map(d=>({recordId:chain.id,start0:d.start0,end0:d.end0,label:d.kind||d.chainType,evidence:'inferred'})));saveView({selectedTargets:targets});const local=targets.find(t=>t.recordId===selectedId);if(local){selection={...local,label};saveView({selection});drawSequence();}detail(label,targets.map(t=>state.records.find(x=>x.id===t.recordId).name+': '+t.label+' '+(t.start0+1)+'–'+t.end0).join('\n')+'\nDomain composition inferred within the explicitly grouped construct.');styleStructure();};
  concepts.append(button('Fv · VH + VL',()=>choose('Fv',false)));
  if(h.analysis.constantDomains?.some(d=>d.kind==='CH1')&&l.analysis.constantDomains?.some(d=>d.kind==='CL'))concepts.append(button('Fab · VH/CH1 + VL/CL',()=>choose('Fab',true)));
  $('moleculeMap').prepend(concepts);
 }
 $('mapCaption').textContent=(context?'Construct '+context.name+' · '+context.members.length+' explicitly declared chain copies. ':r.construct?'Construct '+r.construct+' · researcher-assigned grouping. ':'No chain pairing assigned. ')+'Domain bounds are inferred from ANARCII and source-labelled constant-region references. Unfilled sequence remains unassigned.';
 $('domainDetails').replaceChildren();
 ds.forEach((d,i)=>{
  const panel=make('div',undefined,'panel');panel.append(make('h3','Variable domain '+(i+1)+' · '+d.chainType+' · '+(d.start0+1)+'–'+d.end0));
  panel.append(track(r,d.regions));const row=make('div',undefined,'concepts');
  for(const a of d.regions)row.append(button(a.kind+' · '+a.sequence.length,()=>{regionSelect(a.start0,a.end0,a.kind,'inferred',(a.definition||'IMGT')+' definition · ANARCII 2.0.8\n'+a.sequence);showTab('Sequence');}));
  panel.append(row);$('domainDetails').append(panel);
 });
 for(const d of r.analysis?.constantDomains||[]){const p=make('div',undefined,'panel');p.append(make('h3',d.kind+' · constant-domain reference match'),button('Inspect '+(d.start0+1)+'–'+d.end0,()=>{regionSelect(d.start0,d.end0,d.kind,'inferred',d.referenceName+' · '+d.reference+'\n'+d.method+'\nIdentity '+(100*d.identity).toFixed(1)+'%; reference coverage '+(100*d.coverage).toFixed(1)+'%');showTab('Sequence');}),make('p',d.referenceName+' · identity '+(100*d.identity).toFixed(1)+'% · reference coverage '+(100*d.coverage).toFixed(1)+'%','muted'));if(d.alternatives.length)p.append(make('small','Other matches: '+d.alternatives.map(x=>x.referenceName+' ('+(100*x.identity).toFixed(1)+'%)').join(', ')));$('domainDetails').append(p);}
 $('construct').value=r.construct||'';$('role').value=r.role||'unknown';$('alphabet').value=r.alphabet||'protein';$('translationPanel').hidden=r.alphabet==='protein'||!r.alphabet;
}
function drawRegionSearch(result){
 const box=$('regionSearchResults');box.replaceChildren();if(!result)return;
 box.append(make('h4','Selected-region search'),make('p',result.protocol+' · '+result.scope,'muted'),make('p',result.denominator,'muted'),make('small',result.recordCount+' input records; '+result.skipped.length+' skipped; query '+result.query.length+' aa'));
 box.append(tableView(['Target','Input range','Identity','Query coverage','Score'],result.hits.slice(0,100).map(h=>[button(h.name,()=>send('select',{recordId:h.id,selection:{start0:h.start0,end0:h.end0,label:'Region search hit',evidence:'computed'}})),(h.start0+1)+'–'+h.end0,(100*h.identity).toFixed(1)+'% ('+h.matches+'/'+h.alignedColumns+')',(100*h.queryCoverage).toFixed(1)+'%',h.score.toFixed(1)])));
 if(result.hits.length>100)box.append(make('small','First 100 hits shown; all hits retained in the project.'));
}
function drawSequence(){
 drawRegionSearch(state?.regionSearch);
 drawGermline();
 const r=record();if(!r)return;const domains=viewDomains(r);const scheme=r.analysis?.numberingVariants?.kabat?(state.view.numberingScheme||'imgt'):'imgt',definition=r.analysis?.numberingVariants?.kabat?(state.view.cdrDefinition||'IMGT'):'IMGT';$('numberingScheme').value=scheme;$('cdrDefinition').value=definition;$('cdrDefinitionLabel').textContent=definition+' definition';$('numberingStatus').textContent='Numbering and CDR boundaries are independent choices';const lookup=new Map(domains.flatMap(d=>d.residues).map(x=>[x.index0,x]));
 const seq=$('sequence');seq.replaceChildren();const start=page*300,end=Math.min(r.length,start+300);
 for(let i=start;i<end;i+=30){
  const row=make('div',undefined,'seqrow');row.append(make('span',String(i+1),'ruler'));
  for(let j=i;j<Math.min(i+30,end);j++){
   const info=lookup.get(j),b=make('button',undefined,'residue '+(info?.region||''));b.dataset.pos=String(j+1);b.tabIndex=j===start?0:-1;b.addEventListener('focus',()=>{$('sequence').querySelectorAll('.residue').forEach(x=>x.tabIndex=x===b?0:-1);});b.addEventListener('keydown',event=>{const keys={ArrowLeft:-1,ArrowRight:1,ArrowUp:-30,ArrowDown:30};if(event.key in keys){const target=$('sequence').querySelector('[data-pos="'+(j+1+keys[event.key])+'"]');if(target){event.preventDefault();target.focus();}}});b.append(make('span',info?info.position+info.insertion:'','number'),document.createTextNode(r.sequence[j]));
   b.title='Input '+(j+1)+(info?' · '+scheme.toUpperCase()+' '+info.position+info.insertion+' · '+info.region:' · unnumbered');b.setAttribute('aria-label',b.title+' '+r.sequence[j]);
   b.addEventListener('click',e=>{const first=e.shiftKey&&selection?selection.start0:j;regionSelect(Math.min(first,j),Math.max(first,j)+1,'Residue '+r.sequence[j],info?'inferred':'input',b.title);});
   row.append(b);
  }seq.append(row);
 }
 $('pageLabel').textContent=(start+1)+'–'+end+' / '+r.length;$('previousPage').disabled=page===0;$('nextPage').disabled=end>=r.length;
 $('rangeMap').replaceChildren(track(r,domains.flatMap(d=>d.regions)));
 const previousDomain=$('alignmentDomain').value;$('alignmentDomain').replaceChildren();for(const [i,d] of (r.analysis?.domains||[]).entries()){const o=make('option',(i+1)+' · '+d.chainType+' · input '+(d.start0+1)+'–'+d.end0);o.value=i;$('alignmentDomain').append(o);}if([...$('alignmentDomain').options].some(o=>o.value===previousDomain))$('alignmentDomain').value=previousDomain;
 $('cdrTable').replaceChildren();
 const rows=domains.flatMap((d,i)=>d.regions.filter(a=>a.kind.startsWith('CDR')).map(a=>[String(i+1),button(a.kind,()=>regionSelect(a.start0,a.end0,a.kind,'inferred',definition+' · ANARCII')),a.sequence,String(a.sequence.length),(a.start0+1)+'–'+a.end0,Object.entries([...a.sequence].reduce((counts,aa)=>(counts[aa]=(counts[aa]||0)+1,counts),{})).sort().map(([aa,n])=>aa+':'+n).join(' ')]));
 if(rows.length)$('cdrTable').append(tableView(['Domain','Region','Sequence','Length','Input range','Composition'],rows));
 $('regions').replaceChildren();
 for(const a of r.annotations){
  const row=make('div',undefined,'region');const b=button(a.kind+' · '+a.start+'–'+a.end,()=>{regionSelect(a.start-1,a.end,a.kind,'user',a.definition);saveView({annotationId:a.id});});
  row.append(b,make('small',a.definition||'User annotation'),button('Remove',()=>send('removeAnnotation',{id:a.id})));$('regions').append(row);
 }
 $('liabilities').replaceChildren();
 if(r.analysis?.liabilities?.length){$('liabilities').append(make('h3','Sequence motifs'),make('p','Motif presence does not establish modification, reaction rate or experimental risk.','muted'),tableView(['Motif','Positions','Context'],r.analysis.liabilities.map(a=>[button(a.kind,()=>regionSelect(a.start0,a.end0,a.kind,'computed',a.note)),(a.start0+1)+'–'+a.end0,a.note])));}
 applySelection();
}
function tableView(headers,rows){
 const t=make('table'),h=make('tr');headers.forEach(x=>{const cell=make('th',x);cell.scope='col';h.append(cell);});const head=make('thead');head.append(h);t.append(head);const body=make('tbody');
 for(const values of rows){const row=make('tr');for(const value of values){const td=make('td');if(value instanceof Node)td.append(value);else td.textContent=String(value??'unknown');row.append(td);}body.append(row);}t.append(body);return t;
}
function entityKindChanged(){document.querySelectorAll('[data-entity]').forEach(n=>n.hidden=n.dataset.entity!==$('entityKind').value);}
function memberRow(member={}){
 const row=make('div',undefined,'inline-controls');row.dataset.member='true';row.dataset.copyId=member.copyId||'';
 const sequence=make('select');sequence.setAttribute('aria-label','Chain-copy sequence');for(const r of state?.records||[]){const o=make('option',r.name);o.value=r.id;sequence.append(o);}if(member.sequenceId)sequence.value=member.sequenceId;
 const label=make('input');label.setAttribute('aria-label','Chain-copy label');label.placeholder='Copy label';label.value=member.label||'';
 const remove=button('Remove copy',()=>row.remove());remove.type='button';row.append(sequence,label,remove);$('entityMembers').append(row);
}
function drawEntities(){
 const entities=state.entities||[];$('entityList').replaceChildren(entities.length?tableView(['Type','Name','ID','Relationship'],entities.map(e=>[e.kind,button(e.name,()=>editEntity(e)),e.id,e.kind==='construct'?e.members.length+' chain copies':e.kind==='specimen'?'construct: '+e.constructId+' · lot: '+(e.lot||'unknown'):e.kind==='antigen'?(e.species||'species unknown')+' · '+(e.modifications||'construct/modifications unknown'):e.uri||'source identifier unknown'])):make('p','No entities registered. Sequence records and imported observations remain available.','muted'));
 for(const [id,kind] of [['entitySource','source'],['entityConstruct','construct']]){const previous=$(id).value;$(id).replaceChildren();const none=make('option','Choose / unknown');none.value='';$(id).append(none);for(const e of entities.filter(e=>e.kind===kind)){const o=make('option',e.name+' ['+e.id+']');o.value=e.id;$(id).append(o);}$(id).value=previous;}
 const selected=new Set([...$('entitySequences').selectedOptions].map(o=>o.value));$('entitySequences').replaceChildren();for(const r of state.records){const o=make('option',r.name);o.value=r.id;o.selected=selected.has(r.id);$('entitySequences').append(o);}
 if(!$('entityMembers').children.length)memberRow();
}
function editEntity(e={kind:$('entityKind').value}){
 $('entityEditor').open=true;for(const [id,key] of [['entityId','id'],['entityName','name'],['entityKind','kind'],['entitySource','sourceId'],['entityFormat','format'],['entityConstruct','constructId'],['entityLot','lot'],['entityConditions','conditions'],['entitySpecies','species'],['entityModifications','modifications'],['entityUri','uri'],['entityCitation','citation'],['entityLicense','license']])$(id).value=e[key]||'';
 $('entityMembers').replaceChildren();for(const member of e.members||[{}])memberRow(member);for(const o of $('entitySequences').options)o.selected=(e.sequenceIds||[]).includes(o.value);entityKindChanged();
}
on('constructContext',()=>{saveView({constructId:$('constructContext').value});drawMap();},'change');
on('entityKind',entityKindChanged,'change');on('addEntityMember',()=>memberRow());on('newEntity',()=>editEntity());
on('entityForm',event=>{event.preventDefault();const kind=$('entityKind').value,entity={id:$('entityId').value.trim(),kind,name:$('entityName').value.trim(),sourceId:$('entitySource').value||undefined};
 if(kind==='construct')Object.assign(entity,{format:$('entityFormat').value||'unknown',members:[...$('entityMembers').children].map((row,i)=>({copyId:row.dataset.copyId||'copy-'+(i+1)+'-'+Date.now(),sequenceId:row.querySelector('select').value,label:row.querySelector('input').value||'Copy '+(i+1)}))});
 if(kind==='specimen')Object.assign(entity,{constructId:$('entityConstruct').value,lot:$('entityLot').value||'unknown',conditions:$('entityConditions').value||'unknown'});
 if(kind==='antigen')Object.assign(entity,{species:$('entitySpecies').value||'unknown',modifications:$('entityModifications').value||'unknown',sequenceIds:[...$('entitySequences').selectedOptions].map(o=>o.value)});
 if(kind==='source')Object.assign(entity,{uri:$('entityUri').value,citation:$('entityCitation').value,license:$('entityLicense').value||'unknown'});
 send('saveEntity',{entity});},'submit');
function drawEvidence(){
 drawEntities();
 const r=record(),items=(state.observations||[]).filter(x=>x.recordId===r.id);
 $('measurements').replaceChildren(items.length?tableView(['Specimen','Endpoint','Value','Conditions','Source'],items.map(x=>[(()=>{const specimen=state.entities?.find(e=>e.kind==='specimen'&&e.id===x.specimen_id);return specimen?button(specimen.name+' ['+specimen.id+']',()=>editEntity(specimen)):x.specimen_id+' (unresolved entity)';})(),x.endpoint,({eq:'',lt:'<',le:'≤',gt:'>',ge:'≥'}[x.operator]||'')+x.value+' '+x.unit,JSON.stringify(x.condition),x.source])):make('p','No measurements attached to this sequence.','muted'));
 if(document.activeElement!==$('note'))$('note').value=r.note;
 $('sources').replaceChildren();
 for(const s of state.sources||[])$('sources').append(make('p',s.name+' · '+s.kind),make('small',s.digest||s.uri||''));
 if(r.analysis)$('sources').append(make('p','ANARCII '+r.analysis.engine?.versions?.anarcii+' · inferred numbering'),make('small','Input SHA-256: '+r.analysis.inputDigest));
 if(r.translation)$('sources').append(make('pre',JSON.stringify(r.translation,null,2)));
 $('snapshots').replaceChildren();if(state.snapshots?.length)$('snapshots').append(make('h3','Saved observations'));
 for(const s of state.snapshots||[])$('snapshots').append(button(s.name,()=>send('restoreSnapshot',{id:s.id}),'snapshot'));
 drawPins();
}
function drawPins(){ $('pins').replaceChildren();for(const p of state?.view?.pins||[])$('pins').append(button(p.label+' · '+(p.start0+1)+'–'+p.end0,()=>{if(p.recordId!==selectedId)send('select',{recordId:p.recordId,selection:{start0:p.start0,end0:p.end0,label:p.label,evidence:p.evidence}});else regionSelect(p.start0,p.end0,p.label,p.evidence);},'snapshot')); }
const metricLabels={mw:['Molecular weight','Da'],pI:['Isoelectric point',''],charge:['Charge at pH 7.4','e'],gravy:['GRAVY','']};
function histogram(values,value,bounds){
 const box=make('div',undefined,'histogram');if(!values.length){box.append(make('p','No compatible values.','muted'));return box;}
 let min=bounds?.min??Infinity,max=bounds?.max??-Infinity;for(const v of values){min=Math.min(min,v);max=Math.max(max,v);}if(min===max){min-=.5;max+=.5;}const bins=Array(20).fill(0);
 values.forEach(v=>bins[Math.min(19,Math.floor((v-min)/(max-min)*20))]++);
 const bars=make('div',undefined,'bars');bins.forEach((n,i)=>{const b=make('div',undefined,'bar');b.style.height=(100*n/Math.max(...bins))+'%';b.title=(min+(max-min)*i/20).toFixed(2)+' · n='+n;bars.append(b);});box.append(bars);
 if(Number.isFinite(value)&&value>=min&&value<=max){const marker=make('div',undefined,'marker');marker.style.left=(100*(value-min)/(max-min))+'%';marker.title='Selected: '+value;box.append(marker);}
 box.append(make('small',min.toFixed(2)+' — '+max.toFixed(2)+' · n='+values.length));return box;
}
function drawGermline(){
 const root=$('germlineResults'),result=record()?.germline;root.replaceChildren();if(!result)return;
 root.append(make('p',result.interpretation,'muted'),make('small',result.denominator));
 for(const d of result.domains)for(const [segment,g] of Object.entries(d.segments)){
  const panel=make('div',undefined,'panel');panel.append(make('h3','Domain '+(d.domainIndex+1)+' · '+d.chainType+' · '+segment+' references'),make('p',g.candidateCount+' compared · '+g.topTieCount+' tied best · '+d.ignoredInsertionCount+' insertion-coded residues excluded','muted'));
  if(!g.candidates.length)panel.append(make('p','Insufficient aligned positions for this segment.'));
  else panel.append(tableView(['Reference','Identity','Coverage','Differences'],g.candidates.map(c=>[c.gene, (100*c.identity).toFixed(1)+'% ('+c.matched+'/'+c.compared+')',(100*c.referenceCoverage).toFixed(1)+'% ('+c.compared+'/'+c.referenceLength+')',button(String(c.differences.length),()=>{const target=c.differences[0];if(target)regionSelect(target.index0,target.index0+1,'Germline reference difference','computed',c.gene+'\n'+c.differences.map(r=>'IMGT '+r.position+': '+r.reference+' → '+r.query+' (input '+(r.index0+1)+')').join('\n'));else detail('Reference similarity',c.gene+': all compared amino-acid positions match.');})])));
  root.append(panel);
 }
 root.append(make('small',result.reference.id+' '+result.reference.version+' · '+result.species),make('pre','Reference SHA-256: '+result.reference.digest+'\n'+result.reference.source));
}
function drawHumanness(){
 const root=$('humannessResults'),result=record()?.humanness;root.replaceChildren();
 if(!result){root.append(make('p','Compare each numbered variable domain with the local human OAS 9-mer reference. This is sequence similarity, not species assignment or immunogenicity prediction.','muted'));return;}
 root.append(make('p',result.method+' '+result.version+' · '+result.scope,'muted'),make('p',result.interpretation,'muted'));
 for(const d of result.domains){
  const panel=make('div',undefined,'panel');panel.append(make('h3','Domain '+(d.domainIndex+1)+' · '+d.chainType+' · input '+(d.start0+1)+'–'+d.end0));
  if(d.status!=='succeeded'){panel.append(make('p',d.reason));root.append(panel);continue;}
  panel.append(make('strong',(100*d.identity).toFixed(1)+'% peptide identity'),make('p',d.matched+' / '+d.total+' overlapping windows matched; repeated windows retained.'));
  const missing=d.windows.filter(w=>!w.found),details=make('details'),summary=make('summary',missing.length+' unmatched windows');details.append(summary);
  const scroll=make('div',undefined,'scroll');scroll.append(tableView(['Input range','9-mer'],missing.map(w=>[button((w.start0+1)+'–'+w.end0,()=>{regionSelect(w.start0,w.end0,'Unmatched OAS 9-mer','computed',w.peptide);showTab('Sequence');}),w.peptide])));details.append(scroll);panel.append(details);root.append(panel);
 }
 root.append(make('small','Reference: '+result.reference.id+' · '+result.reference.peptideCount+' unique peptides · '+result.reference.threshold),make('pre','SHA-256: '+result.reference.digest+'\nSource: '+result.reference.source));
}
function drawDistribution(){
 if(!state)return;drawHumanness();const props=record()?.analysis?.properties;$('metrics').replaceChildren();
 for(const [key,[label,unit]] of Object.entries(metricLabels)){const box=make('div',undefined,'metric');box.append(make('small',label),make('strong',Number.isFinite(props?.[key])?props[key].toFixed(2):'—'),make('small',unit));$('metrics').append(box);}
 $('metricConditions').textContent=props?.status==='succeeded'?'Biopython '+props.version+' · free termini · unmodified chain · reduced cysteines · average mass · Kyte–Doolittle GRAVY':props?.reason||'Analyze a protein sequence to compute these properties.';
 const key=$('metricSelect').value,values=state.records.map(r=>r.analysis?.properties?.[key]).filter(Number.isFinite);
 $('distribution').replaceChildren(histogram(values,props?.[key]));
 $('references').replaceChildren();
 const metrics=[...new Set((state.references||[]).map(p=>p.metric))],selectedMetric=metrics.includes(state.view.referenceMetric)?state.view.referenceMetric:metrics[0];
 $('referenceMetric').replaceChildren();for(const metric of metrics){const option=make('option',metric);option.value=metric;$('referenceMetric').append(option);}$('referenceMetric').value=selectedMetric||'';$('referenceMetricControl').hidden=!metrics.length;
 const packs=(state.references||[]).filter(p=>p.metric===selectedMetric),boundsByUnit=new Map();
 for(const pack of packs){const bounds=boundsByUnit.get(pack.unit)||{min:Infinity,max:-Infinity};for(const value of pack.values)if(value!==null){bounds.min=Math.min(bounds.min,value);bounds.max=Math.max(bounds.max,value);}boundsByUnit.set(pack.unit,bounds);}
 for(const pack of packs){
  const panel=make('div',undefined,'panel');panel.append(make('h3',(pack.cohort||pack.id)+' · '+pack.version),make('p',pack.metric+' · '+pack.protocol+' · '+pack.unit,'muted'),histogram(pack.values.filter(v=>v!==null),null,boundsByUnit.get(pack.unit)),make('small','Source: '+pack.source+' · denominator: '+pack.denominator+' · missing: '+pack.missing));
  panel.append(make('p','Reference shown independently; candidate overlay requires matching metric, units and protocol.','muted'));$('references').append(panel);
 }
}
function drawSurfaceProfile(s){
 const box=$('surfaceProfileResults');box.replaceChildren();const p=s.surfaceProfile;if(!p)return;
 box.append(make('p',p.protocol+' · model '+p.modelId+' · chains '+p.chains.join(' + ')+' · isolated selected chains','muted'));
 box.append(tableView(['Residue class','Exposed area (Å²)','Surface fraction','Largest patch (Å²)'],Object.entries(p.groups).map(([key,g])=>[key+' ('+g.residueNames.join(', ')+')',g.exposedArea.toFixed(1),g.surfaceFraction===null?'not evaluable':(100*g.surfaceFraction).toFixed(1)+'%',g.largestPatchArea.toFixed(1)])));
 box.append(make('p','SASA: 1.4 Å probe, 300 points/atom. Patch: residue SASA ≥5 Å², any heavy-atom distance ≤6 Å; connected components. Charge classes exclude histidine and termini; no pH-dependent electrostatics.','muted'));
 for(const [key,g] of Object.entries(p.groups)){
  const details=make('details');details.append(make('summary',key+' patches ('+g.patches.length+')'));
  for(const patch of g.patches.slice(0,10)){const row=make('div',undefined,'inline-controls');row.append(make('span',patch.area.toFixed(1)+' Å²'));for(const rid of patch.residueIds)row.append(button(rid,()=>selectStructuralResidue(rid)));details.append(row);}
  if(g.patches.length>10)details.append(make('small','Largest 10 shown; all patches retained in the project and report.'));box.append(details);
 }
 box.append(make('p',p.interpretation,'muted'));
 const peers=(state.structures||[]).filter(x=>x.surfaceProfile?.protocol===p.protocol);
 if(peers.length>1)box.append(make('h4','Same-protocol results (construct equivalence requires review)'),tableView(['Structure','Chains','Hydrophobic area (Å²)','Largest hydrophobic patch (Å²)'],peers.map(x=>[x.name||x.id,x.surfaceProfile.chains.join(' + '),x.surfaceProfile.groups.hydrophobic.exposedArea.toFixed(1),x.surfaceProfile.groups.hydrophobic.largestPatchArea.toFixed(1)])));
}
function currentStructure(){return state?.structures?.find(s=>s.id===state.view.structureId)||state?.structures?.[0];}
function saveCamera(){if(viewer)saveView({camera:viewer.getView()});}
function styleStructure(){
 const s=currentStructure();if(!viewer||!s)return;
 const style=$('structureStyle').value||'cartoon';
 const qualityMode=$('structureColor').value==='quality';$('qualityLegend').hidden=!qualityMode;
 const values=s.atoms.filter(a=>a.model===0&&Number.isFinite(a.b)).map(a=>a.b);let lo=Infinity,hi=-Infinity;for(const value of values){lo=Math.min(lo,value);hi=Math.max(hi,value);}
 if(qualityMode&&values.length){
  $('qualityLegend').textContent=s.qualityField+' · blue '+lo.toFixed(2)+' → orange '+hi.toFixed(2)+' · observed model range; this color scale does not imply confidence thresholds. Selected residues remain gold.';
  viewer.setStyle({model:0},{[style]:{colorfunc:a=>{if(!Number.isFinite(a.b))return 0x999999;const t=Math.max(0,Math.min(1,(a.b-lo)/(hi-lo||1))),rgb=[Math.round(63+182*t),Math.round(130+30*t),Math.round(220-176*t)];return (rgb[0]<<16)|(rgb[1]<<8)|rgb[2];}}});
 }else viewer.setStyle({model:0},{[style]:{colorscheme:'chain'}});
 if(state.view.superposition?.fixedId===s.id)viewer.setStyle({model:1},{[style]:{color:'#f4cb75',opacity:.65}});
 if(selection||state.view.selectedTargets?.length){
  const targets=state.view.selectedTargets?.length?state.view.selectedTargets:selection?[{recordId:selectedId,...selection}]:[];
  const indices=s.residues.filter(r=>targets.some(t=>r.recordId===t.recordId&&r.index0>=t.start0&&r.index0<t.end0)).flatMap(r=>r.atomIndices);
  if(indices.length)viewer.addStyle({model:0,index:indices},{stick:{color:'#e7c363',radius:.2},sphere:{color:'#e7c363',scale:.22}});
 }viewer.render();
}
function drawStructure(){
 const s=currentStructure();$('structureSelect').replaceChildren();
 for(const x of state?.structures||[]){const o=make('option',x.name);o.value=x.id;$('structureSelect').append(o);}
 if(!s)return;$('structureSelect').value=s.id;state.view.structureId=s.id;
 $('movingStructure').replaceChildren();for(const other of state.structures.filter(x=>x.id!==s.id)){const o=make('option',other.name);o.value=other.id;$('movingStructure').append(o);}
 $('assemblyControls').hidden=!s.availableAssemblies?.length||!!s.assemblyId;$('assemblyId').replaceChildren();for(const id of s.availableAssemblies||[]){const o=make('option',id);o.value=id;$('assemblyId').append(o);}
 drawSurfaceProfile(s);
 $('surfaceResults').replaceChildren();
 if(s.disulfides?.length){const details=make('details');details.append(make('summary',s.disulfides.length+' source-annotated disulfide bonds'),make('p','PDB SSBOND / mmCIF struct_conn annotations. Symmetry-related endpoints may require an assembly copy; only supplied coordinates are displayed.','muted'),tableView(['Endpoint A','Endpoint B','Source distance','Symmetry'],s.disulfides.map(d=>[...d.endpoints.map(e=>e.present?button(e.residueId,()=>selectStructuralResidue(e.residueId)):e.residueId+' (absent)'),Number.isFinite(d.reportedDistance)?d.reportedDistance.toFixed(2)+' Å':'unknown',d.symmetry])));$('surfaceResults').append(details);}
 if(s.sasa){const x=s.sasa;$('surfaceResults').append(make('p','Protein SASA: '+x.total.toFixed(1)+' Å² · probe '+x.probeRadius+' Å · '+x.points+' points/atom'),make('small',x.method+' '+x.version+' · '+x.atomScope));if(x.interface)$('surfaceResults').append(make('p','Chains '+x.interface.chainA+' / '+x.interface.chainB+' · ΔSASA '+x.interface.deltaSASA.toFixed(1)+' Å² · half-ΔSASA '+x.interface.halfDeltaSASA.toFixed(1)+' Å²'));}
 const superposition=state.view.superposition;
 $('superpositionInfo').textContent=superposition?'Fit RMSD '+superposition.fitRmsd.toFixed(3)+' Å ('+superposition.fitCount+' Cα pairs); evaluation RMSD '+superposition.evaluationRmsd.toFixed(3)+' Å ('+superposition.evaluationCount+' pairs).':'';
 $('structureColor').value=state.view.structureColor||'chain';
 $('structureInfo').textContent=s.name+' · '+s.origin+' · '+s.assemblyPolicy+' · '+s.atoms.length+' protein heavy atoms · quality: '+s.qualityField+(s.prediction?' · '+s.prediction.scope+' · refinement: '+s.prediction.refinementStatus:'');
 for(const id of ['chainA','chainB']){const prev=$(id).value;$(id).replaceChildren();for(const c of s.chains.filter(c=>c.modelId===0)){const o=make('option',c.instanceAsymId||c.authAsymId);o.value=c.instanceAsymId||c.authAsymId;$(id).append(o);}if([...$(id).options].some(o=>o.value===prev))$(id).value=prev;else $(id).selectedIndex=id==='chainB'&&$(id).options.length>1?1:0;}
 if(activeTab!=='Structure')return;
 if(!window.$3Dmol){$('atomInfo').textContent='3D rendering is unavailable in this test environment.';return;}
 const renderKey=s.id+JSON.stringify(superposition||null);
 if(loadedStructure!==renderKey){
  lastAtom=null;$('atomInfo').textContent='Click two atoms to measure a distance. Rotation: drag · Zoom: scroll.';
  if(viewer)viewer.clear();
  else {viewer=$3Dmol.createViewer($('viewer'),{backgroundColor:'#111922',antialias:true});$('viewer').addEventListener('mouseup',saveCamera);$('viewer').addEventListener('wheel',()=>setTimeout(saveCamera,100));}
  const model=viewer.addModel();
  // Use worker-normalized atom order so the residue mapping and visual indexes agree.
  const coordinateKey=a=>[a.x.toFixed(3),a.y.toFixed(3),a.z.toFixed(3),a.atom].join(':');
  const parsed=$3Dmol.Parsers[s.format](s.raw,{doAssembly:false,keepH:false})[0]||[];
  const secondary=new Map(parsed.map(a=>[coordinateKey(a),a]));
  model.addAtoms(s.atoms.filter(a=>a.model===0).map(a=>{const source=a.sourceCoordinates?{...a,x:a.sourceCoordinates[0],y:a.sourceCoordinates[1],z:a.sourceCoordinates[2]}:a;const p=secondary.get(coordinateKey(source));return {...a,serial:undefined,ss:p?.ss||'c',ssbegin:p?.ssbegin,ssend:p?.ssend};}));
  model.assignBonds();
  viewer.setClickable({},true,(atom)=>{
   const found=s.residues.find(r=>r.modelId===0&&(r.instanceAsymId||r.authAsymId)===atom.chain&&r.authSeqId===atom.resi&&r.insertionCode===(atom.icode||''));
   let text=atom.chain+':'+atom.resi+(atom.icode||'')+' '+atom.resn+' '+atom.atom+' · '+s.qualityField+' '+Number(atom.b).toFixed(2);
   if(lastAtom){const distance=Math.hypot(atom.x-lastAtom.x,atom.y-lastAtom.y,atom.z-lastAtom.z);text+=' · distance from '+lastAtom.chain+':'+lastAtom.resi+' '+lastAtom.atom+' = '+distance.toFixed(2)+' Å';}lastAtom=atom;
   $('atomInfo').textContent=text;
   detail('Structure residue',text+'\n'+(found?'Author chain '+found.authAsymId+'; label chain '+found.labelAsymId+'; label residue '+found.labelSeqId:'Unmapped'));
   if(found?.recordId===selectedId)regionSelect(found.index0,found.index0+1,'Structure residue','computed',text);
   else if(found?.recordId)send('select',{recordId:found.recordId,selection:{start0:found.index0,end0:found.index0+1,label:'Structure residue',evidence:'computed'}});
  });
  if(superposition?.fixedId===s.id){const moving=state.structures.find(x=>x.id===superposition.movingId);if(moving){const rot=superposition.rotation,t=superposition.translation;const overlay=viewer.addModel();overlay.addAtoms(moving.atoms.filter(a=>a.model===0).map(a=>{const v=[a.x,a.y,a.z];const xyz=t.map((offset,j)=>offset+v.reduce((sum,n,i)=>sum+n*rot[i][j],0));return {...a,x:xyz[0],y:xyz[1],z:xyz[2],color:'#f4cb75',ss:'c'};}));overlay.assignBonds();}}
  viewer.zoomTo();if(state.view.camera)viewer.setView(state.view.camera);loadedStructure=renderKey;
 }viewer.resize();styleStructure();if(s.contacts)drawContacts(s.contacts);else $('contacts').replaceChildren();
}
function drawContacts(result){
 $('contacts').replaceChildren(tableView(['Residue A','Residue B','Minimum distance'],result.contacts.slice(0,500).map(c=>[button(c.a,()=>selectStructuralResidue(c.a)),button(c.b,()=>selectStructuralResidue(c.b)),c.distance.toFixed(2)+' Å'])));
}
function selectStructuralResidue(id){const r=currentStructure()?.residues.find(x=>x.id===id);if(!r)return;detail('Contact residue',JSON.stringify(r,null,2));if(r.recordId===selectedId)regionSelect(r.index0,r.index0+1,'Contact residue','computed','Minimum protein heavy-atom distance');if(viewer){viewer.zoomTo({chain:r.instanceAsymId||r.authAsymId,resi:r.authSeqId,icode:r.insertionCode});viewer.render();saveCamera();}}
function draw(project,selected,dirty){
 const newInput=state?.records?.[0]?.id!==project?.records?.[0]?.id;const old=selectedId;state=project;selectedId=selected;setDirty(dirty);$('empty').hidden=!!project;$('workspace').hidden=!project;
 for(const id of ['save','saveAs','analyzeAll'])$(id).disabled=!project;
 drawList();if(!project)return;
 $('pastePanel').hidden=true;const r=record();if(!r)return;
 if(old!==selectedId)page=0;selection=project.view?.selection||null;if(selection)page=Math.floor(selection.start0/300);
 $('workspace').dataset.selected=r.id;$('name').textContent=r.name;$('breadcrumb').textContent='Collection / '+(r.construct||'Unpaired chain');
 $('meta').textContent=r.length+' residues · '+(r.analysis?.domains?.length||0)+' variable domains · '+(r.alphabet||'protein')+' · '+(r.analysis?.status||'not analyzed');
 $('reference').replaceChildren();for(const other of project.records){const o=make('option',other.name);o.value=other.id;$('reference').append(o);}
 $('reference').value=project.view.referenceId||project.records.find(x=>x.id!==r.id)?.id||r.id;
 const qc=quality.find(x=>x.id===r.id);$('qc').textContent=qc?'Ambiguous residues: '+qc.ambiguous+' · gaps: '+qc.gaps+' · stops: '+qc.stops+(qc.duplicateOf?' · exact duplicate retained':''):'';
 drawDemoGuide();drawMap();drawSequence();drawEvidence();if(newInput){editEntity();$('entityEditor').open=false;$('importPreview').hidden=true;$('pastePanel').hidden=true;}drawDistribution();showTab(project.view.tab||activeTab,false);
 if(selection)detail(selection.label||'Selected region','Input residues '+(selection.start0+1)+'–'+selection.end0+' · '+(selection.evidence||'user')+'\n'+r.name+'\nSelection is linked between sequence and mapped structure coordinates.');
 if(!selection)detail('Chain evidence',r.analysisError||((r.analysis?.domains?.length?'Numbering: ANARCII '+r.analysis.engine?.versions?.anarcii+'; IMGT.\n':'Numbering not available.\n')+'Sequence digest: '+(r.analysis?.inputDigest||'not analyzed')+'\nClass, design history and specificity are not inferred from the variable sequence.'));
}
function drawDemoGuide(){
 const box=$('demoGuide'),steps=state?.demo?.steps;
 box.hidden=!steps?.length;box.replaceChildren();if(box.hidden)return;
 const index=Math.max(0,Math.min(steps.length-1,state.view.demoStep||0)),step=steps[index];
 const heading=make('div',undefined,'row');heading.append(make('span','Guided demo · '+(index+1)+' / '+steps.length,'eyebrow'),make('strong',step.title));
 const nav=make('div',undefined,'inline-controls');
 const back=button('Previous',()=>send('demoStep',{index:index-1}));back.disabled=index===0;
 const next=button(index===steps.length-1?'Restart tour':'Next observation',()=>send('demoStep',{index:(index+1)%steps.length}),'primary');
 nav.append(back,next);heading.append(nav);box.append(heading,make('p',step.description));
}
window.addEventListener('message',event=>{
 const m=event.data;
 if(m.type==='entitySaved'){const entity=state.entities?.find(e=>e.id===m.id);if(entity)editEntity(entity);}
 if(m.type==='importPreview'){
  const p=m.preview;$('importPreview').hidden=false;$('importPreview').dataset.previewId=m.id;
  $('importPreviewSummary').textContent=p.format.toUpperCase()+' · '+p.count+' records · choose column mapping before import';
  $('importPreviewTable').replaceChildren(tableView(p.headers,p.rows.map(r=>p.headers.map(h=>String(r[h]||'').slice(0,100)+(String(r[h]||'').length>100?'…':'')))));
  for(const [id,value] of [['previewName',p.nameColumn],['previewSequence',p.sequenceColumn]]){const select=$(id);select.replaceChildren();const blank=make('option','Choose column');blank.value='';select.append(blank);for(const h of p.headers){const o=make('option',h);o.value=h;select.append(o);}select.value=value;select.disabled=p.format==='fasta';}
 }
 if(m.type==='requestDemo')send('researchDemo');
 if(m.type==='project'){quality=m.quality||[];draw(m.project,m.selected,m.dirty);}
 if(m.type==='dirty')setDirty(m.dirty);
 if(m.type==='error'||m.type==='notice')notice(m.text,m.type==='error');
 if(m.type==='diagnostics'){$('runtimePanel').hidden=false;$('diagnostics').textContent=JSON.stringify(m.result,null,2);}
 if(m.type==='job'){$('job').textContent=m.label;$('cancel').hidden=m.status!=='running';$('job').classList.toggle('error',m.status==='failed');}
 if(m.type==='regionSearchResult')drawRegionSearch(m.result);
 if(m.type==='contacts')drawContacts(m.result);
 if(m.type==='comparison'&&m.recordId===selectedId){
  const grid=make('div',undefined,'alignment');m.result.columns.forEach((c,i)=>{const desc='Column '+(i+1)+' · reference input position '+(c.referencePosition??'gap')+' · selected input position '+(c.queryPosition??'gap');const b=button(c.reference+'\n'+(c.reference===c.query?'|':' ')+'\n'+c.query,()=>{if(c.queryPosition)regionSelect(c.queryPosition-1,c.queryPosition,'Alignment','computed',desc);else{selection=null;applySelection();} $('focus').textContent=desc;},'column'+(c.reference!==c.query?' difference':''));b.title=desc;grid.append(b);});
  $('comparison').replaceChildren(make('p','Global pairwise alignment · top: reference; bottom: selected · match +1, mismatch −1, gap −1','muted'),grid);
 }
 if(m.type==='numberedAlignment'){
  const a=m.result,grid=make('div',undefined,'msagrid');
  a.columns.forEach((c,i)=>{const col=make('div',undefined,'msacol');col.append(make('small',c.position+c.insertion));for(const row of a.rows){const r=row.residues[i];const b=button(r?.aa||'—',()=>{if(row.id===selectedId&&r)regionSelect(r.index0,r.index0+1,'IMGT '+c.position+c.insertion,'inferred');else send('select',{recordId:row.id});});b.title=row.name+(r?' · input '+(r.index0+1):' · gap');col.append(b);}const f=a.frequencies[i];const counts=button(f.entropy.toFixed(1),()=>detail('IMGT '+c.position+c.insertion+' · residue frequencies',Object.entries(f.counts).sort().map(([aa,n])=>aa+': '+n+' / '+f.n+' ('+(100*n/f.n).toFixed(1)+'%)').join('\n')+'\nMissing: '+f.missing+' / '+a.rows.length+'\nEntropy: '+f.entropy.toFixed(3)+' bits\n'+a.denominator+'\nPopulation: '+a.rows.map(r=>r.name+' ['+r.id+']').join('; ')));counts.title='Inspect counts, missing values and denominator';col.append(counts);grid.append(col);});
  $('numberedAlignment').replaceChildren(make('p','IMGT · '+a.denominator+' · last row: entropy (bits); click to inspect counts and missing values','muted'),make('p',a.rows.map(r=>r.name).join(' / '),'muted'),grid);
 }
});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='s'){event.preventDefault();send('save');}});
send('ready');
})();
