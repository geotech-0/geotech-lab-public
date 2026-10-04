import test from 'node:test';
import assert from 'node:assert/strict';
import { ExcavationStaged as S } from '../src/excavation-staged.mjs';
import { ExcavationPlanar as P } from '../src/excavation-planar.mjs';
const near = (a, b, t = 1e-8) => assert.ok(Math.abs(a - b) <= t, `${a} differs from ${b} by more than ${t}`);
const input = () => structuredClone(S.defaults);
const run = (d, observation = {}) => S.analyze(d, { ...d.observation, ...observation }, { planarProvider: P });
const stable = r => { assert.equal(r.status, 'stable', r.errors.join(' ')); assert.equal(r.valid, true); return r; };
const fresh = () => ({ pressure: 0, base: 0, u: 0, plastic: 0, gap: 0 });
const unique = profile => [...new Map(profile.map(p => [p.z, p])).values()];

test('independent cantilever exact solutions include end reactions and combined loading', () => {
  const length = 6, EI = 500000, uniformLoad = 10, tipLoad = 100;
  for (const elements of [1, 7, 24]) {
    const r = stable(S.beamBenchmark({ length, EI, uniformLoad, tipLoad, elements }));
    near(r.tipDisplacement, uniformLoad * length ** 4 / (8 * EI) + tipLoad * length ** 3 / (3 * EI), 1e-10);
    near(r.baseReaction, -uniformLoad * length - tipLoad, 1e-6);
    near(r.baseMoment, uniformLoad * length ** 2 / 2 + tipLoad * length, 1e-6);
    near(r.profile.at(-1).moment, r.baseMoment, 1e-6);
  }
});

test('constitutive limits, elastic unload/reload and open gap closure are independently hand checked', () => {
  const k = 1000, lim = { base: 50, low: 20, high: 100 };
  let p = S.constitutiveStep(fresh(), 0, 1, k, lim); near(p.pressure, 50);
  p = S.constitutiveStep(p, .1, 1, k, lim); near(p.pressure, 100); near(p.plastic, .05); assert.equal(p.state, 'passive');
  p = S.constitutiveStep(p, .08, 1, k, lim); near(p.pressure, 80); near(p.tangent, k);
  p = S.constitutiveStep(p, .1, 1, k, lim); near(p.pressure, 100);
  p = S.constitutiveStep(p, -.1, 1, k, lim); near(p.pressure, 20); assert.equal(p.state, 'active');
  const contact = { base: 0, low: 0, high: 100 };
  p = S.constitutiveStep(fresh(), -.01, 1, k, contact); near(p.pressure, 0); near(p.gap, -10);
  p = S.constitutiveStep(p, -.009, 1, k, contact); near(p.pressure, 0); near(p.gap, -9); near(p.tangent, 0);
  p = S.constitutiveStep(p, .002, 1, k, contact); near(p.pressure, 2); near(p.gap, 0); near(p.tangent, k);
});

test('H0 has balanced K0 pressures and water on both faces with no manufactured deflection', () => {
  const d = input(); d.water = { retained: 2, excavation: 2, restore: 2 };
  const r = stable(run(d)); near(r.maxDisplacement, 0, 1e-12);
  for (const p of r.profile) { near(p.pressure, 0); near(p.retainedTotalPressure, p.excavationTotalPressure); }
  const z = 4, p = r.profile.find(p => p.z === z);
  near(p.retainedPressure, .5 * (18 * 2 + (20 - 9.81) * 2));
  near(p.retainedTotalPressure, p.retainedPressure + 9.81 * 2);
});

test('installation is excavation elevation plus clearance, with zero-force fitting and exact lock-off', () => {
  const d = input(); d.supports[0].installClearance = .63; d.supports[0].preloadLoss = .1;
  const h = 2.13, before = stable(run(d, { depth: h, eventSide: 'before' }));
  const installed = stable(run(d, { depth: h, eventSide: 'installed' }));
  const after = stable(run(d, { depth: h, eventSide: 'after' }));
  assert.equal(stable(run(d, { depth: 1.51 })).supportForces[0].state, 'planned');
  assert.equal(before.supportForces[0].state, 'planned');
  assert.equal(installed.supportForces[0].state, 'installed');
  near(installed.supportForces[0].force, 0); near(installed.maxDisplacement, before.maxDisplacement, 1e-11);
  near(after.supportForces[0].force, 36, 1e-8);
  assert.ok(after.profile.some((p, i) => Math.abs(p.displacement - before.profile[i].displacement) > 1e-6));
  assert.equal(S.events(d).find(e => e.id === 'install:support-1').depth, h);
});

