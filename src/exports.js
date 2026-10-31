'use strict';
const crypto=require('node:crypto');
function csv(rows){
 const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))];
 const cell=value=>{if(value===null||value===undefined)return '""';let text=typeof value==='object'?JSON.stringify(value):String(value);if(typeof value==='string'&&/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
 return '\uFEFF'+[headers.map(cell).join(','),...rows.map(row=>headers.map(key=>cell(row[key])).join(','))].join('\r\n')+'\r\n';
}
function exportTable(project,kind){
 let rows;
 if(kind==='sequences')rows=project.records.map(r=>({sequence_id:r.id,name:r.name,sequence_sha256:crypto.createHash('sha256').update(r.sequence).digest('hex'),length:r.length,role:r.role||'unknown',construct:r.construct||'',status:r.analysis?.properties?.status||'not_calculated',molecular_weight_Da:r.analysis?.properties?.mw,pI:r.analysis?.properties?.pI,charge_e:r.analysis?.properties?.charge,GRAVY:r.analysis?.properties?.gravy,conditions:r.analysis?.properties?.conditions,method:r.analysis?.properties?.method,version:r.analysis?.properties?.version}));
 else if(kind==='measurements')rows=(project.observations||[]).map(x=>({observation_id:x.id,sequence_id:x.recordId,specimen_id:x.specimen_id,endpoint:x.endpoint,operator:x.operator,value:x.value,unit:x.unit,raw_value:x.rawValue,conditions:x.condition,source:x.source,evidence_kind:x.evidenceKind}));
 else if(kind==='surface')rows=(project.structures||[]).filter(s=>s.surfaceProfile).flatMap(s=>Object.entries(s.surfaceProfile.groups).map(([group,g])=>({structure_id:s.id,structure_name:s.name,source_sha256:s.digest,coordinate_input_sha256:s.surfaceProfile.inputDigest,protocol:s.surfaceProfile.protocol,model:s.surfaceProfile.modelId,chains:s.surfaceProfile.chains,group,residue_names:g.residueNames,exposed_area:g.exposedArea,surface_fraction:g.surfaceFraction,largest_patch_area:g.largestPatchArea,unit:s.surfaceProfile.unit,total_area:s.surfaceProfile.totalArea,parameters:s.surfaceProfile.parameters,sasa_method:s.surfaceProfile.sasa.method,sasa_version:s.surfaceProfile.sasa.version,interpretation:s.surfaceProfile.interpretation})));
 else throw new Error('Unknown table export.');
 if(!rows.length)throw new Error('No results are available for this table.');return csv(rows);
}
module.exports={csv,exportTable};
