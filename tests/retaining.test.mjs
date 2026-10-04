import test from 'node:test';
import assert from 'node:assert/strict';
import {Retaining as R} from '../src/retaining.mjs';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} ≠ ${b}`);
const rel=(a,b,t=1e-7)=>near(a,b,t*Math.max(1,Math.abs(b)));

test('Rankine states and dry triangle/rectangle hand integration',()=>{
  const r=R.earthPressure();assert.ok(r.valid);near(r.ka,1/3);near(r.kp,3);near(r.k0,.5);near(r.components.soil.force,108);near(r.components.soil.height,2);near(r.components.surcharge.force,20);near(r.components.surcharge.height,3);near(r.force,128);near(r.moment,276);near(r.resultantHeight,276/128);
  near(R.earthPressure({state:'rest'}).force,192);near(R.earthPressure({state:'passive'}).force,1152);
});
test('water is not multiplied by K; effective soil weight changes below water',()=>{
  const r=R.earthPressure({waterDepth:0,surcharge:0});near(r.base.water,9.81*6);near(r.base.soil,(20-9.81)*6/3);near(r.components.water.force,.5*9.81*36);near(r.force,.5*(9.81+(20-9.81)/3)*36);near(r.resultantHeight,2);
  const a=R.earthPressure({waterDepth:2.3}),b=R.earthPressure({waterDepth:2.3,state:'passive'});near(a.components.water.force,b.components.water.force);
});
test('piecewise resultant and moment agree with independent fine midpoint integration',()=>{
  const r=R.earthPressure({height:7.1,waterDepth:2.7,phi:34,surcharge:25,state:'rest',ocr:3});let f=0,m=0;const n=100000,dz=r.height/n;
  for(let i=0;i<n;i++){const z=(i+.5)*dz,p=r.k*(18*Math.min(z,2.7)+10.19*Math.max(0,z-2.7)+25)+9.81*Math.max(0,z-2.7);f+=p*dz;m+=p*(r.height-z)*dz;}
  near(r.force,f,1e-6);near(r.moment,m,1e-5);assert.ok(r.k0>.5);
});
test('dry hydrostatic boundary, K=1 frictionless limit and invalid inputs',()=>{
  const a=R.earthPressure({waterDepth:6}),b=R.earthPressure({waterDepth:20});near(a.force,b.force);
  for(const state of ['active','rest','passive'])near(R.earthPressure({phi:0,state}).k,1);
  for(const d of [null,{height:0},{state:'custom'},{gammaSat:9},{phi:NaN},{ocr:.5}])assert.equal(R.earthPressure(d).valid,false);
});
test('Coulomb smooth horizontal limit equals Rankine; maximizing wedge agrees independently',()=>{
  for(const phi of [20,30,42]){const r=R.coulomb({phi,delta:0,beta:0});near(r.k,r.rankineK,1e-12);near(r.wedge.theta,45+phi/2,1e-5);near(r.force,r.wedge.force,1e-9);near(r.forceResidual,0,1e-9);}
  for(const d of [{delta:20,beta:15},{delta:0,beta:18},{phi:42,delta:28,beta:5}]){const r=R.coulomb(d);near(r.force,r.wedge.force,1e-8);near(r.forceResidual,0,1e-8);assert.ok(r.wedge.run>0);near(r.horizontal**2+r.vertical**2,r.force**2,1e-7);}
  for(const d of [{beta:30},{delta:35},{height:-1},{phi:Infinity}])assert.equal(R.coulomb(d).valid,false);
});
test('gravity wall centroid, self-weight, moments and full contact match hand values',()=>{
  const r=R.gravityWall({height:5,baseWidth:3,topWidth:3,surcharge:0});near(r.area,15);near(r.weight,360);near(r.centroidX,1.5);near(r.earth.force,75);near(r.earth.moment,125);near(r.resultantX,(540-125)/360);assert.equal(r.contact,'full');near(r.slidingResistance,198);near(r.slidingRatio,198/75);
});
test('base contact pressure exactly balances force and toe moment including partial contact',()=>{
  const cases=[R.gravityWall(),R.gravityWall({baseWidth:2,topWidth:.7}),R.gravityWall({baseWidth:5,waterDepth:0})];
  assert.ok(cases.some(r=>r.contact==='toe'));
  for(const r of cases){assert.ok(r.equilibriumExists);let F=0,M=0;for(let i=1;i<r.pressure.length;i++){const a=r.pressure[i-1],b=r.pressure[i],L=b.x-a.x,f=L*(a.p+b.p)/2;F+=f;M+=a.x*f+L*L*(a.p+2*b.p)/6;}near(F,r.normal);near(M,r.netMoment);assert.ok(r.pressure.every(p=>p.p>=0));}
});
test('uplift is separated from lateral water, and loss of compression contact is not hidden',()=>{
  const wet=R.gravityWall({waterDepth:0}),noU=R.gravityWall({waterDepth:0,uplift:false});near(wet.upliftForce,.5*9.81*5*3);near(wet.upliftX,2);near(noU.earth.force,wet.earth.force);near(wet.normal,noU.normal-wet.upliftForce);assert.ok(wet.slidingRatio<noU.slidingRatio);
  const lost=R.gravityWall({baseWidth:1,topWidth:.5,surcharge:50});assert.ok(lost.valid);assert.equal(lost.equilibriumExists,false);assert.equal(lost.pressureToe,null);assert.equal(lost.pressure.length,0);
  assert.equal(R.gravityWall({baseWidth:.5,topWidth:1}).valid,false);
});
test('Hermite beam reproduces independent cantilever uniform and tip load solutions',()=>{
  const L=6,EI=500000,q=10,P=100;
  const a=R.beamBenchmark({length:L,EI,uniformLoad:q});assert.ok(a.valid);near(a.nodes[0].displacement,q*L**4/(8*EI),1e-10);near(a.baseReaction,-q*L,1e-8);near(a.baseMoment,q*L*L/2,1e-8);near(a.maxMoment,q*L*L/2,1e-7);
  const b=R.beamBenchmark({length:L,EI,uniformLoad:0,tipLoad:P});near(b.nodes[0].displacement,P*L**3/(3*EI),1e-10);near(b.maxMoment,P*L,1e-7);near(b.maxShear,P,1e-7);
  near(R.beamBenchmark({EI:EI*2}).nodes[0].displacement,a.nodes[0].displacement/2,1e-10);
});
test('all excavation stages satisfy global force and moment equilibrium',()=>{
  for(const input of [{},{height:8,embedment:4,EI:100000},{groundK:5000,anchorK:10000,preload:0},{preload:200,installDepth:4}]){const r=R.excavation(input);assert.ok(r.valid);for(const s of r.stages){near(s.forceBalance,0,1e-5);near(s.momentBalance,0,1e-4);assert.ok(s.algebraicResidual<1e-4);}}
});
test('lock-off applies prescribed force and stores the deformed installation reference',()=>{
  const a=R.excavation(),b=R.excavation({preload:0});near(a.stages[1].anchorForce,100);near(b.stages[1].anchorForce,0);near(b.stages[0].anchorAt,b.stages[1].anchorAt,1e-10);
  assert.ok(a.stages[1].anchorAt<a.stages[0].anchorAt);near(a.stages[2].anchorForce,a.preload+a.anchorK*(a.stages[2].anchorAt-a.reference),1e-8);near(a.reference,a.stages[1].anchorAt);
});
test('installation history is retained; changing installation depth changes final solution',()=>{
  const a=R.excavation({height:8,installDepth:3}),b=R.excavation({height:8,installDepth:4});assert.ok(a.valid&&b.valid);assert.ok(Math.abs(a.stages[2].anchorForce-b.stages[2].anchorForce)>.1);assert.ok(Math.abs(a.stages[2].anchorAt-b.stages[2].anchorAt)>.0001);
});
test('excavation mesh refinement and input errors',()=>{
  const a=R.excavation({mesh:.5}),b=R.excavation({mesh:.25});rel(a.stages[2].anchorForce,b.stages[2].anchorForce,.02);near(a.stages[2].maxDisplacement,b.stages[2].maxDisplacement,.0003);
  for(const d of [{height:6.1},{EI:0},{anchorK:0},{preload:-1},{installDepth:6},{phi:NaN}])assert.equal(R.excavation(d).valid,false);
});
test('clay heave, upward-gradient boiling and slab uplift use different force balances',()=>{
  const r=R.bottomModes();near(r.heaveResistance,(2+Math.PI)*30);near(r.heaveDemand,118);near(r.gradient,.75);near(r.criticalGradient,10.19/9.81);near(r.slabWeight,19.2);near(r.upliftPressure,29.43);near(r.upliftNet,10.23);
  const stronger=R.bottomModes({su:60});near(stronger.heaveRatio,2*r.heaveRatio);near(stronger.boilingDemandRatio,r.boilingDemandRatio);near(stronger.upliftNet,r.upliftNet);
  const dry=R.bottomModes({headDifference:0,slabHead:0});near(dry.gradient,0);near(dry.upliftPressure,0);assert.equal(dry.slabRatio,null);
});

test('saturated density cannot be below the same soil moist density, including dry water levels',()=>{
 for(const waterDepth of [0,6,20]){
  assert.equal(R.earthPressure({gamma:22,gammaSat:18,waterDepth}).valid,false);
  assert.equal(R.gravityWall({gamma:22,gammaSat:18,waterDepth}).valid,false);
  assert.equal(R.earthPressure({gamma:20,gammaSat:20,waterDepth}).valid,true);
 }
});
