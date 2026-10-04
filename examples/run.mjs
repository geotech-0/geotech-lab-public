// Synthetic learning cases. No field observations or site-specific inputs.
// Run from any directory with Node.js >=22: node examples/run.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LayeredCase } from '../src/layered-case.mjs';
import { ExcavationStaged } from '../src/excavation-staged.mjs';
import { ExcavationPlanar } from '../src/excavation-planar.mjs';

const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const near = (actual, expected, tolerance, label) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `${label}: ${actual} differs from ${expected} by more than ${tolerance}`,
);
const round = (value, places = 6) => Number(value.toFixed(places));

const layered = read('./layered-settlement.json');
const forward = LayeredCase.solve(layered, 'contribution');
assert.equal(forward.valid, true, forward.errors.join(' '));
near(forward.s1 * 1000, 20, 1e-8, 'Upper-layer compression (mm)');
near(forward.s2 * 1000, 80, 1e-8, 'Lower-layer compression (mm)');
near(forward.totalMm, 100, 1e-8, 'Forward surface settlement (mm)');

const inverseRows = [10000, 20000].map(m1 => {
  const fit = LayeredCase.solve({ ...layered, m1 }, 'observation');
  assert.equal(fit.valid, true, fit.errors.join(' '));
  assert.equal(fit.conditionalStatus, 'admissible');
  const replay = LayeredCase.solve({ ...layered, m1, m2: fit.conditionalM2 });
  assert.equal(replay.valid, true);
  near(replay.totalMm, layered.observedMm, 1e-8, 'Conditional inverse replay (mm)');
  for (const [key, settlement] of [['lower', 85], ['upper', 75]]) {
    const bound = LayeredCase.solve({ ...layered, m1, m2: fit.conditionalRange[key] });
    assert.equal(bound.valid, true);
    near(bound.totalMm, settlement, 1e-8, 'Inverse interval endpoint (mm)');
  }
  return { m1_kPa: m1, fitted_m2_kPa: round(fit.conditionalM2), settlement_mm: round(replay.totalMm),
    m2_lower_kPa: round(fit.conditionalRange.lower), m2_upper_kPa: round(fit.conditionalRange.upper) };
});
const noFiniteFit = LayeredCase.solve({ ...layered, m1: 2500 }, 'observation');
assert.equal(noFiniteFit.conditionalStatus, 'no-positive-solution');
assert.equal(noFiniteFit.conditionalM2, null);
console.log('Synthetic layered settlement: forward 20 + 80 = 100 mm; conditional fits to 80 +/- 5 mm');
console.table(inverseRows);

const excavation = read('./staged-excavation.json');
const runStage = (observation, input = excavation) => {
  const result = ExcavationStaged.analyze(input, { ...input.observation, ...observation }, { planarProvider: ExcavationPlanar });
  assert.equal(result.valid, true, result.errors.join(' '));
  assert.equal(result.status, 'stable');
  // Integrate the actual discrete loads, counting repeated beam-end nodes once.
  const nodes = [...new Map(result.profile.map(point => [point.z, point])).values()];
  const width = result.selectedStrip.width;
  const force = nodes.reduce((sum, point) => sum + point.soilForce / width, 0)
    - result.supportForces.reduce((sum, support) => sum + support.reaction, 0);
  const moment = nodes.reduce((sum, point) => sum + point.soilForce * point.z / width, 0)
    - result.supportForces.reduce((sum, support) => sum + support.reaction * support.z, 0);
  near(force, 0, 2e-5, 'Discrete horizontal force balance (kN/m)');
  near(moment, 0, 2e-4, 'Discrete moment balance (kN m/m)');
  assert.ok(result.residuals.algebraic < 2e-6, 'Solver residual exceeds the example tolerance');
  return result;
};

ExcavationStaged.clearCache();
const stages = [
  { depth: 0 },
  { depth: 2, eventSide: 'before' },
  { depth: 2, eventSide: 'installed' },
  { depth: 2, eventSide: 'after' },
  { depth: 4 }, { depth: 6 }, { depth: 8 },
  { phase: 'backfill', depth: 5 }, { phase: 'backfill', depth: 0 },
].map(observation => runStage(observation));
near(stages[0].maxDisplacement, 0, 1e-12, 'Balanced initial displacement (m)');
assert.equal(stages[1].supportForces[0].state, 'planned');
near(stages[2].supportForces[0].force, 0, 1e-8, 'Force immediately after fitting (kN)');
near(stages[2].maxDisplacement, stages[1].maxDisplacement, 1e-11, 'Zero-force installation displacement (m)');
near(stages[3].supportForces[0].force, 40, 1e-8, 'Effective lock-off force (kN)');
assert.ok(stages.at(-1).supportForces.every(support => support.state === 'released'));
console.log('Synthetic staged excavation: absolute maximum displacement; axial force per anchor');
console.table(stages.map(result => ({
  phase: result.phase, depth_m: result.depth, event: result.eventSide,
  max_abs_u_mm: round(result.maxDisplacement * 1000),
  max_abs_M_kNm_per_m: round(result.maxMoment),
  anchor_1_kN: round(result.supportForces[0].force),
  anchor_2_kN: round(result.supportForces[1].force),
  anchor_3_kN: round(result.supportForces[2].force),
})));

// An independent beam formula checks the element formulation, not field accuracy.
const beam = ExcavationStaged.beamBenchmark({ length: 6, EI: 500000, uniformLoad: 10, tipLoad: 100, elements: 7 });
assert.equal(beam.valid, true);
near(beam.tipDisplacement, 10 * 6 ** 4 / (8 * 500000) + 100 * 6 ** 3 / (3 * 500000), 1e-10, 'Cantilever tip displacement (m)');
near(beam.baseReaction, -(10 * 6 + 100), 1e-6, 'Cantilever reaction (kN)');
near(beam.baseMoment, 10 * 6 ** 2 / 2 + 100 * 6, 1e-6, 'Cantilever base moment (kN m)');

const coarse = stages[6];
const mediumInput = { ...excavation, mesh: 0.25 };
const medium = runStage({ depth: 8 }, mediumInput);
const fine = runStage({ depth: 8 }, { ...excavation, mesh: 0.125 });
assert.ok(Math.abs(fine.maxDisplacement - medium.maxDisplacement) < Math.abs(medium.maxDisplacement - coarse.maxDisplacement));
assert.ok(Math.abs(medium.maxDisplacement / fine.maxDisplacement - 1) < 0.005);
assert.ok(Math.abs(medium.maxMoment / fine.maxMoment - 1) < 0.01);
const smallerStep = runStage({ depth: 8 }, { ...mediumInput, increment: 0.125 });
near(smallerStep.maxDisplacement, medium.maxDisplacement, 1e-6, 'Construction increment sensitivity (m)');
console.log('Final-excavation sensitivity (these tolerances apply only to this synthetic case)');
console.table([coarse, medium, fine, smallerStep].map(result => ({
  mesh_m: result.diagnostics.mesh, increment_m: result.diagnostics.increment,
  max_abs_u_mm: round(result.maxDisplacement * 1000),
  max_abs_M_kNm_per_m: round(result.maxMoment),
})));
console.log('All example checks passed. Numerical consistency is not field or design-code validation.');
