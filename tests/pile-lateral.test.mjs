import test from 'node:test';
import assert from 'node:assert/strict';
import {PileLateral as P} from '../src/pile-lateral.mjs';
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const relative=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<=tol*Math.abs(b),`${a} != ${b}`);
const valid=args=>{const r=P.solve(args);assert.ok(r.valid,r.errors?.join(' '));return r;};

test('zero support with fixed toe recovers free-head cantilever at every depth',()=>{
  const L=10,EI=300000,F=60,r=valid({length:L,EI,load:F,soilModulus:0,tip:'fixed'});
  close(r.headDisplacement,F*L**3/(3*EI));close(r.headRotation,-F*L**2/(2*EI));
  close(r.tipForce,-F);close(r.tipMoment,F*L);close(r.headInternalMoment,0);
  for(const v of r.profile){close(v.displacement,F*(2*L**3-3*L**2*v.z+v.z**3)/(6*EI));close(v.moment,F*v.z);close(v.shear,F);}
});
test('rotation-fixed head and fixed toe recover sidesway beam limit',()=>{
  const L=10,EI=300000,F=60,r=valid({length:L,EI,load:F,soilModulus:0,tip:'fixed',head:'fixed'});
  close(r.headDisplacement,F*L**3/(12*EI));close(r.headRotation,0);close(r.headInternalMoment,-F*L/2);close(r.tipMoment,F*L/2);
  for(const v of r.profile){const t=v.z/L;close(v.displacement,r.headDisplacement*(1-3*t*t+2*t**3));close(v.moment,F*(v.z-L/2));}
});
test('long uniform pile matches independent exponential free-head solution',()=>{
  const EI=10000,k=40000,F=100,beta=(k/(4*EI))**.25,r=valid({length:16,EI,soilModulus:k,load:F,elements:128});
  const w0=F/(2*EI*beta**3);
  relative(r.headDisplacement,w0,2e-6);relative(r.headRotation,-beta*w0,2e-6);
  relative(r.maxMoment,F/beta*Math.exp(-Math.PI/4)/Math.sqrt(2),1e-5);
  close(r.maxMomentDepth,Math.PI/(4*beta),1e-4);
  for(const v of r.profile.filter(p=>p.z<8))close(v.displacement,w0*Math.exp(-beta*v.z)*Math.cos(beta*v.z),2e-8);
});
test('long rotation-fixed pile matches independent decaying solution',()=>{
  const EI=10000,k=40000,F=100,beta=1,r=valid({length:16,EI,soilModulus:k,load:F,head:'fixed',elements:128});
  const w0=F/(4*EI*beta**3);
  relative(r.headDisplacement,w0,2e-6);close(r.headRotation,0);relative(r.headInternalMoment,-F/(2*beta),1e-6);
  for(const v of r.profile.filter(p=>p.z<8))close(v.displacement,w0*Math.exp(-v.z)*(Math.cos(v.z)+Math.sin(v.z)),2e-8);
});
test('free end actions and constrained kinematics satisfy both boundaries',()=>{
  for(const head of ['free','fixed'])for(const tip of ['free','fixed']){
    const r=valid({head,tip}),top=r.profile[0],end=r.profile.at(-1);
    close(top.shear,r.load);if(head==='free')close(top.moment,0);else close(r.headRotation,0);
    if(tip==='free'){close(end.moment,0);close(end.shear,0);}else{close(end.displacement,0);close(end.rotation,0);close(end.moment,r.tipMoment);close(end.shear,-r.tipForce);}
  }
});
test('integrated support force and moment balance external loads and head reaction',()=>{
  for(const head of ['free','fixed'])for(const tip of ['free','fixed']){
    const r=valid({head,tip});close(r.load+r.soilForce+r.tipForce,0,1e-7);close(r.headReactionMoment+r.soilMoment+r.tipForce*r.length+r.tipMoment,0,1e-7);
    assert.ok(r.relativeResidual<1e-8);close(r.headReactionMoment,-r.headInternalMoment,1e-7);
  }
});
test('equilibrium-recovered internal forces are continuous at every interface',()=>{
  const r=valid({head:'fixed'});
  for(let e=0;e<r.elements-1;e++){
    const a=r.profile[e*9+8],b=r.profile[(e+1)*9];close(a.z,b.z);close(a.moment,b.moment,1e-7);close(a.shear,b.shear,1e-7);close(a.displacement,b.displacement);close(a.rotation,b.rotation);
  }
});
test('strain and support energy integrate to external work',()=>{
  const r=valid({head:'fixed',tip:'fixed'});let energy=0;
  for(const e of r.elementResults){const a=e.coefficients,h=e.length;
    energy+=.5*r.EI/h**3*(4*a[2]**2+12*a[2]*a[3]+12*a[3]**2);
    for(let i=0;i<4;i++)for(let j=0;j<4;j++)energy+=.5*r.soilModulus*h*a[i]*a[j]/(i+j+1);
  }
  close(energy,.5*r.load*r.headDisplacement);close(energy,r.strainEnergy);
});
test('linear scaling doubles displacement, moment and reaction; energy quadruples',()=>{
  const a=valid({load:50,head:'fixed'}),b=valid({load:100,head:'fixed'});
  close(b.headDisplacement,2*a.headDisplacement);close(b.maxMoment,2*a.maxMoment);close(b.headReactionMoment,2*a.headReactionMoment);close(b.strainEnergy,4*a.strainEnergy);
});
test('uniformly scaling both stiffnesses leaves moments and divides displacements',()=>{
  const a=valid({}),b=valid({EI:400000,soilModulus:10000});
  close(b.characteristicLength,a.characteristicLength);close(b.headDisplacement,a.headDisplacement/2);close(b.maxMoment,a.maxMoment);
});
test('head rotation restraint reduces translation without imposing zero translation',()=>{
  const free=valid({head:'free'}),fixed=valid({head:'fixed'});
  assert.ok(fixed.headDisplacement>0&&fixed.headDisplacement<free.headDisplacement);
  close(fixed.headRotation,0);assert.ok(fixed.maxMoment>free.maxMoment);
});
test('mesh refinement converges against closed solution and exposes error estimates',()=>{
  const args={length:16,EI:10000,soilModulus:40000,load:100};
  const a=valid({...args,elements:32}),b=valid({...args,elements:64}),c=valid({...args,elements:128});
  assert.ok(Math.abs(c.headDisplacement-.005)<Math.abs(b.headDisplacement-.005));
  assert.ok(Math.abs(b.headDisplacement-.005)<Math.abs(a.headDisplacement-.005));
  close(b.meshHeadRelative,Math.abs(b.headDisplacement-a.headDisplacement)/Math.abs(b.headDisplacement));
  assert.equal(P.solve({...args,elements:4}).valid,false);
});
test('zero force gives exactly zero state including diagnostics',()=>{
  const r=valid({load:0});close(r.headDisplacement,0);close(r.maxMoment,0);close(r.soilForce,0);close(r.meshHeadRelative,0);close(r.strainEnergy,0);
});
test('UI stiffness-length corner cases converge under both end conditions',()=>{
  for(const length of [3,30])for(const EI of [10000,1000000])for(const soilModulus of [200,20000])for(const head of ['free','fixed'])for(const tip of ['free','fixed'])valid({length,EI,soilModulus,head,tip,load:500});
});
test('invalid support, boundaries and values are rejected, never silently clamped',()=>{
  for(const input of [null,[],{length:0},{EI:-1},{soilModulus:-1},{load:NaN},{load:-1},{head:'pinned'},{tip:'pinned'},{elements:3},{elements:64.5},{soilModulus:0,tip:'free'}])assert.equal(P.solve(input).valid,false);
});
