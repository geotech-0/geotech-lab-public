import test from 'node:test';
import assert from 'node:assert/strict';
import {CompositeGround as C} from '../src/composite-ground.mjs';
const close=(a,b,tol=1e-11)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const valid=data=>{const r=C.solve(data);assert.ok(r.valid,r.errors.join(' '));return r;};

test('independent parallel-spring hand example',()=>{
  const r=valid({areaRatio:.25,soilModulus:10000,columnModulus:30000,deltaStress:120,thickness:10});
  close(r.equivalentModulus,15000);close(r.strain,.008);close(r.settlementMm,80);
  close(r.soilStress,80);close(r.columnStress,240);close(r.soilLoad,60);close(r.columnLoad,60);
  close(r.columnLoadFraction,.5);close(r.untreatedSettlementMm,120);close(r.reductionMm,40);
});
test('zero replacement recovers soil alone without reporting stress in an absent column',()=>{
  const r=valid({areaRatio:0});close(r.equivalentModulus,5000);close(r.settlementMm,160);
  close(r.soilStress,100);assert.equal(r.columnStress,null);close(r.columnLoad,0);close(r.columnLoadFraction,0);assert.equal(r.stressConcentration,null);
});
test('complete replacement recovers column material alone',()=>{
  const r=valid({areaRatio:1});close(r.equivalentModulus,50000);close(r.settlementMm,16);
  close(r.columnStress,100);assert.equal(r.soilStress,null);close(r.soilLoad,0);close(r.columnLoadFraction,1);
});
test('equal moduli make settlement independent of area ratio and load share equal area share',()=>{
  for(const areaRatio of [0,.1,.5,.9,1]){
    const r=valid({areaRatio,columnModulus:5000});close(r.settlementMm,160);close(r.reductionMm,0);close(r.columnLoadFraction,areaRatio);
    if(areaRatio>0)close(r.columnStress,100);if(areaRatio<1)close(r.soilStress,100);
  }
});
test('stress concentration and load fraction are different quantities',()=>{
  const r=valid({areaRatio:.2});close(r.stressConcentration,10);close(r.columnLoadFraction,5/7);
  close(r.columnStress/r.soilStress,10);close(r.settlementRatio,1/(1+.2*(10-1)));
});
test('static force and equal-strain compatibility at all UI endpoints',()=>{
  for(const areaRatio of [0,.01,.2,.8,1])for(const soilModulus of [2000,50000])for(const columnModulus of [2000,200000])for(const deltaStress of [0,200]){
    const r=valid({areaRatio,soilModulus,columnModulus,deltaStress});close(r.columnLoad+r.soilLoad,deltaStress);close(r.forceResidual,0);close(r.compatibilityResidual,0);assert.equal(r.smallStrainExceeded,false);
    assert.ok(r.equivalentModulus>=Math.min(soilModulus,columnModulus)&&r.equivalentModulus<=Math.max(soilModulus,columnModulus));
  }
});
test('depth changes settlement, not stress or load share',()=>{
  const a=valid({thickness:8}),b=valid({thickness:16});close(b.settlementMm,2*a.settlementMm);close(b.columnStress,a.columnStress);close(b.soilStress,a.soilStress);close(b.columnLoadFraction,a.columnLoadFraction);
});
test('load scales stress and settlement but not a nonzero-load fraction',()=>{
  const a=valid({deltaStress:50}),b=valid({deltaStress:100});close(b.settlementMm,2*a.settlementMm);close(b.soilStress,2*a.soilStress);close(b.columnLoad,2*a.columnLoad);close(b.columnLoadFraction,a.columnLoadFraction);
});
test('increasing stiff replacement reduces settlement while making it carry more total force',()=>{
  const a=valid({areaRatio:.1}),b=valid({areaRatio:.3});assert.ok(b.settlementMm<a.settlementMm);assert.ok(b.columnLoadFraction>a.columnLoadFraction);
  // More area can carry more total force despite a lower stress per unit column area.
  assert.ok(b.columnStress<a.columnStress);close(a.stressConcentration,b.stressConcentration);
});
test('soft replacement is allowed but is not falsely called settlement improvement',()=>{
  const r=valid({soilModulus:50000,columnModulus:5000});assert.ok(r.reductionMm<0);assert.ok(r.settlementRatio>1);assert.ok(r.columnLoadFraction<r.areaRatio);
});
test('zero loading has zero stress and settlement but undefined observed load fraction',()=>{
  const r=valid({deltaStress:0});close(r.columnStress,0);close(r.soilStress,0);close(r.settlementMm,0);assert.equal(r.columnLoadFraction,null);assert.equal(r.soilLoadFraction,null);assert.equal(r.stressConcentration,null);assert.equal(r.settlementRatio,null);
});
test('force-displacement stiffness and energy match two parallel one-dimensional columns',()=>{
  const r=valid({}),w=r.settlementMm/1000,ks=(1-r.areaRatio)*r.soilModulus/r.thickness,kc=r.areaRatio*r.columnModulus/r.thickness;
  close((ks+kc)*w,r.totalLoad);close(.5*(ks+kc)*w*w,.5*r.totalLoad*w);
});
test('invalid values rejected and large linear strain explicitly flagged',()=>{
  for(const args of [null,[],{areaRatio:-.1},{areaRatio:1.1},{soilModulus:0},{columnModulus:-1},{thickness:0},{deltaStress:NaN},{deltaStress:-1},{soilModulus:1e-308,columnModulus:1e308,deltaStress:0}])assert.equal(C.solve(args).valid,false);
  assert.equal(valid({soilModulus:100,areaRatio:0,deltaStress:100}).smallStrainExceeded,true);
});
