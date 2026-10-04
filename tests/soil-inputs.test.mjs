import test from 'node:test';
import assert from 'node:assert/strict';
import {SoilInputs as S} from '../src/soil-inputs.mjs';
import {Soil} from '../src/soil.mjs';
const near=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} ≠ ${b}`);

test('broad sand example preserves former SW-SC curve and classification',()=>{
  const p=S.generateCurve({fines:8,gravelShare:0,gradation:'broad'});
  const old=Soil.generateCurve({fines:8,gradation:'well'});
  old.forEach((v,i)=>{near(p[i].size,v.size);near(p[i].passing,v.passing);});
  assert.equal(Soil.classify({points:p,ll:32,pl:22}).symbol,'SW-SC');
});
test('independent mixture example: 20% fines and half coarse gravel produces 60% #4 passing',()=>{
  const p=S.generateCurve({fines:20,gravelShare:50,gradation:'broad'});
  near(p[0].passing,20);near(p.find(v=>v.size===4.75).passing,60);near(p.at(-1).passing,100);
  const a=Soil.analyzeCurve(p);near(a.fines,20);near(a.sand,40);near(a.gravel,40);
});
test('all synthetic modes preserve monotone curves and endpoints throughout mixture domain',()=>{
  for(const fines of [0,5,12,50,100])for(const gravelShare of [0,50,100])for(const gradation of ['broad','uniform','gap']){
    const p=S.generateCurve({fines,gravelShare,gradation});
    assert.equal(p[0].size,.075);assert.equal(p.at(-1).size,63);
    near(p[0].passing,fines);near(p.at(-1).passing,100);
    assert.ok(p.every((v,i)=>v.passing>=0&&v.passing<=100&&(i===0||v.passing>=p[i-1].passing)));
  }
});
test('gap has an explicit flat interval; no synthetic hydrometer point is fabricated',()=>{
  const p=S.generateCurve({fines:11,gravelShare:0,gradation:'gap'});
  near(p.find(v=>v.size===.3).passing,p.find(v=>v.size===1.18).passing);
  assert.ok(p.every(v=>v.size>=.075));assert.equal(Soil.analyzeCurve(p).d10,null);
});
test('synthetic generator rejects missing, infinite and out-of-domain values',()=>{
  for(const fines of [null,'',-1,101,Infinity,NaN])assert.throws(()=>S.generateCurve({fines}));
  for(const gravelShare of [null,-1,101,Infinity])assert.throws(()=>S.generateCurve({gravelShare}));
  assert.throws(()=>S.generateCurve({gradation:'well'}));
});
test('independent 500 g mass balance: 50/100/200/100/50 g yields 90/70/30/10%',()=>{
  const rows=[{size:19,mass:50},{size:4.75,mass:100},{size:.425,mass:200},{size:.075,mass:100},{size:null,mass:50}];
  const r=S.retainedToPassing(rows);assert.ok(r.valid);near(r.totalMass,500);
  assert.deepEqual(r.points,[{size:.075,passing:10},{size:.425,passing:30},{size:4.75,passing:70},{size:19,passing:90}]);
  assert.deepEqual(r.rows.map(v=>v.retainedPercent),[10,20,40,20,10]);
  near(r.rows.at(-1).cumulativeRetained,100);assert.equal(r.rows.at(-1).passing,null);near(r.panPercent,10);
});
test('mass units and scaling do not change passing percentages',()=>{
  const g=[{size:4.75,mass:200},{size:.075,mass:600},{size:null,mass:200}];
  const kg=g.map(v=>({...v,mass:v.mass/1000}));
  S.retainedToPassing(g).points.forEach((v,i)=>near(v.passing,S.retainedToPassing(kg).points[i].passing));
});
test('top retained fraction is preserved even when largest sieve passing is less than 100%',()=>{
  const p=[{size:.075,passing:10},{size:4.75,passing:70},{size:19,passing:90}];
  const r=S.passingToRetained(p,500);assert.ok(r.valid);
  assert.deepEqual(r.rows.map(v=>v.mass),[50,100,300,50]);
  assert.deepEqual(r.points,p);
});
test('inverse conversion round trip preserves every synthetic mode including all fines and all gravel',()=>{
  for(const fines of [0,8,50,100])for(const gravelShare of [0,50,100])for(const gradation of ['broad','uniform','gap']){
    const p=S.generateCurve({fines,gravelShare,gradation}),r=S.passingToRetained(p,750);
    assert.ok(r.valid);near(r.totalMass,750);p.forEach((v,i)=>near(r.points[i].passing,v.passing));
  }
});
test('zero, missing and negative masses are not silently converted into valid curves',()=>{
  for(const mass of [null,undefined,'',-1,NaN,Infinity])assert.equal(S.retainedToPassing([{size:.075,mass},{size:null,mass:1}]).valid,false);
  assert.equal(S.retainedToPassing([{size:.075,mass:0},{size:null,mass:0}]).valid,false);
  assert.equal(S.retainedToPassing([{size:.075,mass:Number.MAX_VALUE},{size:null,mass:Number.MAX_VALUE}]).valid,false);
});
test('pan required at end, ordered unique sieve openings required, no automatic sorting',()=>{
  for(const rows of [[],[{size:.075,mass:1}],[{size:4.75,mass:1},{size:.075,mass:1}],[{size:null,mass:1},{size:.075,mass:1}], [{size:.075,mass:1},{size:4.75,mass:1},{size:null,mass:1}],[{size:.075,mass:1},{size:.075,mass:1},{size:null,mass:1}],[{size:75,mass:1},{size:null,mass:1}]])assert.equal(S.retainedToPassing(rows).valid,false);
});
test('inverse rejects missing or decreasing passing, duplicate sizes and invalid total mass',()=>{
  for(const p of [[],[{size:.075,passing:null}],[{size:.075,passing:30},{size:4.75,passing:20}],[{size:.075,passing:10},{size:.075,passing:10}],[{size:.075,passing:101}]])assert.equal(S.passingToRetained(p).valid,false);
  for(const m of [0,-1,null,Infinity])assert.equal(S.passingToRetained([{size:.075,passing:10}],m).valid,false);
});
test('independent consistency example w35 LL50 PL20 gives PI30 LI0.5 Ic0.5',()=>{
  const r=S.consistency({w:35,ll:50,pl:20});assert.ok(r.valid);near(r.pi,30);near(r.li,.5);near(r.ic,.5);assert.equal(r.state,'plastic');
});
test('LI and Ic retain below-zero and above-one results and exact limit identities',()=>{
  const cases=[[10,-.5,1.5,'below-pl'],[20,0,1,'plastic-limit'],[30,.5,.5,'plastic'],[40,1,0,'liquid-limit'],[60,2,-1,'above-ll']];
  cases.forEach(([w,li,ic,state])=>{const r=S.consistency({w,ll:40,pl:20});near(r.li,li);near(r.ic,ic);near(r.li+r.ic,1);assert.equal(r.state,state);});
});
test('below PL does not infer solid or semi-solid without shrinkage limit',()=>{
  const r=S.consistency({w:5,ll:50,pl:25});assert.equal(r.stateLabel,'소성한계 이하');assert.ok(r.notes.some(n=>n.includes('SL')));
});
test('NP and zero PI never produce fabricated zero or infinite indices',()=>{
  const np=S.consistency({w:12,ll:null,pl:null,np:true});assert.ok(np.valid);assert.equal(np.status,'nonplastic');assert.equal(np.pi,null);assert.equal(np.li,null);assert.equal(np.ic,null);
  const zero=S.consistency({w:12,ll:20,pl:20});assert.ok(zero.valid);assert.equal(zero.pi,0);assert.equal(zero.status,'undefined');assert.equal(zero.li,null);assert.equal(zero.ic,null);
});
test('consistency does not cap water content or limits at 100%',()=>{
  const r=S.consistency({w:150,ll:200,pl:100});assert.ok(r.valid);near(r.li,.5);
});
test('consistency rejects nonphysical or missing inputs and does not coerce strings',()=>{
  const base={w:20,ll:50,pl:20};
  for(const edit of [{w:null},{w:-1},{w:Infinity},{ll:0},{ll:'50'},{pl:51},{pl:null},{pl:-1},{np:1}])assert.equal(S.consistency({...base,...edit}).valid,false);
});
test('input conversion functions do not mutate caller data',()=>{
  const p=S.generateCurve(),copy=structuredClone(p);S.passingToRetained(p,200);assert.deepEqual(p,copy);
  const rows=[{size:.075,mass:100},{size:null,mass:100}],before=structuredClone(rows);S.retainedToPassing(rows);assert.deepEqual(rows,before);
});
