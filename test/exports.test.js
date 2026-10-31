'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {csv,exportTable}=require('../src/exports');
const {newProject}=require('../src/project');
const {table}=require('../src/imports');
test('table export retains censoring, units, conditions and quotes; protects formula-like text',()=>{
 const p=newProject('>H\nEVQLV');p.observations=[{id:'a',recordId:p.records[0].id,specimen_id:'lot',endpoint:'KD',operator:'lt',value:1,unit:'nM',rawValue:'<1',condition:{buffer:'PBS, pH 7'},source:'=UNTRUSTED()',evidenceKind:'experimental'}];
 const result=table(exportTable(p,'measurements'),',').rows[0];assert.equal(result.operator,'lt');assert.equal(result.value,'1');assert.equal(result.unit,'nM');assert.equal(JSON.parse(result.conditions).buffer,'PBS, pH 7');assert.equal(result.source,"'=UNTRUSTED()");
 assert.match(csv([{number:-2,text:'line\n"quoted"'}]),/"-2"/);assert.throws(()=>exportTable(p,'surface'),/No results/);
});