test('all construction phases balance external force and moment without toe restraints', () => {
  const d = input();
  for (const observation of [{ depth: 2 }, { depth: 4 }, { depth: 6 }, { depth: 8 }, { phase: 'backfill', depth: 5 }, { phase: 'backfill', depth: 0 }]) {
    const r = stable(run(d, observation));
    const nodes = unique(r.profile), width = r.selectedStrip.width;
    const force = nodes.reduce((sum, p) => sum + p.soilForce / width, 0) - r.supportForces.reduce((sum, p) => sum + p.reaction, 0);
    const moment = nodes.reduce((sum, p) => sum + p.soilForce * p.z / width, 0) - r.supportForces.reduce((sum, p) => sum + p.reaction * p.z, 0);
    near(force, 0, 2e-5); near(moment, 0, 2e-4);
    assert.ok(r.residuals.algebraic < 2e-6); near(r.residuals.force, 0, 2e-5); near(r.residuals.moment, 0, 2e-4);
    for (const p of nodes) assert.ok(p.retainedPressure >= p.activeLimit - 1e-7 && p.retainedPressure <= p.passiveLimit + 1e-7);
  }
});

test('continuous 0.01m observations preserve continuous excavation forces across a mesh boundary', () => {
  const d = input(); const a = stable(run(d, { depth: 3.24 })), b = stable(run(d, { depth: 3.25 })), c = stable(run(d, { depth: 3.26 }));
  assert.ok(Math.abs(c.maxDisplacement - a.maxDisplacement) > 1e-8);
  assert.ok(Math.abs(c.maxDisplacement - a.maxDisplacement) < .0001);
  assert.ok(Math.abs((b.maxDisplacement - a.maxDisplacement) - (c.maxDisplacement - b.maxDisplacement)) < 2e-6);
});

test('mesh and construction increment refinement converge separately', () => {
  const a = input(), b = input(), c = input(); a.mesh = .5; b.mesh = .25; c.mesh = .125;
  const ra = stable(run(a, { depth: 8 })), rb = stable(run(b, { depth: 8 })), rc = stable(run(c, { depth: 8 }));
  assert.ok(Math.abs(rc.maxDisplacement - rb.maxDisplacement) < Math.abs(rb.maxDisplacement - ra.maxDisplacement));
  assert.ok(Math.abs(rb.maxDisplacement / rc.maxDisplacement - 1) < .005);
  assert.ok(Math.abs(rb.maxMoment / rc.maxMoment - 1) < .01);
  b.increment = .125; const fineStep = stable(run(b, { depth: 8 }));
  near(fineStep.maxDisplacement, rb.maxDisplacement, 1e-6);
  for (let i = 0; i < rb.supportForces.length; i++) near(fineStep.supportForces[i].force, rb.supportForces[i].force, .05);
});

test('backward scrub and query order replay identical physical states; off-grid targets do not become checkpoints', () => {
  const d = input(), observation = { phase: 'backfill', depth: 3.17 };
  S.clearCache(); const reference = stable(run(d, observation));
  S.clearCache(); run(d, { depth: 3.13 }); run(d, { depth: 3.24 }); run(d, { depth: 8 }); run(d, { phase: 'backfill', depth: 3.19 });
  const replay = stable(run(d, observation));
  assert.deepEqual(replay.profile, reference.profile); assert.deepEqual(replay.supportForces, reference.supportForces);
  assert.deepEqual(replay.envelope, reference.envelope); assert.equal(replay.diagnostics.reusedCheckpoint, true);
  const back = stable(run(d, { depth: 2.07 })); S.clearCache(); const freshBack = stable(run(d, { depth: 2.07 }));
  assert.deepEqual(back.profile, freshBack.profile);
  replay.profile[0].displacement = 999; assert.notEqual(stable(run(d, observation)).profile[0].displacement, 999);
});

test('parameter edits invalidate history and replay from initial equilibrium', () => {
  const a = input(); stable(run(a, { phase: 'backfill', depth: 0 })); const b = input(); b.clearance = .75; b.EI *= 2;
  const replay = stable(run(b, { depth: 8 })); S.clearCache(); const rebuilt = stable(run(b, { depth: 8 }));
  assert.deepEqual(replay.profile, rebuilt.profile); assert.deepEqual(replay.supportForces, rebuilt.supportForces);
  assert.ok(Math.abs(stable(run(a, { depth: 8 })).maxDisplacement - replay.maxDisplacement) > 1e-5);
});

