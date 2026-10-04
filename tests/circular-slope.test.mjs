import test from 'node:test';
import assert from 'node:assert/strict';
import { CircularSlope as C } from '../src/circular-slope.mjs';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const total = (items, f) => items.reduce((s, x) => s + f(x), 0);

test('prescribed circle passes toe and entry and stays under the two-segment ground', () => {
  const r = C.prescribed();
  assert.ok(r.valid && r.comparisonValid);
  const { geometry: g } = r;
  close(Math.hypot(g.toe.x - g.center.x, g.toe.y - g.center.y), g.radius);
  close(Math.hypot(g.entry.x - g.center.x, g.entry.y - g.center.y), g.radius);
  close(g.points[0].y, 0);
  close(g.points.at(-1).y, g.height);
  for (const p of g.points) assert.ok(p.y <= p.top + 1e-10);
});

test('requested slice count is retained and no slice crosses the ground crest', () => {
  for (const count of [10, 17, 40, 80]) {
    const r = C.prescribed({ circularSlices: count });
    assert.equal(r.slices.length, count);
    assert.ok(r.geometry.boundaries.includes(r.geometry.crest.x));
    for (const s of r.slices) assert.ok(s.xRight <= r.geometry.crest.x || s.xLeft >= r.geometry.crest.x);
  }
});

test('exact circular-segment areas agree with independent fine midpoint integration', () => {
  const r = C.prescribed({ circularSlices: 10 });
  const g = r.geometry;
  for (const s of r.slices) {
    const count = 4000, dx = s.b / count;
    let area = 0;
    for (let j = 0; j < count; j++) {
      const x = s.xLeft + (j + .5) * dx;
      const top = Math.min(x * Math.tan(g.betaDegrees * Math.PI / 180), g.height);
      const bottom = g.center.y - Math.sqrt(g.radius * g.radius - (x - g.center.x) ** 2);
      area += (top - bottom) * dx;
    }
    close(s.area, area, 2e-7);
  }
});

test('total mass is invariant under slice splitting', () => {
  const reference = C.prescribed({ circularSlices: 10 });
  for (const n of [17, 40, 80, 160]) {
    const r = C.prescribed({ circularSlices: n });
    close(r.totals.area, reference.totals.area, 1e-12);
    close(r.totals.weight, reference.totals.weight, 1e-12);
  }
});

test('default same-circle dry method values are stable reference values', () => {
  const r = C.prescribed();
  close(r.ordinary.factor, 1.438690904017497, 2e-10);
  close(r.bishop.factor, 1.6720153718160975, 2e-10);
  assert.ok(r.bishop.factor > r.ordinary.factor);
});

test('independent Python quadrature and fixed-point benchmark matches geometry and wet cohesive factors', () => {
  // Independent reviewer used adaptive Simpson integration and damped fixed-point iteration;
  // no imports or calls to this JavaScript engine. See circular-slope-reference.md.
  const dry = C.prescribed({ circularCohesion: 3 });
  const wet = C.prescribed({ circularCohesion: 3, circularRu: .2 });
  close(dry.totals.area, 84.94567731426613, 1e-10);
  close(dry.totals.weight, 1613.9678689710565, 1e-10);
  close(dry.totals.driving, 525.1431532811824, 1e-10);
  close(dry.ordinary.factor, 1.5702228662396223, 1e-10);
  close(dry.bishop.factor, 1.8008330885383432, 1e-10);
  close(wet.ordinary.factor, 1.282484685436123, 1e-10);
  close(wet.bishop.factor, 1.4257486583534287, 1e-10);
  close(wet.bishop.minEffectiveNormal, 2.8918301412074183, 1e-9);
});

test('Bishop bracketing agrees with an independent fixed-point iteration', () => {
  const r = C.prescribed({ circularCohesion: 1, circularRu: .2 });
  assert.ok(r.comparisonValid);
  const phi = r.inputs.circularPhi * Math.PI / 180, c = r.inputs.circularCohesion;
  let F = 1;
  for (let i = 0; i < 1000; i++) {
    const next = total(r.slices, s => (c * s.b + (s.weight - s.u * s.b) * Math.tan(phi))
      / (Math.cos(s.alphaRadians) + Math.sin(s.alphaRadians) * Math.tan(phi) / F)) / r.totals.driving;
    if (Math.abs(F - next) < 1e-13) { F = next; break; }
    F = next;
  }
  close(r.bishop.factor, F, 2e-11);
});

