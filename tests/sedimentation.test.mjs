import test from 'node:test';
import assert from 'node:assert/strict';
import { Sedimentation as S } from '../src/sedimentation.mjs';
const near = (a, b, relative = 1e-9, absolute = 1e-14) => assert.ok(Math.abs(a - b) <= Math.max(absolute, relative * Math.abs(b)), `${a} != ${b}`);

test('IAPWS published verification table independently checks density and viscosity at three temperatures', () => {
  // SR6-08(2011) Table 8. The outer two are property-function checks only;
  // the sedimentation learning UI is deliberately limited to 5–40°C.
  for (const [kelvin, density, microPascalSeconds] of [[260, 997.068360, 3058.360750], [298.15, 997.047013, 889.996774], [375, 957.009710, 276.207245]]) {
    const r = S.water(kelvin - 273.15);
    assert.ok(r.valid);
    near(r.density, density, 1e-9);
    near(r.viscosity, microPascalSeconds * 1e-6, 1e-9);
    near(r.specificVolume * r.density, 1);
  }
});

test('20°C viscosity agrees with the ISO reference reproduced by IAPWS', () => {
  near(S.water(20).viscosity * 1000, 1.0016, .0017);
});

test('independent Decimal calculation from the published 25°C table checks mm, time and density conversions', () => {
  // rho_s=2650, rho_w=997.047013 kg/m³; mu=.000889996774 Pa·s;
  // L=.1 m; t=600 s; g=9.80665. Independently evaluated with Python Decimal.
  const r = S.analyze({ sedimentTemperature: 25, sedimentGs: 2650 / S.referenceDensity });
  assert.ok(r.valid && r.creepingFlow);
  near(r.diameterMm, .012834065605100473, 1e-9);
  near(r.reynolds, .0023962945990430194, 1e-9);
  near(r.velocityMmPerSecond, 1 / 6);
  near(r.diameterMicrons, r.diameterMm * 1000);
});

test('four times the elapsed time gives half the equivalent diameter and one quarter the velocity', () => {
  const a = S.analyze({ sedimentTimeMinutes: 10 }), b = S.analyze({ sedimentTimeMinutes: 40 });
  near(b.diameterMm, a.diameterMm / 2);
  near(b.velocity, a.velocity / 4);
  near(b.reynolds, a.reynolds / 8);
});

test('four times the effective depth gives twice the diameter at the same time', () => {
  const a = S.analyze({ sedimentDepthCm: 5 }), b = S.analyze({ sedimentDepthCm: 20 });
  near(b.diameterMm, a.diameterMm * 2);
  near(b.velocity, a.velocity * 4);
});

test('scaling depth and time together preserves the interpreted diameter', () => {
  const a = S.analyze({ sedimentDepthCm: 5, sedimentTimeMinutes: 20 });
  const b = S.analyze({ sedimentDepthCm: 20, sedimentTimeMinutes: 80 });
  near(a.diameterMm, b.diameterMm);
  near(a.reynolds, b.reynolds);
});

test('bath temperature changes water properties while particle density keeps the fixed 4°C reference', () => {
  const a = S.analyze({ sedimentTemperature: 5 }), b = S.analyze({ sedimentTemperature: 40 });
  near(a.particleDensity, b.particleDensity);
  near(a.particleDensity, a.inputs.sedimentGs * S.referenceDensity);
  assert.ok(b.properties.viscosity < a.properties.viscosity);
  assert.ok(b.diameterMm < a.diameterMm);
  near(a.velocity, b.velocity);
});

test('denser particles imply a smaller equivalent diameter at the same settling velocity', () => {
  const a = S.analyze({ sedimentGs: 2 }), b = S.analyze({ sedimentGs: 3 });
  assert.ok(b.diameterMm < a.diameterMm);
  near(a.diameterMm / b.diameterMm, Math.sqrt(b.densityDifference / a.densityDifference));
});

