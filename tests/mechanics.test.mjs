import test from 'node:test';
import assert from 'node:assert/strict';
import { Mechanics } from '../src/mechanics.mjs';

const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected} within ${tolerance}`);
};

test('hydrostatic hand example: z=5, water=2, surcharge=10 kPa', () => {
  const result = Mechanics.effectiveStress({ waterDepth: 2, depth: 5, surcharge: 10 });
  assert.equal(result.valid, true);
  close(result.total, 106);
  close(result.pore, 29.43);
  close(result.effective, 76.57);
  assert.ok(result.profile.some((row) => row.depth === 2));
  assert.ok(result.profile.some((row) => row.depth === 5));
  result.profile.forEach((row) => close(row.total, row.pore + row.effective));
});

test('dry, water-at-ground, and exact-water-level limits', () => {
  const dry = Mechanics.effectiveStress({ waterDepth: 8, depth: 5 });
  close(dry.total, 90); close(dry.pore, 0); close(dry.effective, 90);
  const submerged = Mechanics.effectiveStress({ waterDepth: 0, depth: 5 });
  close(submerged.total, 100); close(submerged.pore, 49.05); close(submerged.effective, 50.95);
  const boundary = Mechanics.effectiveStress({ waterDepth: 5, depth: 5 });
  close(boundary.total, 90); close(boundary.pore, 0);
});

test('drained surcharge changes total and effective stress equally, without excess pore pressure', () => {
  const a = Mechanics.effectiveStress({ surcharge: 0 });
  const b = Mechanics.effectiveStress({ surcharge: 45 });
  close(b.total - a.total, 45); close(b.effective - a.effective, 45); close(b.pore, a.pore);
});

test('raising water by 1 m below the observation reduces effective stress by 7.81 kPa', () => {
  const a = Mechanics.effectiveStress({ depth: 5, waterDepth: 3 });
  const b = Mechanics.effectiveStress({ depth: 5, waterDepth: 2 });
  close(b.total - a.total, 2); close(b.pore - a.pore, 9.81); close(b.effective - a.effective, -7.81);
});

test('profile extends to a deep observation and includes zero-depth boundary', () => {
  const result = Mechanics.effectiveStress({ depth: 12.3, waterDepth: 1.234, surcharge: 12 });
  close(result.maxDepth, 12.3);
  close(result.profile[0].total, 12);
  assert.equal(result.profile.at(-1).depth, 12.3);
  assert.ok(result.profile.some((row) => row.depth === 1.234));
});

test('fixed total load: doubling square width quarters q and halves elastic center settlement', () => {
  const a = Mechanics.foundation({ width: 2, load: 400 });
  const b = Mechanics.foundation({ width: 4, load: 400 });
  assert.equal(a.valid, true); assert.equal(b.valid, true);
  close(a.pressure, 100); close(b.pressure, 25);
  close(b.settlementMm, a.settlementMm / 2);
  close(a.load, b.load);
});

test('fixed pressure: doubling width doubles settlement and quadruples total load', () => {
  const a = Mechanics.foundation({ width: 2, loadMode: 'pressure', pressure: 100 });
  const b = Mechanics.foundation({ width: 4, loadMode: 'pressure', pressure: 100 });
  close(a.load, 400); close(b.load, 1600);
  close(b.settlementMm, a.settlementMm * 2);
  close(a.pressure, b.pressure);
});

test('center settlement agrees with independently tabulated Is=1.12 to table precision', () => {
  // FHWA Eq.8-19 and square flexible center Cd=1.12: 100*2*.91*1.12/20000*1000=10.192 mm.
  const result = Mechanics.foundation({ width: 2, pressure: 100, loadMode: 'pressure' });
  close(result.settlementMm, 10.192, 0.025);
  assert.equal(result.settlementLocation, 'center');
  const stiffer = Mechanics.foundation({ width: 2, pressure: 100, loadMode: 'pressure', modulus: 40000 });
  close(stiffer.settlementMm, result.settlementMm / 2);
});

test('FHWA phi=30 tabulated factors and square shape factor produce expected bearing pressure', () => {
  const result = Mechanics.foundation({ width: 3, phi: 30, cohesion: 0 });
  close(result.nq, 18.4, 0.05); close(result.nc, 30.1, 0.05); close(result.ngamma, 22.4, 0.05);
  close(result.shapeFactors.weight, 0.6);
  // Independently using published rounded Nγ=22.4: 0.5*18*3*22.4*0.6=362.88 kPa.
  close(result.ultimateGross, 362.88, 0.1);
  close(result.ultimateGross, result.ultimateNet);
  close(result.bearingTerms.surcharge, 0);
});

test('phi=0 branch is finite with source-specific square cohesion shape factor', () => {
  const result = Mechanics.foundation({ phi: 0, cohesion: 50, load: 0 });
  close(result.nq, 1); close(result.ngamma, 0); close(result.shapeFactors.cohesion, 1.2);
  close(result.ultimateGross, 308.5, 0.1); // 50*5.14159*1.2.
  close(result.settlementMm, 0);
  const tiny = Mechanics.foundation({ phi: 1e-10, cohesion: 50 });
  close(tiny.nc, Math.PI + 2, 1e-8);
});

test('over-capacity elastic calculation is explicitly flagged; zero load is zero settlement', () => {
  const loaded = Mechanics.foundation({ width: 1, load: 1200 });
  assert.equal(loaded.valid, true); assert.equal(loaded.settlementApplicable, false);
  assert.ok(loaded.warnings.length > 0);
  const unloaded = Mechanics.foundation({ load: 0, phi: 0, cohesion: 0 });
  close(unloaded.load, 0); close(unloaded.pressure, 0); close(unloaded.settlementMm, 0);
  assert.equal(unloaded.settlementApplicable, true);
});

test('invalid input is rejected without coercion, clamping, or fabricated results', () => {
  for (const input of [null, [], { waterDepth: -1 }, { depth: -1 }, { surcharge: -1 }, { depth: NaN }, { gammaSat: 8 }, { gammaMoist: 22 }, { depth: '5' }]) {
    const result = Mechanics.effectiveStress(input);
    assert.equal(result.valid, false); assert.ok(result.errors.length); assert.equal(result.total, undefined);
  }
  for (const input of [null, [], { width: 0 }, { width: '3' }, { length: 4 }, { embedment: 1 }, { waterDepth: 20 }, { phi: 46 }, { modulus: 0 }, { poisson: 0.5 }, { load: -1 }, { loadMode: 'other' }, { load: Infinity }]) {
    const result = Mechanics.foundation(input);
    assert.equal(result.valid, false); assert.ok(result.errors.length); assert.equal(result.pressure, undefined);
  }
});

test('only the active load definition controls the force/pressure calculation', () => {
  const force = Mechanics.foundation({ loadMode: 'force', load: 900, pressure: 200 });
  close(force.pressure, 100);
  const pressure = Mechanics.foundation({ loadMode: 'pressure', pressure: 200, load: 900 });
  close(pressure.load, 1800);
});
