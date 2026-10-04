import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {CyclicEvidence as C} from '../src/cyclic-evidence.mjs';
const raw=readFileSync(new URL('../assets/data/cyclic-leap2017-csr0325.tsv',import.meta.url));
const lines=raw.toString().trim().split(/\r?\n/);
const rows=lines.slice(1).map(l=>l.split('\t').map(Number));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('source provenance hash and original 6001 six-column rows',()=>{
 assert.equal(createHash('sha256').update(raw).digest('hex'),C.source.sha256);assert.equal(rows.length,6001);
 assert.equal(lines[0],'time_min\teps_a\teps_v\tsigmaP_3_kPa\tsigma_3_kPa\tsigma_d_kPa');
 assert.ok(rows.every(r=>r.length===6&&r.every(Number.isFinite)));
 const meta=JSON.parse(readFileSync(new URL('../assets/data/cyclic-leap2017-source.json',import.meta.url),'utf8'));
 assert.equal(meta.license,'ODC-BY 1.0');assert.equal(meta.sha256,C.source.sha256);assert.equal(meta.doi,C.source.doi);
});
test('every plotted sample is an actual source row, with no digitization/interpolation',()=>{
 assert.equal(C.series.length,2521);assert.equal(C.series.at(-1).timeMinutes,42);
 C.series.forEach((p,i)=>{const row=rows[i];assert.equal(p.sourceLine,i+2);assert.equal(p.timeMinutes,row[0]);assert.equal(p.strainPercent,row[1]);assert.equal(p.sigma3Effective,row[3]);assert.equal(p.sigma3Total,row[4]);assert.equal(p.deviator,row[5]);});
});
test('eight selected records and exported CSV retain exact source locations',()=>{
 assert.deepEqual(C.observations.map(p=>p.sourceLine),[2,304,604,1024,1804,2404,2417,2449]);
 const csv=readFileSync(new URL('../assets/data/cyclic-leap2017-selected.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1).map(l=>l.split(',').map(Number));
 assert.equal(csv.length,8);
 C.observations.forEach((p,i)=>{assert.equal(p.sourceLine,csv[i][0]);close(p.timeMinutes,csv[i][1]);close(p.strainPercent,csv[i][2]);close(p.ru,csv[i].at(-1));assert.equal(p.timeMinutes,rows[p.sourceLine-2][0]);});
});
test('independent initial pore pressure and unadjusted strain offset',()=>{
 const r=C.read({point:1});assert.equal(r.valid,true);close(r.reference.u,69.66);close(r.current.u,69.66);close(r.current.deltaU,0);close(r.current.ru,0);close(r.current.strainPercent,-.004624);
});
test('independent record arithmetic: line604 at 10.033 minutes',()=>{
 const p=C.read({point:3}).current;close(p.u,156.02);close(p.deltaU,86.36);close(p.ru,86.36/99.74);close(p.strainPercent,-.6081);
});
test('near unity pore-pressure ratio precedes large strain at selected observations',()=>{
 const early=C.read({point:4}).current,later=C.read({point:8}).current;
 assert.ok(early.ru>.99&&early.ru<1);assert.ok(Math.abs(early.strainPercent)<1);assert.ok(later.timeMinutes>early.timeMinutes);assert.ok(Math.abs(later.strainPercent)>=2.5);assert.ok(later.ru<.2);
 close(later.strainPercent,-2.506);close(later.ru,19.52/99.74);
});
test('total confining stress fluctuation and ru>1 are preserved, not clamped',()=>{
 const p=C.read({point:6}).current;assert.ok(p.ru>1);close(p.ru,100.4507/99.74);close(p.sigma3Total-C.reference.sigma3Total,1);close(p.sigma3Effective,.2893);
 close(C.reference.sigma3Effective+(p.sigma3Total-C.reference.sigma3Total)-p.deltaU,p.sigma3Effective);
});
test('intra-cycle pressure recovery does not erase recorded strain history',()=>{
 const a=C.read({point:6}).current,b=C.read({point:7}).current,c=C.read({point:8}).current;
 assert.ok(a.timeMinutes<b.timeMinutes&&b.timeMinutes<c.timeMinutes);assert.ok(a.ru>b.ru&&b.ru>c.ru);assert.ok(b.strainPercent>0&&c.strainPercent<0);assert.ok(b.deviator>0&&c.deviator<0);
});
test('pore-pressure ratio definition differs from mean-effective-stress reduction',()=>{
 const p=C.read({point:8}).current,p0=C.series[0].sigma3Effective+C.series[0].deviator/3,mean=p.sigma3Effective+p.deviator/3;
 assert.ok(Math.abs(p.ru-(p0-mean)/p0)>.1);
});
test('source metadata preserves individual specimen, loading and published criteria',()=>{
 assert.equal(C.source.testDate,'2016-09-30');assert.equal(C.source.consolidatedVoidRatio,.507);assert.equal(C.source.bValue,.959);assert.equal(C.source.csr,.325);assert.equal(C.source.periodMinutes,1);
 assert.equal(C.source.reportedRuUnityCycles,18);assert.equal(C.source.reportedStrainCriterionCycles,41);
});
test('all displayed observations and series satisfy the stress decomposition',()=>{
 for(const p of C.series){close(p.u+p.sigma3Effective,p.sigma3Total);close(p.ru*C.reference.sigma3Effective,p.deltaU);assert.ok(p.ru>-.1&&p.ru<1.1);assert.ok(p.strainPercent>=-3&&p.strainPercent<=1);}
});
test('discrete selection rejects missing, fractional, nonnumeric and out-of-range values',()=>{
 for(const input of [null,[],{}, {point:0},{point:9},{point:4.5},{point:'4'},{point:NaN},{point:Infinity}])assert.equal(C.read(input).valid,false);
 for(let point=1;point<=8;point++)assert.equal(C.read({point}).current,C.observations[point-1]);
});
test('immutable evidence cannot be edited accidentally into a synthetic response',()=>{
 for(const obj of [C.source,C.reference,C.series,C.series[0],C.observations,C.observations[0]])assert.equal(Object.isFrozen(obj),true);
 const input=Object.freeze({point:2});assert.equal(C.read(input).valid,true);assert.deepEqual(input,{point:2});
});
test('one evidence lab, one question, one actual-data selector and no physical prediction controls',()=>{
 const ctx=vm.createContext({CyclicEvidence:C});vm.runInContext(readFileSync(new URL('../src/labs/cyclic-evidence-lab.js',import.meta.url),'utf8')+';globalThis.labs=CyclicEvidenceLabs;',ctx);
 assert.equal(ctx.labs.length,1);const lab=ctx.labs[0];assert.equal(lab.meta.navGroup,'mechanics');assert.equal(lab.meta.questions.length,1);assert.deepEqual([...lab.activeFields(lab.defaults)],['point']);assert.equal(lab.compute(lab.defaults).valid,true);
});
