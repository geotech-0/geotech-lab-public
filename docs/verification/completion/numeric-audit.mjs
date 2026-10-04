import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Mechanics} from '../../../src/mechanics.mjs';
import {FoundationConditions} from '../../../src/foundation-conditions.mjs';
import {Soil} from '../../../src/soil.mjs';
import {SoilInputs} from '../../../src/soil-inputs.mjs';
let seed=92327;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);let checks=0,maxStressError=0,maxForceError=0,maxMomentError=0;
// Independent uniform midpoint integration of piecewise gravity loads; no engine profile used.
for(let k=0;k<500;k++){
 const gammaMoist=14+8*rand(),gammaSat=Math.max(gammaMoist,18+8*rand()),gammaMoist2=14+8*rand(),gammaSat2=Math.max(gammaMoist2,18+8*rand());
 const d={soilProfile:'layered',depth:.01+7.99*rand(),waterDepth:8*rand(),layerDepth:8*rand(),surcharge:120*rand(),gammaMoist,gammaSat,gammaMoist2,gammaSat2,gammaW:9.81};
 const r=Mechanics.effectiveStress(d);assert.equal(r.valid,true);
 const n=20000,h=d.depth/n;let integrated=d.surcharge;
 for(let i=0;i<n;i++){const z=(i+.5)*h;integrated+=h*(z<d.layerDepth?(z<d.waterDepth?gammaMoist:gammaSat):(z<d.waterDepth?gammaMoist2:gammaSat2));}
 maxStressError=Math.max(maxStressError,Math.abs(r.total-integrated));near(r.total,integrated,.00002);near(r.total-r.pore,r.effective);near(r.pore,9.81*Math.max(0,d.depth-d.waterDepth));
 const extra=Mechanics.effectiveStress({...d,surcharge:d.surcharge+12.5});near(extra.effective-r.effective,12.5);near(extra.pore,r.pore);checks+=5;
}
// Integrate returned contact-pressure polygon independently by exact trapezoid force and linear-pressure moment.
for(let k=0;k<500;k++){
 const d={width:.5+8*rand(),length:.5+8*rand(),load:1+5999*rand(),eccentricityRatio:(rand()-.5)*.98};const r=FoundationConditions.contact(d);assert.equal(r.valid,true);let force=0,moment=0;
 for(let i=1;i<r.profile.length;i++){const a=r.profile[i-1],b=r.profile[i],h=b.x-a.x; if((a.x+b.x)/2<r.start||(a.x+b.x)/2>r.end)continue;force+=h*(a.pressure+b.pressure)/2*d.length;moment+=h/6*((2*a.x+b.x)*a.pressure+(a.x+2*b.x)*b.pressure)*d.length;}
 maxForceError=Math.max(maxForceError,Math.abs(force-d.load));maxMomentError=Math.max(maxMomentError,Math.abs(moment-d.load*d.width*d.eccentricityRatio));near(force,d.load);near(moment,d.load*d.width*d.eccentricityRatio);checks+=2;
}
// Scale/dimensional identities for square elastic settlement at force-constant versus pressure-constant loading.
for(let k=0;k<200;k++){
 const d={width:1.5+1.5*rand(),load:50+100*rand(),phi:20+22*rand(),cohesion:5+20*rand(),gamma:14+10*rand(),modulus:5000+75000*rand(),poisson:.3};const a=Mechanics.foundationForQuestion(d,'settlement'),b=Mechanics.foundationForQuestion({...d,width:d.width*2},'settlement'),c=Mechanics.foundationForQuestion({...d,width:d.width*2,loadMode:'pressure',pressure:a.pressure},'settlement');
 assert.equal(a.valid&&b.valid&&c.valid,true);near(b.pressure,a.pressure/4);near(b.settlementMm,a.settlementMm/2);near(c.load,a.load*4);near(c.settlementMm,a.settlementMm*2);near((b.ultimateGross-b.bearingTerms.cohesion),2*(a.ultimateGross-a.bearingTerms.cohesion));checks+=5;
}
const points=[{size:.02,passing:2},{size:.05,passing:5},{size:.1,passing:10},{size:.3,passing:30},{size:1,passing:60},{size:4.75,passing:90},{size:19,passing:100}];
const d={mode:'raw',points,ll:32,pl:22};const original=Soil.classify(d);const context={SoilInputs,getPoints:d=>d.points};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../../../src/learning-soil.js',import.meta.url),'utf8'),context);context.d=d;const converted=vm.runInContext('soilMassData(d)',context);const after=Soil.classify({...d,points:converted.points});
assert.equal(converted.valid,true);assert.equal(after.symbol,original.symbol);near(after.fines,original.fines);
const result={checks,maxStressError,maxForceError,maxMomentError,classificationMassConversion:{original:{valid:original.valid,symbol:original.symbol,fines:original.fines},converted:{valid:converted.valid,panPercent:converted.panPercent,minSieve:converted.points[0].size},after:{valid:after.valid,symbol:after.symbol,fines:after.fines,errors:after.errors}}};
console.log(JSON.stringify(result,null,2));fs.writeFileSync(new URL('./numeric-audit-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
