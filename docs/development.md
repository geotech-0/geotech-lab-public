# Development

[README](../README.md) · [Examples](examples.md) · [Validation](validation.md)

## Prerequisites and local setup

Use Node.js 22 or later and npm. Install dependencies from the lockfile with `npm ci`. The complete suite also exercises the `jose` dependency used by the optional authentication code; that code is excluded from the public app.

```sh
npm ci
npm test
npm run build
npm start
```

Open <http://127.0.0.1:8766>. To change the local port:

```sh
PORT=8771 npm start
```

`npm run build` and `npm run build:public` both build `dist-public/index.html`. The local server binds to `127.0.0.1`, serves `dist-public/`, and returns `local_only` for API requests. Local calculations and JSON backup/import work without a cloud service. `npm start` does not watch or rebuild source changes; rerun the build and refresh after editing.

The generated HTML is a static app with selected embedded assets. Public hosting must serve that output; building or previewing does not deploy it. The included public Worker configuration is separate from the generic authenticated service code. No account or database setup is needed for local use.

## Source layout

| Location | Purpose |
|---|---|
| `src/*.mjs` | Calculation engines, schemas, and data-reading modules. |
| `src/labs/*.js`, `src/lab-registry.js` | Experiment descriptors, questions, defaults, and explicit registration. |
| `src/app.js`, `src/learning-*.js` | Shared application state and lab UI. |
| `src/visitor-guide.js` | English/Korean introduction and persisted interface language. |
| `src/i18n.js`, `locales/` | Presentation-only localization and source-indexed English messages. |
| `src/shell.html`, `src/*.css` | Page shell and styles. |
| `source-manifest.cjs`, `build.mjs` | Source selection and self-contained HTML generation. |
| `build-asset-policy.mjs`, `public-release.json` | Public asset policy and explicit distribution marker. |
| `assets/` | Font and selected published data with provenance records. |
| `examples/` | Assumed inputs for staged excavation and settlement inverse non-uniqueness. |
| `tests/` | Node tests and the excavation browser check. |
| `cloud/` | Generic optional authentication/storage code and migrations; not included in the public UI. |
| `wrangler.public.jsonc` | Configuration for serving the static public build. |
| `docs/` | Equations, assumptions, sources, and validation. |

Only registered lab namespaces are included in the app. The build resolves referenced calculation engines, removes module `export` declarations for the combined script, embeds selected assets, checks JavaScript syntax, and verifies that the embedded script matches the checked source. Edit source files and rebuild; generated `index.html`, `dist/`, and `dist-public/` are ignored by Git.

## Making a focused change

1. Read [AGENTS.md](../AGENTS.md) and the relevant model document. Preserve units, assumptions, and saved-file behavior unless the change explicitly revises them.
2. Keep model computation separate from UI state. Include equations and limitations next to affected outputs.
3. Add meaningful tests for changed calculation or compatibility behavior. For UI changes, exercise the actual browser interaction and retained state.
4. Run the checks in [validation](validation.md), including the public build when changing UI or source selection.

The interface language preference is separate from experiment inputs and workspace data. It translates DOM text, plot labels, accessibility attributes, dynamic results and worksheet reports. Calculation engines, input values, identifiers and saved JSON remain canonical. Opening a featured lab preserves its existing inputs; the reproducible example files provide explicit assumed inputs for calculations.

## Maintaining translations

Run `node tools/i18n-catalog.mjs` after changing source messages, then update `locales/en.json`. `locales/source.json` records source locations; dynamic `{{0}}` slots must survive unchanged. Complete messages are matched before dynamic templates. Unknown text stays visible and fails coverage checks; words are never replaced inside other words. Korean text is retained on the original DOM nodes so toggling back restores it exactly. The existing language storage key remains compatible.

`npm test` checks catalogue coverage and placeholders, 40 modules/78 questions, the worksheet, option variants and empty numeric inputs. Run `node tools/i18n-audit.mjs /tmp/i18n-audit.json` and `node tools/i18n-variants.mjs /tmp/i18n-variants.json` for detailed reports. Text entered by users, source document titles, equations and data identifiers are not a promise of translated source material. Review English engineering terminology and long-label layout in the browser; string coverage alone does not certify translation quality or every possible input combination.

## Data and distribution

Experiment state, learning-library/progress state, and the worksheet are separate datasets. Current individual experiment files use version 5; previous experiment versions 1–4 and worksheet version 1 remain readable. Review [session formats](session-files.md) before altering import/export.

The public distribution deliberately omits the original USGS workbook and the USACE excerpt PDF. Selected numbers, extraction references, and publisher links remain. `public-release.json` records the omissions; it is also used to explain the three tests that need the unavailable original bytes or cells. Other missing required assets must fail validation.

Keep credentials, allowlists, personal backups, local reference books, and machine-specific metadata outside commits. Published datasets require attribution and transformation notes; see [third-party materials](third-party-materials.md). Application code has no open-source license grant; see [COPYRIGHT.md](../COPYRIGHT.md).