test('restore inherits irreversible history and independently placed fill; no-pressure spring fill starts stress free', () => {
  const d = input(); const final = stable(run(d, { depth: 8 })), transition = stable(run(d, { phase: 'backfill', depth: 8 }));
  for (let i = 0; i < final.profile.length; i++) for (const key of ['pressure', 'displacement', 'moment', 'shear']) near(transition.profile[i][key], final.profile[i][key], 1e-10);
  const restored = stable(run(d, { phase: 'backfill', depth: 0 }));
  assert.ok(restored.maxDisplacement > .001); assert.ok(restored.supportForces.every(s => s.state === 'released'));
  const springFill = input(); springFill.fill.pressureModel = 'spring'; springFill.water.restore = 8;
  const before = stable(run(springFill, { depth: 8 })), lift = stable(run(springFill, { phase: 'backfill', depth: 7.9 }));
  near(lift.maxDisplacement, before.maxDisplacement, 1e-10);
  for (let i = 0; i < before.profile.length; i++) near(lift.profile[i].displacement, before.profile[i].displacement, 1e-10);
});

test('linked release follows install clearance; independent release and replacement slab retain event order', () => {
  const d = input(); d.supports[2].releaseClearance = 1;
  d.supports.push({ id: 'slab-1', type: 'slab', z: 5.5, stiffness: 60000, angle: 0, spacing: 2, preload: 0, activateAtBackfill: 6.5, retained: true });
  const e = S.events(d); near(e.find(e => e.id === 'release:support-3').depth, 6.5);
  const before = stable(run(d, { phase: 'backfill', depth: 6.5, eventSide: 'before' }));
  const installed = stable(run(d, { phase: 'backfill', depth: 6.5, eventSide: 'installed' }));
  const after = stable(run(d, { phase: 'backfill', depth: 6.5, eventSide: 'after' }));
  assert.equal(before.supportForces[3].state, 'planned'); assert.equal(installed.supportForces[2].state, 'active');
  near(installed.supportForces[3].force, 0, 1e-7); assert.equal(after.supportForces[2].state, 'released');
  assert.ok(after.supportForces[3].force > 0); assert.equal(after.supportForces[3].state, 'retained');
});

test('shape mode keeps prescribed earth loading independent of kh and retains deepest installed support on backfill', () => {
  const d = input(), soft = input(); soft.soil.kh *= .5;
  const a = stable(run(d, { depth: 8, mode: 'shape' })), b = stable(run(soft, { depth: 8, mode: 'shape' }));
  a.profile.forEach((p, i) => near(p.retainedPressure, b.profile[i].retainedPressure));
  assert.ok(Math.abs(a.maxDisplacement - b.maxDisplacement) > 1e-6);
  d.supports = [{ ...d.supports[0], z: 7.5 }]; d.EI = 1e7; d.embedment = 8;
  const final = stable(run(d, { depth: 8, mode: 'shape' }));
  const back = stable(run(d, { phase: 'backfill', depth: 8, eventSide: 'before', mode: 'shape' }));
  near(back.supportForces[0].force, final.supportForces[0].force); assert.equal(back.supportForces[0].state, 'active');
});

test('corner support transfers forces through coupled walls; wall position changes resulting profiles', () => {
  const d = input(); d.height = 4; d.embedment = 4; d.EI = 1e6;
  d.supports = [{ ...d.supports[0], type: 'corner', angle: 0, preload: 30, capacity: 10000, z: 1.5 }];
  const lock = stable(run(d, { depth: 2 })); near(lock.supportForces[0].force, 30, 1e-6); assert.equal(lock.strips.length, 12);
  const center = stable(run(d, { depth: 4, position: .5 })), end = stable(run(d, { depth: 4, position: 0 }));
  assert.ok(Math.abs(center.maxDisplacement - end.maxDisplacement) > 1e-5);
  assert.ok(center.supportForces[0].members.length >= 4); assert.ok(center.residuals.algebraic < 2e-6);
});

test('nonconvergence preserves the last equilibrium and never claims an arbitrary stable result', () => {
  const d = input(); d.supports = []; d.embedment = .5; d.EI = 10000; d.water.retained = 0;
  const r = run(d, { depth: 8 }); assert.equal(r.valid, false); assert.ok(['invalid', 'nonconverged'].includes(r.status));
  if (r.status === 'nonconverged') { assert.ok(r.depth < r.requestedDepth); assert.ok(r.residuals.algebraic < 2e-6); }
});

