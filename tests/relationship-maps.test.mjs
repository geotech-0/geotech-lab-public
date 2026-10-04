import test from 'node:test';
import assert from 'node:assert/strict';
import {RelationshipMaps} from '../src/relationship-maps.mjs';
import {Mechanics} from '../src/mechanics.mjs';
import {Consolidation} from '../src/consolidation.mjs';
import {CohesivePressure} from '../src/cohesive-pressure.mjs';
const maps=RelationshipMaps.create({mechanics:Mechanics,consolidation:Consolidation,cohesive:CohesivePressure});
const stress={soilProfile:'homogeneous',waterDepth:2,surcharge:25,depth:5,gammaMoist:18,gammaSat:20,gammaW:9.81};
const foot={width:3,load:1200,pressure:1200/9,loadMode:'force',embedment:0,phi:32,cohesion:0,gamma:18,modulus:25000,poisson:.3};
const cons={k:1e-9,mv:.0003,thickness:6,deltaStress:100,timeDays:100,drainage:'double',gammaW:9.81};
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('water and load hand combination includes moist-to-saturated weight replacement',()=>{const m=maps.model('stress',stress,'profile');near(m.evaluate(2,25).value,91.57);near(m.evaluate(1,75).value,133.76);});
test('water below observation produces a plateau, while surcharge remains linear',()=>{const m=maps.model('stress',stress,'profile');near(m.evaluate(5,25).value,m.evaluate(8,25).value);near(m.evaluate(5,75).value-m.evaluate(5,25).value,50);});
test('layer boundaries and source inputs are preserved by sampling',()=>{const d={...stress,soilProfile:'layered',layerDepth:3,gammaMoist2:19,gammaSat2:21},before=structuredClone(d),m=maps.model('stress',d,'profile');for(const c of m.sample(5).cells)near(c.value,Mechanics.effectiveStress({...d,waterDepth:c.x,surcharge:c.y}).effective);assert.deepEqual(d,before);});
test('force vs pressure axis mode gives opposite width relationships',()=>{let m=maps.model('foundation',foot,'pressure');near(m.evaluate(6,1200).value,m.evaluate(3,1200).value/4);m=maps.model('foundation',{...foot,loadMode:'pressure'},'pressure');near(m.evaluate(6,100).value,m.evaluate(3,100).value*4);});
test('settlement changes with both axes and invalid bearing cells are masked',()=>{const m=maps.model('foundation',foot,'settlement');near(m.evaluate(6,1200).value,m.evaluate(3,1200).value/2);near(m.evaluate(3,600).value,m.evaluate(3,1200).value/2);const weak=maps.model('foundation',{...foot,phi:20},'settlement');assert.equal(weak.evaluate(1.5,3000).valid,false);assert.equal(weak.evaluate(3,0).value,0);});
test('fixed pressure settlement grows with width',()=>{const m=maps.model('foundation',{...foot,loadMode:'pressure'},'settlement');near(m.evaluate(6,50).value,m.evaluate(3,50).value*2);});
test('bearing surface is unchanged by applied load and responds to friction and width',()=>{const a=maps.model('foundation',foot,'bearing'),b=maps.model('foundation',{...foot,load:2400},'bearing');near(a.evaluate(3,32).value,b.evaluate(3,32).value);assert.ok(a.evaluate(3,40).value>a.evaluate(3,30).value);near(a.evaluate(6,32).value,a.evaluate(3,32).value*2);});
test('t90 scales inversely with k and with square of actual layer thickness',()=>{const m=maps.model('consolidation',cons,'primary');near(m.evaluate(2e-9,6).value,m.evaluate(1e-9,6).value/2);near(m.evaluate(1e-9,12).value,m.evaluate(1e-9,6).value*4);});
test('single drainage has four times t90 for same actual thickness',()=>{near(maps.model('consolidation',{...cons,drainage:'single'},'primary').evaluate(1e-9,6).value,maps.model('consolidation',cons,'primary').evaluate(1e-9,6).value*4);});
test('no-load or invalid fixed conditions never produce a plausible surface',()=>{assert.equal(maps.model('consolidation',{...cons,deltaStress:0},'primary').sample(3).min,null);assert.equal(maps.model('stress',{...stress,gammaSat:3},'profile').sample(3).min,null);});
test('numeric guards reject nonfinite and outside ranges; no clamping into valid output',()=>{const m=maps.model('stress',stress,'profile');for(const x of [NaN,Infinity,-1,9])assert.equal(m.evaluate(x,20).valid,false);assert.throws(()=>m.sample(100));});
test('log axis interpolation is multiplicative and invertible',()=>{const a=maps.model('consolidation',cons,'primary').x;near(RelationshipMaps.at(a,.5),Math.sqrt(a.min*a.max),1e-20);for(const t of [0,.2,.5,1])near(RelationshipMaps.fraction(a,RelationshipMaps.at(a,t)),t);});
test('unrelated questions do not receive meaningless relationship maps',()=>{assert.equal(maps.model('soil',{},'plasticity'),null);assert.equal(maps.model('consolidation',cons,'secondary'),null);});

test('expanded log axis preserves exact endpoint and never masks rounding outside',()=>{const m=maps.model('consolidation',{...cons,k:3e-6},'primary');assert.equal(RelationshipMaps.at(m.x,1),m.x.max);assert.ok(m.sample(3).cells.every(c=>c.valid));});

test('cohesive surface is an exact clipped pressure integral and zero contact stays valid',()=>{const m=maps.model('earth-pressure',{height:6,phi:30,gamma:18,cohesion:12,surcharge:10},'cohesive');near(m.evaluate(0,0).value,108);near(m.evaluate(0,30).value,168);const z=2*12*Math.sqrt(3)/18;near(m.evaluate(12,0).value,3*(6-z)**2);assert.deepEqual(m.evaluate(60,0).valid,true);near(m.evaluate(60,0).value,0);assert.ok(m.evaluate(12,50).value>m.evaluate(12,10).value);});
test('cohesive map fixed height and strength survive applying selected pair',()=>{const d={height:7,phi:35,gamma:19,cohesion:12,surcharge:10,waterDepth:null},m=maps.model('earth-pressure',d,'cohesive');const r=m.evaluate(20,30);assert.equal(r.valid,true);assert.equal(r.input.height,7);assert.equal(r.input.phi,35);assert.equal(r.input.waterDepth,null);assert.equal(maps.model('earth-pressure',d,'pressure'),null);});
