# Validation scope

[README](../README.md) · [Examples](examples.md)

The checks in this repository test numerical relationships, input contracts, saved-state compatibility, and software behavior. A passing suite is not field validation, a complete design check, or independent professional approval.

## Reproduce the checks

With Node.js 22 or later:

```sh
npm ci
npm test
npm run build
node examples/run.mjs
python3 tools/check_source.py
git diff --check
```

`npm test` runs `tests/*.test.mjs`. The excavation browser script is separate and requires a browser and Playwright. The source-safety script is a limited automated check, not a comprehensive review of credentials, provenance, or rights. `npm run build:public` is an alias for the same public build as `npm run build`.

For the excavation browser check, build the app and run `PORT=8771 npm start` in another terminal:

```sh
GEOTECH_URL=http://127.0.0.1:8771 node tests/excavation-ux.cjs
```

Where needed, set `PLAYWRIGHT_MODULE` to the installed Playwright module and `CHROME_EXECUTABLE` to the browser executable. The script uses a separate browser context. Generated captures and logs belong in ignored `test-results/`; selected documentation screenshots are stored in `docs/images/`.

## What the tests check

| Area | Evidence in the repository | Boundary |
|---|---|---|
| Staged excavation | `tests/excavation-staged.test.mjs`: independent beam solutions, spring response, equilibrium, installation/lock-off, backfill/removal, refinement, failure rollback, and history replay. | Simplified beam–spring response; convergence failure is not a collapse safety factor. |
| Planar support transfer | `tests/excavation-planar.test.mjs`: actual member geometry, force transfer, condensed tangent stiffness, and prestress. | Wall-strip/waler/support structural coupling, not a full 3D soil continuum. |
| Layered settlement and inverse problem | `tests/layered-case.test.mjs`: hand-calculated settlement, layer compatibility, scaling, non-unique modulus pairs, inverse observation intervals, and inadmissible solutions. | Constant constrained modulus, equal uniform stress increase, fully drained one-dimensional response; each layer's compressive strain is limited to 10%. |
| Published evidence | `tests/*-evidence.test.mjs`: selected data/runtime consistency, transformations, units, and reading boundaries. | The original-file exceptions below do not verify unavailable source bytes. Reproducing supplied records does not validate an extrapolating material model. |
| Input and persistence | Session, worksheet, workspace, and lab-contract tests. | Automated supported-format checks; actual user-device restore testing is a separate activity. |
| Optional cloud code | Cloud-security and cloud-sync tests, including signed JWT handling and revision conflicts. | This code is excluded from the public UI. Tests do not establish a configured or deployed service. |
| Build selection | `tests/public-build.test.mjs`, source-manifest tests, and build-time syntax/embedding checks. | Public build excludes account/workspace synchronization and the omitted originals; source selection does not itself audit every asset's rights. |

## Deliberately unavailable originals

The public distribution contains selected evidence data but omits the original USGS workbook and USACE excerpt PDF, as recorded in [public-release.json](../public-release.json). Three original-file tests are explicitly skipped in this marked distribution: the workbook checksum, workbook-cell extraction comparison, and excerpt-PDF checksum. They cannot establish byte identity or original-cell agreement from the public checkout alone.

The selected-data/runtime comparisons, ordering, units, interval calculations, digitization calibration, and model invariants remain checked. Missing required selected data must still fail. The [oedometer](oedometer-evidence.md) and [compaction](compaction-evidence.md) documents explain extraction and source access.

## Numerical interpretation

Excavation outputs depend on discretization, soil/support assumptions, and construction history. The 0.01 m observation display is not a claim of numerical accuracy. The example runner independently checks discrete force and moment equilibrium, support installation/lock-off and removal, and a cantilever beam formula. Tests refine mesh length and construction increments separately. The independent current-geometry mode changes loading and reference assumptions as well as history; differences cannot all be attributed to accumulated deformation. See [the model](excavation-staged.md) and [the worked example](examples.md#1-excavation-installation-lock-off-and-backfill).

For layered settlement, `s = Δσ′(H₁/M₁ + H₂/M₂)`. With `Δσ′ = 100 kPa`, `H₁ = 2 m`, `H₂ = 4 m`, `M₁ = 10,000 kPa`, and `M₂ = 5,000 kPa`, settlement is `20 + 80 = 100 mm`. An assumed `80 mm` observation can instead be matched by `M₁ = 10 MPa, M₂ ≈ 6.667 MPa` or `M₁ = 20 MPa, M₂ ≈ 5.714 MPa`. This illustrates non-uniqueness under known thickness/load assumptions. The user-entered observation tolerance is an interval, not a statistical confidence interval. See [the model](layered-case.md).

## Public distribution check — 2026-10-04

The public export completed **810 Node tests: 807 passed, 0 failed, 3 explicitly skipped**. The skips are solely the excluded-original byte/cell checks described above. `npm run build` completed the public build, and `node examples/run.mjs` passed its supplied numerical assertions. A local Chrome check also confirmed excavation-first navigation, both featured routes, Korean/language and input persistence after reload, online links for the omitted originals, and no horizontal overflow at 390 px and 320 px viewport settings. The console reported no errors or warnings in the checked flows. Screenshots in `docs/images/` were captured from the public build. These are implementation checks for this export, not a deployment or CI status claim.

## Browser and engineering review boundaries

Browser checks should cover the English/Korean introduction, both featured routes, input and language persistence after reload, JSON backup/import, the worksheet, and narrow viewports. A screenshot illustrates the captured state; it does not verify every interaction or another deployed version.

No same-input quantitative comparison with SUNEX, GEOXD, or DeepEX is documented. Actual site suitability, an independent external engineering review, and a learner study remain outside the completed validation. [External-review material](external-review-pack.md) and a [learner protocol](learner-validation-protocol.md) exist as preparation, not completed evidence.
