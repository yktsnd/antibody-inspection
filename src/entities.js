'use strict';
const crypto=require('node:crypto');
const kinds=new Set(['construct','specimen','antigen','source']);
function validateEntities(project){
 const entities=project.entities||[];if(!Array.isArray(entities)||entities.length>10000)throw new Error('Invalid entity registry.');
 const ids=new Map(),sequenceIds=new Set(project.records.map(r=>r.id));
 for(const e of entities){if(!e||!kinds.has(e.kind)||typeof e.id!=='string'||!e.id||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim())throw new Error('Entities require distinct IDs, a type and a name.');ids.set(e.id,e);}
 for(const e of entities){
  if(e.sourceId&&ids.get(e.sourceId)?.kind!=='source')throw new Error('Source link must identify a source entity.');
  if(e.kind==='specimen'&&ids.get(e.constructId)?.kind!=='construct')throw new Error('A specimen must link to an explicit construct.');
  if(e.kind==='construct'){
   if(!Array.isArray(e.members)||!e.members.length)throw new Error('A construct needs at least one explicit chain copy.');
   const copies=new Set();for(const member of e.members){if(!sequenceIds.has(member.sequenceId)||typeof member.copyId!=='string'||!member.copyId||copies.has(member.copyId))throw new Error('Invalid construct chain-copy reference.');copies.add(member.copyId);}
  }
  if(e.kind==='antigen'&&(e.sequenceIds||[]).some(id=>!sequenceIds.has(id)))throw new Error('Antigen sequence reference is missing.');
  for(const key of ['species','modifications','format','lot','conditions','uri','citation','license'])if(e[key]!==undefined&&(typeof e[key]!=='string'||e[key].length>20000))throw new Error('Invalid entity field: '+key);
 }
 return entities;
}
function upsertEntity(project,input){
 const e=structuredClone(input);e.id=e.id||crypto.randomUUID();e.evidenceKind='user';
 const prior=(project.entities||[]).find(x=>x.id===e.id);if(prior&&prior.kind!==e.kind)throw new Error('An existing entity ID cannot change its type.');
 e.createdAt=prior?.createdAt||new Date().toISOString();e.updatedAt=new Date().toISOString();
 const entities=[...(project.entities||[]).filter(x=>x.id!==e.id),e];validateEntities({...project,entities});return entities;
}
module.exports={validateEntities,upsertEntity};
