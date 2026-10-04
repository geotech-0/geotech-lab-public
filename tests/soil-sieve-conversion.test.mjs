import test from 'node:test';
import assert from 'node:assert/strict';
import {SoilInputs} from '../src/soil-inputs.mjs';
import {Soil} from '../src/soil.mjs';
import {Plasticity} from '../src/plasticity.mjs';
const {sieveMassFromPassing}=SoilInputs;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const source=[{size:.02,passing:2},{size:.05,passing:5},{size:.1,passing:10},{size:.3,passing:30},{size:1,passing:60},{size:4.75,passing:90},{size:19,passing:100}];
test('bracketed No.200 is inserted using log interpolation and preserves classification',()=>{
 const r=sieveMassFromPassing(source),before=Soil.classify({points:source,ll:32,pl:22}),after=Soil.classify({points:r.points,ll:32,pl:22});assert.equal(r.valid,true);assert.equal(r.boundaryInterpolated,true);assert.equal(r.panOpening,.075);near(r.panPercent,5+5*Math.log(1.5)/Math.log(2));near(r.panPercent,before.fines);near(after.fines,before.fines);assert.equal(after.symbol,before.symbol);near(r.rows.reduce((a,p)=>a+p.mass,0),1000);assert.equal(r.discardedFinePointCount,2);assert.deepEqual(r.boundarySources,source.slice(1,3));
});
test('supplied No.200 is never interpolated or shifted',()=>{
 const p=[{size:.02,passing:3},{size:.075,passing:8.2},{size:.5,passing:30},{size:4.75,passing:100}],r=sieveMassFromPassing(p);assert.equal(r.valid,true);assert.equal(r.boundaryInterpolated,false);near(r.panPercent,8.2);assert.deepEqual(r.boundarySources,[]);assert.equal(r.discardedFinePointCount,1);
});
test('missing lower or upper boundary refuses extrapolation',()=>{
 for(const p of [[{size:.1,passing:10},{size:4.75,passing:100}],[{size:.02,passing:3},{size:.05,passing:8}]]){const r=sieveMassFromPassing(p);assert.equal(r.valid,false);assert.ok(r.errors.join(' ').includes('외삽'));assert.deepEqual(r.rows,[]);}
});
test('invalid discarded points are rejected before filtering',()=>{
 const p=source.map(p=>({...p}));p[0].passing=20;assert.equal(sieveMassFromPassing(p).valid,false);p[0].passing=NaN;assert.equal(sieveMassFromPassing(p).valid,false);
});
test('source data are immutable and scaling mass leaves passing fractions unchanged',()=>{
 const frozen=source.map(p=>Object.freeze({...p}));Object.freeze(frozen);const a=sieveMassFromPassing(frozen,1000),b=sieveMassFromPassing(frozen,3333);a.rows.forEach((row,i)=>{near(b.rows[i].mass,row.mass*3.333);if(row.passing!==null)near(row.passing,b.rows[i].passing);});assert.deepEqual(source,frozen);
});
test('dropping fine-detail samples is explicit and must not pretend to preserve D10',()=>{
 const p=[{size:.02,passing:3},{size:.075,passing:11},{size:.3,passing:30},{size:1,passing:60},{size:4.75,passing:100}],before=Soil.classify({points:p,ll:32,pl:22}),r=sieveMassFromPassing(p),after=Soil.classify({points:r.points,ll:32,pl:22});assert.equal(before.status,'classified');assert.equal(after.status,'needs-info');assert.equal(r.discardedFinePointCount,1);near(r.panPercent,11);
});
test('imported mass rows have a pan tied to their actual smallest sieve, not always No.200',()=>{
 const rows=[{size:4.75,mass:100},{size:.1,mass:800},{size:.05,mass:50},{size:null,mass:50}],r=SoilInputs.retainedToPassing(rows),a=Soil.analyzeCurve(r.points);assert.equal(r.valid,true);assert.equal(a.valid,true);const panOpening=r.panOpening;assert.equal(panOpening,.05);near(r.panPercent,5);near(a.fines,5+5*Math.log(1.5)/Math.log(2));assert.notEqual(a.fines,r.panPercent);
});

test('classification rejects coarse particles outside the stated fraction instead of silently normalizing',()=>{for(const size of [75,150]){const points=[{size:.075,passing:10},{size:4.75,passing:30},{size:63,passing:50},{size,passing:100}],r=Soil.classify({points,ll:32,pl:22});assert.equal(r.valid,false);assert.match(r.errors.join(' '),/75 mm/);}});

test('3333 g round-trip does not change a 50 percent fine soil into coarse soil',()=>{
 const points=SoilInputs.generateCurve({fines:50,gravelShare:75,gradation:'uniform'}),r=SoilInputs.passingToRetained(points,3333),classified=Soil.classify({points:r.points,ll:32,pl:22});
 assert.equal(classified.symbol,'CL');assert.equal(Plasticity.analyze({ll:32,pl:22,fines:classified.fines}).scope,'fine-soil');
});
test('mass scales preserve exact fines boundaries and gravel-sand ties',()=>{
 for(const fines of [5,12,50])for(const gravelShare of [0,50,75,100])for(const gradation of ['broad','uniform','gap']){
  const points=[{size:.002,passing:0},{size:.02,passing:fines/2},...SoilInputs.generateCurve({fines,gravelShare,gradation})],before=Soil.classify({points,ll:32,pl:22});
  assert.equal(before.status,'classified');
  for(const total of [1,3333,750.5,1e7]){const converted=SoilInputs.passingToRetained(points,total),after=Soil.classify({points:converted.points,ll:32,pl:22});assert.equal(after.symbol,before.symbol,JSON.stringify({fines,gravelShare,gradation,total}));}
 }
});
test('classification tolerance does not erase real differences next to a boundary',()=>{
 const classify=(fines,gravelShare=0)=>Soil.classify({points:[{size:.002,passing:0},{size:.02,passing:fines/2},...SoilInputs.generateCurve({fines,gravelShare,gradation:'uniform'})],ll:32,pl:22});
 assert.equal(classify(5-1e-7).symbol,'SP');assert.equal(classify(5+1e-7).symbol,'SP-SC');assert.equal(classify(12-1e-7).symbol,'SP-SC');assert.equal(classify(12+1e-7).symbol,'SC');assert.equal(classify(50-1e-7).symbol,'SC');assert.equal(classify(50+1e-7).symbol,'CL');assert.equal(classify(5,50-1e-7).symbol,'SP-SC');assert.equal(classify(5,50+1e-7).symbol,'GP-GC');
 for(const [fines,scope]of [[5-1e-7,'clean-coarse'],[5+1e-7,'coarse-fines'],[50-1e-7,'coarse-fines'],[50+1e-7,'fine-soil']])assert.equal(Plasticity.analyze({ll:32,pl:22,fines}).scope,scope);
});
