import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {LayeredFooting as F} from '../src/layered-footing.mjs';
import {RectangularStress as R} from '../src/rectangular-stress.mjs';
import {LayeredCase as C} from '../src/layered-case.mjs';
const solve=d=>F.solve(d,R.rectangle),near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}, tolerance ${t}`);

// Independent calculation: analytically integrate the Boussinesq point kernel in z,
// then composite Simpson integration in x/y. No rectangle-corner code is reused.
function independentStressIntegral(B,L,q,top,bottom,n=160){
 const dx=B/n,dy=L/n;let sum=0;
 const primitive=(z,r2)=>-1/Math.sqrt(r2+z*z)+r2/(3*(r2+z*z)**1.5);
 for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){
  const x=-B/2+i*dx,y=-L/2+j*dy,r2=x*x+y*y;
  const wx=i===0||i===n?1:i%2?4:2,wy=j===0||j===n?1:j%2?4:2;
  sum+=wx*wy*3*q/(2*Math.PI)*(primitive(bottom,r2)-primitive(top,r2));
 }
 return sum*dx*dy/9;
}

test('default layer integrals agree with independent depth-first 2D area integration',()=>{
 const r=solve({});assert.ok(r.valid);near(r.pressure,100);near(r.load,600);
 for(const layer of r.layers){
  const coarse=independentStressIntegral(r.width,r.length,r.pressure,layer.top,layer.bottom,80),fine=independentStressIntegral(r.width,r.length,r.pressure,layer.top,layer.bottom,160);
  near(coarse,fine,1e-6);near(layer.stressIntegral,fine,1e-7);near(layer.compressionMm,fine/layer.modulus*1000,1e-7);
 }
 near(r.totalMm,r.layers.reduce((s,l)=>s+l.compressionMm,0));
 assert.ok(r.integrationErrorMm<1e-6);
});

test('independent spatial integral converges for several asymmetric and deep load cases',()=>{
 for(const p of [
  {footingWidth:.8,footingLength:4,footingPressure:150,footingLoadMode:'pressure',layerStart:.5,h1:2,h2:3},
  {footingWidth:5,footingLength:1,footingPressure:80,footingLoadMode:'pressure',layerStart:2,h1:1,h2:5},
  {footingWidth:6,footingLength:8,footingPressure:70,footingLoadMode:'pressure',layerStart:10,h1:3,h2:2}
 ]){
  const r=solve(p);assert.ok(r.valid);
  for(const l of r.layers){const c=independentStressIntegral(r.width,r.length,r.pressure,l.top,l.bottom,80),f=independentStressIntegral(r.width,r.length,r.pressure,l.top,l.bottom,160);near(c,f,2e-5);near(l.stressIntegral,f,2e-6);}
 }
});

test('very broad footprint approaches uniform qH/M compression',()=>{
 const r=solve({footingWidth:1e5,footingLength:1e5,footingLoadMode:'pressure',footingPressure:100,layerStart:0});
 assert.ok(r.valid);near(r.layers[0].compressionMm,20,1e-7);near(r.layers[1].compressionMm,80,1e-7);
});

test('zero load produces exactly zero stresses, compression and no pressure ratio',()=>{
 const r=solve({footingLoad:0});assert.ok(r.valid);near(r.totalMm,0);assert.equal(r.lowerBoundaryRatio,null);
 for(const p of r.profile)near(p.stress,0);
});

test('load is linear and doubling one modulus halves only that layer contribution',()=>{
 const a=solve({}),q=solve({footingLoad:1200}),m=solve({m1:20000});
 near(q.totalMm,2*a.totalMm);near(m.layers[0].compressionMm,a.layers[0].compressionMm/2);near(m.layers[1].compressionMm,a.layers[1].compressionMm);
 for(let i=0;i<a.profile.length;i++)near(m.profile[i].stress,a.profile[i].stress);
});

test('Q and q maintenance have distinct, monotonic width relationships',()=>{
 const a=solve({}),wideQ=solve({footingWidth:4}),wideq=solve({footingWidth:4,footingLoadMode:'pressure'});
 near(wideQ.load,a.load);near(wideQ.pressure,a.pressure/2);assert.ok(wideQ.totalMm<a.totalMm);
 near(wideq.pressure,a.pressure);near(wideq.load,a.load*2);assert.ok(wideq.totalMm>a.totalMm);
});

test('deeper selected layers compress less under the same footprint and load',()=>{
 const a=solve({}),b=solve({layerStart:5});assert.ok(b.totalMm<a.totalMm);
 assert.ok(b.layers.every((l,i)=>l.compressionMm<a.layers[i].compressionMm));
});

test('splitting an identical material at another boundary preserves the integral',()=>{
 const a=solve({h1:1,h2:5,m1:10000,m2:10000}),b=solve({h1:4,h2:2,m1:10000,m2:10000});near(a.totalMm,b.totalMm,1e-7);
});

test('moving the softer material upward increases compression when layer heights match',()=>{
 const softTop=solve({h1:2,h2:2,m1:5000,m2:20000}),softBottom=solve({h1:2,h2:2,m1:20000,m2:5000});
 assert.ok(softTop.totalMm>softBottom.totalMm);
});

test('B/L rotation and geometric similarity preserve stress and scale compression',()=>{
 const a=solve({}),rot=solve({footingWidth:3,footingLength:2}),scaled=solve({footingWidth:4,footingLength:6,footingLoad:2400,layerStart:2,h1:4,h2:8});
 near(rot.totalMm,a.totalMm);near(scaled.totalMm,2*a.totalMm,1e-7);
});

test('surface influence is q; layer peak checks local strain rather than layer average',()=>{
 const a=solve({layerStart:0,m1:1000});assert.ok(a.valid);near(a.profile[0].stress,100);near(a.layers[0].maxStrain,.1);
 assert.equal(solve({layerStart:0,m1:999}).valid,false);
 assert.ok(a.layers[0].meanStrain<a.layers[0].maxStrain);
});

test('active null/string/nonfinite/physical invalid input fails without masking blanks',()=>{
 for(const p of [null,{footingWidth:0},{footingLength:NaN},{footingLoad:null},{footingLoad:'600'},{footingLoad:Infinity},{footingLoad:-1},{footingLoadMode:'other'},{footingLoadMode:'pressure',footingPressure:null},{layerStart:-1},{h1:0},{h2:Infinity},{m1:0},{m2:null}])assert.equal(solve(p).valid,false,JSON.stringify(p));
});

test('inactive drivers and other question data do not enter this calculation',()=>{
 near(solve({footingPressure:NaN,pressure:null,observedMm:Infinity,toleranceMm:'bad'}).totalMm,solve({}).totalMm);
 assert.ok(solve({footingLoadMode:'pressure',footingLoad:NaN}).valid);
});

test('support-range extremes have finite nonnegative profiles bounded by surface pressure',()=>{
 for(const footingWidth of [.5,8])for(const footingLength of [.5,12])for(const layerStart of [0,12]){
  const r=solve({footingWidth,footingLength,layerStart,footingLoadMode:'pressure',footingPressure:50,h1:8,h2:12,m1:30000,m2:5000});assert.ok(r.valid);
  assert.ok(r.totalMm>=0&&Number.isFinite(r.totalMm));
  for(let i=0;i<r.profile.length;i++){const p=r.profile[i];assert.ok(p.stress>=0&&p.stress<=50+1e-10);if(i)assert.ok(p.stress<=r.profile[i-1].stress+1e-10);}
 }
});

const context={LayeredFooting:{...F,solve},LayeredCase:C,fmt:(v,d=1)=>Number(v).toFixed(d),esc:String,metric:()=>'<div>metric</div>',fieldControl:k=>`<input data-field="${k}">`,svgWrap:s=>`<svg>${s}</svg>`};
vm.createContext(context);vm.runInContext(readFileSync(new URL('../src/learning-layered-footing.js',import.meta.url),'utf8'),context);
const lab=vm.runInContext(readFileSync(new URL('../src/labs/layered-case-lab.js',import.meta.url),'utf8')+'\nLayeredCaseLabs[0];',context);

test('descriptor preserves both existing questions and isolates inactive inputs',()=>{
 assert.deepEqual(Array.from(lab.meta.questions,q=>q[0]),['contribution','footing','observation']);
 for(const q of ['contribution','footing','observation']){
  const d={...lab.defaults},active=lab.activeFields(d,q);
  for(const [f,v]of Object.entries(d))if(typeof v==='number'&&!active.includes(f))d[f]=NaN;
  assert.ok(lab.compute(d,q).valid,q);
 }
});

test('Q/q switches preserve the actual load even when unrelated layer stiffness is invalid',()=>{
 const before={...lab.defaults,footingWidth:4,m1:NaN},d={...before,footingLoadMode:'pressure'};
 lab.onFieldChange(d,'footingLoadMode',before);near(d.footingPressure,50);near(d.footingLoad,600);
 const invalid={...before,footingLoad:null},next={...invalid,footingLoadMode:'pressure'};lab.onFieldChange(next,'footingLoadMode',invalid);assert.equal(next.footingLoadMode,'force');
});

test('controls expose only the selected driver, all current geometry and layer inputs',()=>{
 for(const mode of ['force','pressure']){const d={...lab.defaults,footingLoadMode:mode},html=lab.controls(d,'footing');for(const f of lab.activeFields(d,'footing'))assert.ok(html.includes(`data-field="${f}"`),f);assert.ok(!html.includes(`data-field="${mode==='force'?'footingPressure':'footingLoad'}"`));}
});

test('baseline actually plots stored geometry/stress; result and theory identify the selected interval',()=>{
 const d={...lab.defaults},r=lab.compute(d,'footing'),b=lab.compute({...d,footingWidth:4,layerStart:2},'footing'),v=lab.render({result:r,baseline:b,question:'footing'});
 assert.equal(v.comparisonPlot,true);assert.match(v.chart,/class="baseline"/);assert.match(v.chart,/저장한 기준/);
 assert.match(v.theory,/평균 Δσ/);assert.match(v.explanation,/전체 기초침하/);assert.match(v.method,/층상 탄성해가 아닙니다/);assert.doesNotMatch(v.chart,/NaN|Infinity|undefined/);
});
