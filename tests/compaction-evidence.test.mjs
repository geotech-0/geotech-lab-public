import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {CompactionEvidence as C} from '../src/compaction-evidence.mjs';
import {privateOriginalSkipReason} from './helpers/evidence-original-policy.mjs';
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const evidence=JSON.parse(readFileSync(new URL('../assets/compaction/usace-em1110-3-141-points.json',import.meta.url)));

test('runtime rows exactly match the documented 20 manually read symbols',()=>{
  assert.equal(C.series.reduce((n,s)=>n+s.points.length,0),20);
  for(const [i,s]of C.series.entries()){
    assert.equal(s.blowsPerLayer,evidence.series[i].blowsPerLayer);assert.equal(s.marker,evidence.series[i].marker);
    for(const [j,p]of s.points.entries()){const q=evidence.series[i].points[j];near(p.w,q.w);near(p.dryDensityPcf,q.dryDensityPcf);}
  }
});
test('calibrated pixel coordinates reproduce rounded moisture and original density',()=>{
  const c=evidence.calibration;
  for(const s of evidence.series)for(const p of s.points){
    const w=5+(p.pixelX-c.x5percent)*20/(c.x25percent-c.x5percent);
    const density=90+(c.y90pcf-p.pixelY)*30/(c.y90pcf-c.y120pcf);
    near(p.w,Math.round(w*10)/10);near(p.dryDensityPcf,Math.round(density*2)/2);
  }
});
test('preserved source page matches its recorded SHA256',{skip:privateOriginalSkipReason('assets/compaction/usace-em1110-3-141-page3-3.pdf')},()=>{
  const bytes=readFileSync(new URL('../assets/compaction/'+evidence.page.extractedAsset,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),evidence.page.extractedSha256);
});
test('original pcf conversion uses mass, cubic length and standard gravity',()=>{
  near(C.pcfToKNm3,0.1570874638462462);near(C.solve({effort:55,observeW:14.2}).atWater.gammaDry,18.22214580616456);
});
test('point maxima are distinct from fitted curve maxima and retained unchanged',()=>{
  const values=C.series.map(s=>[s.sampledPeak.w,s.sampledPeak.dryDensityPcf]);
  assert.deepEqual(values,[[16.9,104.5],[15.3,111],[14.2,116]]);
  assert.ok(C.series.every(s=>s.points.includes(s.sampledPeak)));
});
test('observed symbols are returned exactly and interior connectors are explicitly marked',()=>{
  const r=C.solve({effort:'26',observeW:15.3});assert.equal(r.valid,true);assert.equal(r.atWater.kind,'digitized-test-symbol');near(r.atWater.dryDensityPcf,111);
  const m=C.solve({effort:'26',observeW:14.5});assert.equal(m.atWater.kind,'straight-connector');near(m.atWater.dryDensityPcf,110);assert.deepEqual(m.atWater.bracket,[13.7,15.3]);
});
test('all three source series stay the same when selecting effort or observation',()=>{
  const a=C.solve({effort:'12',observeW:10.1}),b=C.solve({effort:'55',observeW:19.9});
  assert.equal(a.series,b.series);assert.equal(a.readings.length,3);assert.equal(b.readings.length,3);
  near(a.highMinusLow,a.readings[2].gammaDry-a.readings[0].gammaDry);
});
test('no new effort curve, extrapolation or numeric-string moisture is accepted',()=>{
  for(const x of [null,[],{effort:25},{effort:'modified'},{effort:['55']},{observeW:10},{observeW:20},{observeW:NaN},{observeW:'15'}])assert.equal(C.solve(x).valid,false);
  for(const effort of [12,26,55,'12','26','55'])for(const observeW of [10.1,15,19.9])assert.equal(C.solve({effort,observeW}).valid,true);
});
test('source datasets are immutable across browser calls',()=>{
  assert.throws(()=>{C.series[0].points[0].w=999;},TypeError);
  assert.throws(()=>{C.series.push({});},TypeError);
});
test('existing compaction descriptor routes modes without using inactive synthetic fields',()=>{
  const helpers={fmt:(v,d=1)=>Number(v).toFixed(d),esc:String,fieldControl:(f)=>`data-field="${f}"`,numericRow:f=>`data-field="${f}"`,metric:(l,v,u)=>`${l} ${v} ${u}`,svgWrap:s=>`<svg>${s}</svg>`};
  const files=['state-models.mjs','compaction-evidence.mjs','learning-downloads.js','learning-compaction-evidence.js','labs/state-labs.js'];
  const code=files.map(f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8').replace(/^export /gm,'')).join('\n')+'\nStateLabs;';
  const lab=vm.runInNewContext(code,helpers).find(x=>x.key==='compaction');
  assert.equal(lab.meta.questions.length,1);
  const synthetic=lab.compute(lab.defaults);assert.equal(synthetic.model,'compaction-observation-identities-v1');
  for(const effort of ['12','26','55'])for(const observeW of [10.1,14.2,15.3,16.9,19.9]){
    const d={...lab.defaults,compactionMode:'evidence',effort,observeW,Gs:NaN};const r=lab.compute(d);assert.equal(r.valid,true);
    assert.deepEqual([...lab.activeFields(d)],['observeW']);assert.equal(r.model,'usace-compaction-digitized-evidence-v1');
    const view=lab.render({data:d,result:r,baseline:synthetic});assert.doesNotMatch(JSON.stringify(view),/NaN|undefined|Infinity/);assert.equal(view.comparisonPlot,false);
    const controls=lab.controls(d);assert.match(controls,/data-field="effort"/);assert.doesNotMatch(controls,/data-field="Gs"/);
  }
  const view=lab.render({data:lab.defaults,result:synthetic,baseline:C.solve()});assert.doesNotMatch(JSON.stringify(view),/NaN|undefined|Infinity/);assert.equal(view.comparisonPlot,false);
  assert.equal(lab.compute({...lab.defaults,compactionMode:'made-up'}).valid,false);
});
