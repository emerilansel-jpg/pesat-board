#!/usr/bin/env node
/**
 * Generate src/data/versions.ts dari VERSIONS.md (root repo).
 * Format VERSIONS.md:
 *   ## v0.01 — 21 Jul 2026 — MAJOR
 *   - poin perubahan
 * Jalankan: node scripts/gen-versions.mjs [path-ke-VERSIONS.md]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = process.argv[2] ?? resolve(root, 'VERSIONS.md')
const out = resolve(root, 'src/data/versions.ts')

const md = readFileSync(src, 'utf8')
const re = /^##\s+(v[\d.]+)\s*[—–-]\s*([^—–-]+?)\s*[—–-]\s*(\w+)\s*$/gm
const matches = []
let m
while ((m = re.exec(md)) !== null) {
  matches.push({ version: m[1], date: m[2].trim(), type: m[3].toUpperCase(), end: re.lastIndex })
}
/** PM Mode (MAJOR/FEATURE/FIX) -> versions.ts (MAJOR/MINOR/PATCH) sesuai typeBadge di features/version. */
const TYPE_MAP = { MAJOR: 'MAJOR', FEATURE: 'MINOR', FIX: 'PATCH', MINOR: 'MINOR', PATCH: 'PATCH' }

const entries = matches.map((cur, i) => {
  const nextStart = i + 1 < matches.length ? md.lastIndexOf('##', matches[i + 1].end) : md.length
  const body = md.slice(cur.end, nextStart)
  const changes = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim())
  return { version: cur.version, date: cur.date, type: TYPE_MAP[cur.type] ?? 'PATCH', changes }
})

const ts = `// GENERATED dari VERSIONS.md oleh scripts/gen-versions.mjs — jangan edit manual.
export interface VersionEntry {
  version: string
  date: string
  type: 'MAJOR' | 'MINOR' | 'PATCH'
  changes: string[]
}

export const versions: VersionEntry[] = ${JSON.stringify(entries, null, 2)}

export const latestVersion: string = versions[0]?.version ?? 'v0.01'
`
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, ts)
console.log(`versions.ts: ${entries.length} entri -> ${out}`)
