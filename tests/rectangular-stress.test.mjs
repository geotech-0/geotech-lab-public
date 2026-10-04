import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {RectangularStress as R} from '../src/rectangular-stress.mjs';
import {StrengthStress as S} from '../src/strength-stress.mjs';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}; tolerance ${t}`);

// Independent composite 2D Simpson integral of the point-load kernel: no corner function.
function areaIntegral(p,n=120){
  const {width:B,length:L,pressure:q,x=0,y=0,depth:z,centerX=0,centerY=0}=p,dx=B/n,dy=L/n;
  let sum=0;
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){
    const u=centerX-B/2+i*dx-x,v=centerY-L/2+j*dy-y;
    const weight=(i===0||i===n?1:i%2?4:2)*(j===0||j===n?1:j%2?4:2);
    sum+=weight*3*q*z**3/(2*Math.PI*(u*u+v*v+z*z)**2.5);
  }
  return sum*dx*dy/9;
}

test('square centre and corner agree with independent hand calculation',()=>{
  const corner=1/12+1/(2*Math.PI*Math.sqrt(3));
  near(R.rectangle({width:1,length:1,pressure:100,x:.5,y:.5,depth:1}).stress,100*corner);
  near(R.rectangle({width:2,length:2,pressure:100,depth:1}).stress,400*corner);
  near(R.rectangle({width:2,length:2,pressure:100,depth:1}).stress,70.08859302811947);
});

test('arbitrary centre/edge/outside points agree with a converged independent 2D integral',()=>{
  for(const p of [
    {width:2,length:3,pressure:100,x:0,y:0,depth:3},
    {width:2,length:3,pressure:90,x:1,y:1.5,depth:.5},
    {width:4,length:1,pressure:150,x:3,y:1,depth:2},
    {width:1,length:6,pressure:75,x:1.5,y:-3,depth:.4},
    {width:3,length:2,pressure:120,x:-2,y:2,depth:1,centerX:1,centerY:-1}
  ]){
    const a=areaIntegral(p,80),b=areaIntegral(p,160),r=R.rectangle(p);
    assert.ok(r.valid);near(a,b,2e-5);near(r.stress,b,2e-6);
  }
});

test('surface limits and approach: inside, edge, corner and outside',()=>{
  for(const [x,y,expected,position] of [[0,0,100,'inside'],[1,0,50,'edge'],[1,1.5,25,'corner'],[1.01,0,0,'outside'],[0,2,0,'outside']]){
    const r=R.rectangle({width:2,length:3,pressure:100,x,y,depth:0});
    near(r.stress,expected);assert.equal(r.surfacePosition,position);
    near(R.rectangle({width:2,length:3,pressure:100,x,y,depth:1e-5}).stress,expected,1e-5);
  }
});

test('symmetry, translation, B/L rotation and geometric scale invariance',()=>{
  const a={width:2,length:5,pressure:137,x:.7,y:1.8,depth:1.2},stress=R.rectangle(a).stress;
  near(R.rectangle({...a,x:-a.x,y:-a.y}).stress,stress);
  near(R.rectangle({...a,x:a.x+8,y:a.y-7,centerX:8,centerY:-7}).stress,stress);
  near(R.rectangle({...a,width:a.length,length:a.width,x:a.y,y:a.x}).stress,stress);
  near(R.rectangle({...a,width:4,length:10,x:1.4,y:3.6,depth:2.4}).stress,stress);
  near(R.rectangle({...a,pressure:274}).stress,2*stress);
});

test('far field approaches point load of equal total force',()=>{
  const p={width:2,length:3,pressure:100,x:20,y:0,depth:150},r=R.rectangle(p);
  near(r.stress,S.pointStress({load:600,r:20,z:150}).stress,r.stress*.0002);
});

test('rectangle strips converge to the independently calculated circular load',()=>{
  const a=2,q=100,z=1.5,r=1;
  function strips(n){let sum=0;const w=2*a/n;for(let i=0;i<n;i++){const cx=-a+(i+.5)*w;sum+=R.rectangle({width:w,length:2*Math.sqrt(a*a-cx*cx),centerX:cx,pressure:q,x:r,depth:z}).stress;}return sum;}
  const circle=S.circularStress({pressure:q,radius:a,z,r}).stress,coarse=strips(100),fine=strips(3200);
  assert.ok(Math.abs(fine-circle)<Math.abs(coarse-circle));near(fine,circle,.0003);
});

test('two patches superpose; adding a neighbour leaves first patch unchanged',()=>{
  const single=R.field(),double=R.field({mode:'double'});
  near(double.parts[0],single.stress);near(double.stress,double.parts[0]+double.parts[1]);
  near(double.parts[1],R.rectangle({centerX:4}).stress);
  near(double.stress,27.059004485028886);near(double.load,1200);
  for(const p of [...double.cells,...double.profile])near(p.stress,p.parts[0]+p.parts[1]);
  const zero=R.field({mode:'double',ratio:0});near(zero.stress,single.stress);near(zero.parts[1],0);
  const twice=R.field({mode:'double',ratio:2});near(twice.parts[1],double.parts[1]*2);
});

test('touching equal patches equal one larger rectangle including their shared surface edge',()=>{
  for(const x of [0,1,2,4])for(const depth of [0,.1,2,12]){
    const pair=R.field({mode:'double',width:2,length:3,spacing:2,ratio:1,x,depth});
    const whole=R.rectangle({width:4,length:3,centerX:1,x,depth});
    assert.ok(pair.valid);near(pair.stress,whole.stress,1e-10);
  }
  near(R.field({mode:'double',spacing:2,x:1,depth:0}).stress,100);
});

test('invalid physical values and overlapping patches fail; inactive inputs do not',()=>{
  for(const p of [null,{width:0},{length:-1},{pressure:-1},{depth:-1},{x:Infinity},{depth:'3'},{width:NaN},{x:1e30}])assert.equal(R.rectangle(p).valid,false,JSON.stringify(p));
  for(const p of [{mode:'bad'},{width:7},{pressure:601},{x:17},{mode:'double',spacing:1},{mode:'double',ratio:NaN},{mode:'double',ratio:3},{mode:'double',spacing:13}])assert.equal(R.field(p).valid,false,JSON.stringify(p));
  assert.ok(R.field({mode:'single',spacing:NaN,ratio:null,unrelated:NaN}).valid);
  near(R.field({pressure:0,mode:'double'}).stress,0);
});

test('supported extreme fields remain finite, nonnegative and within applied pressure bounds',()=>{
  for(const width of [.5,6])for(const length of [.5,10])for(const x of [-4,0,12,16])for(const depth of [0,.01,12]){
    const r=R.field({width,length,x,depth,pressure:600,mode:'double',spacing:12,ratio:2});
    assert.ok(r.valid);
    for(const p of [r,...r.profile,...r.cells])assert.ok(Number.isFinite(p.stress)&&p.stress>=0&&p.stress<=1800+1e-8);
  }
});

const context={RectangularStress:R,StrengthStress:S,fmt:(v,d=1)=>Number(v).toFixed(d),esc:String,
  metric:()=>'<div>metric</div>',fieldControl:k=>`<input data-field="${k}">`,numericRow:k=>`<input data-field="${k}">`,svgWrap:s=>`<svg>${s}</svg>`};
const lab=vm.runInNewContext(readFileSync(new URL('../src/labs/strength-stress-labs.js',import.meta.url),'utf8')+'\nStrengthStressLabs;',context).find(l=>l.key==='stress-spread');

test('descriptor isolates question errors and exposes active relation inputs only',()=>{
  for(const question of ['point','circular','rectangle']){
    const d={...lab.defaults},active=lab.activeFields(d,question);
    for(const field of Object.keys(lab.bounds))if(!active.includes(field))d[field]=NaN;
    assert.ok(lab.compute(d,question).valid,question);
  }
  const d={...lab.defaults,rectMode:'double'},controls=lab.controls(d,'rectangle');
  for(const f of lab.activeFields(d,'rectangle'))assert.ok(controls.includes(`data-field="${f}"`),f);
  assert.ok(!lab.controls({...d,rectMode:'single'},'rectangle').includes('data-field="rectSpacing"'));
  assert.equal(lab.compute({...d,rectWidth:5,rectSpacing:4},'rectangle').valid,false);
});

test('baseline comparison plots stored geometry/profile and visible formula substitutions',()=>{
  const d={...lab.defaults,rectMode:'double'},r=lab.compute(d,'rectangle'),b=lab.compute({...d,rectWidth:1,rectRatio:.5,rectX:2},'rectangle');
  const v=lab.render({result:r,baseline:b,question:'rectangle'});
  assert.equal(v.comparisonPlot,true);assert.match(v.chart,/class="baseline"/);assert.match(v.chart,/저장한 기준/);
  assert.match(v.theory,/Δσz=Δσz,1\+Δσz,2/);assert.match(v.theory,/27\.059/);
  assert.equal(/NaN|undefined|Infinity/.test(v.chart),false);
});
