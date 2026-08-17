/**
 * Generates docs/plcy_admin_console-developer-notes.md from src/data/devNotes.ts.
 *
 * The TypeScript module is the single source: the in-app Dev Notes panel renders
 * it directly, and this script renders the same data as markdown. Neither can
 * drift from the other because there is only one copy of the content.
 *
 *   npm run docs:dev-notes          # write the file
 *   npm run docs:dev-notes:check    # fail if it's out of date (for CI)
 *
 * Run from the repo root.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(root, 'src/data/devNotes.ts')
const OUT = resolve(root, 'docs/plcy_admin_console-developer-notes.md')

/* The notes module is plain data with no imports, so transpiling it and
 * importing the result is enough — no bundler, no type-checking round trip. */
function loadNotes() {
  const source = readFileSync(SRC, 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const tmp = resolve(root, 'node_modules/.cache/devNotes.generated.mjs')
  mkdirSync(dirname(tmp), { recursive: true })
  writeFileSync(tmp, js)
  return import(pathToFileURL(tmp).href)
}

const FIDELITY_BADGE = {
  'rule-real': '✅ **Rule is real**',
  'value-placeholder': '⚠️ **Value is a placeholder**',
  illustrative: '🚫 **Illustrative only**',
}

const bullets = (items) => items.map((i) => `- ${i}`).join('\n')

function renderModule(m) {
  const out = []
  out.push(`### ${m.title}`)
  out.push('')
  out.push(`*${m.summary}*`)
  out.push('')
  out.push(`**Start here:**\n${bullets(m.files.map((f) => `\`${f.split(' — ')[0]}\`${f.includes(' — ') ? ` — ${f.split(' — ').slice(1).join(' — ')}` : ''}`))}`)
  out.push('')

  out.push('#### Overview')
  out.push('')
  out.push(m.overview.join('\n\n'))
  out.push('')

  out.push('#### Business rules')
  out.push('')
  for (const r of m.rules) {
    out.push(`- ${FIDELITY_BADGE[r.fidelity]} — ${r.rule}`)
    if (r.example) out.push(`  - *Example:* ${r.example}`)
    if (r.source) out.push(`  - *Source:* \`${r.source}\``)
  }
  out.push('')

  out.push('#### Key data fields')
  out.push('')
  out.push('| Field | Type | Source | Notes |')
  out.push('| --- | --- | --- | --- |')
  for (const f of m.fields) {
    out.push(`| \`${f.field}\` | \`${f.type}\` | ${f.source} | ${f.note ?? ''} |`)
  }
  out.push('')

  out.push('#### Edge cases')
  out.push('')
  out.push(bullets(m.edgeCases))
  out.push('')

  out.push('#### Integrations')
  out.push('')
  for (const i of m.integrations) out.push(`- **${i.name}** — ${i.note}`)
  out.push('')

  out.push('#### Permissions')
  out.push('')
  out.push('| Action | Capability | Notes |')
  out.push('| --- | --- | --- |')
  for (const p of m.permissions) {
    out.push(`| ${p.action} | ${p.capability ? `\`${p.capability}\`` : '—'} | ${p.note} |`)
  }
  out.push('')

  out.push('#### Open questions')
  out.push('')
  out.push(bullets(m.openQuestions))
  out.push('')
  return out.join('\n')
}

function render({ PLATFORM, DEV_MODULES }) {
  const out = []
  out.push('<!--')
  out.push('  GENERATED FILE — DO NOT EDIT.')
  out.push('  Source: src/data/devNotes.ts · Regenerate: npm run docs:dev-notes')
  out.push('  The in-app "Dev Notes" panel renders the same module, so the two cannot drift.')
  out.push('-->')
  out.push('')
  out.push('# PLCY Admin Console — Developer Handover Notes')
  out.push('')
  out.push('**Status:** handover · **Audience:** developers new to this codebase')
  out.push('**Companion to:** the running console, and `docs/red-team-runner-spec.md`')
  out.push('')
  out.push('---')
  out.push('')

  out.push('## 1. What this is')
  out.push('')
  out.push(PLATFORM.product.join('\n\n'))
  out.push('')
  out.push('### Deployment modes')
  out.push('')
  out.push(bullets(PLATFORM.deploymentModes))
  out.push('')
  out.push('### Architecture and state')
  out.push('')
  out.push(bullets(PLATFORM.architecture))
  out.push('')
  out.push('### Conventions')
  out.push('')
  out.push(bullets(PLATFORM.conventions))
  out.push('')

  out.push('---')
  out.push('')
  out.push('## 2. What is NOT a specification')
  out.push('')
  out.push('Read this before treating anything in the console as a requirement.')
  out.push('')
  out.push(bullets(PLATFORM.doNotTreatAsSpec))
  out.push('')
  out.push('The distinction that matters throughout this document:')
  out.push('')
  out.push(`- ${FIDELITY_BADGE['rule-real']} — a real business decision. Reimplement it faithfully.`)
  out.push(`- ${FIDELITY_BADGE['value-placeholder']} — the mechanism is real, the number is a dial awaiting real input.`)
  out.push(`- ${FIDELITY_BADGE['illustrative']} — do not carry it forward.`)
  out.push('')

  out.push('---')
  out.push('')
  out.push('## 3. Known gaps')
  out.push('')
  out.push(bullets(PLATFORM.knownGaps))
  out.push('')

  out.push('---')
  out.push('')
  out.push('## 4. Modules')
  out.push('')
  out.push('Each section below is also available in-app: the **Dev Notes** button (bottom-right) opens the notes for whatever page you are on.')
  out.push('')
  for (const m of DEV_MODULES) {
    out.push(renderModule(m))
    out.push('---')
    out.push('')
  }

  out.push('## 5. All open questions, collected')
  out.push('')
  out.push('Everything the code cannot answer, gathered from the sections above.')
  out.push('')
  for (const m of DEV_MODULES) {
    out.push(`**${m.title}**`)
    out.push('')
    out.push(bullets(m.openQuestions))
    out.push('')
  }
  return out.join('\n')
}

const notes = await loadNotes()
const markdown = render(notes)

const check = process.argv.includes('--check')
if (check) {
  const require = createRequire(import.meta.url)
  void require
  let current = ''
  try {
    current = readFileSync(OUT, 'utf8')
  } catch {
    /* missing counts as out of date */
  }
  if (current !== markdown) {
    console.error('docs/plcy_admin_console-developer-notes.md is out of date. Run: npm run docs:dev-notes')
    process.exit(1)
  }
  console.log('dev notes are up to date')
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, markdown)
  console.log(`wrote ${OUT} (${(markdown.length / 1024).toFixed(1)} KB)`)
}
