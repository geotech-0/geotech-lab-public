# Completion numerical re-review

Read-only source review on 2026-09-22. Original two findings are **resolved** in the current checkout:

1. `SoilInputs.sieveMassFromPassing` validates the whole source curve, retains/inserts the 0.075-mm boundary only when exact/bracketed, refuses extrapolation and returns explicit interpolation and discarded-detail metadata. The original reproduction preserves **SP-SC**, fines **7.9248125036%**, and pan **7.9248125036%**. The sieve controls disclose interpolation and loss of fine-detail points. Imported mass rows label the actual pan opening; a 0.05-mm pan is separated from the 0.075-mm classification metric.
2. `Soil.analyzeCurve` now rejects sizes >=75 mm, including 75 and 150 mm reproductions, consistently with the UI and mass-conversion contract. No silent renormalization occurs.

The original independent **4,500 numerical assertions pass again**. Maximum stress quadrature error is 0.0013238463 kPa; contact resultant force and moment errors remain below 7.3e-12 in their respective units. No new effective-stress or foundation defect was found.

## Additional numerical boundary issue — resolved

An additional mass-scaling check found a pre-existing classification instability at exact percentage boundaries. For fines=50%, gravelShare=75%, uniform gradation, LL=32%, PL=22%, scaling the normalized curve to 3,333 g produces a floating-point fines value 49.999999999999986%; classification changes CL→GC despite identical material fractions.

Other exact 12% cases drift to 12.000000000000014% and can change dual symbols to single symbols; a numerical G/S tie can also flip. This was roundoff, not a model limitation. The current classifier now applies its existing EPS consistently to 5%, 12%, 50% and gravel/sand tie decisions, with matching plasticity scope decisions; stated engineering boundaries remain unchanged.

The original reproduction is retained in `numeric-audit-results.json`. `soil-boundary-final.mjs` supplies a bounded 300-case roundtrip check of boundary fractions, gradations, G/S proportions and common mass scaling values. Before the fix, 38 cases changed classified symbols. After the numerical tolerance adjustment, **all 300 roundtrips pass with zero symbol changes**. All three findings from this review are resolved; no further actionable numerical defect remains from these bounded checks.

This is a dated numerical review of the bounded cases above. The public distribution does not include the historical browser/full-suite run artifact. See [current validation commands and scope](../../validation.md) to reproduce the included checks. This review does not claim external expert approval or learner-study completion.