test('Bishop effective normals satisfy each slice vertical force equilibrium', () => {
  const r = C.prescribed({ circularCohesion: 1, circularRu: .2 });
  assert.ok(r.bishop.valid);
  for (const s of r.slices) {
    const N = s.bishopEffectiveNormal + s.poreForce;
    const T = s.bishopResistance / r.bishop.factor;
    close(N * Math.cos(s.alphaRadians) + T * Math.sin(s.alphaRadians), s.weight, 1e-10);
  }
  assert.ok(r.bishop.residual < 1e-10);
  assert.ok(r.bishop.minM > 0);
  assert.ok(r.bishop.iterations < 120);
});

test('USACE Ordinary wet treatment projects W−ub rather than subtracting uℓ', () => {
  const dry = C.prescribed({ circularCohesion: 0 });
  const wet = C.prescribed({ circularCohesion: 0, circularRu: .4 });
  close(wet.ordinary.factor, dry.ordinary.factor * .6, 1e-12);
  for (const s of wet.slices) close(s.ordinaryEffectiveNormal, (s.weight - s.u * s.b) * Math.cos(s.alphaRadians), 1e-12);
  const classic = total(wet.slices, s => (s.weight * Math.cos(s.alphaRadians) - s.poreForce) * Math.tan(28 * Math.PI / 180)) / wet.totals.driving;
  assert.ok(Math.abs(classic - wet.ordinary.factor) > .01);
});

test('phi zero gives identical equation factors when both methods are admissible', () => {
  const r = C.prescribed({ circularPhi: 0, circularCohesion: 8, circularSlices: 4 });
  assert.ok(r.comparisonValid);
  close(r.ordinary.factor, 8 * r.totals.baseLength / r.totals.driving, 1e-12);
  close(r.bishop.factor, r.ordinary.factor, 1e-12);
});

test('zero shear strength returns an exact zero factor', () => {
  for (const d of [{ circularPhi: 0, circularCohesion: 0 }, { circularRu: 1, circularCohesion: 0 }]) {
    const r = C.prescribed(d);
    assert.ok(r.comparisonValid);
    assert.equal(r.ordinary.factor, 0);
    assert.equal(r.bishop.factor, 0);
    assert.equal(r.bishop.status, 'zero-strength');
    assert.equal(r.bishop.residual, null);
    assert.equal(r.bishop.minM, null);
    assert.ok(r.slices.every(s => s.bishopEffectiveNormal === null && s.bishopM === null));
  }
});

test('geometric scaling preserves both factors when cohesion scales with gamma H', () => {
  const a = C.prescribed({ circularHeight: 8, circularCohesion: 1, circularRu: .2 });
  const b = C.prescribed({ circularHeight: 16, circularCohesion: 2, circularRu: .2 });
  assert.ok(a.comparisonValid && b.comparisonValid);
  close(b.totals.area, a.totals.area * 4, 1e-12);
  close(b.totals.weight, a.totals.weight * 4, 1e-12);
  close(b.ordinary.factor, a.ordinary.factor, 1e-12);
  close(b.bishop.factor, a.bishop.factor, 1e-12);
});

test('cohesionless factors are independent of constant unit weight', () => {
  const a = C.prescribed({ circularGamma: 14 });
  const b = C.prescribed({ circularGamma: 24 });
  close(a.ordinary.factor, b.ordinary.factor, 1e-12);
  close(a.bishop.factor, b.bishop.factor, 1e-12);
});

test('same surface with greater pore pressure has lower factors for cohesionless soil', () => {
  const results = [0, .2, .4, .6].map(circularRu => C.prescribed({ circularRu }));
  for (let i = 1; i < results.length; i++) {
    assert.ok(results[i].comparisonValid);
    assert.ok(results[i].ordinary.factor < results[i - 1].ordinary.factor);
    assert.ok(results[i].bishop.factor < results[i - 1].bishop.factor);
  }
  close(results[1].bishop.factor, 1.297577851349672, 2e-10);
});

