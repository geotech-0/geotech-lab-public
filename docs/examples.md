# Reproducible synthetic examples

These two examples connect editable inputs, implemented equations, and numerical checks. The inputs are educational scenarios, not field monitoring records or recommended design parameters. The 80 mm settlement target is synthetic.

Run the examples from the repository root with Node.js 22 or newer. They require no browser, cloud account, or third-party package:

```sh
node examples/run.mjs
```

The script reads [staged-excavation.json](../examples/staged-excavation.json) and [layered-settlement.json](../examples/layered-settlement.json), prints the results, and exits unsuccessfully if a numerical check fails. These JSON files are engine inputs; they are not saved-session files for the browser's file-open dialog. Edit them and rerun to explore another scenario; the supplied assertions describe the original scenario and must be reconsidered when changing inputs.

For the corresponding Korean model documentation, see [흙막이 시공과정](excavation-staged.md) and [두 층의 압축과 계측의 비유일성](layered-case.md). The existing Korean interface remains editable.

## 1. Excavation, installation, lock-off, and backfill

Open **흙막이 시공과정**, choose **시공 이력 · 탄소성**, and view **현재 총결과**. This example uses the [staged engine](../src/excavation-staged.mjs) with the same [support provider](../src/excavation-planar.mjs) as the app.

| Input | Value |
| --- | --- |
| Final excavation / embedment | 8 m / 4 m |
| Wall EI | 300,000 kN·m² per metre of wall |
| Element size / construction increment | 0.5 m / 0.25 m |
| Original soil | γ = 18, γsat = 20 kN/m³; c′ = 0 kPa; φ′ = 30°; K₀ = 0.5; kh = 18,000 kN/m³ |
| Fill | Same weight and strength; kh = 12,000 kN/m³; soil pressure mode; no extra initial pressure |
| Water depths below original ground | 8 m on both sides and at restored condition |
| Surcharge | 0 kPa |
| Anchor levels | 1.5, 3.5, 5.5 m |
| Each anchor | 50,000 kN/m axial stiffness; 40 kN preload; zero preload loss; 15° inclination; 2 m spacing; 1,000 kN force cap |
| Installation and release clearance | 0.5 m below each anchor level |

The JSON also includes the plan fields accepted by the app. This anchor example uses an independent one-metre wall strip; it does not exercise the corner-strut coupling model. The supplied 12 m anchor length does not derive its stiffness: axial stiffness is an independent input here, with no optional bond stiffness supplied.

The model uses Euler–Bernoulli beam elements and independent elastoplastic soil springs. Positive wall displacement points into the excavation. For cohesionless soil in this case, Rankine limits are `Kₐσ′ᵥ` and `Kₚσ′ᵥ`, with `Kₐ = (1 − sin φ′)/(1 + sin φ′)` and `Kₚ = 1/Kₐ`; initial pressure is `K₀σ′ᵥ`. The engine updates pressure from the last converged state, projects it onto active/passive limits, and retains no-tension gap history. It uses the same specified kh for loading and unloading. Hydrostatic water pressure is separate; here equal water levels give zero net water pressure, while buoyancy still affects effective stress below 8 m.

At excavation depth 2 m, the first anchor passes through three states at the same geometry: `before`, `installed` with zero force, and `after` with 40 kN effective lock-off force. Its later force evolves from the locked reference position. The other rows install at depths 4 m and 6 m. Backfill continues from the completed excavation state, activates fill at the wall's current position, and releases anchors in reverse order at depths 6, 4, and 2 m. Backfill `depth` denotes the fill surface below original ground: it moves from 8 m to 0 m, while filled height increases from 0 m to 8 m.

Representative output from `node examples/run.mjs` (rounded):

| Stage | Depth (m) | Maximum absolute displacement (mm) | Maximum absolute moment (kN·m/m) | First-anchor axial force (kN) |
| --- | ---: | ---: | ---: | ---: |
| Initial equilibrium | 0 | 0 | 0 | 0 |
| Before first installation | 2 | 1.832232 | 22.638867 | 0 |
| Installed, before preload | 2 | 1.832232 | 22.638867 | 0 |
| After first lock-off | 2 | 1.490864 | 16.143985 | 40 |
| Final excavation | 8 | 6.992929 | 151.457264 | 74.738631 |
| Backfilled to original ground | 0 | 8.634492 | 73.376399 | 0 |

These are current profile maxima, not a history envelope. Backfill does not reset the displacement: this model retains construction history and releases the temporary supports. Residual movement here is a model outcome, not a prediction for a real excavation.

## 2. Layered settlement and a conditional inverse

Open **층별 침하와 계측** in the app. Compare **어느 층이 더 눌릴까** (layer contributions) with **계측으로 정수를 알 수 있을까** (what one observation can identify).

| Quantity | Input | Engine unit |
| --- | ---: | --- |
| Uniform effective stress increase, Δσ′ | 100 | kPa |
| Layer thicknesses, H₁ / H₂ | 2 / 4 | m |
| Constrained moduli, M₁ / M₂ | 10,000 / 5,000 | kPa |
| Synthetic surface observation | 80 | mm |
| User-specified observation tolerance | ±5 | mm |

The UI displays M in MPa; the engine and JSON use kPa. M is the one-dimensional constrained modulus, not Young's modulus E.

The [implemented model](../src/layered-case.mjs) gives each layer the same stress increase and uses constant moduli:

```text
εᵢ = Δσ′ / Mᵢ
sᵢ = εᵢ Hᵢ
s_surface = s₁ + s₂
M₂ = Δσ′ H₂ / (s_observed − Δσ′ H₁ / M₁)
```

