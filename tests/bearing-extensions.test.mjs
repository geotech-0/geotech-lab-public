import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {BearingExtensions as B} from '../src/bearing-extensions.mjs';
import {FoundationConditions as F} from '../src/foundation-conditions.mjs';
import {UndrainedBearing} from '../src/undrained-bearing.mjs';
import {Mechanics} from '../src/mechanics.mjs';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b} within ${t}`);
const valid=r=>{assert.equal(r.valid,true,r.errors?.join(';'));return r;};

test('published 30-degree bearing factors in independent USACE coefficient table',()=>{
 const m=valid(B.capacity({phi:30,method:'usace-meyerhof'})).factors;
 const v=valid(B.capacity({phi:30,method:'fhwa-vesic'})).factors;
 near(m.nc,30.14,.005);near(m.nq,18.40,.005);near(m.ng,15.67,.005);near(v.ng,22.40,.005);
 near(m.nc,v.nc);near(m.nq,v.nq);
});
test('2025 USACE Appendix B-3 dry footing published example, including both correction systems',()=>{
 const input={width:7*.3048,length:7*.3048,embedment:2*.3048,waterDepth:13*.3048,gamma:.135*157.087463,phi:34,cohesion:0,totalLoad:104.7*4.448221615};
 const [m,v]=valid(B.compare(input)).results;
 // Published hand calculation rounds each coefficient to 2 dp; allow 0.6% only for that rounding.
 near(m.ultimateEffective/47.88025898,32.15,32.15*.006);
 near(v.ultimateEffective/47.88025898,25.86,25.86*.006);
 near(m.factors.sq,1.35,.005);near(v.factors.sq,1.67,.005);
 near(m.factors.dq,1.05,.005);near(v.factors.dq,1.07,.005);
});
test('dry surface square Vesic case reproduces existing foundation lesson',()=>{
 const r=valid(B.capacity({width:2,length:2,embedment:0,waterDepth:10,phi:30,cohesion:10,gamma:18,method:'fhwa-vesic'}));
 const old=Mechanics.foundation({width:2,phi:30,cohesion:10,gamma:18,load:1000});
 assert.equal(old.valid,true);near(r.ultimateEffective,old.ultimateGross,1e-8);
});
test('source correction systems remain complete, not Nγ substitutions',()=>{
 const [m,v]=valid(B.compare({width:2,length:4,embedment:1,phi:30,cohesion:5})).results;
 near(m.factors.sc,1.3);near(m.factors.sq,1.15);near(m.factors.sg,1.15);
 near(m.factors.dc,1+.1*Math.sqrt(3));near(m.factors.dg,1+.05*Math.sqrt(3));
 near(v.factors.sg,.8);near(v.factors.dc,1);near(v.factors.dg,1);
 assert.notEqual(m.factors.sq,v.factors.sq);assert.notEqual(m.terms.cohesion,v.terms.cohesion);
});
test('source groundwater endpoint and interpolation use physical B',()=>{
 const base={width:4,length:5,embedment:1,eccentricityRatio:.1,gamma:20};
 const m=valid(B.capacity({...base,waterDepth:1,method:'usace-meyerhof'}));near(m.groundwaterFactor,.45);
 const mm=valid(B.capacity({...base,waterDepth:3,method:'usace-meyerhof'}));near(mm.groundwaterFactor,.725);
 const md=valid(B.capacity({...base,waterDepth:5,method:'usace-meyerhof'}));near(md.groundwaterFactor,1);
 const v=valid(B.capacity({...base,waterDepth:0,method:'fhwa-vesic'}));near(v.groundwaterFactor,.5);
 const vmid=valid(B.capacity({...base,waterDepth:3.5,method:'fhwa-vesic'}));near(vmid.groundwaterFactor,.75);
 const vd=valid(B.capacity({...base,waterDepth:7,method:'fhwa-vesic'}));near(vd.groundwaterFactor,1);
});
test('above-base water affects overburden and applied load once on full base area',()=>{
 const r=valid(B.capacity({width:3,length:4,embedment:1,waterDepth:.5,gamma:20,totalLoad:1200,eccentricityRatio:.1}));
 near(r.baseWaterPressure,4.905);near(r.originalEffective,15.095);near(r.uplift,58.86);
 near(r.effectiveLoad,1141.14);near(r.effectiveArea,9.6);near(r.demandEffective,118.86875);
 near(r.grossTotalFullArea-r.originalTotal,r.grossEffectiveFullArea-r.originalEffective);
 near(r.ultimateEffective-r.demandEffective,r.ultimateNet-r.demandNet);
 assert.notEqual(r.demandNet,r.netIncrementFullArea);
});
test('root force ledger connects actual layered unit weights without double deduction',()=>{
 const ledger=valid(F.ledger({width:3,length:4,embedment:1,waterDepth:.5,thickness:.3,columnLoad:1200,gammaSoil:18,gammaSat:20}));
 const r=valid(B.fromLedger(ledger,{gamma:20,phi:30,cohesion:0,eccentricityRatio:0,method:'fhwa-vesic'}));
 near(r.originalTotal,19);near(r.originalEffective,ledger.originalEffective);
 near(r.totalLoad,ledger.downwardLoad);near(r.effectiveLoad,ledger.effectiveLoad);
 near(r.demandEffective,ledger.grossEffective);near(r.demandNet,ledger.netIncrement);
 assert.equal(B.fromLedger(ledger,{}).valid,false);
});
test('eccentric load changes effective area, not physical area of uplift',()=>{
 const a=valid(B.capacity({embedment:1,waterDepth:0,eccentricityRatio:0}));
 const b=valid(B.capacity({embedment:1,waterDepth:0,eccentricityRatio:.2}));
 near(b.effectiveWidth,.6*a.width);near(b.effectiveArea,.6*a.area);near(b.uplift,a.uplift);
 near(b.demandEffective,a.demandEffective/.6);near(b.moment,b.effectiveLoad*.2*b.width);
 assert.ok(b.ultimateLoad<a.ultimateLoad);
});
test('opposite eccentricities give equal capacity and opposite moment',()=>{
 const a=valid(B.capacity({eccentricityRatio:.2})),b=valid(B.capacity({eccentricityRatio:-.2}));
 near(a.ultimateLoad,b.ultimateLoad);near(a.demandEffective,b.demandEffective);near(a.moment,-b.moment);
});
test('effective area equivalent pressure is distinct from maximum contact pressure',()=>{
 const r=valid(B.capacity({width:3,length:4,embedment:0,waterDepth:0,totalLoad:1200,eccentricityRatio:.2}));
 const c=valid(F.contact({width:3,length:4,load:1200,eccentricityRatio:.2}));
 near(r.demandEffective,c.equivalentPressure);assert.notEqual(r.demandEffective,c.qMax);
 assert.notEqual(r.effectiveWidth,c.contactWidth);
});
test('surface removes surcharge and all depth enhancements',()=>{
 for(const method of B.METHODS){const r=valid(B.capacity({embedment:0,method}));near(r.terms.surcharge,0);for(const k of ['dc','dq','dg'])near(r.factors[k],1);}
});
test('wider surface sand footing gives q proportional to B and Q proportional to B cubed at fixed aspect ratio',()=>{
 for(const method of B.METHODS){const a=valid(B.capacity({width:2,length:4,embedment:0,cohesion:0,waterDepth:100,method})),b=valid(B.capacity({width:4,length:8,embedment:0,cohesion:0,waterDepth:100,method}));near(b.ultimateEffective,2*a.ultimateEffective);near(b.ultimateLoad,8*a.ultimateLoad);}
});
test('cohesion term linearity and stronger friction response at fixed water/geometry',()=>{
 for(const method of B.METHODS){const a=valid(B.capacity({cohesion:10,method})),b=valid(B.capacity({cohesion:20,method})),c=valid(B.capacity({cohesion:10,phi:35,method}));near(b.terms.cohesion,2*a.terms.cohesion);near(b.terms.surcharge,a.terms.surcharge);near(b.terms.weight,a.terms.weight);assert.ok(c.ultimateEffective>a.ultimateEffective);}
});
test('zero c at surface leaves weight term, without fabricated resistance',()=>{
 const r=valid(B.capacity({cohesion:0,embedment:0}));near(r.terms.cohesion,0);near(r.terms.surcharge,0);near(r.ultimateEffective,r.terms.weight);
});
test('unsupported or nonphysical conditions fail explicitly without clamping',()=>{
 for(const input of [null,[],3,{width:0},{width:5,length:4},{phi:0},{phi:9},{phi:46},{embedment:-1},{waterDepth:-1},{cohesion:-1},{gamma:9.81},{gammaW:0},{totalLoad:0},{eccentricityRatio:.5},{eccentricityRatio:-.5},{width:2,length:3,embedment:1.1,eccentricityRatio:.25},{method:'Vesic'},{method:0},{phi:'30'},{width:NaN},{totalLoad:Infinity},{originalTotal:NaN},{originalTotal:-1},{originalTotal:0,waterDepth:0},{waterDepth:0,totalLoad:1},{width:1e200,length:1e200}])assert.equal(B.capacity(input).valid,false,JSON.stringify(input));
});
test('valid shallow-depth boundary is included, just beyond is rejected',()=>{
 assert.equal(B.capacity({width:2,length:3,embedment:1,eccentricityRatio:.25}).valid,true);
 assert.equal(B.capacity({width:2,length:3,embedment:1.000001,eccentricityRatio:.25}).valid,false);
});
test('contribution sum and force-pressure equivalence across a parameter grid',()=>{
 let count=0;
 for(const width of [1,3,6])for(const ratio of [1,2])for(const phi of [10,30,45])for(const waterDepth of [0,1,20])for(const eccentricityRatio of [0,.2])for(const method of B.METHODS){const r=valid(B.capacity({width,length:width*ratio,embedment:.3*width,phi,waterDepth,eccentricityRatio,method,totalLoad:10000}));near(r.ultimateEffective,Object.values(r.terms).reduce((a,b)=>a+b,0),1e-8);near(r.ultimateLoad/r.effectiveArea,r.ultimateEffective,1e-8);assert.ok(r.ultimateEffective>=0);assert.ok(r.groundwaterFactor<=1);count++;}
 assert.equal(count,216);
});
test('descriptor has a discoverable group, coherent questions, and defined fields',()=>{
 const context=vm.createContext({BearingExtensions:B,UndrainedBearing});
 vm.runInContext(fs.readFileSync(new URL('../src/labs/bearing-extension-labs.js',import.meta.url),'utf8')+';globalThis.labs=BearingExtensionLabs;',context);
 const lab=context.labs[0];assert.equal(lab.meta.navGroup,'foundations');
 for(const [q] of lab.meta.questions){const r=valid(lab.compute({...lab.defaults},q));if(q!=='undrained')assert.equal(r.comparison.length,2);for(const key of lab.activeFields(lab.defaults,q))assert.ok(key in lab.defaults);}
});