test('Stokes drag equals submerged particle weight in the stated model', () => {
  const r = S.analyze(), d = r.diameterMetres;
  const drag = 3 * Math.PI * r.properties.viscosity * d * r.velocity;
  const weightMinusBuoyancy = Math.PI * d ** 3 / 6 * r.densityDifference * r.gravity;
  near(drag, weightMinusBuoyancy, 1e-12, 1e-25);
});

test('outside creeping flow keeps an explicitly unsupported formula value without clipping', () => {
  const r = S.analyze({ sedimentDepthCm: 30, sedimentTimeMinutes: .1, sedimentTemperature: 40 });
  assert.ok(r.valid);
  assert.ok(r.reynolds > .1);
  assert.equal(r.creepingFlow, false);
  assert.equal(r.status, 'outside-creeping-flow');
  assert.ok(r.diameterMm > r.maxCreepingDiameterMm);
  assert.ok(r.minCreepingTimeMinutes > r.timeMinutes);
});

test('computed creeping-flow boundary is consistent with Re=0.1', () => {
  const r = S.analyze();
  const edge = S.analyze({ sedimentTimeMinutes: r.minCreepingTimeMinutes });
  near(edge.reynolds, .1, 1e-12);
  near(edge.diameterMm, r.maxCreepingDiameterMm);
  assert.ok(edge.creepingFlow);
  assert.equal(S.analyze({ sedimentTimeMinutes: r.minCreepingTimeMinutes * .99 }).creepingFlow, false);
  assert.equal(S.analyze({ sedimentTimeMinutes: r.minCreepingTimeMinutes * 1.01 }).creepingFlow, true);
});

test('logarithmic time curve retains true endpoint units and is monotone', () => {
  const r = S.analyze();
  assert.equal(r.curve[0].timeMinutes, .1);
  assert.equal(r.curve.at(-1).timeMinutes, 1440);
  for (let i = 1; i < r.curve.length; i++) {
    assert.ok(r.curve[i].timeMinutes > r.curve[i - 1].timeMinutes);
    assert.ok(r.curve[i].diameterMm < r.curve[i - 1].diameterMm);
  }
  assert.ok(r.curve.some(p => Math.abs(p.reynolds - .1) < 1e-10));
});

test('all supported slider corners produce finite results and state the applicability separately', () => {
  for (const sedimentDepthCm of [1, 30]) for (const sedimentTimeMinutes of [.1, 1440])
    for (const sedimentGs of [1.5, 3.5]) for (const sedimentTemperature of [5, 40]) {
      const r = S.analyze({ sedimentDepthCm, sedimentTimeMinutes, sedimentGs, sedimentTemperature });
      assert.ok(r.valid);
      assert.ok([r.diameterMm, r.velocity, r.reynolds, r.minCreepingTimeMinutes].every(Number.isFinite));
      assert.ok(r.diameterMm > 0 && r.reynolds > 0);
    }
});

test('invalid or out-of-range values fail instead of silently correcting inputs', () => {
  for (const d of [null, [], { sedimentDepthCm: 0 }, { sedimentTimeMinutes: 0 }, { sedimentTimeMinutes: 1441 },
    { sedimentGs: 1 }, { sedimentTemperature: 0 }, { sedimentTemperature: 41 }, { sedimentTemperature: '20' },
    { sedimentDepthCm: NaN }, { sedimentTimeMinutes: Infinity }]) {
    const r = S.analyze(d); assert.equal(r.valid, false); assert.ok(r.errors.length);
  }
  for (const t of [-20.01, 110.01, Infinity, null, '20']) assert.equal(S.water(t).valid, false);
});

test('classification inputs are irrelevant here and no mass distribution is invented', () => {
  const d = Object.freeze({ sedimentTimeMinutes: 30, ll: null, pl: NaN, fines: 100, points: Object.freeze([]) });
  const r = S.analyze(d);
  assert.ok(r.valid);
  assert.equal(r.massDistributionAvailable, false);
  assert.deepEqual(Object.keys(r.inputs).sort(), [...S.fields].sort());
  assert.ok(!('passing' in r) && !('symbol' in r) && !('fines' in r));
  assert.deepEqual(d.points, []);
});