Lengths in the equations are metres, including `s_observed`; divide the mm observation by 1,000 before substitution. The forward result is **20 + 80 = 100 mm**, with 80 mm movement at the layer interface and zero movement at the fixed bottom.

One surface observation supplies one equation for two unknown moduli. Holding a different M₁ fixed gives a different M₂ that fits the same observation:

| Assumed M₁ (kPa) | Conditional M₂ (kPa) | Replayed settlement (mm) | M₂ interval for 75–85 mm (kPa) |
| ---: | ---: | ---: | ---: |
| 10,000 | 6,666.666667 | 80 | 6,153.846154–7,272.727273 |
| 20,000 | 5,714.285714 | 80 | 5,333.333333–6,153.846154 |

The interval is the inverse image of a user-specified measurement interval, not a statistical confidence interval. The lower modulus endpoint produces the larger settlement. The inverse result does not replace the current input M₂: `totalMm` still reports the current forward model, while `conditionalM2` reports the fit. The example explicitly reruns the forward engine with that fitted value.

A positive finite solution requires `M₁ > Δσ′ H₁ / s_observed` (2,500 kPa here). At equality, the upper layer alone produces 80 mm and no finite positive M₂ fits. The engine also limits each layer's compression strain to 10%, requiring Mᵢ ≥ 1,000 kPa for this load. Check `conditionalStatus` and `conditionalM2`; `valid: true` alone does not establish that an admissible inverse exists.

Assumptions: wide uniform loading, lateral strain constrained, completed drainage, fixed bottom, known thicknesses and load, and constant M within each layer. The 10% limit is an implementation guard, not a general accuracy claim. This case excludes finite-footing stress spread, consolidation time, stress history, creep, lateral movement, and differential settlement. The app's finite-footing question uses a separate engine.

## What the checks establish

The example runner verifies layer hand calculations, two distinct inverse fits, both observation-interval endpoints, and the no-finite-solution boundary. For excavation, it independently sums discrete soil loads and support reactions for horizontal force and moment balance, checks initial equilibrium and exact lock-off, and checks that all temporary anchors are released after backfill. Duplicate beam-end profile nodes are counted once when summing loads.

An independent cantilever formula checks the beam element: for length L, uniform load q, end load P, and EI, `u_tip = qL⁴/(8EI) + PL³/(3EI)`. The script also checks base force and moment. That benchmark constrains the beam's base; it does not add an artificial fixed toe to the excavation model.

At final excavation, separate mesh and construction-increment changes produce:

| Element size (m) | Increment (m) | Maximum absolute displacement (mm) | Maximum absolute moment (kN·m/m) |
| ---: | ---: | ---: | ---: |
| 0.5 | 0.25 | 6.992929 | 151.457264 |
| 0.25 | 0.25 | 7.005034 | 152.426337 |
| 0.125 | 0.25 | 7.009115 | 152.223640 |
| 0.25 | 0.125 | 7.005038 | 152.424737 |

The displacement difference decreases with mesh refinement. The two finer meshes differ by less than 0.5% in displacement and 1% in moment for this case; the smaller increment changes displacement by less than 0.001 mm. These are case-specific consistency checks, not error bounds for arbitrary inputs. A 0.01 m UI depth step is not a claim of numerical accuracy.

Run the relevant existing engine tests separately:

```sh
node --test tests/layered-case.test.mjs tests/excavation-staged.test.mjs tests/excavation-planar.test.mjs
```

They also cover constitutive hand checks, cache/query-order independence, nonconvergence behavior, water paths, support release rollback, and planar support force transfer. An unsuccessful equilibrium solve must not be reported as a stable solution; it is not a calculated factor of safety or a proven field failure. No comparison against an independently executed SUNEX, GEOXD, or DeepEX case, field-calibrated accuracy study, or design-code certification is established by these checks.

The excavation model excludes a 3D soil continuum, soil arching along the wall, seepage, time-dependent consolidation, dynamic loading, variable unloading stiffness, member buckling, anchor bond design, basal-heave checks, and global slope stability. Its c′–φ′ inputs describe drained effective-stress behavior; they do not provide a short-term undrained clay model. Support force caps are equivalent resistance limits, not structural design checks. The separate `shape` mode changes the load, soil, and reference-state assumptions; differences from history mode cannot all be attributed to accumulated deformation.

## Sources and traceability

- [USACE EM 1110-1-1904, Settlement Analysis (1990)](https://www.publications.usace.army.mil/Portals/76/Publications/EngineerManuals/EM_1110-1-1904.pdf), equation 3-14 and printed pages 3-11–3-12: constrained-modulus compression and summation by layer. A [copy of the USACE manual hosted by ASDSO](https://damtoolbox.org/images/0/0b/EM_1110-1-1904.pdf#page=36) provides access when the official PDF endpoint is unavailable. This example uses a constant prescribed modulus; it does not implement the manual's DMT interpretation or stress-dependent modulus adjustments.
- [MIDAS GEOXD, Construction Stages](https://manual.midasuser.com/KR/GeoXD/Analysis/latest/model/construction-stage.html): terminology for staged excavation, installation clearance, backfill, and support removal. This is background for the workflow, not evidence of numerical agreement with GEOXD.
- [Deep Excavation, Non-Linear Analysis Method](https://www.deepexcavation.com/post/deep-excavations-non-linear-analysis-method): background for beam-and-spring idealization. The application here uses its own simplified, constant-kh implementation; it does not reproduce DeepEX's stiffness updates or full constitutive options.
- Exact behavior is defined by the linked source modules and [layered-case tests](../tests/layered-case.test.mjs), [staged-excavation tests](../tests/excavation-staged.test.mjs), and [planar-support tests](../tests/excavation-planar.test.mjs). The example script contains the checks used to generate the tables above. No source figures, site imagery, or monitoring datasets are included in these examples.
