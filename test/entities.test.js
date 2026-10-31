'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {newProject,validateProject}=require('../src/project');
const {upsertEntity}=require('../src/entities');
test('construct chain copies and specimens retain separate identities despite equal sequence and names',()=>{
 const p=newProject('>H\nEVQLV');const sequenceId=p.records[0].id;
 p.entities=upsertEntity(p,{id:'construct',kind:'construct',name:'Molecule',members:[{copyId:'H1',sequenceId},{copyId:'H2',sequenceId}]});
 p.entities=upsertEntity(p,{id:'lot-a',kind:'specimen',name:'Same name',constructId:'construct',lot:'A',conditions:'pH 6'});
 p.entities=upsertEntity(p,{id:'lot-b',kind:'specimen',name:'Same name',constructId:'construct',lot:'B',conditions:'pH 7'});
 const saved=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(saved.entities.length,3);assert.equal(saved.entities[0].members.length,2);
 const created=saved.entities[1].createdAt;saved.entities=upsertEntity(saved,{...saved.entities[1],conditions:'pH 6, 4 C'});
 assert.equal(saved.entities.length,3);assert.equal(saved.entities.at(-1).createdAt,created);assert.equal(saved.entities.find(e=>e.id==='lot-b').conditions,'pH 7');
});
test('entity references reject missing constructs, missing sequences and duplicate copy IDs',()=>{
 const p=newProject('>H\nEVQLV'),sequenceId=p.records[0].id;
 assert.throws(()=>upsertEntity(p,{kind:'specimen',name:'Lot',constructId:'unknown'}),/construct/);
 assert.throws(()=>upsertEntity(p,{kind:'construct',name:'Pair',members:[{copyId:'copy',sequenceId},{copyId:'copy',sequenceId}]}),/chain-copy/);
 assert.throws(()=>upsertEntity(p,{kind:'construct',name:'Pair',members:[{copyId:'copy',sequenceId:'missing'}]}),/chain-copy/);
});
