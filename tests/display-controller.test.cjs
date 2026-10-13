'use strict';
const assert = require('node:assert/strict');
const portable = require('../dist/portable-project.js');
const {createController} = require('../companion/display-controller.cjs');
let checks = 0;
const check = (name, fn) => { fn(); checks++; };
const project = {
  format:portable.FORMAT, schemaVersion:1, nxVersion:'2606',
  workspaces:{modeling:portable.layers.map((layer,index) => ({
    label:layer, key:(layer === 'none' ? '' : layer.split('+').map(x=>({ctrl:'Ctrl',alt:'Alt',shift:'Shift'})[x]).join('+')+'+')+'F1',
    kind:'builtin',commandId:'TEST_'+index
  })),sketch:[{label:'Local toggle',key:'R',kind:'journal',commandId:null,slot:'journal-1'}]},
  tabs:{ribbon:{},side:{}},overlay:{...portable.defaults}
};
const sample = (at, options={}) => ({at, foreground:{verifiedNx:true,minimized:false},
  modifiers:{ctrl:false,alt:false,shift:false}, workspace:'modeling',paused:false,...options});
const immediate = () => createController({...project,overlay:{...project.overlay,showDelayMs:0}});

check('initial hidden',()=>assert.equal(createController(project).snapshot().status,'hidden'));
check('show boundary',()=>{
  const c=createController(project);
  assert.equal(c.step(sample(10)).status,'waiting');
  assert.equal(c.step(sample(129)).status,'waiting');
  assert.equal(c.step(sample(130)).status,'visible');
  assert.equal(c.step(sample(140)).showAt,130);
});
for (const layer of portable.layers) check('exact '+layer,()=>{
  const c=immediate(),modifiers=Object.fromEntries(['ctrl','alt','shift'].map(x=>[x,layer.split('+').includes(x)]));
  const state=c.step(sample(0,{modifiers}));
  assert.equal(state.status,'visible');assert.equal(state.layer,layer);
  assert.equal(state.rows.length,1);assert.equal(state.rows[0].label,layer);
});
check('changed layer clears rows and resets delay',()=>{
  const c=createController(project);c.step(sample(0));c.step(sample(120));
  const changed=c.step(sample(130,{modifiers:{ctrl:false,alt:false,shift:true}}));
  assert.equal(changed.status,'waiting');assert.deepEqual(changed.rows,[]);assert.equal(changed.showAt,250);
  assert.equal(c.step(sample(249,{modifiers:{ctrl:false,alt:false,shift:true}})).status,'waiting');
  assert.equal(c.step(sample(250,{modifiers:{ctrl:false,alt:false,shift:true}})).rows[0].label,'shift');
});
for (const [reason,options] of [
  ['paused',{paused:true}],
  ['not-nx-foreground',{foreground:{verifiedNx:false,minimized:false}}],
  ['nx-minimized',{foreground:{verifiedNx:true,minimized:true}}]
]) check('immediate safety hide '+reason,()=>{
  const c=createController(project);c.step(sample(0));c.step(sample(120));
  const state=c.step(sample(121,options));assert.equal(state.reason,reason);assert.deepEqual(state.rows,[]);
  assert.equal(state.status,'hidden');assert.equal(c.step(sample(122)).showAt,242);
});
check('pending display cancelled on focus loss',()=>{
  const c=createController(project);c.step(sample(0));c.step(sample(50,{foreground:{verifiedNx:false,minimized:false}}));
  assert.equal(c.step(sample(120)).status,'waiting');assert.equal(c.step(sample(240)).status,'visible');
});
check('workspace isolation and unresolved journal',()=>{
  const c=immediate(),state=c.step(sample(0,{workspace:'sketch'}));
  assert.equal(state.rows.length,1);assert.equal(state.rows[0].key,'R');assert.equal(state.rows[0].unresolved,true);
  assert.equal(state.rows[0].commandId,null);
  assert.equal(c.step(sample(1,{workspace:'sketch',modifiers:{ctrl:true,alt:false,shift:false}})).reason,'no-bindings');
});
check('workspace change delay',()=>{
  const c=createController(project);c.step(sample(0));c.step(sample(120));
  assert.equal(c.step(sample(121,{workspace:'sketch'})).status,'waiting');
  assert.equal(c.step(sample(241,{workspace:'sketch'})).rows[0].kind,'journal');
});
check('zero delay',()=>assert.equal(immediate().step(sample(0)).status,'visible'));
check('maximum delay',()=>{
  const c=createController({...project,overlay:{...project.overlay,showDelayMs:1000}});
  assert.equal(c.step(sample(0)).status,'waiting');assert.equal(c.step(sample(999)).status,'waiting');
  assert.equal(c.step(sample(1000)).status,'visible');
});
check('backward clock cancels',()=>{
  const c=createController(project);c.step(sample(200));
  assert.equal(c.step(sample(100)).reason,'clock-reversed');
  assert.equal(c.step(sample(101)).showAt,221);
});
for (const invalid of [null,{},sample(-1),sample(NaN),sample(Infinity),sample(0,{workspace:'unknown'}),
  sample(0,{paused:1}),sample(0,{foreground:{verifiedNx:true}}),
  sample(0,{modifiers:{ctrl:false,alt:false,shift:1}}),{...sample(0),ordinaryKey:'A'}
]) check('invalid observation hides',()=>{
  const c=immediate();c.step(sample(0));const state=c.step(invalid);
  assert.equal(state.status,'hidden');assert.equal(state.reason,'invalid-observation');assert.deepEqual(state.rows,[]);
});
check('invalid creation rejected',()=>assert.throws(()=>createController({...project,schemaVersion:99})));
check('invalid replacement fails closed until valid reload',()=>{
  const c=immediate();c.step(sample(0));assert.equal(c.replaceProject({}).reason,'invalid-project');
  assert.equal(c.step(sample(1)).status,'hidden');
  c.replaceProject(project);assert.equal(c.step(sample(2)).status,'waiting');
});
check('valid replacement resets delay and rows',()=>{
  const c=createController(project);c.step(sample(0));c.step(sample(120));
  const replacement=structuredClone(project);replacement.workspaces.modeling[0].label='Replacement';
  assert.equal(c.replaceProject(replacement).status,'hidden');assert.equal(c.step(sample(121)).status,'waiting');
  assert.equal(c.step(sample(241)).rows[0].label,'Replacement');
});
check('caller project cannot mutate controller',()=>{
  const value=structuredClone(project),c=createController(value);value.workspaces.modeling[0].label='Tampered';
  c.step(sample(0));assert.equal(c.step(sample(120)).rows[0].label,'none');
});
check('returned state cannot mutate controller',()=>{
  const c=immediate(),state=c.step(sample(0));state.rows[0].label='Tampered';state.status='hidden';
  assert.equal(c.snapshot().rows[0].label,'none');assert.equal(c.snapshot().status,'visible');
});
check('no keys supplied',()=>{
  const c=createController({...project,workspaces:{modeling:[],sketch:[]}});
  assert.equal(c.step(sample(0)).reason,'no-bindings');
});
console.log('PASS: '+checks+' pure companion display-controller checks; no desktop input or OS observer.');
