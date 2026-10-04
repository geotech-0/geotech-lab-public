import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import vm from 'node:vm';
import {OedometerEvidence as O} from '../src/oedometer-evidence.mjs';
import {privateOriginalSkipReason} from './helpers/evidence-original-policy.mjs';
const asset=name=>new URL('../assets/data/'+name,import.meta.url);
const data=JSON.parse(fs.readFileSync(asset('oedometer-usgs-15021308-points.json'),'utf8'));
const originalSkip=privateOriginalSkipReason('assets/data/oedometer-usgs-15021308-original.xlsx');
const near=(a,b,t=1e-11)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} != ${b}`);
// Read the untouched XLSX's numeric cells independently; no spreadsheet library
// and no app-generated JSON is used as the source of these values.
function zipEntry(buffer,name){
 let end=-1;for(let p=buffer.length-22;p>=Math.max(0,buffer.length-65557);p--)if(buffer.readUInt32LE(p)===0x06054b50){end=p;break;}
 assert.ok(end>=0,'zip end');let p=buffer.readUInt32LE(end+16);
 for(let i=0;i<buffer.readUInt16LE(end+10);i++){
  assert.equal(buffer.readUInt32LE(p),0x02014b50);
  const method=buffer.readUInt16LE(p+10),size=buffer.readUInt32LE(p+20),nl=buffer.readUInt16LE(p+28),el=buffer.readUInt16LE(p+30),cl=buffer.readUInt16LE(p+32),local=buffer.readUInt32LE(p+42),key=buffer.subarray(p+46,p+46+nl).toString();
  if(key===name){const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28),raw=buffer.subarray(start,start+size);assert.ok(method===0||method===8);return (method===8?inflateRawSync(raw):raw).toString();}
  p+=46+nl+el+cl;
 }
 throw Error('Missing original entry '+name);
}
test('original publisher workbook hash and repository checksum are preserved',{skip:originalSkip},()=>{
 const b=fs.readFileSync(asset(data.originalFile)),repo=JSON.parse(fs.readFileSync(asset('oedometer-usgs-15021308-repository.json'),'utf8'));
 assert.equal(createHash('sha256').update(b).digest('hex'),O.source.sha256);
 assert.equal(data.originalSha256,O.source.sha256);
 assert.equal('md5:'+createHash('md5').update(b).digest('hex'),repo.files[0].checksum);
 assert.equal(repo.metadata.license.id,'cc-by-4.0');assert.equal(repo.metadata.doi,O.source.doi);
});
test('all 12 runtime points exactly match original table cells, order and MPa-to-kPa conversion',{skip:originalSkip},()=>{
 const xml=zipEntry(fs.readFileSync(asset(data.originalFile)),'xl/worksheets/sheet2.xml').replace(/<c\b[^>]*\/>/g,''),cells={};
 for(const m of xml.matchAll(/<c\b[^>]*\br="([^"]+)"[^>]*>([\s\S]*?)<\/c>/g)){const value=m[2].match(/<v>([^<]+)<\/v>/);if(value)cells[m[1]]=Number(value[1]);}
 assert.equal(O.points.length,12);
 for(let i=0;i<12;i++){const p=O.points[i],row=i+8;assert.equal(p.sourceRow,row);assert.equal(p.e,cells['N'+row]);assert.equal(p.stressMPa,cells['O'+row]);assert.equal(p.stress,cells['O'+row]*1000);assert.equal(data.points[i].e,p.e);assert.equal(data.points[i].stressMPa,p.stressMPa);}
 assert.equal(cells.C38,O.source.publishedCr);assert.equal(cells.C28,O.source.publishedCc);
});
test('selected points, cell references and source provenance remain consistent in every distribution',()=>{
 const repo=JSON.parse(fs.readFileSync(asset('oedometer-usgs-15021308-repository.json'),'utf8'));
 assert.equal(data.originalSha256,O.source.sha256);
 assert.equal('md5:'+data.originalMd5,repo.files[0].checksum);
 assert.equal(repo.metadata.license.id,'cc-by-4.0');assert.equal(repo.metadata.doi,O.source.doi);
 assert.equal(data.recordUrl,O.source.url);assert.equal(data.points.length,12);assert.equal(O.points.length,12);
 for(const [i,p]of O.points.entries()){
  const q=data.points[i],row=i+8;
  assert.equal(p.sourceRow,row);assert.equal(q.sourceRow,row);
  assert.equal(q.stressCell,'Consolidation!O'+row);assert.equal(q.voidRatioCell,'Consolidation!N'+row);
  assert.equal(q.e,p.e);assert.equal(q.stressMPa,p.stressMPa);assert.equal(p.stress,q.stressMPa*1000);
 }
 assert.equal(data.publishedCompression.index,O.source.publishedCc);
 assert.equal(data.publishedRecompression.index,O.source.publishedCr);
});
test('default loading interval matches independent numerical calculation, not the published regression',()=>{
 const r=O.read();assert.ok(r.valid);assert.equal(r.kind,'Cc');near(r.index,.43798406573453513);near(r.mv,.00024218856720963883);near(r.modulus,4129.014063386395);assert.notEqual(r.index,O.source.publishedCc);
});
test('reloading two-point slope reproduces the publisher reported Cr',()=>{
 const r=O.read({evidenceBranch:'reloading'});assert.ok(r.valid);assert.equal(r.first.sourceRow,13);assert.equal(r.last.sourceRow,14);assert.equal(r.kind,'Cr');near(r.index,O.source.publishedCr);near(r.modulus,31306.62453736586);
});
test('unloading chronology and signs are retained rather than sorting by stress',()=>{
 const r=O.read({evidenceBranch:'unloading'});assert.equal(r.first.number,9);assert.equal(r.last.number,12);assert.equal(r.kind,'Cs');assert.ok(r.deltaStress<0&&r.strain<0&&r.mv>0&&r.modulus>0);near(r.index,.12203195833244851);assert.notEqual(r.index,O.source.publishedCr);
});
test('same stress on earlier loading and reloading remains separate observations',()=>{
 const a=O.points[4],b=O.points[6];assert.equal(a.stress,b.stress);assert.notEqual(a.e,b.e);assert.ok(a.e>b.e);assert.ok(O.points[5].stress<a.stress);
});
test('initial low-stress and reloading endpoint intervals are not automatically virgin Cc',()=>{
 assert.equal(O.read({evidenceFirst:1,evidenceLast:5}).kind,'Csec');
 assert.equal(O.read({evidenceBranch:'continued'}).kind,'Csec');
 assert.equal(O.read({evidenceBranch:'continued',evidenceFirst:2,evidenceLast:3}).kind,'Cc');
});
test('every allowed pair satisfies independent specimen-volume and log-increment relations',()=>{
 let count=0;
 for(const [evidenceBranch,branch] of Object.entries(O.branches))for(let evidenceFirst=1;evidenceFirst<branch.count;evidenceFirst++)for(let evidenceLast=evidenceFirst+1;evidenceLast<=branch.count;evidenceLast++){
  const r=O.read({evidenceBranch,evidenceFirst,evidenceLast});assert.ok(r.valid);const h1=.02,h2=h1*(1+r.last.e)/(1+r.first.e);
  near((h1-h2)/h1,r.mv*(r.last.stress-r.first.stress));near(r.index*(Math.log(r.last.stress)-Math.log(r.first.stress))/Math.LN10,r.first.e-r.last.e);near(r.mv*r.modulus,1);assert.ok([r.index,r.mv,r.modulus].every(Number.isFinite));count++;
 }
 assert.equal(count,20);
});
test('changing the selected stress interval changes the measured secant stiffness',()=>{
 const a=O.read({evidenceFirst:2,evidenceLast:3}),b=O.read({evidenceFirst:4,evidenceLast:5});assert.ok(a.mv>b.mv);assert.ok(a.modulus<b.modulus);assert.notEqual(a.index,b.index);
});
test('invalid selections are rejected, never rounded, reordered or clamped',()=>{
 for(const d of [null,[],{evidenceBranch:'bogus'},{evidenceBranch:'__proto__'},{evidenceBranch:1},{evidenceFirst:0},{evidenceFirst:1.5},{evidenceFirst:'2'},{evidenceFirst:null},{evidenceLast:NaN},{evidenceLast:Infinity},{evidenceLast:6},{evidenceFirst:4,evidenceLast:2},{evidenceFirst:3,evidenceLast:3},{evidenceBranch:'reloading',evidenceLast:3},{evidenceBranch:'unloading',evidenceLast:5}])assert.equal(O.read(d).valid,false,JSON.stringify(d));
});
test('unrelated educational and history fields cannot change or invalidate real observations',()=>{
 assert.deepEqual(O.read({cc:999,testBranch:'invalid',testFirst:NaN,testLast:-1,evidenceDevice:'not-an-input'}),O.read());
 assert.throws(()=>{O.points[0].e=8;},TypeError);assert.throws(()=>{O.branches.loading.numbers.reverse();},TypeError);
});
test('view resets only a deliberately changed path and filters incompatible saved models',()=>{
 const code=['learning-downloads.js','learning-oedometer-evidence.js'].map(f=>fs.readFileSync(new URL('../src/'+f,import.meta.url),'utf8')).join('\n');
 const view=vm.runInNewContext(code+';OedometerEvidenceView',{OedometerEvidence:O,fmt:(x,n=1)=>x.toFixed(n),metric:()=>'',svgWrap:s=>s,fieldControl:()=>''});
 const d={...O.defaults,evidenceBranch:'reloading'};view.onFieldChange(d,'evidenceBranch');assert.equal(d.evidenceFirst,1);assert.equal(d.evidenceLast,2);
 d.evidenceFirst=9;view.onFieldChange(d,'evidenceFirst');assert.equal(d.evidenceFirst,9);
 assert.equal(view.render({result:O.read(),baseline:{model:'oedometer-educational-points-v1'}}).comparisonPlot,false);
 assert.equal(view.render({result:O.read(),baseline:O.read({evidenceBranch:'unloading'})}).comparisonPlot,true);
});
