import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {UndrainedBearing as U} from '../src/undrained-bearing.mjs';
import {BearingExtensions as B} from '../src/bearing-extensions.mjs';
import {BearingGeometry as G} from '../src/bearing-geometry.mjs';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const valid=r=>{assert.equal(r.valid,true,r.errors?.join('; '));return r;};
const context=vm.createContext({UndrainedBearing:U,BearingExtensions:B,BearingGeometry:G});
const lab=vm.runInContext(fs.readFileSync(new URL('../src/labs/bearing-extension-labs.js',import.meta.url),'utf8')+';BearingExtensionLabs[0]',context);

test('published phi=0 row and square shape factor produce the independent hand example',()=>{
 const r=valid(U.capacity({width:3,totalLoad:1200,su:50}));
 near(r.nc,5.14,.002);near(r.sc,1.2);near(r.ultimateNet,308.4,.1); // Manual factors rounded to 5.14.
 near(r.ultimateNet,308.4955592154,1e-8);near(r.ultimateLoad,2776.460032939,1e-7);
 near(r.area,9);near(r.pressure,400/3);assert.equal(r.state,'below');
});
test('doubling square width keeps pressure resistance and quadruples force resistance',()=>{
 const a=valid(U.capacity({width:2,totalLoad:1000,su:40})),b=valid(U.capacity({width:4,totalLoad:1000,su:40}));
 near(b.ultimateNet,a.ultimateNet);near(b.ultimateLoad,4*a.ultimateLoad);near(b.pressure,a.pressure/4);near(b.ratio,4*a.ratio);
});
test('strength changes resistance only; load changes demand only',()=>{
 const a=valid(U.capacity()),s=valid(U.capacity({su:100})),w=valid(U.capacity({totalLoad:2400}));
 near(s.ultimateNet,2*a.ultimateNet);near(s.ultimateLoad,2*a.ultimateLoad);near(s.pressure,a.pressure);
 near(w.pressure,2*a.pressure);near(w.ultimateLoad,a.ultimateLoad);near(w.ultimateNet,a.ultimateNet);
});
test('surface total and net pressures coincide and no weight resistance is added',()=>{
 const r=valid(U.capacity({width:5,totalLoad:2000,su:25}));near(r.ultimateGross,r.ultimateNet);near(r.overburden,0);near(r.ngamma,0);near(r.nq,1);near(r.ultimateNet,r.stripUltimate*1.2);
});
test('pressure and force comparisons agree across the supported UI grid',()=>{
 for(const width of [1,3,8])for(const totalLoad of [10,1200,10000])for(const su of [0,50,150]){
  const r=valid(U.capacity({width,totalLoad,su}));near(r.pressure*r.area,totalLoad,1e-8);near(r.ultimateGross*r.area,r.ultimateLoad,1e-8);near(r.pressureMargin*r.area,r.loadMargin,1e-8);near(r.ratio,r.ultimateLoad/totalLoad,1e-8);
 }
});
test('load at resistance, zero strength, and zero load are explicit distinct states',()=>{
 const a=valid(U.capacity());assert.equal(valid(U.capacity({totalLoad:a.ultimateLoad})).state,'equal');
 assert.equal(valid(U.capacity({totalLoad:a.ultimateLoad*1.01})).state,'above');
 const zero=valid(U.capacity({su:0}));near(zero.ultimateLoad,0);near(zero.ratio,0);assert.equal(zero.state,'above');
 const unloaded=valid(U.capacity({totalLoad:0}));near(unloaded.pressure,0);assert.equal(unloaded.ratio,null);assert.equal(unloaded.state,'no-demand');
});
test('bad numbers and unsupported geometry are rejected without clamping',()=>{
 for(const input of [null,[],0,{width:0},{width:-1},{su:-1},{su:null},{su:'50'},{totalLoad:-1},{totalLoad:Infinity},{width:NaN},{width:1e200},{width:1e-200},{embedment:1},{length:4},{phi:0},{cohesion:50},{waterDepth:0},{eccentricityRatio:0}])assert.equal(U.capacity(input).valid,false,JSON.stringify(input));
 assert.equal(U.capacity({width:4,length:4,embedment:0}).valid,true);
});
test('the third question uses su and ignores all inactive drained conditions',()=>{
 assert.ok(lab.meta.questions.some(([q])=>q==='undrained'));
 assert.deepEqual(Array.from(lab.activeFields(lab.defaults,'undrained')),['width','totalLoad','su']);
 const d={width:3,totalLoad:1200,su:50};
 for(const k of ['length','embedment','phi','cohesion','gamma','waterDepth','eccentricityRatio','method'])Object.defineProperty(d,k,{get(){throw Error('inactive read '+k);}});
 const r=valid(lab.compute(d,'undrained'));near(r.ultimateNet,308.4955592154,1e-8);assert.equal(r.length,r.width);
});
test('inactive su errors do not change either drained question',()=>{
 for(const q of ['conditions','theories']){
  const a=valid(lab.compute({...lab.defaults},q)),b=valid(lab.compute({...lab.defaults,su:NaN},q));
  near(b.ultimateEffective,a.ultimateEffective);assert.equal(b.comparison.length,2);assert.ok(!lab.activeFields(lab.defaults,q).includes('su'));
 }
});
test('phi-u zero mechanism has 45-degree wedges and circular fan, separate from square coefficient',()=>{
 const g=valid(G.prandtl({width:3,phi:0}));near(g.angles.active,45);near(g.angles.passive,45);near(g.metrics.totalWidth,9);near(g.metrics.maxDepth,3/Math.sqrt(2));
 for(const p of g.spirals.right)near(Math.hypot(p.x-1.5,p.y),3/Math.sqrt(2));
 const r=valid(U.capacity({width:3,su:50}));near(r.stripUltimate,257.0796326795,1e-8);assert.notEqual(r.stripUltimate,r.ultimateNet);
});
