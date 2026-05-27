# web-embed-workflows

Reusable GitHub Actions workflows that build and publish project artifacts
for the **codeseys-embed** project-embed pipeline. See the architecture doc
at [codeseys.io](https://codeseys.io/blog/build-anything-make-it-playable-an-architecture-for-discoverable-project-embeds)
or the canonical reference in
[`baladithyab/baladithyab.github.io` → `docs/PROJECT_EMBEDS.md`](https://github.com/baladithyab/baladithyab.github.io/blob/main/docs/PROJECT_EMBEDS.md).

## Available workflows

| Workflow | Embed kind | What it does |
|---|---|---|
| [`static-passthrough.yml`](./.github/workflows/static-passthrough.yml) | `static-html` | Validate manifest → upload directory tree to R2 → write back versioned manifest |
| [`wasm-emscripten.yml`](./.github/workflows/wasm-emscripten.yml) | `wasm-emscripten` | Run `emcc` → upload `.js` + `.wasm` + glue HTML to R2 _(coming)_ |
| [`wasm-rust.yml`](./.github/workflows/wasm-rust.yml) | `wasm-rust` | Run `wasm-pack build --target web` → upload to R2 _(coming)_ |
| [`notebook-html.yml`](./.github/workflows/notebook-html.yml) | `notebook-html` | Run `jupyter nbconvert --to html --no-input` → upload to R2 _(coming)_ |
| [`pyodide-bundle.yml`](./.github/workflows/pyodide-bundle.yml) | `pyodide` | Bundle Python source + Pyodide loader → upload to R2 _(coming)_ |
| [`pglite-db.yml`](./.github/workflows/pglite-db.yml) | `pglite-db` | Validate `schema.sql` and optional `seed.sql` → upload to R2 _(coming)_ |
| [`tex-pdf.yml`](./.github/workflows/tex-pdf.yml) | `tex-pdf` | Run `latexmk` → upload PDF to R2 _(coming)_ |

## Conventions

All workflows expect:

- A `web.codeseys.json` at the calling repo's root.
- Caller passes `secrets: inherit` so the workflow picks up the upload bearer token from organization, user-level, or repo secrets:
  - `PROJECT_EMBED_UPLOAD_TOKEN` — shared bearer that authenticates against `https://codeseys.io/api/embed-upload`.

The personal-site Worker holds the only R2 binding; CI never sees S3
credentials. The Worker validates the bearer token, validates slug/path,
and writes via `env.PROJECT_ASSETS.put()`.

All workflows publish to:
```
r2://assets-r2/<slug>/<git-sha>/...
```
and serve from:
```
https://assets-r2.codeseys.io/<slug>/<git-sha>/...
```

The `<git-sha>` is the short SHA of the commit being built. The workflow
also writes the versioned URL and SHA back into `web.codeseys.json` and
opens a tiny PR to bump `delivery.version` + `delivery.url` + `delivery.sizeBytes`,
so the manifest in the repo always pins to the latest published artifact.

## Caller example

```yaml
# .github/workflows/build-web-asset.yml in your project repo
name: build web embed
on:
  push: { branches: [main] }
  workflow_dispatch:

jobs:
  build:
    uses: baladithyab/web-embed-workflows/.github/workflows/static-passthrough.yml@main
    with:
      manifest: web.codeseys.json
      source-dir: '.'    # directory to upload (defaults to repo root, minus .git/.github/etc.)
    secrets: inherit
    permissions:
      contents: write    # needed to bump manifest back into the repo
      pull-requests: write
```

## Local validation

A small `validate-manifest.ts` script lives alongside the workflows at
[`scripts/validate-manifest.ts`](./scripts/validate-manifest.ts). It runs the
same zod validation the personal-site discovery script uses, so you can
sanity-check your manifest before pushing:

```bash
bunx tsx scripts/validate-manifest.ts path/to/web.codeseys.json
```

## Versioning

Tag this repo with `v1`, `v2`, etc. for major schema breaks. Workflows
default to `@main` for project repos that want the latest, but can pin to
a tag for stability.
