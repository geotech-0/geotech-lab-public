# Sand Triaxial Test Database

A collection of drained monotonic triaxial compression test data on 59 granular
materials (46 sands, including a calcareous coral sand, 6 artificially graded
coarse-grained soils, 1 rockfill, 6 glass-bead materials), compiled from
published literature and open datasets into a single, uniform, machine-readable
format.

Compiled by: Huan Wang, Norwegian Geotechnical Institute
License: CC-BY-4.0
Format version: 1.1

## Package contents

- `NN_Material_name.csv` — one self-contained file per material (see format below)
- `index.csv` — one row per material: index properties, number of tests, stress
  and density ranges, and the primary data source. Use this to browse the
  database without opening the individual files.
- `references.csv` — every reference cited anywhere in the database,
  deduplicated, with persistent identifiers (DOI/URL) where available, the
  role each reference plays (data source, site characterisation, related
  publication, dataset repository), and the material IDs that draw on it.
  This database is a compilation of existing work; this file is the complete
  list of the underlying sources.
- `database_coverage.png|pdf` — overview figure: one row per material with
  d50 on the grain-size scale and the per-test ranges of confining stress,
  relative density, and void ratio.
- `figures/` — one grain-size-distribution figure per material (`figures/psd/`)
  and one test figure per material (`figures/tests/`), plus
  `figures/all_materials_psd.png|pdf` with every available PSD curve colored
  by median grain size and `figures/all_tests_dilatancy.png|pdf` showing the
  derived stress-dilatancy response (psi vs. phi_mob, see below) of every
  test, colored by relative-density group.
- `README.md` — this file

## Test figures

Each test figure in `figures/tests/` shows four panels per group of tests
(grouped by confining stress level or by density, whichever reads best for
that material):

1. deviator stress q vs. axial strain
2. volumetric strain vs. axial strain
3. stress path q vs. mean effective stress p' = (sigma'_v + 2 sigma'_r)/3
4. **dilatancy angle vs. mobilized friction angle**, where
   sin(psi) = -d_eps_vol / (2 d_eps_a - d_eps_vol)  (e.g. Bolton 1986) and
   sin(phi_mob) = (sigma'_v - sigma'_r) / (sigma'_v + sigma'_r).

Note that panel 4 shows **derived** quantities: the strain increments are
computed from the digitized curves after resampling to a uniform strain grid
and light smoothing (moving average plus a median filter to suppress
digitization noise). These panels are intended for visual characterisation;
for quantitative stress-dilatancy work, recompute the increments from the
published data columns with your own smoothing choices. The data files
themselves contain measured/digitized quantities only.

## File format

Each material file is a single CSV containing six sections. Section headers are
comment lines starting with `#`; each section is a self-contained rectangular
CSV table with its own header row. **An empty cell always means "not available /
not reported in the source".**

| # | Section | Content |
|---|---------|---------|
| 1 | `FILE_INFO` | key–value pairs: material name, type, testing laboratory, origin, license, compilation info |
| 2 | `SOURCES` | one row per reference, with a `role` (data source, site characterisation, related publication, dataset repository), full citation, and DOI/URL |
| 3 | `INDEX_PROPERTIES` | d50, Cu, Gs, e_max, e_min, phi_c with units |
| 4 | `PARTICLE_SIZE_DISTRIBUTION` | grain diameter [mm] vs. finer by weight [%]; multiple sievings stack in long format (`sieving_id`, optional `label` e.g. sieving year) |
| 5 | `TEST_PROGRAMME` | one row per test: type, drainage, consolidation (with stress ratio K_c and OCR), initial stresses, initial void ratio e_0 and relative density Dr_0, number of data points, the source's own test designation where known (`source_test_id`), source, notes |
| 6 | `TEST_DATA` | the measurement records: `test_id, eps_a[%], eps_v[%], sigma_r[kPa], sigma_v[kPa]` |

## Conventions

- All tests are **drained monotonic triaxial compression** tests (test IDs
  `TMD*`). Most are isotropically consolidated and normally consolidated;
  a few materials include anisotropically (K0) consolidated or
  overconsolidated tests, identified by the `consolidation`, `K_c[-]`
  (= sigma'_r / sigma'_v during consolidation) and `OCR[-]` columns of
  `TEST_PROGRAMME`.
- Sign convention: **compression positive** (axial strain eps_a, volumetric
  strain eps_v, stresses sigma).
- `sigma_r` = radial (cell) stress, `sigma_v` = vertical (axial) stress; both
  are effective stresses in kPa.
- `e_0` and `Dr_0` describe the state after consolidation, at the start of
  shearing; they are constant per test and therefore live in `TEST_PROGRAMME`,
  not in the data records.
- Most data were digitized from figures in the cited publications; values are
  rounded (strains to 4 decimals, stresses to 0.01 kPa) and carry the usual
  digitization tolerance. Minor artifacts (e.g. percent-finer marginally above
  100) may remain from digitization.
- Relative density and void ratio are reported as given in the sources. In a
  few cases they are mutually inconsistent with the reported e_max/e_min
  (flagged in the `notes` column where known); users needing strict consistency
  should recompute Dr from e_0, e_max and e_min.

## Reading the files

Python:

```python
import csv

def read_material(path):
    """Return {section_name: list-of-dict-rows} for one material file."""
    sections, name, header = {}, None, None
    with open(path) as f:
        for line in f:
            line = line.rstrip('\n')
            if line.startswith('# ====='):
                name = line.split(']')[1].strip(' =')
                sections[name], header = [], None
            elif line.startswith('#') or not line.strip() or name is None:
                continue
            else:
                row = next(csv.reader([line]))
                if header is None:
                    header = row
                else:
                    sections[name].append(dict(zip(header, row)))
    return sections

data = read_material('01_Karlsruhe_fine_sand.csv')
tests = data['TEST_PROGRAMME']    # test catalogue
records = data['TEST_DATA']       # all measurement points
```

With pandas, convert any section to a DataFrame:

```python
import pandas as pd
df = pd.DataFrame(data['TEST_DATA']).astype({'eps_a[%]': float, 'eps_v[%]': float,
                                             'sigma_r[kPa]': float, 'sigma_v[kPa]': float})
```

## How to cite

Please cite this database and, for each material you use, the original data
source(s) listed in that file's `SOURCES` section.

## Acknowledgements

The compilation draws on the cited publications, the GEOLAB Material Properties
Database (https://doi.org/10.5281/zenodo.12697903), and the SoilModels sand and
clay standard datasets (https://soilmodels.com/sand-and-clay-standard-datasets/).
