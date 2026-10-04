import test from 'node:test';
import assert from 'node:assert/strict';
import {Mechanics as M} from '../src/mechanics.mjs';

const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const valid=r=>{assert.equal(r.valid,true,r.errors?.join(';'));return r;};
const absent=(r,keys)=>keys.forEach(k=>assert.equal(Object.hasOwn(r,k),false,`${k} must not be calculated`));
const strengthKeys=['phi','cohesion','gamma','nq','nc','ngamma','shapeFactors','bearingTerms','overburden','ultimateGross','ultimateNet','bearingExceeded','bearingSource'];
const elasticKeys=['modulus','poisson','influenceFactor','settlementMm','settlementApplicable','settlementLocation'];

test('pressure hand calculation uses only selected force and square dimensions',()=>{
 const r=valid(M.foundationForQuestion({width:2,load:400,pressure:null,phi:null,cohesion:NaN,gamma:-1,modulus:null,poisson:Infinity},'pressure'));
 near(r.area,4);near(r.pressure,100);near(r.load,400);near(r.netPressure,100);
 assert.deepEqual(r.warnings,[]);absent(r,[...strengthKeys,...elasticKeys]);
 const wider=valid(M.foundationForQuestion({width:4,load:400},'pressure'));
 near(wider.pressure,25);near(wider.area,16);
});
test('pressure-controlled loading ignores invalid inactive force',()=>{
 const r=valid(M.foundationForQuestion({width:4,loadMode:'pressure',pressure:100,load:NaN,modulus:0},'pressure'));
 near(r.area,16);near(r.load,1600);near(r.pressure,100);
});
test('default question is pressure and does not invent omitted material properties',()=>{
 const r=valid(M.foundationForQuestion({width:3,load:900}));
 near(r.pressure,100);absent(r,[...strengthKeys,...elasticKeys]);
 assert.ok(!r.conditions.some(x=>/탄성|일반전단/.test(x)));
});
test('bearing agrees with independent rounded FHWA example without reading E or ν',()=>{
 const r=valid(M.foundationForQuestion({width:3,phi:30,cohesion:0,gamma:18,modulus:null,poisson:NaN},'bearing'));
 // Published Nγ=22.4 and square sγ=.6: .5*18*3*22.4*.6=362.88 kPa.
 near(r.ultimateGross,362.88,.1);near(r.nq,18.4,.05);near(r.nc,30.1,.05);
 assert.equal(r.bearingExceeded,false);absent(r,elasticKeys);
});
test('bearing phi-zero branch and overload flag do not manufacture a settlement',()=>{
 const r=valid(M.foundationForQuestion({width:2,phi:0,cohesion:50,load:1600,modulus:-10,poisson:1},'bearing'));
 near(r.ultimateGross,50*(Math.PI+2)*1.2);near(r.pressure,400);
 assert.equal(r.bearingExceeded,true);assert.ok(r.warnings.length);absent(r,elasticKeys);
 const zero=valid(M.foundationForQuestion({load:0,phi:0,cohesion:0},'bearing'));
 near(zero.ultimateGross,0);assert.equal(zero.bearingExceeded,false);
});
test('settlement retains independent centre coefficient benchmark and bearing applicability',()=>{
 const r=valid(M.foundationForQuestion({width:2,loadMode:'pressure',pressure:100,modulus:20000,poisson:.3},'settlement'));
 // Independent tabulated Is=1.12 gives 10.192 mm; exact integrated coefficient rounds to that table.
 near(r.settlementMm,10.192,.025);assert.equal(r.settlementApplicable,true);
 assert.equal(r.settlementLocation,'center');assert.ok(r.ultimateGross>r.pressure);
 const excessive=valid(M.foundationForQuestion({width:1,load:1200},'settlement'));
 assert.equal(excessive.bearingExceeded,true);assert.equal(excessive.settlementApplicable,false);
 assert.ok(excessive.warnings.length);
});
test('settlement still requires elastic and strength properties, including its applicability check',()=>{
 for(const changed of [{modulus:null},{modulus:0},{poisson:null},{poisson:.5},{phi:null},{cohesion:-1},{gamma:0}]){
  const r=M.foundationForQuestion(changed,'settlement');assert.equal(r.valid,false);assert.ok(r.errors.length);absent(r,['pressure','ultimateGross','settlementMm']);
 }
});
test('hidden-error transitions preserve inputs and unblock only unrelated questions',()=>{
 const input=Object.freeze({width:3,load:900,phi:30,cohesion:0,gamma:18,modulus:null,poisson:.3});
 assert.equal(M.foundationForQuestion(input,'settlement').valid,false);
 const bearing=valid(M.foundationForQuestion(input,'bearing')),pressure=valid(M.foundationForQuestion(input,'pressure'));
 near(bearing.pressure,100);near(pressure.pressure,100);assert.equal(input.modulus,null);
 assert.equal(M.foundationForQuestion(input,'settlement').valid,false);
 const badStrength={...input,phi:null};
 assert.equal(M.foundationForQuestion(badStrength,'bearing').valid,false);
 assert.equal(M.foundationForQuestion(badStrength,'pressure').valid,true);
});
test('inactive properties are not even read, rather than replaced with fallback values',()=>{
 const p={width:2,load:400};
 for(const k of ['phi','cohesion','gamma','modulus','poisson'])Object.defineProperty(p,k,{get(){throw Error('inactive '+k+' was read');}});
 near(valid(M.foundationForQuestion(p,'pressure')).pressure,100);
 const b={width:2,load:400,phi:30,cohesion:0,gamma:18};
 for(const k of ['modulus','poisson'])Object.defineProperty(b,k,{get(){throw Error('inactive '+k+' was read');}});
 valid(M.foundationForQuestion(b,'bearing'));
});
test('inactive extreme values cannot trigger an unrelated numerical overflow',()=>{
 valid(M.foundationForQuestion({gamma:1e308,cohesion:1e308,modulus:Number.MIN_VALUE},'pressure'));
 valid(M.foundationForQuestion({modulus:Number.MIN_VALUE},'bearing'));
 assert.equal(M.foundationForQuestion({modulus:Number.MIN_VALUE},'settlement').valid,false);
});
test('all questions reject unsupported geometry, active load errors, and malformed input',()=>{
 for(const q of ['pressure','bearing','settlement'])for(const input of [null,[],5,{width:null},{width:0},{width:'3'},{length:4},{embedment:null},{embedment:1},{waterDepth:5},{loadMode:'other'},{load:null},{load:-1},{load:Infinity},{loadMode:'pressure',pressure:null},{width:1e200},{width:Number.MIN_VALUE}]){
  const r=M.foundationForQuestion(input,q);assert.equal(r.valid,false,`${q}: ${JSON.stringify(input)}`);assert.ok(r.errors.length);absent(r,['pressure','ultimateGross','settlementMm']);
 }
 for(const q of [null,'', 'soil',1])assert.equal(M.foundationForQuestion({},q).valid,false);
});
test('question results share exactly the legacy valid numerical values in both load modes',()=>{
 const fields=['width','length','embedment','area','load','pressure','netPressure'];
 for(const width of [1.5,3,6])for(const phi of [0,30,45])for(const loadMode of ['force','pressure']){
  const d={width,phi,cohesion:10,gamma:18,modulus:25000,poisson:.3,loadMode,load:900,pressure:100};
  const old=valid(M.foundation(d)),p=valid(M.foundationForQuestion(d,'pressure')),b=valid(M.foundationForQuestion(d,'bearing')),s=valid(M.foundationForQuestion(d,'settlement'));
  for(const key of fields){near(p[key],old[key]);near(b[key],old[key]);near(s[key],old[key]);}
  for(const key of ['nc','nq','ngamma','ultimateGross','ultimateNet'])near(b[key],old[key]);
  assert.deepEqual(s,old);assert.deepEqual(b.bearingTerms,old.bearingTerms);
 }
});
test('legacy full-model API continues rejecting missing explicit elastic values',()=>{
 assert.equal(M.foundation({modulus:null}).valid,false);
 assert.equal(M.foundation({poisson:null}).valid,false);
 assert.equal(M.foundation().valid,true);
});
