import test from 'node:test';
import assert from 'node:assert/strict';
import { Soil } from '../src/soil.mjs';

const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const fineCurve = fines => [{ size: 0.001, passing: 0 }, { size: 0.075, passing: fines }, { size: 4.75, passing: 100 }, { size: 19, passing: 100 }];
// Sub-No.200 points bracket D10 even when fines exceed 10%; no generator assumptions.
const coarseCurve = fines => [{ size: 0.01, passing: 0 }, { size: 0.02, passing: Math.min(10, fines / 2) }, { size: 0.075, passing: fines }, { size: 0.2, passing: 20 }, { size: 0.45, passing: 30 }, { size: 1.8, passing: 60 }, { size: 4.75, passing: 100 }];

test('generated examples conserve dry-mass fractions across the requested range', () => {
  for (const gradation of ['well', 'uniform']) for (const fines of [0, 3, 5, 10, 12, 50, 60]) {
    const points = Soil.generateCurve({ fines, gradation });
    assert.deepEqual(points.map(p => p.size), [0.075, 0.15, 0.3, 0.6, 1.18, 2, 4.75, 9.5, 19]);
    const a = Soil.analyzeCurve(points);
    assert.equal(a.valid, true);
    assert.equal(a.fines, fines);
    assert.equal(a.gravel, 0);
    near(a.fines + a.gravel + a.sand, 100);
    for (let i = 1; i < points.length; i++) assert.ok(points[i].passing >= points[i - 1].passing);
    for (const p of points.filter(p => p.size >= 4.75)) assert.equal(p.passing, 100);
  }
  assert.throws(() => Soil.generateCurve({ fines: -1 }), RangeError);
  assert.throws(() => Soil.generateCurve({ fines: 61 }), RangeError);
  assert.throws(() => Soil.generateCurve({ gradation: 'unknown' }), RangeError);
});

test('log diameter interpolation agrees with an independently chosen geometric midpoint', () => {
  const a = Soil.analyzeCurve([{ size: 0.075, passing: 0 }, { size: 0.1, passing: 10 }, { size: 1, passing: 50 }, { size: 4, passing: 60 }, { size: 4.75, passing: 100 }]);
  near(a.d10, 0.1);
  near(a.d30, Math.sqrt(0.1));
  near(a.d60, 4);
  near(a.cu, 40);
  near(a.cc, 0.25);
});

test('no extrapolation below measured curve and no forced poor grading', () => {
  const points = Soil.generateCurve({ fines: 12 });
  const a = Soil.analyzeCurve(points);
  assert.equal(a.valid, true);
  assert.equal(a.d10, null);
  assert.equal(a.cu, null);
  assert.equal(a.cc, null);
  const result = Soil.classify({ points, ll: 25, pl: 23 });
  assert.equal(result.status, 'needs-info');
  assert.equal(result.symbol, null);
  assert.ok(result.needs.some(text => text.includes('D10')));
});

test('flat passage at a target diameter does not select an arbitrary D value', () => {
  const a = Soil.analyzeCurve([{ size: 0.075, passing: 0 }, { size: 0.1, passing: 10 }, { size: 0.2, passing: 10 }, { size: 1, passing: 60 }, { size: 4.75, passing: 100 }]);
  assert.equal(a.d10, null);
  assert.ok(a.warnings.some(text => text.includes('수평 구간')));
});

test('invalid cumulative mass, duplicate sizes, unordered sizes and missing sieve bounds are rejected', () => {
  const valid = Soil.generateCurve();
  for (const points of [
    [{ size: 0.075, passing: -1 }, { size: 4.75, passing: 100 }],
    [{ size: 0.075, passing: 25 }, { size: 1, passing: 20 }, { size: 4.75, passing: 100 }],
    [{ size: 0.075, passing: 5 }, { size: 4.75, passing: 101 }],
    [{ size: 0.075, passing: 0 }, { size: 0.075, passing: 10 }, { size: 4.75, passing: 100 }],
    [...valid].reverse(),
    [{ size: 0, passing: 0 }, { size: 4.75, passing: 100 }],
    [{ size: 0.1, passing: 5 }, { size: 4.75, passing: 100 }],
    [{ size: 0.075, passing: 5 }, { size: 1, passing: 100 }],
    [{ size: 0.075, passing: NaN }, { size: 4.75, passing: 100 }],
  ]) {
    const result = Soil.classify({ points });
    assert.equal(result.valid, false);
    assert.equal(result.status, 'invalid');
    assert.equal(result.symbol, null);
    assert.ok(result.errors.length);
  }
});

test('clean sand examples demonstrate SW versus SP without plasticity input', () => {
  assert.equal(Soil.classify({ points: Soil.generateCurve({ fines: 0, gradation: 'well' }) }).symbol, 'SW');
  assert.equal(Soil.classify({ points: Soil.generateCurve({ fines: 3, gradation: 'well' }) }).symbol, 'SW');
  assert.equal(Soil.classify({ points: Soil.generateCurve({ fines: 3, gradation: 'uniform' }) }).symbol, 'SP');
});

