import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Investigation as I} from '../src/investigation.mjs';
const spt={basis:'raw',reading:20,energyRatio:75,boreholeFactor:1,rodFactor:.9,samplerFactor:1,effectiveOverburden:2*I.KPA_PER_TSF};
const cpt={basis:'qc',tipResistanceMPa:1,u2:200,areaRatio:.8,totalOverburden:200,nkt:14,nktMin:10,nktMax:18};
const close=(actual,expected,tol=1e-10)=>assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
const bad=fn=>assert.equal(fn().valid,false);
test('independent SPT hand case: N20, ER75%, CR0.9, p0=2 tsf',()=>{
 const r=I.spt(spt);assert.equal(r.valid,true);close(r.energyOnly,25);close(r.n60,22.5);close(r.cn,.77);close(r.n160,17.325);
});
test('SPT all procedural factors enter once',()=>{
 const r=I.spt({...spt,reading:10,energyRatio:60,boreholeFactor:1.1,rodFactor:.8,samplerFactor:1.2});
 close(r.energyOnly,10);close(r.proceduralFactor,1.056);close(r.n60,10.56);
});
test('fixed measured N: energy doubles N60 and normalized value',()=>{
 const a=I.spt({...spt,energyRatio:40}),b=I.spt({...spt,energyRatio:80});close(b.n60,2*a.n60);close(b.n160,2*a.n160);
});
test('same N60: tenfold overburden reduces uncapped CN by 0.77, not N60',()=>{
 const a=I.spt({...spt,effectiveOverburden:.2*I.KPA_PER_TSF}),b=I.spt(spt);close(a.cn,1.54);close(a.cn-b.cn,.77);close(a.n60,b.n60);
});
test('source cap is explicit, with units converted before applying CN',()=>{
 const r=I.spt({...spt,effectiveOverburden:.01*I.KPA_PER_TSF});assert.equal(r.cnCapped,true);close(r.cn,2);close(r.cnUncapped,.77*Math.log10(2000));close(r.n160,45);
 const p=I.overburdenFactor(I.KPA_PER_TSF);close(p.factor,1.0017930966612653);assert.notEqual(p.factor,1);
});
test('N60 basis never reads or re-applies inactive corrections',()=>{
 const data={basis:'n60',reading:22.5,effectiveOverburden:spt.effectiveOverburden};
 for(const key of ['energyRatio','boreholeFactor','rodFactor','samplerFactor'])Object.defineProperty(data,key,{get(){throw new Error(`read inactive ${key}`);}});
 const r=I.spt(data);assert.equal(r.valid,true);close(r.n160,17.325);assert.equal(r.energyOnly,null);assert.equal(r.proceduralFactor,null);assert.equal(r.stages.length,2);
});
test('SPT inactive invalid corrections do not block N60, but do block raw N',()=>{
 const data={...spt,energyRatio:null,rodFactor:NaN,samplerFactor:-1,boreholeFactor:'1'};
 assert.equal(I.spt({...data,basis:'n60'}).valid,true);bad(()=>I.spt(data));
});
test('SPT preserves decimal corrected values and rejects fractional measured blows',()=>{
 bad(()=>I.spt({...spt,reading:20.5}));assert.equal(I.spt({...spt,basis:'n60',reading:20.5}).valid,true);
 close(I.spt({...spt,reading:0}).n160,0);
});
test('SPT rejects ambiguous normalization basis and missing active inputs',()=>{
 for(const data of [null,[],{}, {...spt,basis:'n160'}, {...spt,reading:null}, {...spt,energyRatio:undefined}, {...spt,rodFactor:undefined}])bad(()=>I.spt(data));
});
test('SPT nonphysical corrections, zero effective stress, and overflow rejected',()=>{
 for(const field of ['energyRatio','rodFactor','samplerFactor','boreholeFactor'])for(const value of [0,-1,NaN,Infinity])bad(()=>I.spt({...spt,[field]:value}));
 bad(()=>I.spt({...spt,energyRatio:101}));
 for(const v of [0,-1,null,NaN,Infinity,20*I.KPA_PER_TSF])bad(()=>I.spt({...spt,effectiveOverburden:v}));
 bad(()=>I.spt({...spt,rodFactor:1e308,samplerFactor:1e308}));
 bad(()=>I.overburdenFactor(Number.MIN_VALUE));
});
test('CPT independent unit and subtraction example gives qt1040 qnet840 su60',()=>{
 const r=I.cpt(cpt);assert.equal(r.valid,true);close(r.inputKPa,1000);close(r.poreCorrection,40);close(r.qt,1040);close(r.qnet,840);close(r.su,60);close(r.suMin,140/3);close(r.suMax,84);
});
test('CPT uses total overburden once, and corrected qt is not normalized Qt',()=>{
 const r=I.cpt({...cpt,totalOverburden:300,effectiveOverburden:100});close(r.qt,1040);close(r.qnet,740);close(r.su,740/14);assert.equal('Qt' in r,false);
});
test('CPT qt basis never reads or re-applies u2 and area ratio',()=>{
 const data={...cpt,basis:'qt',tipResistanceMPa:1.04};
 for(const key of ['u2','areaRatio'])Object.defineProperty(data,key,{get(){throw new Error(`read inactive ${key}`);}});
 const r=I.cpt(data);assert.equal(r.valid,true);close(r.qt,1040);close(r.su,60);assert.equal(r.poreCorrection,null);
});
test('CPT inactive correction errors disappear only in qt input mode',()=>{
 const data={...cpt,u2:NaN,areaRatio:null};bad(()=>I.cpt(data));assert.equal(I.cpt({...data,basis:'qt'}).valid,true);
});
test('CPT a=1 removes pore correction; negative u2 is not silently clamped',()=>{
 close(I.cpt({...cpt,areaRatio:1}).qt,1000);const r=I.cpt({...cpt,u2:-100});close(r.poreCorrection,-20);close(r.qt,980);close(r.su,780/14);
});
test('CPT Nkt doubling halves strength while leaving measured and corrected resistances unchanged',()=>{
 const a=I.cpt(cpt),b=I.cpt({...cpt,nkt:28});close(b.su,a.su/2);close(a.qt,b.qt);close(a.qnet,b.qnet);close(a.suMin,b.suMin);close(a.suMax,b.suMax);
});
test('CPT interval endpoints reverse with inverse relation; collapse and outside current Nkt allowed',()=>{
 const r=I.cpt({...cpt,nktMin:12,nktMax:21});close(r.suMin,40);close(r.suMax,70);
 const same=I.cpt({...cpt,nktMin:20,nktMax:20});close(same.suMin,42);close(same.suMax,42);assert.equal(same.valid,true);close(same.su,60);
});
test('nonpositive CPT net resistance preserves ledger but does not invent negative/zero su',()=>{
 for(const totalOverburden of [1040,1100]){const r=I.cpt({...cpt,totalOverburden});assert.equal(r.valid,true);assert.equal(r.suApplicable,false);assert.equal(r.su,null);assert.equal(r.suMin,null);assert.equal(r.suMax,null);close(r.qnet,1040-totalOverburden);}
});
test('CPT invalid interval and parameter values do not silently swap, clamp or default',()=>{
 for(const data of [null,[],{}, {...cpt,basis:'qnet'}, {...cpt,nktMin:20,nktMax:10}, {...cpt,tipResistanceMPa:null}, {...cpt,totalOverburden:-1}, {...cpt,areaRatio:0}, {...cpt,areaRatio:1.1}, {...cpt,u2:Infinity}, {...cpt,nkt:0}, {...cpt,nktMin:-1}, {...cpt,nktMax:NaN}])bad(()=>I.cpt(data));
 bad(()=>I.cpt({...cpt,tipResistanceMPa:0,u2:-100}));bad(()=>I.cpt({...cpt,tipResistanceMPa:1e308}));bad(()=>I.cpt({...cpt,nkt:Number.MIN_VALUE}));
});
test('engines leave caller data unchanged',()=>{
 const s=Object.freeze({...spt}),c=Object.freeze({...cpt});assert.equal(I.spt(s).valid,true);assert.equal(I.cpt(c).valid,true);assert.deepEqual(s,spt);assert.deepEqual(c,cpt);
});
test('descriptor registration, single question, input scope and default calculations',()=>{
 const ctx=vm.createContext({Investigation:I});vm.runInContext(readFileSync(new URL('../src/labs/investigation-labs.js',import.meta.url),'utf8')+';globalThis.labs=InvestigationLabs;',ctx);
 assert.equal(ctx.labs.length,2);
 for(const lab of ctx.labs){assert.equal(lab.meta.navGroup,'practice');assert.equal(lab.meta.questions.length,1);assert.equal(lab.compute(lab.defaults).valid,true);for(const key of lab.activeFields(lab.defaults)){assert.ok(key in lab.defaults);assert.ok(key in lab.bounds);}}
 const [s,c]=ctx.labs;
 assert.deepEqual([...s.activeFields({...s.defaults,basis:'n60'})],['reading','effectiveOverburden']);
 assert.equal(c.activeFields({...c.defaults,basis:'qt'}).includes('u2'),false);assert.equal(c.activeFields({...c.defaults,basis:'qt'}).includes('areaRatio'),false);
});
