import test from 'node:test';
import assert from 'node:assert/strict';
import { Improvement as I } from '../src/improvement.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('vertical diffusion agrees with independent T50/T90 reference values', () => {
  close(I.averageDegree(0), 0);
  close(I.averageDegree(.19673), .5, 1e-5);
  close(I.averageDegree(.84809), .9, 1e-5);
  close(I.averageDegree(20), 1);
  assert.ok(Number.isNaN(I.averageDegree(-1)));
});
test('radial response agrees with closed exponential at Th=F ln(2)/8', () => {
  const r = I.drains({pattern:'square',spacing:1,drainDiameter:.1,khKv:1,timeDays:0});
  const de = 2 / Math.sqrt(Math.PI), f = Math.log(de / .1) - .75;
  const t = de ** 2 * f * Math.log(2) / (8 * (1e-9 / (.0003 * 9.81)) * 86400);
  const half = I.drains({pattern:'square',spacing:1,drainDiameter:.1,khKv:1,timeDays:t});
  assert.ok(half.valid); close(half.radial,.5); close(r.cellArea,1); close(r.influenceDiameter,de);
  close(half.combined,1-(1-half.vertical)*.5);
});
test('triangular equivalent cell conserves tributary area', () => {
  const r=I.drains({spacing:2,pattern:'triangle'});
  close(r.cellArea,2*Math.sqrt(3)); close(Math.PI*r.influenceDiameter**2/4,r.cellArea);
});
test('k, mv and time units: equal response after proportional time scaling', () => {
  const a=I.drains({timeDays:10}), b=I.drains({kv:2e-9,timeDays:5}), c=I.drains({mv:.0006,timeDays:20});
  close(a.cv,1e-9/(.0003*9.81)); close(a.cvDays,a.cv*86400);
  close(a.combined,b.combined); close(a.combined,c.combined);
  close(a.finalSettlementMm,b.finalSettlementMm); close(c.finalSettlementMm,2*a.finalSettlementMm);
  close(b.t90CombinedDays,a.t90CombinedDays/2);
});
test('vertical drainage length, final settlement and radial time are distinct', () => {
  const double=I.drains(), single=I.drains({drainage:'single'});
  close(single.hdr,2*double.hdr); close(single.t90VerticalDays,4*double.t90VerticalDays);
  close(single.t90RadialDays,double.t90RadialDays); close(single.finalSettlementMm,double.finalSettlementMm);
  const r=I.drains({timeDays:double.t90CombinedDays});close(r.combined,.9,1e-9);
});
test('smaller spacing and larger kh accelerate without changing final settlement', () => {
  const a=I.drains({timeDays:10}), b=I.drains({timeDays:10,spacing:1}), c=I.drains({timeDays:10,khKv:4});
  assert.ok(b.combined>a.combined && c.combined>a.combined);
  close(a.finalSettlementMm,b.finalSettlementMm);close(a.finalSettlementMm,c.finalSettlementMm);
});
test('verified Hansbo smear factor slows response and no-disturbance limits recover ideal', () => {
  const clean=I.drains({timeDays:10}), smear=I.drains({timeDays:10,smear:'on',smearDiameterRatio:3,smearPermeabilityRatio:4});
  close(smear.fs,3*Math.log(3)); assert.ok(smear.combined<clean.combined);
  close(I.drains({timeDays:10,smear:'on',smearPermeabilityRatio:1}).combined,clean.combined);
  close(I.drains({timeDays:10,smear:'on',smearDiameterRatio:1}).combined,clean.combined);
});
test('zero time and zero load have exact initial conditions and no false degree', () => {
  const r=I.drains({timeDays:0});close(r.settlementMm,0);close(r.averageExcess,100);close(r.radial,0);close(r.vertical,0);
  const zero=I.drains({deltaStress:0});assert.equal(zero.degree,null);close(zero.settlementMm,0);close(zero.averageExcess,0);
});
test('drain series stays bounded and monotonic at independent parameter extremes', () => {
  for(const kv of [1e-11,1e-7])for(const spacing of [.6,4])for(const drainage of ['single','double']){
    const r=I.drains({kv,spacing,drainage,timeDays:1000});assert.ok(r.valid);
    let last=-1;for(const p of r.curve){assert.ok(p.combined>=last && p.combined>=0 && p.combined<=1);last=p.combined;assert.ok(p.combined+1e-14>=Math.max(p.vertical,p.radial));}
  }
});
test('no surcharge recovers a single Terzaghi step independently', () => {
  const r=I.staged({surcharge:0,timeDays:100});
  const tv=(1e-9/(.0003*9.81))*86400*100/16;
  close(r.settlementMm,.0003*8*80*I.averageDegree(tv)*1000);close(r.settlementMm,r.withoutSurchargeMm);
  close(r.averageExcess+r.effectiveIncrement,r.load);
});
test('simultaneous permanent and surcharge are exactly one summed increment', () => {
  const a=I.staged({permanentLoad:80,surcharge:40,addDays:0,timeDays:50}),b=I.staged({permanentLoad:120,surcharge:0,timeDays:50});
  close(a.settlementMm,b.settlementMm);close(a.averageExcess,b.averageExcess);
});
test('added and removed load jump in pore pressure, not settlement', () => {
  const r=I.staged();
  for(const [t,delta] of [[30,40],[180,-40]]){
    const rows=r.curve.filter(p=>p.days===t);
    assert.equal(rows.length,2);close(rows[1].load-rows[0].load,delta);
    close(rows[1].averageExcess-rows[0].averageExcess,delta);close(rows[1].settlementMm,rows[0].settlementMm);
  }
});
test('staged effective stress balance and linear long-time rebound', () => {
  const r=I.staged({timeDays:1e6});close(r.settlementMm,192);close(r.averageExcess,0);close(r.load,80);
  for(const p of I.staged().curve){close(p.load,p.averageExcess+p.effectiveIncrement);close(p.settlementMm,.0003*8*1000*p.effectiveIncrement);}
});
test('preload reference hand calculation uses constant solid volume, not final layer twice', () => {
  const r=I.preload({sigma0:100,preloadLoad:100,serviceLoad:100,e0:1,cc:.3,cr:.05,thickness:10});
  close(r.preSettlementMm,1500*Math.log10(2));close(r.reboundMm,250*Math.log10(2));
  close(r.postServiceSettlementMm,250*Math.log10(2));close(r.finalSettlementMm,r.preSettlementMm);
  close(r.reductionMm,1250*Math.log10(2));close(r.finalOCR,1);
});
test('zero preload gives unmodified future settlement and zero retained compression', () => {
  const r=I.preload({preloadLoad:0});close(r.reductionMm,0);close(r.retainedSettlementMm,0);close(r.postServiceSettlementMm,r.withoutPreloadSettlementMm);
});
test('partial preload splits reload and virgin loading at the new preconsolidation stress', () => {
  const r=I.preload({sigma0:100,preloadLoad:50,serviceLoad:100,e0:1,cc:.3,cr:.05,thickness:10});
  close(r.postServiceSettlementMm,5000*(.05*Math.log10(1.5)+.3*Math.log10(2/1.5)));
  assert.equal(r.path.length,5);close(r.preconsolidationAfterRemoval,150);
});
test('preloading beyond service load does not invent further benefit at constant Cr', () => {
  const a=I.preload({preloadLoad:100,serviceLoad:100}),b=I.preload({preloadLoad:200,serviceLoad:100});
  close(a.postServiceSettlementMm,b.postServiceSettlementMm);assert.ok(b.preSettlementMm>a.preSettlementMm);assert.ok(b.finalOCR>1);
  close(I.preload({cc:.1,cr:.1}).reductionMm,0);
});
test('input errors are explicit; inactive smear fields do not invalidate ideal case', () => {
  for(const args of [{kv:0},{mv:-1},{timeDays:NaN},{drainDiameter:1,spacing:1},{smear:'on',smearDiameterRatio:100},{smear:'on',smearPermeabilityRatio:.5},{deltaStress:1000},{pattern:'hexagon'}])assert.equal(I.drains(args).valid,false);
  assert.equal(I.drains({smear:'off',smearDiameterRatio:NaN}).valid,true);
  for(const args of [{removeDays:30,addDays:30},{permanentLoad:-1},{surcharge:Infinity}])assert.equal(I.staged(args).valid,false);
  for(const args of [{cr:.5,cc:.1},{sigma0:0},{preloadLoad:-1},{cc:10}])assert.equal(I.preload(args).valid,false);
});
