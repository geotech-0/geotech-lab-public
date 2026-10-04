# Mechanics API and calculation scope

Date: 2026-09-21. Implemented educational calculation checks, not independent professional validation.

## Files

- `outputs/geotech-lab/src/mechanics.mjs`: dependency-free ESM. Exactly one top-level declaration, `export const Mechanics = (() => { … })();`.
- `outputs/geotech-lab/tests/mechanics.test.mjs`: run with `node --test outputs/geotech-lab/tests/mechanics.test.mjs`.

## Common behavior

Inputs and outputs use metres, kN, kPa and kN/m³; settlement output uses mm. Input values must be finite JavaScript numbers, not strings. No coercion or silent clamping. Both methods accept omitted input (documented defaults) and return `{valid:false, errors:[Korean messages], warnings:[]}` on invalid input. Invalid results deliberately have no calculated values.

## `Mechanics.effectiveStress(input)`

Defaults: `{waterDepth:2, surcharge:0, depth:5, gammaMoist:18, gammaSat:20, gammaW:9.81}`.

Homogeneous or horizontal two-layer, hydrostatic, drained final-state soil column. No capillary suction above the water table, no ground-surface flooding, no transient excess pore pressure. `surcharge` is a uniform load of infinite horizontal extent after drainage. Changing water depth represents another equilibrated water-table state, not a transient simulation.

At depth z below ground:

- `σ = surcharge + γmoist·min(z,waterDepth) + γsat·max(0,z−waterDepth)`.
- `u = γw·max(0,z−waterDepth)`.
- `σ′ = σ−u`.

`depth`, `waterDepth`, `surcharge` must be nonnegative. `γsat≥γmoist>0`, `γsat>γw>0`. Output includes observation values `{total,pore,effective,depth}`, normalized parameter names, conditions and `profile`. Profile samples span 0 to `max(8, depth)` in 80 intervals, plus exact observation depth and the water-table depth when within the profile.

These are elementary self-weight and hydrostatic relationships. The no-suction model above water is deliberately an idealization; it is not a general unsaturated-soil effective-stress model.

### Two-layer extension (2026-09-22)

`soilProfile:'layered'` enables `layerDepth` (m), `gammaMoist2` and `gammaSat2` (kN/m³). The first layer extends from the surface to the boundary, the second below it. Total stress sums the exact moist and saturated thicknesses in each layer. The hydrostatic pressure remains γw·max(0,z−zw), independent of material unit weight. At an interface the stress is continuous and the slope changes. Inactive second-layer values do not invalidate the homogeneous model. UI values are limited to the depicted 0–8 m column and ≤30 kN/m³.

The result also returns `layers` and per-observation `contributions` so the visible substituted equation is derived from the same integration as the plotted profile. A hand case (layer boundary3 m, water2 m, z5 m, q25 kPa, upper18/20 and lower19/21) gives σ123, u29.43, σ′93.57 kPa. Nine independent identity/boundary tests cover this extension.

Source: [FHWA GEC5 §11.8, Geotechnical Site Characterization](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi16072.pdf), which defines total overburden as ΣγᵢΔzᵢ and effective vertical stress by subtracting pore pressure. This extension does not compute transient or confined/artesian flow.

## `Mechanics.foundation(input)`

Defaults: `{width:3, length:width, load:1200, pressure:1200/9, loadMode:'force', embedment:0, phi:30, cohesion:0, gamma:18, modulus:20000, poisson:0.3}`.

**Initial release explicitly supports a square at the ground surface, dry homogeneous soil, central vertical loading, level base and ground.** `embedment` must equal 0; a supplied `length` must equal `width`; `waterDepth` must be omitted. Unsupported parameters fail instead of being ignored. This changes the tentative Df=1 default to Df=0 so net/gross and excavation history are not misrepresented. Root UI should keep Df fixed at 0.

