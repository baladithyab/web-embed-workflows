#!/usr/bin/env bun
// Validates a web.codeseys.json against the project-embed schema.
// Usage: bunx tsx scripts/validate-manifest.ts path/to/web.codeseys.json

import { readFile } from 'node:fs/promises'
import { z } from 'zod'

const EmbedSpec = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('static-html'), entry: z.string() }),
  z.object({ kind: z.literal('wasm-emscripten'), entry: z.string(), memory: z.string().optional() }),
  z.object({ kind: z.literal('wasm-rust'), entry: z.string() }),
  z.object({ kind: z.literal('pyodide'), entry: z.string(), packages: z.array(z.string()).default([]) }),
  z.object({ kind: z.literal('notebook-html'), notebook: z.string() }),
  z.object({ kind: z.literal('pglite-db'), schema: z.string(), seed: z.string().optional() }),
  z.object({ kind: z.literal('tex-pdf'), pdf: z.string() }),
  z.object({ kind: z.literal('external-app'), url: z.string().url() }),
])

const Category = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('college'),
    school: z.enum(['UCSC', 'USC']),
    code: z.string(),
    title: z.string(),
    year: z.number().int().min(2014).max(2030),
  }),
  z.object({ kind: z.literal('hackathon'), event: z.string(), year: z.number().int() }),
  z.object({ kind: z.literal('side'), year: z.number().int() }),
  z.object({ kind: z.literal('work'), org: z.string().optional(), year: z.number().int() }),
  z.object({ kind: z.literal('research'), venue: z.string().optional(), year: z.number().int() }),
])

const ProjectManifest = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  category: Category,
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  thumbnail: z.string().optional(),
  completionLevel: z.enum(['wip', 'works', 'ships']),
  embed: EmbedSpec,
  delivery: z.object({
    mode: z.enum(['bundle', 'runtime-r2', 'runtime-foreign']),
    url: z.string().url(),
    version: z.string().min(1),
    sizeBytes: z.number().int().min(0),
  }),
  build: z.object({
    ci: z.boolean(),
    workflow: z.string().optional(),
  }),
})

const path = process.argv[2]
if (!path) {
  console.error('usage: validate-manifest.ts <path/to/web.codeseys.json>')
  process.exit(2)
}

const raw = await readFile(path, 'utf8')
let parsed: unknown
try {
  parsed = JSON.parse(raw)
} catch (err) {
  console.error(`invalid JSON: ${(err as Error).message}`)
  process.exit(1)
}

const result = ProjectManifest.safeParse(parsed)
if (!result.success) {
  console.error('manifest failed validation:')
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

console.log(`✓ ${path} valid`)
console.log(`  slug:           ${result.data.slug}`)
console.log(`  embed.kind:     ${result.data.embed.kind}`)
console.log(`  delivery.mode:  ${result.data.delivery.mode}`)
console.log(`  completion:     ${result.data.completionLevel}`)