test('fines thresholds include 5 and 12 in dual symbols and 50 in fine soils', () => {
  assert.equal(Soil.classify({ points: coarseCurve(4.999) }).symbol, 'SW');
  assert.equal(Soil.classify({ points: coarseCurve(5), np: true }).symbol, 'SW-SM');
  assert.equal(Soil.classify({ points: coarseCurve(12), np: true }).symbol, 'SW-SM');
  assert.equal(Soil.classify({ points: coarseCurve(12.001), np: true }).symbol, 'SM');
  assert.equal(Soil.classify({ points: fineCurve(49.999), ll: 30, pl: 20 }).symbol, 'SC');
  assert.equal(Soil.classify({ points: fineCurve(50), ll: 30, pl: 20 }).symbol, 'CL');
});

test('PI 4 and 7 belong to the CL-ML area only on or above the A-line', () => {
  const points = fineCurve(80);
  for (const pi of [4, 7]) assert.equal(Soil.classify({ points, ll: 25, pl: 25 - pi }).symbol, 'CL-ML');
  assert.equal(Soil.classify({ points, ll: 25, pl: 21.001 }).symbol, 'ML');
  assert.equal(Soil.classify({ points, ll: 25, pl: 17.999 }).symbol, 'CL');
  assert.equal(Soil.classify({ points, ll: 40, pl: 33 }).symbol, 'ML');
  assert.equal(Soil.classify({ points, ll: 30, pl: 30 - 0.73 * 10 }).symbol, 'CL');
});

test('LL 50 belongs to the high-liquid-limit branch, including on the A-line', () => {
  const points = fineCurve(80);
  assert.equal(Soil.classify({ points, ll: 49.999, pl: 20 }).symbol, 'CL');
  assert.equal(Soil.classify({ points, ll: 50, pl: 20 }).symbol, 'CH');
  assert.equal(Soil.classify({ points, ll: 50, pl: 50 - 0.73 * 30 }).symbol, 'CH');
  assert.equal(Soil.classify({ points, ll: 50, pl: 35 }).symbol, 'MH');
});

test('CL-ML fines use C in 5–12% dual band and SC-SM above it', () => {
  assert.equal(Soil.classify({ points: coarseCurve(5), ll: 25, pl: 20 }).symbol, 'SW-SC');
  assert.equal(Soil.classify({ points: coarseCurve(12), ll: 25, pl: 20 }).symbol, 'SW-SC');
  assert.equal(Soil.classify({ points: coarseCurve(15), ll: 25, pl: 20 }).symbol, 'SC-SM');
});

test('gravel versus sand compares coarse fractions, with equality assigned to sand', () => {
  const make = p4 => [{ size: 0.075, passing: 20 }, { size: 4.75, passing: p4 }, { size: 19, passing: 100 }];
  assert.equal(Soil.classify({ points: make(59.9), np: true }).symbol, 'GM');
  assert.equal(Soil.classify({ points: make(60), np: true }).symbol, 'SM');
  assert.equal(Soil.classify({ points: make(60.1), np: true }).symbol, 'SM');
  assert.equal(Soil.classify({ points: make(40), ll: 25, pl: 20 }).symbol, 'GC-GM');
});

test('different Cu thresholds are applied to clean gravel and sand', () => {
  const points = [{ size: 0.075, passing: 0 }, { size: 2, passing: 10 }, { size: 4, passing: 30 }, { size: 4.75, passing: 45 }, { size: 8, passing: 60 }, { size: 19, passing: 100 }];
  const result = Soil.classify({ points });
  near(result.cu, 4);
  near(result.cc, 1);
  assert.equal(result.symbol, 'GW');
});

test('missing Atterberg information, NP, invalid limits and organic soil are explicit', () => {
  assert.equal(Soil.classify({ points: fineCurve(60) }).status, 'needs-info');
  assert.equal(Soil.classify({ points: fineCurve(60), ll: 30 }).status, 'needs-info');
  assert.equal(Soil.classify({ points: fineCurve(60), np: true }).status, 'needs-info');
  assert.equal(Soil.classify({ points: fineCurve(60), ll: 30, np: true }).symbol, 'ML');
  assert.equal(Soil.classify({ points: fineCurve(60), ll: 50, np: true }).symbol, 'MH');
  assert.equal(Soil.classify({ points: fineCurve(20), np: true }).symbol, 'SM');
  assert.equal(Soil.classify({ points: fineCurve(60), ll: 25, pl: 26 }).status, 'invalid');
  assert.equal(Soil.classify({ points: fineCurve(60), ll: -10, pl: 0 }).status, 'invalid');
  assert.equal(Soil.classify({ points: fineCurve(60), ll: 25, pl: 15, organic: true }).status, 'unsupported');
});
