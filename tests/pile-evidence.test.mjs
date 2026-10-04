import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {PileEvidence as P} from '../src/pile-evidence.mjs';
const root=new URL('../assets/data/',import.meta.url);
const read=name=>fs.readFileSync(new URL('pile-evidence-amaliahaven-'+name,root));
const csv=name=>{const [head,...lines]=read(name).toString().trim().split(/\r?\n/);const keys=head.split(',');return lines.filter(Boolean).map(s=>Object.fromEntries(s.split(',').map((v,i)=>[keys[i],v])));};
const time=t=>{const [d,s]=t.split(' '),[day,month,year]=d.split('/');return Date.UTC(+year,+month-1,+day,...s.split(':').map(Number));};
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('original raw CSV is byte-preserved and its author dataset is attributed',()=>{
 assert.equal(crypto.createHash('sha256').update(read('P02_topside.csv')).digest('hex'),P.source.sha256);
 assert.equal(P.source.license,'CC BY 4.0');assert.match(P.source.url,/8a27f456.*\.v1$/);
 const repository=JSON.parse(read('repository.json'));assert.equal(repository.license.name,P.source.license);assert.equal(repository.doi,'10.4121/8a27f456-66f0-4e3b-a0ac-4f776926644d.v1');assert.match(read('original-readme.md').toString(),/License: CC BY 4.0/);
 assert.equal(csv('P02_topside.csv').length,6942);
});
test('all 23 observations select the last source row inside the published stage interval',()=>{
 const raw=csv('P02_topside.csv'),stages=csv('P02_datums.csv');assert.equal(P.points.length,stages.length);
 for(const [i,p] of P.points.entries()){
  const stage=stages[i],matches=raw.map((r,j)=>({r,j})).filter(({r})=>time(r.timestamp)>=time(stage.start_P02)&&time(r.timestamp)<=time(stage.end_P02)),last=matches.at(-1);
  assert.equal(p.stage,stage.Descr);assert.equal(p.sourceRow,last.j+2);assert.equal(p.sourceIndex,+last.r['']);assert.equal(p.load,+last.r.F_total);assert.equal(p.timestamp,last.r.timestamp);
  p.lvdt.forEach((s,n)=>assert.equal(s,+last.r['lvdt'+(n+1)]));
 }
});
test('stage order remains chronological through load reversals, not load-sorted',()=>{
 assert.ok(P.points.every((p,i)=>i===0||p.sourceRow>P.points[i-1].sourceRow));
 assert.ok(P.points[3].load<P.points[2].load);assert.ok(P.points[17].load<P.points[16].load);
 assert.equal(P.points.at(-1).timestamp,'04/12/2019 02:01');assert.equal(csv('P02_topside.csv').at(-1).timestamp,'04/12/2019 03:30');
});
test('actual four-channel average and sensor spread stay observable',()=>{
 const r=P.read({pileEvidencePoint:18});near(r.current.settlement,7.92543478375);near(r.current.sensorSpread,9.391739135);
 near(r.current.settlement,r.current.lvdt.reduce((a,b)=>a+b,0)/4);assert.equal(r.branch,'제하');
});
test('initial load and slight negative displacement are not silently zeroed',()=>{
 const r=P.read({pileEvidencePoint:1});assert.equal(r.current.load,223.1652609);near(r.current.settlement,-.00456521725);assert.equal(r.stiffness,null);assert.equal(r.deltaLoad,null);assert.equal(r.branch,'기준계측');
});
test('an unloading interval has positive observed secant because both changes are negative',()=>{
 const r=P.read({pileEvidencePoint:12});assert.equal(r.branch,'제하');near(r.deltaLoad,-4236.0000001);near(r.deltaSettlement,-14.55750000225);near(r.stiffness,4236/14.5575,1e-6);assert.ok(r.current.load>0);
});
test('reloading within prior peak is distinguished from reloading beyond that peak',()=>{
 assert.equal(P.read({pileEvidencePoint:19}).branch,'재재하');assert.equal(P.read({pileEvidencePoint:20}).branch,'재재하');assert.equal(P.read({pileEvidencePoint:22}).branch,'재재하·증재');assert.equal(P.read({pileEvidencePoint:23}).branch,'추가 재하');assert.equal(P.read({pileEvidencePoint:3}).branch,'재하');
});
test('source pile dimensions are square width and elevation-derived length',()=>{
 const p=csv('pile-details.csv').find(r=>r.pile==='P02');assert.equal(p.publication_name,'DP1');near(P.source.pileLength,+p.pile_top-+p.pile_depth);assert.equal(P.source.pileWidth,+p.b);assert.equal(P.source.equivalentDiameter,+p.D_eq);
});
test('invalid cursor indices cannot extrapolate or round onto another record',()=>{
 for(const pileEvidencePoint of [0,24,-1,1.1,NaN,Infinity,'12',null]){const r=P.read({pileEvidencePoint});assert.equal(r.valid,false);assert.ok(r.errors.length);assert.equal(r.current,undefined);}
 for(const d of [null,[],true])assert.equal(P.read(d).valid,false);
});
test('unrelated simulation inputs cannot invalidate or mutate an actual record',()=>{
 const a=P.read(),b=P.read({...P.defaults,length:NaN,diameter:-1,headLoad:Infinity});assert.deepEqual(b,a);assert.equal(a.number,12);assert.ok(Object.isFrozen(P.points)&&Object.isFrozen(a.current)&&Object.isFrozen(a.current.lvdt));
});
test('all record results retain finite observable quantities without capacity estimates',()=>{
 for(let i=1;i<=23;i++){const r=P.read({pileEvidencePoint:i});assert.equal(r.valid,true);for(const v of [r.current.load,r.current.settlement,r.current.sensorSpread])assert.ok(Number.isFinite(v));if(i>1)assert.ok(Number.isFinite(r.stiffness));assert.equal(r.ultimate,undefined);assert.equal(r.allowable,undefined);}
});
test('downloaded transformation record agrees with engine values and raw file hashes',()=>{
 const m=JSON.parse(read('points.json'));assert.equal(m.license,P.source.license);assert.equal(m.rawRecordCount,6942);assert.equal(m.points.length,P.points.length);
 for(const [name,hash] of Object.entries(m.hashes))assert.equal(crypto.createHash('sha256').update(read(name)).digest('hex'),hash);
 for(const [i,p] of m.points.entries()){assert.equal(p.sourceRow,P.points[i].sourceRow);assert.equal(p.load,P.points[i].load);assert.deepEqual(p.lvdt,P.points[i].lvdt);}
});
test('the record view shows only compatible saved observations and no invalid numeric output',()=>{
 const code=fs.readFileSync(new URL('../src/learning-pile-evidence.js',import.meta.url),'utf8');
 const view=vm.runInNewContext(code+';PileEvidenceView',{PileEvidence:P,fmt:(n,d=1)=>n.toFixed(d),metric:(label,value)=>label+value,svgWrap:s=>s,fieldControl:()=>''});
 for(let i=1;i<=23;i++){const v=view.render({result:P.read({pileEvidencePoint:i})});assert.doesNotMatch(v.chart+v.results+v.theory,/NaN|Infinity|undefined/);assert.equal(v.comparisonPlot,false);}
 assert.equal(view.render({result:P.read(),baseline:{model:'other-simulation'}}).comparisonPlot,false);
 const v=view.render({result:P.read(),baseline:P.read({pileEvidencePoint:23})});assert.equal(v.comparisonPlot,true);assert.match(v.chart,/class="baseline"/);assert.match(v.method,/CSV 행/);
});
