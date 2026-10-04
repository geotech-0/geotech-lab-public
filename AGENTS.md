# Geotech Lab development instructions

- Edit source files, not generated `index.html`, `dist/`, or `dist-public/`. Source registration and bundling are controlled by `source-manifest.cjs` and `build.mjs`.
- Preserve calculation assumptions, units, input validation, and saved-file compatibility unless the requested change explicitly revises them. Keep calculations separate from UI state and document model limits beside relevant results.
- Run `npm test`, `npm run build`, and relevant reproducible examples for calculation or compatibility changes. Verify UI changes in a browser, including Korean content and retained input state.
- `npm run build` creates the static public app. It stores data in the browser and excludes account/workspace synchronization. Generic cloud code is not a configured service; changes there require its security and sync tests.
- Preserve experiment state, learning records/examples, and the worksheet as distinct datasets. Keep experiment versions 1–4 and worksheet version 1 readable alongside current experiment version 5. Never silently discard or overwrite user data on an import failure or conflict.
- Preserve the public asset policy and `public-release.json`. The original USGS workbook and USACE excerpt PDF are intentionally absent; retain selected data, provenance, and publisher links. Do not treat unrelated missing assets as optional.
- Keep third-party attributions, license records, units, transformation notes, and the distinction between synthetic inputs, published observations, and digitized figures. Do not invent rights, validation, contributions, or institutional endorsement.
- Do not commit credentials, real account allowlists, personal backups, local reference books, machine-specific paths, or deployment-local metadata.
- Documentation must distinguish reproducible test scope from verified results and actual deployment. Do not report unperformed checks as complete or add an application-code license without the rights holder's explicit choice.
