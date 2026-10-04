import test from 'node:test';
import assert from 'node:assert/strict';
import { BearingGeometry } from '../src/bearing-geometry.mjs';

const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);
const closePoint = (a, b, tolerance = 1e-10) => { close(a.x, b.x, tolerance); close(a.y, b.y, tolerance); };
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const properIntersection = (a, b, c, d) => cross(a, b, c) * cross(a, b, d) < -1e-10 && cross(c, d, a) * cross(c, d, b) < -1e-10;

test('zero-friction Prandtl limit consists of quarter circles and 45-degree wedges', () => {
  const g = BearingGeometry.prandtl({ width: 2, phi: 0 });
  assert.equal(g.valid, true);
  close(g.apex.y, 1); close(g.metrics.r0, Math.SQRT2); close(g.metrics.rEnd, Math.SQRT2);
  close(g.metrics.totalWidth, 6); close(g.metrics.maxDepth, Math.SQRT2);
  close(g.angles.active, 45); close(g.angles.passive, 45); close(g.angles.fan, 90);
  g.spirals.right.forEach((p) => close(Math.hypot(p.x - 1, p.y), Math.SQRT2));
});

test('phi=30 construction uses 60-degree active and 30-degree passive wedges', () => {
  const g = BearingGeometry.prandtl({ width: 2, phi: 30 });
  close(g.apex.y, Math.sqrt(3)); close(g.metrics.r0, 2);
  close(g.metrics.rEnd, 2 * Math.exp(Math.PI / (2 * Math.sqrt(3))));
  const e = g.spirals.right.at(-1);
  close(Math.atan2(e.y, e.x - 1) * 180 / Math.PI, 30);
  close(Math.atan2(e.y, g.exits.right.x - e.x) * 180 / Math.PI, 30);
  // Independent phi=30 simplification: totalWidth/B = 1+2√3 exp(π/(2√3)).
  close(g.metrics.totalWidth / 2, 9.57930585040741, 1e-10);
});

test('spiral equation and 90-degree rotation hold point by point', () => {
  for (const phi of [0, 20, 30, 42, 45]) {
    const g = BearingGeometry.prandtl({ width: 3, phi });
    const theta0 = Math.PI - g.angles.active * Math.PI / 180;
    g.spirals.right.forEach((p) => {
      const radius = Math.hypot(p.x - 1.5, p.y);
      const t = theta0 - Math.atan2(p.y, p.x - 1.5);
      close(radius, g.metrics.r0 * Math.exp(t * Math.tan(phi * Math.PI / 180)));
    });
    const end = g.spirals.right.at(-1);
    close(theta0 - Math.atan2(end.y, end.x - 1.5), Math.PI / 2);
  }
});

test('the passive straight boundary is tangent to the logarithmic spiral', () => {
  for (const phi of [0, 20, 30, 42]) {
    const g = BearingGeometry.prandtl({ width: 3, phi, samples: 720 });
    const points = g.spirals.right;
    const last = points.at(-1), previous = points.at(-2);
    const sampledSlope = (last.y - previous.y) / (last.x - previous.x);
    close(sampledSlope, -Math.tan(g.angles.passive * Math.PI / 180), 0.0025);
  }
});

test('doubling B doubles every boundary coordinate while preserving angles and normalized dimensions', () => {
  const small = BearingGeometry.prandtl({ width: 1.5, phi: 32 });
  const large = BearingGeometry.prandtl({ width: 3, phi: 32 });
  assert.equal(small.slipBoundary.length, large.slipBoundary.length);
  small.slipBoundary.forEach((p, i) => closePoint(large.slipBoundary[i], { x: 2 * p.x, y: 2 * p.y }));
  close(large.metrics.maxDepth, 2 * small.metrics.maxDepth);
  close(large.metrics.totalWidth, 2 * small.metrics.totalWidth);
  assert.deepEqual(small.angles, large.angles);
});

test('larger phi changes the normalized geometry, rather than just rescaling a stock curve', () => {
  const a = BearingGeometry.prandtl({ width: 3, phi: 20 });
  const b = BearingGeometry.prandtl({ width: 3, phi: 42 });
  assert.ok(b.metrics.maxDepth > a.metrics.maxDepth);
  assert.ok(b.metrics.totalWidth > a.metrics.totalWidth);
  assert.ok(b.angles.active > a.angles.active);
  assert.ok(b.angles.passive < a.angles.passive);
  assert.notEqual(b.metrics.totalWidth / b.metrics.maxDepth, a.metrics.totalWidth / a.metrics.maxDepth);
});

test('mirror symmetry, continuous zone joins and exact apex are retained', () => {
  const g = BearingGeometry.prandtl();
  closePoint(g.spirals.right[0], g.apex);
  closePoint(g.spirals.left[0], g.apex);
  g.spirals.right.forEach((p, i) => closePoint(g.spirals.left[i], { x: -p.x, y: p.y }));
  for (const zone of g.zones) {
    assert.ok(Number.isFinite(zone.label.x) && Number.isFinite(zone.label.y));
    assert.ok(zone.label.y > 0);
  }
  close(g.bounds.minX, -g.bounds.maxX);
  close(g.slipBoundary[0].y, 0); close(g.slipBoundary.at(-1).y, 0);
});

test('entire UI parameter range has an underground, monotonic-x, non-self-crossing slip boundary', () => {
  for (const width of [1.5, 3, 6]) {
    for (const phi of [20, 25, 30, 35, 40, 42]) {
      const g = BearingGeometry.prandtl({ width, phi, samples: 32 });
      assert.equal(g.valid, true);
      const line = g.slipBoundary;
      line.forEach((p, i) => {
        assert.ok(p.y >= -1e-10 && p.y <= g.bounds.maxY + 1e-10);
        if (i) assert.ok(p.x >= line[i - 1].x - 1e-10);
      });
      for (let i = 0; i < line.length - 1; i += 1) {
        for (let j = i + 2; j < line.length - 1; j += 1) {
          assert.equal(properIntersection(line[i], line[i + 1], line[j], line[j + 1]), false);
        }
      }
      close(Math.max(...line.map((p) => p.y)), g.bounds.maxY);
    }
  }
});

test('Q does not create unsupported load-dependent geometry', () => {
  const a = BearingGeometry.prandtl({ width: 3, phi: 30, load: 10 });
  const b = BearingGeometry.prandtl({ width: 3, phi: 30, load: 10000 });
  assert.deepEqual(a.slipBoundary, b.slipBoundary);
  assert.match(a.captions.scope, /2D 띠기초/);
  assert.match(a.captions.scope, /정사각형/);
});

test('invalid geometric inputs produce errors rather than quietly clamping', () => {
  for (const input of [null, [], { width: 0 }, { width: -1 }, { width: '3' }, { width: Infinity }, { phi: -1 }, { phi: 46 }, { phi: NaN }, { samples: 3 }, { samples: 16.5 }, { samples: 721 }]) {
    const result = BearingGeometry.prandtl(input);
    assert.equal(result.valid, false); assert.ok(result.errors.length); assert.equal(result.zones, undefined);
  }
});
