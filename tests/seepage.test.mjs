import test from 'node:test';
import assert from 'node:assert/strict';
import {Seepage} from '../src/seepage.mjs';

const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} ≠ ${expected}`);
const relative=(actual,expected,tolerance=1e-6)=>near(actual,expected,tolerance*Math.max(Math.abs(expected),1e-20));

test('Darcy hand example, discharge velocity and pore velocity are separate',()=>{
  const r=Seepage.darcy({headDifference:2,length:4,area:.2,logK:-4,porosity:.4});
  assert.ok(r.valid);near(r.gradient,.5);near(r.velocity,.00005);near(r.poreVelocity,.000125);near(r.flow,.00001);near(r.flowLitresMinute,.6);
  relative(Seepage.darcy({logK:-3}).flow,10*Seepage.darcy().flow);
  relative(Seepage.darcy({area:.4}).flow,2*Seepage.darcy().flow);
  relative(Seepage.darcy({length:8}).flow,.5*Seepage.darcy().flow);
});
test('upward seepage reduces effective self-weight and reaches zero at ideal critical gradient',()=>{
  const ic=(20-9.81)/9.81;
  const hydro=Seepage.darcy({headDifference:0,length:3});
  near(hydro.upwardBase.effective,(20-9.81)*3);
  const critical=Seepage.darcy({headDifference:ic*3,length:3});
  near(critical.criticalGradient,ic);near(critical.upwardBase.effective,0);assert.equal(critical.stableSkeleton,false);
  const beyond=Seepage.darcy({headDifference:2*ic*3,length:3});
  assert.equal(beyond.stableSkeleton,false);assert.ok(beyond.upwardBase.effective<0);
});
test('falling-head inverse permeability and exponential endpoints match independent calculation',()=>{
  const r=Seepage.fallingHead({initialHead:1,finalHead:.5,time:600,length:.2,area:.01,tubeArea:.0001});
  near(r.k,Math.log(2)/300000,1e-16);near(r.curve[0].head,1);near(r.curve.at(-1).head,.5);near(r.curve[20].head,Math.sqrt(.5));near(r.dischargedVolume,.00005);
  relative(Seepage.fallingHead({time:300}).k,2*r.k);
});
test('invalid Darcy and laboratory inputs are rejected, never replaced',()=>{
  for(const arg of [null,{length:0},{headDifference:-1},{area:NaN},{porosity:1},{gammaSat:9}])assert.equal(Seepage.darcy(arg).valid,false);
  for(const arg of [null,{initialHead:.5,finalHead:1},{finalHead:0},{time:0},{tubeArea:-1},{area:Infinity}])assert.equal(Seepage.fallingHead(arg).valid,false);
});
test('equal head produces hydrostatic pressure, no flow, no invented traces',()=>{
  const r=Seepage.wall({headUp:3,headDown:3});assert.ok(r.valid);near(r.totalIn,0);near(r.totalOut,0);near(r.throughWall,0);assert.equal(r.streamlines.length,0);assert.equal(r.contours.length,0);
  for(const c of r.cells){near(c.head,3);near(c.porePressure,9.81*(3+c.z));near(c.vx,0);near(c.vz,0);}
});
test('no wall, lateral-only heads reproduces exact one-dimensional analytical solution',()=>{
  const r=Seepage.wall({wallDepth:0,boundaryMode:'lateral'});assert.ok(r.valid);
  const expectedV=1e-4*5/24;
  relative(r.throughWall,expectedV*12,1e-10);
  for(const c of r.cells){near(c.head,6-5*(c.x+12)/24,1e-11);near(c.vx,expectedV,1e-14);near(c.vz,0,1e-14);}
  near(r.massBalance,0,1e-10);
});
test('full-depth wall splits reservoirs and exactly blocks throughflow',()=>{
  const r=Seepage.wall({wallDepth:12});assert.ok(r.valid);near(r.totalIn,0);near(r.totalOut,0);near(r.throughWall,0);
  r.cells.forEach(c=>near(c.head,c.x<0?6:1));
  for(let j=0;j<r.nz;j++)near(r.faceX[j*(r.nx+1)+r.nx/2],0);
});
test('computed field conserves flux and respects impermeable faces and maximum principle',()=>{
  const r=Seepage.wall();assert.ok(r.valid);assert.ok(r.normalizedResidual<1e-10);assert.ok(r.massBalance<2e-6);assert.ok(r.maxCellImbalance/r.totalIn<1e-7);
  relative(r.throughWall,r.totalIn,2e-6);relative(r.totalOut,r.totalIn,2e-6);
  for(let j=0;j<r.wallDepth/r.dz;j++)near(r.faceX[j*(r.nx+1)+r.nx/2],0);
  for(let i=0;i<r.nx;i++)near(r.faceZ[r.nz*r.nx+i],0);
  for(const h of r.heads)assert.ok(h>=1-1e-9&&h<=6+1e-9);
});
test('multiplying permeability scales flux but not head or streamline geometry',()=>{
  const a=Seepage.wall(),b=Seepage.wall({logK:-3});
  relative(b.throughWall,10*a.throughWall,1e-10);near(b.exitGradient2m,a.exitGradient2m,1e-10);assert.deepEqual(a.heads,b.heads);
  assert.equal(a.streamlines.length,b.streamlines.length);
  a.streamlines.forEach((line,i)=>{assert.equal(line.length,b.streamlines[i].length);line.forEach((p,j)=>{near(p.x,b.streamlines[i][j].x,1e-10);near(p.z,b.streamlines[i][j].z,1e-10);});});
});
test('datum head offset changes pressure, while reversal reverses flow without changing its magnitude',()=>{
  const a=Seepage.wall({visuals:false}),b=Seepage.wall({headUp:8,headDown:3,visuals:false}),c=Seepage.wall({headUp:1,headDown:6,visuals:false});
  relative(b.throughWall,a.throughWall,1e-10);relative(c.throughWall,-a.throughWall,1e-10);
  for(let i=0;i<a.cells.length;i++){near(b.cells[i].head-a.cells[i].head,2);near(b.cells[i].porePressure-a.cells[i].porePressure,19.62);}
  near(c.exitGradient2m,a.exitGradient2m,1e-7);
});
test('anisotropy changes the head field, conserves mass and changes throughput',()=>{
  const a=Seepage.wall({visuals:false}),b=Seepage.wall({logAnisotropy:1,visuals:false}),c=Seepage.wall({logAnisotropy:-1,visuals:false});
  assert.ok(b.valid&&c.valid);assert.ok(b.throughWall>a.throughWall&&a.throughWall>c.throughWall);
  assert.ok(Math.max(...b.heads.map((h,i)=>Math.abs(h-a.heads[i])))>.1);
  assert.ok(b.massBalance<2e-6&&c.massBalance<2e-6);
});
test('streamlines and contour segments do not pass through the cutoff wall',()=>{
  const r=Seepage.wall();assert.equal(r.streamlines.length,12);assert.ok(r.contours.length>100);
  for(const line of [...r.streamlines,...r.contours.map(s=>s.points)])for(let j=1;j<line.length;j++){
    const a=line[j-1],b=line[j];
    for(const p of [a,b])assert.ok(p.x>=-12-1e-8&&p.x<=12+1e-8&&p.z>=-1e-8&&p.z<=12+1e-8);
    if(a.x*b.x<0){const z=a.z+(b.z-a.z)*(-a.x)/(b.x-a.x);assert.ok(z>=6-1e-8);}
  }
});
test('uniform geometric scaling keeps flow per unit out-of-plane width invariant',()=>{
  const a=Seepage.wall({visuals:false}),b=Seepage.wall({width:48,depth:24,wallDepth:12,visuals:false});
  relative(b.throughWall,a.throughWall,1e-10);
  b.cells.forEach((c,i)=>{near(c.head,a.cells[i].head,1e-10);near(c.vx,a.cells[i].vx/2,1e-14);near(c.vz,a.cells[i].vz/2,1e-14);});
});
test('24×12, 48×24, 96×48 refinement reduces flow discrepancy',()=>{
  const a=Seepage.wall({nx:24,nz:12,visuals:false}),b=Seepage.wall({visuals:false}),c=Seepage.wall({nx:96,nz:48,visuals:false});
  assert.ok(a.valid&&b.valid&&c.valid);assert.ok(c.massBalance<2e-6);
  const coarse=Math.abs(a.throughWall-b.throughWall)/b.throughWall,fine=Math.abs(b.throughWall-c.throughWall)/c.throughWall;
  assert.ok(coarse<.03);assert.ok(fine<.015);assert.ok(fine<coarse);
});
test('invalid geometry and failed numerical convergence remain explicit',()=>{
  for(const arg of [null,{wallDepth:6.25},{wallDepth:13},{headDown:-1},{nx:47},{nz:0},{width:0},{logAnisotropy:3},{headUp:NaN}])assert.equal(Seepage.wall(arg).valid,false);
  const r=Seepage.wall({maxIterations:1});assert.equal(r.valid,false);assert.equal(r.converged,false);assert.ok(r.errors.length);assert.equal(r.streamlines.length,0);assert.equal(r.contours.length,0);
});
test('constant-head test obtains k from measured collection, not forward k input',()=>{
  const r=Seepage.constantHead();assert.ok(r.valid);near(r.k,1/60000,1e-16);near(r.flow,.0005/600);near(r.curve.at(-1).volume,.0005);
  relative(Seepage.constantHead({volume:.001}).k,2*r.k);relative(Seepage.constantHead({time:1200}).k,r.k/2);
  assert.equal(Seepage.constantHead({headDifference:0}).valid,false);assert.equal(Seepage.constantHead({volume:-1}).valid,false);
});
test('serial two-layer flow matches resistance hand calculation and preserves flux across interface',()=>{
  const r=Seepage.layered();assert.ok(r.valid);
  const v=2/(2/1e-4+2/1e-6);near(r.velocity,v,1e-16);near(r.equivalentK,4/(2020000),1e-16);
  near(r.interface.head,v*2/1e-4,1e-12);near(r.interface.pressure,9.81*(2+r.interface.head));
  for(const l of r.layers)near(l.k*l.gradient,v,1e-16);
  near(r.layers[0].endHead,r.layers[1].startHead);near(r.layers[0].endPressure,r.layers[1].startPressure);near(r.profile.at(-1).head,2);
});
test('reversing layers keeps Q and equivalent k, but changes internal head and pressure',()=>{
  const a=Seepage.layered(),b=Seepage.layered({order:'BA'});
  near(a.flow,b.flow,1e-16);near(a.equivalentK,b.equivalentK,1e-16);near(a.parallelK,b.parallelK,1e-16);
  assert.ok(b.midpoint.head>a.midpoint.head+1.9);assert.ok(b.midpoint.pressure>a.midpoint.pressure+18);
  near(a.reversedMidpoint.head,b.midpoint.head);near(a.reversedMidpoint.pressure,b.midpoint.pressure);
});
test('layered homogeneous and zero-gradient limits',()=>{
  const r=Seepage.layered({logKA:-4,logKB:-4,thicknessA:1,thicknessB:3});near(r.equivalentK,1e-4,1e-15);near(r.parallelK,1e-4,1e-15);
  r.profile.forEach(p=>near(p.head,p.z*.5));
  const z=Seepage.layered({headDifference:0});near(z.flow,0);z.profile.forEach(p=>{near(p.head,0);near(p.pressure,9.81*p.z);});
  for(const input of [{thicknessA:0},{order:'unknown'},{logKB:NaN},{headDifference:-1}])assert.equal(Seepage.layered(input).valid,false);
});
test('capillary profile is signed hydrostatic only inside the specified saturated zone',()=>{
  const r=Seepage.capillary();assert.ok(r.valid);near(r.topPressure,-9.81);near(r.observation.pore,-4.905);assert.equal(r.profile[10].pore,null);near(r.profile[30].pore,0);near(r.profile[40].pore,9.81);
  assert.equal(Seepage.capillary({observationDepth:.5}).observation.pore,null);
  for(const d of [{capillaryHeight:4},{waterDepth:-1},{observationDepth:9}])assert.equal(Seepage.capillary(d).valid,false);
});
