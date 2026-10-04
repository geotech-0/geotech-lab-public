# Third-party materials

[README](../README.md) · [Reference map](reference-map.md) · [Copyright and licensing](../COPYRIGHT.md)

The repository combines assumed learning inputs, source-linked equations, published experimental data, numbers read from a figure, and a bundled font. The featured example inputs are assumed cases; this does not make the other assets synthetic.

This inventory records source and license statements. Preserve citations, license notices, processing notes, and distinctions between original observations and derived values when working with these files. The application code has no open-source license grant; material-specific terms below apply to their respective materials.

## Included materials

| Material | Files and provenance | Recorded terms and important distinction |
|---|---|---|
| Pretendard variable font | `assets/fonts/PretendardVariable.woff2`, [license text](../assets/fonts/OFL.txt) | SIL Open Font License 1.1; copyright and reserved-font-name notice are bundled. |
| Karlsruhe fine sand drained triaxial records | `assets/data/drained-*.csv`, [provenance](../assets/data/drained-provenance.md), [source README](../assets/data/drained-source-readme.md) | Compilation records CC BY 4.0. Cite the compilation and underlying test publication. Many source values are digitized/rounded; the dataset license does not license the complete source article or its figures. |
| LEAP-2017 GWU cyclic triaxial record | `assets/data/cyclic-leap2017-*`, [model and provenance](cyclic-evidence.md) | Data record states ODC-BY 1.0. The app selects observed points and derives pore-pressure ratios; it does not generate new test responses from arbitrary parameters. |
| USGS/DOE kaolin oedometer selected records | `assets/data/oedometer-usgs-15021308-points.json`, `assets/data/oedometer-usgs-15021308-repository.json`, [model and provenance](oedometer-evidence.md) | Records retain both Zenodo CC BY 4.0 and USGS public-domain/CC0 metadata statements. Selected values and extraction/cell references remain; the workbook is not bundled. Reported stage endpoints are not raw continuous instrument logs. |
| Amaliahaven pile-load test | `assets/data/pile-evidence-amaliahaven-*`, [model and provenance](pile-evidence.md) | 4TU record and source README state CC BY 4.0. These are real published site/test records, including site coordinates, dates, elevations, and upstream contact/attribution metadata. They are not fabricated or this app author's field measurements. |
| USACE compaction digitized points | `assets/compaction/usace-em1110-3-141-points.json`, [provenance and limits](compaction-evidence.md) | Approximate numerical readings from Figure 3-1 are included with calibration and source links. The source manual and extracted PDF page are not bundled. The recorded reuse basis is the agency's public-information policy, not a Creative Commons license. Official-server byte identity was not established. |

Calculation references are mapped in [reference-map.md](reference-map.md) and individual model documents. Reading a reference is distinct from redistributing its prose or figures. The excavation documentation cites program manuals to explain modeling distinctions; these citations do not establish numerical equivalence or endorsement.

## Publisher-hosted originals

The following files are deliberately absent from both this repository and its public HTML build:

- `assets/data/oedometer-usgs-15021308-original.xlsx`: use the [Zenodo record](https://zenodo.org/records/15021308) or [publisher's workbook download](https://zenodo.org/api/records/15021308/files/HighStressPermeameter_HSP_ComparisonWithOedometers.xlsx/content). The selected numbers, units, original cell references, checksums, and transformation notes remain here.
- `assets/compaction/usace-em1110-3-141-page3-3.pdf`: use the [USACE manual](https://www.publications.usace.army.mil/portals/76/publications/engineermanuals/em_1110-3-141.pdf) or the identified [public copy](https://www.pdhonline.com/courses/c302/EM1110-3-141.pdf). The numerical readings and calibration record remain here; the PDF page and its images do not.

[The distribution marker](../public-release.json) records these omissions. Source links lead to external providers and require internet access. Inclusion of a publisher link does not license the linked publication's complete text or figures.

## Reuse boundaries

Keep upstream authorship and provider attribution distinct from application development. Preserve the Amaliahaven source's CC BY 4.0 notice and source/processing descriptions. Do not relabel actual public records as synthetic or imply that their providers validated this application.

For any additional material, establish the applicable terms before adding source workbooks, figures, full-text publications, personal information, or site data. Public availability alone does not establish redistribution rights. Review generated HTML and documentation images as well as their source files.
