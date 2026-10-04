import test from 'node:test';
import assert from 'node:assert/strict';
import {ExcavationPlanar as P} from '../src/excavation-planar.mjs';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const support=(type='corner')=>({id:'tier-1',type,z:2,stiffness:100000,length:8,preload:0,angle:0,spacing:2});
const input=(s=support())=>({supports:[s],plan:{...P.defaults},observation:{wallId:'A',position:.5}});
function evaluate(d,displacement,s=d.supports){const p=P.prepare(d);return P.evaluate({input:d,activeSupports:s,uByStrip:p.strips.map(t=>({id:t.id,uAt:()=>typeof displacement==='function'?displacement(t):displacement}))});}

test('axial support projection, tributary spacing and installation reference match hand calculation',()=>{
  const s={...support('anchor'),angle:60,preload:20,referenceByStrip:[{id:'A:0',displacementAtZ:.01}]},d=input(s),r=evaluate(d,.012);
  assert.ok(r.valid);near(r.supportForces[0].force,120);near(r.forces[0].force,30);near(r.tangent[0].k,12500);
  const slack=evaluate(d,0);near(slack.forces[0].force,0);assert.equal(slack.supportForces[0].slack,true);
});
test('bond and raker footing flexibility act in series and do not change strength parameters',()=>{
  const a=input({...support('nail'),bondStiffness:100000}),b=input({...support('raker'),baseStiffness:100000});
  near(evaluate(a,.002).supportForces[0].force,100);near(evaluate(b,.002).supportForces[0].force,100);
  const cap=input({...support('rock'),capacity:40});const r=evaluate(cap,.002);near(r.supportForces[0].force,40);assert.equal(r.supportForces[0].capped,true);assert.equal(r.tangent.length,0);
});
test('symmetric struts use actual span and number along the observed wall',()=>{
  const d=input(support('strut')),r=evaluate(d,.001);
  near(r.forces[0].force,2*100000*8/14*.001/2);
  d.observation.wallId='B';const b=evaluate(d,.001);near(b.forces[0].force,2*100000*8/20*.001/2);
  d.supports[0].angle=30;assert.equal(P.prepare(d).valid,false);
});
test('corner members have actual endpoints, lengths and per-corner counts',()=>{
  const d=input();d.plan.corners=[0,2];d.plan.membersPerCorner=2;
  const g=P.geometry(d);assert.equal(g.members.length,4);near(g.members[0].length,Math.sqrt(8));near(g.members[0].axialStiffness,800000/Math.sqrt(8));
  assert.equal(g.members[0].a.wallId,'A');assert.equal(g.members[0].b.wallId,'D');assert.equal(g.strips.length,12);near(g.strips.filter(t=>t.wallId==='A').reduce((v,t)=>v+t.width,0),20);
  d.plan.offset=8;assert.equal(P.validate(d).valid,false);
});
test('inactive corner drafts do not block other support types or an unsupported wall',()=>{
  for(const type of ['anchor','nail','rock','raker','strut',null]){
    const d=input();d.supports=type?[support(type)]:[];
    d.plan.corners=[];d.plan.offset=0;d.plan.spacing=0;d.plan.membersPerCorner=0;
    assert.equal(P.prepare(d).valid,true,type||'unsupported');assert.equal(evaluate(d,0).valid,true);
    d.supports=[support('corner')];assert.equal(P.prepare(d).valid,false);
  }
  for(const corners of [null,[0,0],[4]]){const d=input(support('anchor'));d.plan.corners=corners;assert.equal(P.validate(d).valid,false);}
});
test('condensed corner frame is zero at its installation reference and couples adjacent walls',()=>{
  const d=input(),zero=evaluate(d,0);assert.ok(zero.valid);zero.forces.forEach(f=>near(f.force,0));
  const a=evaluate(d,t=>t.wallId==='A'?.001:0);assert.ok(a.valid);assert.ok(a.forces.filter(f=>f.stripId.startsWith('D')).some(f=>Math.abs(f.force)>.1));
  assert.ok(Math.abs(a.forces.find(f=>f.stripId==='A:0').force-a.forces.find(f=>f.stripId==='A:1').force)>1);
});
test('frame boundary forces match axial member force components on each wall',()=>{
  const d=input(),r=evaluate(d,.001),g=P.geometry(d);assert.ok(r.valid);
  for(const wall of g.walls){const expected=r.supportForces[0].members.reduce((sum,m)=>{if(m.a.wallId!==wall.id&&m.b.wallId!==wall.id)return sum;const sign=m.a.wallId===wall.id?1:-1;return sum+m.force*sign*((m.b.x-m.a.x)*wall.normal.x+(m.b.y-m.a.y)*wall.normal.y)/m.length;},0);const actual=r.forces.filter(f=>f.stripId.startsWith(wall.id+':')).reduce((v,f)=>v+f.force,0);near(actual,expected,2e-5);}
});
test('condensed tangent is symmetric and matches numerical differentiation',()=>{
  const d=input(),r=evaluate(d,.001),eps=1e-7,perturbed=evaluate(d,t=>.001+(t.id==='A:0'?eps:0));assert.ok(r.valid&&perturbed.valid);
  for(const f of r.forces){const k=r.tangent.find(t=>t.aStripId===f.stripId&&t.bStripId==='A:0')?.k||0;const measured=(perturbed.forces.find(t=>t.stripId===f.stripId).force-f.force)/eps;near(k,measured,1e-3);}
  for(const t of r.tangent){const other=r.tangent.find(v=>v.aStripId===t.bStripId&&v.bStripId===t.aStripId);near(t.k,other?.k||0,1e-6);}
});
test('same number of corners with different offsets or waler EI changes spatial reactions',()=>{
  const d=input(),r=evaluate(d,.001),e=input();e.plan.offset=3;const shifted=evaluate(e,.001);assert.ok(shifted.valid);assert.ok(Math.abs(r.forces[0].force-shifted.forces[0].force)>1);
  const f=input();f.plan.walerEI*=10;const stiff=evaluate(f,.001);assert.ok(stiff.valid);assert.ok(Math.abs(r.forces[0].force-stiff.forces[0].force)>1);
});
test('force-controlled tension and locking preserve waler prestress and exact member preload',()=>{
  const s={...support(),preload:40,forceControlled:true},d=input(s),movement=t=>t.wallId==='A'?.001*(1+t.position):.0002;
  const loaded=evaluate(d,movement);assert.ok(loaded.valid);loaded.supportForces[0].members.forEach(m=>near(m.force,40));
  const locked={...s,forceControlled:false,planarLock:loaded.supportForces[0].lock,referenceByStrip:P.prepare(d).strips.map(t=>({id:t.id,displacementAtZ:movement(t)}))};
  const result=evaluate(d,movement,[locked]);assert.ok(result.valid);result.forces.forEach((f,i)=>near(f.force,loaded.forces[i].force,1e-5));result.supportForces[0].members.forEach(m=>near(m.force,40));
});
test('an impossible prescribed preload is rejected instead of clipping only its displayed force',()=>{
  const d=input({...support(),preload:100,capacity:10,forceControlled:true});
  const r=evaluate(d,.001);assert.equal(r.valid,false);assert.match(r.errors.join(' '),/초기작용력/);assert.equal(r.forces.length,0);
});
