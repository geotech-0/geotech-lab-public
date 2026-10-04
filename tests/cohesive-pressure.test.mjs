import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {CohesivePressure as C} from '../src/cohesive-pressure.mjs';
import {Retaining as R} from '../src/retaining.mjs';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} ≠ ${b}`);
test('c=0 recovers independently integrated dry Rankine triangle plus surcharge rectangle',()=>{
 const c=C.active({cohesion:0}),r=R.earthPressure({waterDepth:6});
 near(c.ka,1/3);near(c.force,128);near(c.moment,276);near(c.force,r.force);near(c.resultantHeight,r.resultantHeight);near(c.crackDepth,0);near(c.removedTensionForce,0);
});
test('frictionless c-phi limit has a 2 m gap and a 4 m pressure triangle',()=>{
 const r=C.active({height:6,phi:0,gamma:20,surcharge:0,cohesion:20});
 assert.ok(r.valid);near(r.ka,1);near(r.crackDepth,2);near(r.base.pressure,80);near(r.force,160);near(r.moment,640/3);near(r.resultantHeight,4/3);near(r.rawForce,120);near(r.removedTensionForce,40);
});
test('combined surcharge and cohesion hand example uses the shifted zero, not the no-surcharge crack',()=>{
 const r=C.active({height:6,phi:30,gamma:18,surcharge:12,cohesion:4*Math.sqrt(3)});
 near(r.crackDepth,2/3);near(r.force,256/3);near(r.moment,4096/27);near(r.resultantHeight,16/9);near(r.rawForce,84);near(r.removedTensionForce,4/3);
});
test('large surcharge produces a complete positive trapezoid with a centroid above H/3',()=>{
 const r=C.active({height:6,phi:0,gamma:20,surcharge:80,cohesion:20});
 near(r.top.pressure,40);near(r.base.pressure,160);near(r.crackDepth,0);near(r.force,600);near(r.moment,1440);near(r.resultantHeight,2.4);assert.equal(r.contact,'full');
});
test('zero exactly at ground surface is a full-height triangle without artificial crack',()=>{
 const r=C.active({height:6,phi:0,gamma:20,surcharge:40,cohesion:20});
 near(r.crackDepth,0);near(r.top.pressure,0);near(r.force,360);near(r.resultantHeight,2);
});
test('zero exactly at the wall base means no force and no defined point of application',()=>{
 const r=C.active({height:6,phi:0,gamma:20,surcharge:0,cohesion:60});
 near(r.potentialCrackDepth,6);near(r.force,0);near(r.moment,0);assert.equal(r.resultantHeight,null);assert.equal(r.contact,'none');assert.ok(r.profile.every(p=>p.pressure===0));
});
test('the theoretical crack can exceed H, but the visible wall gap is clipped and signed force is never used',()=>{
 const r=C.active({height:6,phi:0,gamma:20,surcharge:0,cohesion:100});
 near(r.potentialCrackDepth,10);near(r.crackDepth,6);near(r.force,0);near(r.rawForce,-840);near(r.removedTensionForce,840);assert.equal(r.resultantHeight,null);
});
test('force and base moment match independent dense midpoint quadrature in all contact regimes',()=>{
 for(const d of [{height:7.3,phi:32,gamma:18.7,cohesion:17.3,surcharge:23.4},{height:3.5,phi:22,gamma:20,cohesion:3,surcharge:75},{height:2,phi:40,gamma:16,cohesion:60,surcharge:0}]){
  const r=C.active(d),k=Math.tan((45-d.phi/2)*Math.PI/180)**2,n=100000,dz=d.height/n;let f=0,m=0;
  for(let i=0;i<n;i++){const z=(i+.5)*dz,p=Math.max(0,k*(d.gamma*z+d.surcharge)-2*d.cohesion*Math.sqrt(k));f+=p*dz;m+=p*(d.height-z)*dz;}
  near(r.force,f,1e-6);near(r.moment,m,1e-5);
 }
});
test('decreasing c grows force and shrinks the gap without changing Ka',()=>{
 let previous=null;for(const cohesion of [60,40,20,12,5,0]){const r=C.active({cohesion});if(previous){assert.ok(r.force>=previous.force);assert.ok(r.crackDepth<=previous.crackDepth);near(r.ka,previous.ka);}previous=r;}
});
test('increasing surcharge closes the gap and grows pressure continuously through the contact transition',()=>{
 const cohesion=12,base=C.active({cohesion}),critical=2*cohesion/Math.sqrt(base.ka),e=1e-5;
 const a=C.active({cohesion,surcharge:critical-e}),b=C.active({cohesion,surcharge:critical}),c=C.active({cohesion,surcharge:critical+e});
 assert.ok(a.crackDepth>0);near(b.crackDepth,0,1e-12);near(c.crackDepth,0);assert.ok(a.force<b.force&&b.force<c.force);near(b.force-a.force,c.force-b.force,1e-10);
});
test('cohesion and surcharge are combined before truncation; gap pressure is never negative',()=>{
 const r=C.active();assert.ok(r.profile.every(p=>p.pressure>=0));assert.ok(r.profile.some(p=>p.raw<0));assert.ok(r.profile.some(p=>Math.abs(p.z-r.crackDepth)<1e-12));
 near(r.force,r.rawForce+r.removedTensionForce);assert.ok(r.force>r.rawForce);
});
test('geometry and stress scaling preserves similarity and force/moment dimensions',()=>{
 const a=C.active({height:4,cohesion:8,surcharge:7}),b=C.active({height:8,cohesion:16,surcharge:14});
 near(b.crackDepth,2*a.crackDepth);near(b.force,4*a.force);near(b.moment,8*a.moment);near(b.resultantHeight,2*a.resultantHeight);
});
test('dry question does not read water, OCR or wall state from other questions',()=>{
 const a=C.active(),b=C.active({gammaSat:NaN,waterDepth:-3,state:'nonsense',ocr:null,delta:Infinity,beta:-9});
 assert.deepEqual(b,a);
});
test('invalid active inputs fail explicitly without coercion',()=>{
 for(const d of [null,[],{height:0},{height:31},{phi:50},{phi:-1},{gamma:0},{cohesion:-1},{surcharge:-1},{cohesion:'12'},{surcharge:null},{phi:NaN},{gamma:Infinity},{cohesion:Number.MAX_VALUE},{gamma:Number.MAX_VALUE}])assert.equal(C.active(d).valid,false,JSON.stringify(d));
});
const descriptor=vm.runInNewContext(readFileSync(new URL('../src/labs/retaining-labs.js',import.meta.url),'utf8')+'\nRetainingLabs.find(l=>l.key===\'earth-pressure\')',{CohesivePressure:C,Retaining:R});
test('descriptor question isolates water, OCR and Coulomb fields while preserving original pressure and wedge questions',()=>{
 assert.ok(descriptor.meta.questions.some(([q])=>q==='cohesive'));
 assert.deepEqual(Array.from(descriptor.activeFields(descriptor.defaults,'cohesive')),['height','phi','gamma','surcharge','cohesion']);
 const data={...descriptor.defaults,gammaSat:NaN,waterDepth:NaN,ocr:NaN,delta:NaN,beta:NaN,state:'wrong'};
 assert.ok(descriptor.compute(data,'cohesive').valid);
 assert.ok(descriptor.compute({...descriptor.defaults,cohesion:NaN},'pressure').valid);
 assert.ok(descriptor.compute({...descriptor.defaults,cohesion:NaN},'wedge').valid);
});