`width>0`, `modulus>0`, `gamma>0`, `cohesion≥0`, `0≤poisson<0.5`, `0≤phi≤45°` (the initial educational support range, not a universal physical limit). Active load or pressure must be nonnegative. The inactive load field is not used: UI must explicitly show whether Q or q is fixed and synchronize the other field from the returned result.

`area=B²`; in force mode `q=Q/area`, in pressure mode `Q=q·area`. `load` means **all vertical load transmitted at the footing base**; no additional self-weight is silently added. Since Df=0 and no adjacent surcharge is supported, gross and net stress are the same. Future embedded-foundation support needs separate excavation, backfill, self-weight, overburden and loading-path definitions.

### Bearing capacity

One complete FHWA NHI-06-089 formulation, not Terzaghi factors mixed with a different Nγ. Source: [FHWA NHI-06-089, Soils and Foundations Volume II, 2006, Chapter 8, equations 8-2 through 8-5 and Table 8-4](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06089.pdf). Canonical mirror: [FHWA-hosted PDF](https://highways.dot.gov/sites/fhwa.dot.gov/files/FHWA-NHI-06-089.pdf).

- `Nq = exp(π tanφ) tan²(π/4+φ/2)`.
- `Nc = (Nq−1)/tanφ`; φ=0 uses its analytic limit `π+2≈5.14159`, which rounds to the manual's 5.14.
- `Nγ = 2(Nq+1)tanφ`, the FHWA/Vesic form (also described as the Caquot–Kerisel expression in FHWA GEC 6).
- φ>0 shape factors: `sc=1+(B/L)(Nq/Nc)`, `sq=1+(B/L)tanφ`, `sγ=1−0.4B/L`.
- φ=0 shape factors, the explicit Table 8-4 row: `sc=1+B/(5L)`, `sq=sγ=1`.
- `qult,gross=c Nc sc + q0 Nq sq + 0.5γ B Nγ sγ`, with `q0=0` for this surface-footing model.
- `qult,net=qult,gross−q0`, so both are equal here.

No depth, inclination, slope, eccentricity, groundwater, local-shear, rigidity or safety-factor correction is fabricated. This is an idealized general-shear resistance, not allowable bearing pressure, not a KDS design compliance result. Phi and cohesion are one dry c–phi model; setting φ=0 is a mathematical limiting case, not automatic selection of a saturated undrained clay model.

Output includes `area,load,pressure,netPressure,ultimateGross,ultimateNet,nq,nc,ngamma,shapeFactors,bearingTerms:{cohesion,surcharge,weight},overburden`, conditions and source URL.

### Settlement

Linear isotropic elastic half-space with a flexible square **uniformly pressured** area at the surface. Output is the **centre point displacement**, not rigid-footing displacement or average settlement. `s=q B(1−ν²) Is/E`, converted from m to mm. `Is=(4/π)ln(1+√2)=1.1221997…`, the analytical centre coefficient from integrating the Boussinesq surface displacement kernel over a square.

Source correspondence: [FHWA NHI-06-089, Eq.8-19, page 8-58](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06089.pdf) gives the elastic settlement form. The independently published shape table in [WisDOT research report 0092-12-03, Table 1, page 16](https://wisconsindot.gov/documents2/research/WisDOT-WHRP-project-0092-12-03-final-report.pdf) gives flexible square centre 1.12, corner 0.56, average 0.95 and rigid square 0.82; the exact coefficient here corresponds only to the first case.

The footing UI must label the result `중심점 탄성침하` and should not draw an unsupported rigid slab translating by the centre settlement as though all points deform identically. A diagram may use a separate labelled conceptual centre marker or a flexible displacement illustration.

`settlementMm` is the arithmetic linear-elastic value. `settlementApplicable` becomes false if positive q is at or above the model's ultimate resistance, and `warnings` explains why it must not be presented as a physical settlement prediction. Below ultimate is necessary here but not a claim that soil remains linear: small-strain/homogeneous linear elasticity remains an explicit assumption. There is no arbitrary allowable settlement or safe/unsafe colour criterion.

### Question-specific foundation API (2026-09-22)

`Mechanics.foundationForQuestion(input, question='pressure')` evaluates only the selected learning question. Valid question values are `pressure`, `bearing`, and `settlement`; an unknown value returns an explicit error. `Mechanics.foundation(input)` remains the complete bearing-plus-settlement API and delegates to the `settlement` branch. Existing numerical results, fields and physical restrictions are retained; the full result additionally exposes `bearingExceeded`.

| Question | Inputs that are read and validated | Returned calculation |
|---|---|---|
| `pressure` | B, optional equal L, Df=0, selected Q or q, load mode, dry/surface geometry conditions | Area, load, pressure, netPressure, width/length/embedment, pressure basis and geometry conditions |
| `bearing` | The above plus φ, c and γ | The above plus bearing factors, shape factors, contribution terms, ultimateGross/Net and bearingExceeded |
| `settlement` | The above plus E and ν | Complete result, including centre settlement and settlementApplicable |

Material defaults are used only within the question that needs those properties. The pressure branch does not read or return φ, c, γ, E, ν, bearing factors, resistance, or settlement fields. The bearing branch does not read or return E, ν, influenceFactor, settlementMm, settlementApplicable or settlementLocation. These omitted quantities are **absent**, not zero, guessed values, or results calculated using replacement material properties. Null, NaN, extreme or otherwise invalid **inactive** material values therefore do not invalidate an unrelated question and are not overwritten. When that property becomes active again, its original error is reported.

The common geometric restrictions remain explicit even for pressure: positive equal B/L, Df=0, no supplied waterDepth, known load mode and a nonnegative finite active Q/q. Pressure-only results use `model:'surface-square-contact-pressure-v1'`; bearing and settlement retain the full model's original identifier. Failure results contain no partial pressure, resistance or settlement.

`bearingExceeded` is true when positive applied pressure is at or above the calculated ultimate resistance. It is returned by bearing/settlement only and is not a design compliance verdict. A bearing question's warning refers only to this resistance comparison. `settlementApplicable` is returned by the settlement/full API only; its existing meaning is unchanged.

UI integration must use the selected question for both input validation and calculation. It must not display `!result.settlementApplicable` as a failure in the pressure or bearing question: pressure has no capacity check; bearing uses `result.bearingExceeded`. Detail equations and comparison fields should likewise follow the active question. This separates what is calculated rather than merely hiding a slider while still validating it.

```js
const data = {width:2, load:400, phi:30, cohesion:0, gamma:18, modulus:null};
Mechanics.foundationForQuestion(data, 'pressure');   // valid; q=100 kPa, no strength/E output
Mechanics.foundationForQuestion(data, 'bearing');    // valid; no elastic output
Mechanics.foundationForQuestion(data, 'settlement'); // invalid; modulus is still null
Mechanics.foundation(data);                         // invalid; legacy complete model needs E
```

`tests/foundation-questions.test.mjs` adds 13 focused tests: hand pressure/area calculation; rounded FHWA bearing and independent centre-settlement benchmarks; phi=0 and overload; absent inactive output fields; inactive-property getter guards; null/error preservation through question switches; inactive numerical-overflow isolation; active load/geometry errors; and equality with the complete API across 18 combinations of width, φ and load mode. Combined with the existing mechanics, layered-stress and bearing-extension tests, all 53 tests passed after the refactor. No effective-stress calculation was changed.

## Verification implemented

Hand-calculated hydrostatic stresses, dry/submerged/boundary limits, stress balance, drained surcharge effect, water-table sensitivity, profile boundary coverage, fixed-Q width scaling (q quarter/s half), fixed-q width scaling (Q quadruple/s double), independent rounded settlement and bearing-factor tables, phi=0 and near-zero arithmetic, overload signalling, zero load, active mode semantics and malformed/unsupported inputs. These verify the formulas and API; geotechnical expert review, multi-layer transient validation and field prediction are not claimed.