test('Bishop slice convergence approaches a finite result without a new circle search', () => {
  const r40 = C.prescribed({ circularSlices: 40 });
  const r80 = C.prescribed({ circularSlices: 80 });
  const r160 = C.prescribed({ circularSlices: 160 });
  assert.ok(Math.abs(r160.bishop.factor - r80.bishop.factor) < Math.abs(r80.bishop.factor - r40.bishop.factor));
  assert.ok(Math.abs(r160.bishop.factor - r40.bishop.factor) < .001);
  assert.deepEqual(r40.geometry.center, r160.geometry.center);
  assert.equal(r40.geometry.radius, r160.geometry.radius);
});

test('negative effective normal is rejected, retaining valid geometry and Ordinary result', () => {
  const r = C.prescribed({ circularCohesion: 3, circularRu: .6 });
  assert.equal(r.valid, true);
  assert.equal(r.comparisonValid, false);
  assert.equal(r.ordinary.valid, true);
  assert.equal(r.bishop.valid, false);
  assert.equal(r.bishop.status, 'tensile-normal');
  assert.equal(r.bishop.factor, null);
  assert.ok(r.bishop.minEffectiveNormal < 0);
  assert.ok(r.slices.some(s => s.bishopEffectiveNormal < 0));
  assert.ok(r.bishop.residual < 1e-9);
});

test('wet small cohesion has a supported range and an explicit tension limit', () => {
  assert.ok(C.prescribed({ circularCohesion: 1, circularRu: .6, circularSlices: 40 }).bishop.valid);
  const finer = C.prescribed({ circularCohesion: 1, circularRu: .6, circularSlices: 80 });
  assert.equal(finer.bishop.status, 'tensile-normal');
  assert.ok(C.prescribed({ circularCohesion: 3, circularRu: .4, circularSlices: 40 }).bishop.valid);
  assert.equal(C.prescribed({ circularCohesion: 3, circularRu: .6, circularSlices: 40 }).bishop.status, 'tensile-normal');
});

test('invalid numeric, geometric, water and discretization inputs fail before calculation', () => {
  for (const d of [{ circularHeight: 0 }, { circularHeight: Infinity }, { circularPhi: NaN },
    { circularHeight: '8' }, { circularBeta: 80 }, { circularEntry: 0 }, { circularCenter: 1 },
    { circularRu: -.01 }, { circularRu: 1.01 }, { circularSlices: 3 }, { circularSlices: 20.5 },
    { circularCohesion: -1 }, { circularGamma: 0 }]) {
    const r = C.prescribed(d);
    assert.equal(r.valid, false, JSON.stringify(d));
    assert.ok(r.errors.length);
  }
});

test('search selects the lowest supported Bishop candidate in the stated finite grid', () => {
  const r = C.search({ circularCohesion: 8 });
  assert.ok(r.valid);
  assert.equal(r.total, 169);
  assert.equal(r.candidates.length, 169);
  assert.equal(r.isGlobalMinimum, false);
  close(r.best.result.bishop.factor, Math.min(...r.candidates.filter(c => c.valid).map(c => c.bishopFactor)), 1e-12);
  assert.equal(r.validCount + Object.values(r.rejected).reduce((a, b) => a + b, 0), 169);
  assert.ok(r.validCount < 169);
  assert.deepEqual(r.best.result.geometry, C.prescribed(r.best.inputs).geometry);
});

test('search retains both method results on the selected same circle and reports range-edge minimum', () => {
  const r = C.search();
  assert.ok(r.valid && r.best.result.comparisonValid);
  assert.ok(r.boundaryMinimum);
  assert.equal(r.best.result.inputs.circularEntry, r.best.inputs.circularEntry);
  assert.equal(r.best.result.inputs.circularCenter, r.best.inputs.circularCenter);
});

test('all invalid search candidates produce no fabricated minimum', () => {
  const r = C.search({ circularHeight: 0 });
  assert.equal(r.valid, false);
  assert.equal(r.best, null);
  assert.equal(r.validCount, 0);
  assert.equal(r.rejected['invalid-geometry'], 169);
});

test('prescribed and search do not mutate caller inputs', () => {
  const d = Object.freeze({ circularCohesion: 1, circularRu: .2 });
  C.prescribed(d);
  C.search(d);
  assert.deepEqual(d, { circularCohesion: 1, circularRu: .2 });
});
