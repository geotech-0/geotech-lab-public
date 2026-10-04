import test from 'node:test';
import assert from 'node:assert/strict';
import {Consolidation as C} from '../src/consolidation.mjs';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} ≠ ${b} within ${t}`);
const h={sigma0:100,preconsolidation:200,sigmaUnload:50,sigmaFinal:300,e0:.8,cc:.3,cr:.05,thickness:6,stage:'reload'};
const p={k:1e-9,mv:.0003,thickness:6,deltaStress:100,timeDays:100,drainage:'double'};
const s={cAlpha:.01,eAtStart:.8,thicknessAtStart:6,startDays:365,endDays:3650};

test('independent drained history benchmark: 50.172 mm heave then 226.263 mm net settlement',()=>{
 const r=C.stressHistory(h);assert.ok(r.valid);
 near(r.stages[1].e,.8150514997831991);near(r.stages[1].settlement*1000,-50.171665943997);
 near(r.stages[2].e,.7321211225000965);near(r.settlementMm,226.262924999678);
 near(r.stepSettlementMm,276.434590943675);assert.equal(r.selected.ocr,1);assert.equal(r.selected.preconsolidation,300);
});
test('each stage displays current stress, OCR and drained reference rather than final state',()=>{
 const initial=C.stressHistory({...h,stage:'initial'}),unload=C.stressHistory({...h,stage:'unload'});
 near(initial.settlement,0);near(initial.selected.ocr,2);near(unload.selected.ocr,4);assert.equal(unload.activePath.length,2);
});
test('closed unloading–reloading loop below preconsolidation returns to e0 without virgin compression',()=>{
 const r=C.stressHistory({...h,sigmaFinal:100});near(r.selected.e,h.e0);near(r.settlement,0);near(r.selected.ocr,2);
 const noExcavation=C.stressHistory({...h,sigmaUnload:100,sigmaFinal:180}),excavation=C.stressHistory({...h,sigmaFinal:180});
 near(noExcavation.selected.e,excavation.selected.e);near(noExcavation.settlement,excavation.settlement);
});
test('unloading uses Cr, not the negative of prior virgin compression with Cc',()=>{
 const r=C.stressHistory({...h,preconsolidation:100,stage:'unload'});
 near(r.settlement,-h.thickness/(1+h.e0)*h.cr*Math.log10(2));
 assert.ok(Math.abs(r.settlement)>0);assert.ok(Math.abs(r.settlement)<h.thickness/(1+h.e0)*h.cc*Math.log10(2));
});
test('preconsolidation transition is continuous; virgin loading has larger tangent compressibility',()=>{
 const at=C.stressHistory({...h,sigmaFinal:200}),lo=C.stressHistory({...h,sigmaFinal:200-1e-6}),hi=C.stressHistory({...h,sigmaFinal:200+1e-6});
 near(lo.selected.e,at.selected.e,1e-8);near(hi.selected.e,at.selected.e,1e-8);assert.ok(hi.tangentMv>lo.tangentMv*5.9);
 near(hi.constrainedModulus*hi.tangentMv,1);
});
test('solid volume H/(1+e) conserved at all history stages',()=>{
 const r=C.stressHistory(h);r.stages.forEach(v=>near(v.thickness/(1+v.e),h.thickness/(1+h.e0)));
});
test('zero rebound index allows an ideal no-rebound model and reports undefined reciprocal modulus',()=>{
 const r=C.stressHistory({...h,cr:0,stage:'unload'});assert.ok(r.valid);near(r.settlement,0);near(r.tangentMv,0);assert.equal(r.constrainedModulus,null);
});
test('history rejects stress reversal, underconsolidated initial state, negative e and missing input',()=>{
 for(const edit of [{sigma0:0},{sigmaUnload:110},{sigmaFinal:25},{preconsolidation:99},{cc:.01,cr:.05},{e0:.001,sigmaFinal:1e5},{cr:-.01},{sigma0:null},{stage:'unload-later'}])assert.equal(C.stressHistory({...h,...edit}).valid,false);
});
test('known Terzaghi factors: T50≈0.196731, T90≈0.848085',()=>{
 near(C.timeFactorForDegree(.5),.196730739524,1e-12);near(C.timeFactorForDegree(.9),.848085408046,1e-12);
 near(C.averageDegree(.197),.5,.001);near(C.averageDegree(.848),.9,.0001);
});
test('independent SI benchmark cv=1e-9/(3e-4×9.81), S∞180mm and t90≈260days',()=>{
 const r=C.primary(p);assert.ok(r.valid);near(r.cv,3.39789330615e-7,1e-18);near(r.cvDays,.0293577981651,1e-12);
 near(r.finalSettlementMm,180);near(r.t90Days,259.991182904,1e-8);near(r.degree,.637489331516,1e-11);near(r.settlementMm,114.748079673,1e-8);
});
test('D01 k doubled halves every same-U time but preserves final settlement',()=>{
 const a=C.primary(p),b=C.primary({...p,k:p.k*2,timeDays:p.timeDays/2});
 near(b.cv/a.cv,2);near(b.t50Days/a.t50Days,.5);near(b.t90Days/a.t90Days,.5);near(a.finalSettlement,b.finalSettlement);near(a.degree,b.degree);near(a.settlement,b.settlement);
});
test('D01 mv doubled doubles final settlement and same-U times with fixed k',()=>{
 const a=C.primary(p),b=C.primary({...p,mv:p.mv*2,timeDays:p.timeDays*2});
 near(b.cv/a.cv,.5);near(b.finalSettlement/a.finalSettlement,2);near(b.t90Days/a.t90Days,2);near(a.degree,b.degree);near(b.settlement/a.settlement,2);
});
test('single drainage takes four times two-face drainage for same U with same actual H',()=>{
 const a=C.primary(p),b=C.primary({...p,drainage:'single',timeDays:p.timeDays*4});
 near(b.hdr/a.hdr,2);near(b.t90Days/a.t90Days,4);near(a.finalSettlement,b.finalSettlement);near(a.degree,b.degree);
});
test('H doubled doubles settlement and quadruples time, distinguishing H from Hdr',()=>{
 const a=C.primary(p),b=C.primary({...p,thickness:p.thickness*2,timeDays:p.timeDays*4});
 near(b.finalSettlement/a.finalSettlement,2);near(b.t90Days/a.t90Days,4);near(a.degree,b.degree);
});
test('load doubled changes pore pressure and settlement, not U or cv in this constant-property model',()=>{
 const a=C.primary(p),b=C.primary({...p,deltaStress:p.deltaStress*2});near(a.degree,b.degree);near(a.cv,b.cv);near(b.settlement/a.settlement,2);near(b.averageExcess/a.averageExcess,2);
});
test('initial, drained-face, no-flow and asymptotic pore-pressure boundary conditions',()=>{
 const r=C.primary({...p,timeDays:0});near(r.degree,0);near(r.settlement,0);near(r.profile[0].excess,0);near(r.profile.at(-1).excess,0);near(r.profile.find(x=>x.depth===3).excess,100);
 const single=C.primary({...p,timeDays:0,drainage:'single'});near(single.profile.at(-1).excess,100);
 for(const tv of [.001,.1,1]){near(C.excessRatio(0,tv),0);near(C.excessRatio(2,tv),0);near(C.excessRatio(.4,tv),C.excessRatio(1.6,tv),1e-12);near(C.excessRatio(1-1e-5,tv),C.excessRatio(1+1e-5,tv),1e-12);}
 near(C.averageDegree(20),1,1e-14);near(C.excessRatio(1,20),0,1e-14);
});
test('profile integral matches settlement-based average degree for both boundary conditions',()=>{
 for(const end of [1,2])for(const tv of [.001,.02,.2,1]){
  const n=2000,dz=end/n;let area=0;for(let i=0;i<=n;i++)area+=(i===0||i===n?1:2)*C.excessRatio(i*dz,tv);area*=dz/2;
  near(1-area/end,C.averageDegree(tv),2e-6);
 }
});
test('early-time image solution agrees with independently summed Fourier solution and transition is continuous',()=>{
 const fourier=(z,t)=>{let u=0;for(let n=1;n<4000;n+=2)u+=4/(Math.PI*n)*Math.sin(n*Math.PI*z/2)*Math.exp(-n*n*Math.PI*Math.PI*t/4);return u;};
 for(const tv of [.0001,.019999999,.02])for(const z of [.001,.05,.3,1,1.95])near(C.excessRatio(z,tv),fourier(z,tv),2e-13);
 near(C.averageDegree(.02-1e-10),C.averageDegree(.02+1e-10),1e-8);
});
test('independent explicit finite-difference diffusion solution matches analytic profile and U',()=>{
 // Solve du/dTv=d²u/dx² over x=0..2, u=0 at both faces, uniform initial interior.
 const n=160,dx=2/n,tv=.12,steps=Math.ceil(tv/(.4*dx*dx)),dt=tv/steps,ratio=dt/(dx*dx);
 let u=Array.from({length:n+1},(_,i)=>i===0||i===n?0:1);
 for(let j=0;j<steps;j++){const next=new Array(n+1).fill(0);for(let i=1;i<n;i++)next[i]=u[i]+ratio*(u[i-1]-2*u[i]+u[i+1]);u=next;}
 for(const i of [8,40,80,120,152])near(u[i],C.excessRatio(i*dx,tv),.00015);
 near(1-u.reduce((sum,v)=>sum+v,0)*dx/2,C.averageDegree(tv),.00015);
});
test('U rises monotonically and pore pressure remains bounded throughout supported time domain',()=>{
 let previous=0;for(const tv of [0,1e-12,1e-8,1e-4,.001,.01,.02,.1,.5,1,10,100]){const U=C.averageDegree(tv);assert.ok(U>=previous&&U<=1);previous=U;for(let i=0;i<=20;i++){const u=C.excessRatio(i/10,tv);assert.ok(u>=0&&u<=1,`${i/10} ${tv} ${u}`);}}
});
test('zero load produces zero settlement and excess pressure, without claiming an observed degree',()=>{
 const r=C.primary({...p,deltaStress:0});assert.ok(r.valid);assert.equal(r.degree,null);near(r.finalSettlement,0);near(r.settlement,0);assert.ok(r.profile.every(v=>v.excess===0));
});
test('primary rejects invalid properties, excessive linear strain and unsupported boundaries',()=>{
 for(const edit of [{k:0},{k:null},{mv:0},{thickness:0},{deltaStress:-1},{timeDays:-1},{gammaW:0},{drainage:'radial'},{mv:.01},{timeDays:Infinity}])assert.equal(C.primary({...p,...edit}).valid,false);
 assert.throws(()=>C.averageDegree(-1));assert.throws(()=>C.excessRatio(3,.1));assert.throws(()=>C.timeFactorForDegree(1));
});
test('secondary independent one-decade example: Δe0.01, 33.333mm, final e0.79',()=>{
 const r=C.secondary(s);assert.ok(r.valid);near(r.logCycles,1);near(r.deltaE,.01);near(r.settlementMm,33.3333333333,1e-9);near(r.endE,.79);
});
test('secondary equal logarithmic time intervals create equal additional settlements',()=>{
 const one=C.secondary(s),two=C.secondary({...s,endDays:s.endDays*10});near(two.settlement,one.settlement*2);
 const zero=C.secondary({...s,endDays:s.startDays});near(zero.settlement,0);near(zero.endE,s.eAtStart);
 const ca0=C.secondary({...s,cAlpha:0});near(ca0.settlement,0);
});
test('secondary explicitly uses thickness and e at the same reference time',()=>{
 const a=C.secondary(s),b=C.secondary({...s,cAlpha:s.cAlpha*2}),c=C.secondary({...s,thicknessAtStart:s.thicknessAtStart*2});
 near(b.settlement,2*a.settlement);near(c.settlement,2*a.settlement);near(a.thicknessAtStart/(1+a.eAtStart),(a.thicknessAtStart-a.settlement)/(1+a.endE));
});
test('secondary rejects log-zero, reversed time, missing values and negative predicted void ratio',()=>{
 for(const edit of [{startDays:0},{endDays:100},{endDays:null},{cAlpha:-.01},{cAlpha:1,eAtStart:.1},{thicknessAtStart:0}])assert.equal(C.secondary({...s,...edit}).valid,false);
});