test('invalid physical inputs and ambiguous support angles are rejected; optional draft clearances use common values', () => {
  for (const edit of [d => d.soil.kh = null, d => d.EI = 0, d => d.soil = null, d => d.fill.k0 = 10, d => d.increment = .5, d => d.supports[0].z = 8]) {
    const d = input(); edit(d); assert.equal(run(d).valid, false);
  }
  const d = input(); d.supports[0].installClearance = null; d.supports[0].releaseClearance = null; d.soil.k0 = null;
  assert.equal(S.validateInput(d).valid, true); near(S.events(d).find(e => e.id === 'install:support-1').depth, 2);
  d.supports[0].type = 'corner'; assert.equal(S.validateInput(d).valid, false);
});

test('independent water levels permit ponding; recovery is continuous from final excavation to the restored target', () => {
  const d = input(); d.water = { retained: 3, excavation: 3, restore: 0 };
  const final = stable(run(d, { depth: 8 })), start = stable(run(d, { phase: 'backfill', depth: 8 }));
  near(final.appliedWater.excavation, 3); near(start.appliedWater.excavation, 3);
  for (let i = 0; i < final.profile.length; i++) for (const key of ['pressure', 'displacement', 'moment', 'shear']) near(start.profile[i][key], final.profile[i][key], 1e-10);
  near(stable(run(d, { phase: 'backfill', depth: 4 })).appliedWater.excavation, 1.5);
  near(stable(run(d, { phase: 'backfill', depth: 0 })).appliedWater.excavation, 0);
  for (const p of final.profile) near(p.waterPressure, 0);
  const dry = input(); dry.water = { retained: 3, excavation: 8, restore: 8 }; dry.embedment = 8;
  const drained = stable(run(dry, { depth: 8 }));
  near(drained.profile.find(p => p.z === 5).waterPressure, 9.81 * 2);
  assert.ok(Math.abs(drained.maxDisplacement - final.maxDisplacement) > .0001);
});

test('failed support release rolls back the active set and reactions atomically', () => {
  const d = input(); d.embedment = 1; d.fill.kh = 1; d.fill.pressureModel = 'spring';
  const before = stable(run(d, { phase: 'backfill', depth: 4, eventSide: 'before' }));
  const failed = run(d, { phase: 'backfill', depth: 4, eventSide: 'after' });
  assert.equal(failed.status, 'nonconverged'); assert.equal(failed.eventSide, 'before');
  assert.deepEqual(failed.supportForces, before.supportForces); assert.deepEqual(failed.profile, before.profile);
  assert.equal(failed.supportForces[1].state, 'active'); assert.ok(failed.supportForces[1].force > 0);
});

test('effective preload cannot silently exceed a support capacity', () => {
  const d = input(); d.supports[0].capacity = 20; d.supports[0].preload = 40;
  assert.equal(run(d, { depth: 2 }).status, 'invalid');
  d.supports[0].preloadLoss = .5; assert.equal(S.validateInput(d).valid, true);
});

test('events belonging to the other phase cannot introduce off-grid history checkpoints', () => {
  const d = input();
  d.supports[1].retained = true; d.supports[1].releaseClearance = .63;
  d.supports.push({ id: 'slab-phase', type: 'slab', z: 3, stiffness: 50000, preload: 0, angle: 0, spacing: 2, activateAtBackfill: 3.13, retained: true });
  S.clearCache(); const baseline = stable(run(d, { phase: 'backfill', depth: 2.6 }));
  S.clearCache(); stable(run(d, { depth: 3.13 })); stable(run(d, { phase: 'backfill', depth: 4.13 }));
  const replay = stable(run(d, { phase: 'backfill', depth: 2.6 }));
  assert.deepEqual(replay.profile, baseline.profile); assert.deepEqual(replay.supportForces, baseline.supportForces);
});
test('corner support wall reaction uses the observed strip instead of displaying a missing scalar as zero',()=>{
  const d=input();d.supports=d.supports.map(s=>({...s,type:'corner',angle:0,preload:0}));
  const r=stable(run(d,{depth:4,wallId:'A',position:1/6}));
  for(const s of r.supportForces.filter(s=>s.state==='active'))near(s.reaction,s.reactionByStrip.find(v=>v.stripId===r.selectedStrip.id).lineForce);
  assert.ok(r.supportForces.some(s=>Math.abs(s.reaction)>1));
});
test('malformed nested materials cannot silently become default soil',()=>{
  assert.equal(S.analyze(null).valid,false);
  for(const key of ['soil','fill','water','plan','observation'])for(const value of [null,3,'soil',[]])assert.equal(S.normalize({[key]:value}).valid,false);
});
