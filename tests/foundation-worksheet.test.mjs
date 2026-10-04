import test from 'node:test';
import assert from 'node:assert/strict';
import {FoundationWorksheet} from '../src/foundation-worksheet.mjs';
import {FoundationConditions} from '../src/foundation-conditions.mjs';
import {BearingExtensions} from '../src/bearing-extensions.mjs';
const deps={FoundationConditions,BearingExtensions},evaluate=x=>FoundationWorksheet.evaluate(x,deps),example=()=>FoundationWorksheet.example(),near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} != ${b}`);

test('dry representative case closes the independently tabulated weight and stress ledger',()=>{
 const r=evaluate(example()),c=r.cases[0];assert.equal(r.valid,true);assert.equal(c.valid,true);near(c.ledger.area,12);near(c.ledger.footingWeight,86.4);near(c.ledger.coverWeight,151.2);near(c.ledger.downwardLoad,1437.6);near(c.ledger.originalTotal,18);near(c.ledger.grossTotal,119.8);near(c.ledger.netIncrement,101.8);near(c.bearingCheck.demandGross,119.8);
});
test('gross FS and net display are distinct and do not silently change the allowable convention',()=>{
 const c=evaluate(example()).cases[0],b=c.bearingCheck;near(b.allowableGross,b.ultimateGross/3);near(b.allowableNet,b.allowableGross-b.originalEffective);near(b.achievedFS,b.ultimateGross/b.demandGross);assert.ok(Math.abs(b.allowableNet-b.ultimateNet/3)>1);near(b.allowableGross-b.demandGross,b.allowableNet-b.demandNet);
});
test('dry moment uses the actual total base resultant, with independently integrated force/moment',()=>{
 const input=example();input.combinations[0].moment=180;const c=evaluate(input).cases[0];near(c.contact.eccentricity,180/1437.6);near(c.contact.effectiveWidth,3-360/1437.6);let V=0,M=0;for(let i=1;i<c.contact.profile.length;i++){const a=c.contact.profile[i-1],b=c.contact.profile[i],h=b.x-a.x;V+=4*h*(a.pressure+b.pressure)/2;M+=4*h*((2*a.x+b.x)*a.pressure+(a.x+2*b.x)*b.pressure)/6;}near(V,1437.6);near(M,180);assert.equal(c.bearingCheck.status,'within-user-limit');
});
test('wet centred case subtracts full-area uplift once and matches source pressure identity',()=>{
 const input=example();input.soil.waterDepth=.5;const c=evaluate(input).cases[0];near(c.ledger.originalTotal,19);near(c.ledger.baseWaterPressure,4.905);near(c.ledger.coverWeight,156);near(c.ledger.downwardLoad,1442.4);near(c.ledger.uplift,58.86);near(c.ledger.effectiveLoad,1383.54);near(c.bearingCheck.demandGross,1442.4/12-4.905);near(c.bearingCheck.originalEffective,14.095);near(c.bearingCheck.demandNet,101.2);
});
test('wet eccentric case does not pass off a different equilibrium convention as literal USACE Eq.5-2',()=>{
 const input=example();input.soil.waterDepth=.5;input.combinations[0].moment=180;const c=evaluate(input).cases[0];assert.equal(c.valid,true);assert.equal(c.contact.valid,true);assert.equal(c.bearing,null);assert.equal(c.bearingCheck.status,'not-evaluated');assert.ok(c.bearingCheck.reason.includes('5-2'));
});
test('same physical case with reversed moment mirrors contact without changing dry resistance',()=>{
 const a=example(),b=example();a.combinations[0].moment=180;b.combinations[0].moment=-180;const r=evaluate(a).cases[0],s=evaluate(b).cases[0];near(r.contact.qMax,s.contact.qMax);near(r.contact.eccentricity,-s.contact.eccentricity);near(r.bearing.ultimateEffective,s.bearing.ultimateEffective);
});
test('exact user FS boundary and a real load exceedance have distinct states',()=>{
 const a=example(),r=evaluate(a).cases[0];a.combinations[0].columnLoad=r.bearingCheck.allowableGross*12-r.ledger.footingWeight-r.ledger.coverWeight;let x=evaluate(a).cases[0];near(x.bearingCheck.achievedFS,3);assert.equal(x.bearingCheck.status,'within-user-limit');a.combinations[0].columnLoad+=1;x=evaluate(a).cases[0];assert.equal(x.bearingCheck.status,'exceeds-user-limit');
});
test('deep effective embedment retains ledger/contact but does not return an out-of-scope resistance',()=>{
 const a=example();a.geometry.embedment=3;a.combinations[0].moment=180;const c=evaluate(a).cases[0];assert.equal(c.valid,true);assert.equal(c.contact.valid,true);assert.equal(c.bearing,null);assert.equal(c.bearingCheck.status,'not-evaluated');
});
test('eccentricity outside the footprint cannot yield a fake pressure or pass',()=>{
 const a=example();a.combinations[0].moment=10000;const c=evaluate(a).cases[0];assert.equal(c.valid,false);assert.equal(c.contact,null);assert.equal(c.bearingCheck,null);assert.equal(c.ledger.valid,true);
});
test('no settlement value is manufactured; adopting an external result requires value, limit and source',()=>{
 const a=example();assert.equal(evaluate(a).settlement.status,'not-evaluated');a.settlement={adoptedSettlementMm:12,limitMm:25,source:''};assert.equal(evaluate(a).settlement.status,'not-evaluated');a.settlement.source='별도 침하 계산서 S-01 Rev.A';let r=evaluate(a);assert.equal(r.settlement.status,'within-user-limit');near(r.settlement.ratio,.48);a.settlement.adoptedSettlementMm=26;assert.equal(evaluate(a).settlement.status,'exceeds-user-limit');
});
test('source omissions remain explicit and draft inputs never become default calculations',()=>{
 const a=example(),r=evaluate(a);assert.equal(r.provenance.complete,false);assert.ok(r.provenance.missing.includes('soilSource'));a.soil.phi=null;assert.equal(evaluate(a).valid,false);a.soil.phi=NaN;assert.equal(evaluate(a).valid,false);assert.equal(evaluate(null).valid,false);
});
test('duplicate combinations, unsupported method and FS are rejected without mutating inputs',()=>{
 const a=example(),copy=JSON.stringify(a);evaluate(a);assert.equal(JSON.stringify(a),copy);a.combinations.push({...a.combinations[0]});assert.equal(evaluate(a).valid,false);const b=example();b.method='terzaghi';assert.equal(evaluate(b).valid,false);const c=example();c.requiredFS=1;assert.equal(evaluate(c).valid,false);
});

test('representative 30-degree resistance agrees with independently tabulated intermediate numbers',()=>{
 const c=evaluate(example()).cases[0];near(c.bearing.factors.nq,18.40112221870868);near(c.bearing.factors.ng,22.402486271104568);near(c.bearing.factors.sq,1+.75/Math.sqrt(3));near(c.bearing.factors.sg,.7);near(c.bearing.terms.surcharge,518.7282297787037);near(c.bearing.terms.weight,470.45221169319586);near(c.bearingCheck.ultimateGross,989.1804414718996);near(c.bearingCheck.allowableGross,329.72681382396655);near(c.bearingCheck.allowableNet,311.72681382396655);
});
