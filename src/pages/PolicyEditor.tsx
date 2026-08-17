import { useState } from 'react'
import {
  CheckCircle2,
  Play,
  UploadCloud,
  FileCode2,
  Terminal,
  Shield,
  Sparkles,
} from 'lucide-react'
import { Card, Badge, PageHeader } from '@/components/ui'
import { instances } from '@/data/mock'

const ruleOutline = [
  { id: 'r1', name: 'Detect email addresses', entities: 'EMAIL' },
  { id: 'r2', name: 'Detect phone numbers', entities: 'PHONE' },
  { id: 'r3', name: 'Detect SSN / national ID', entities: 'SSN, NIN' },
  { id: 'r4', name: 'Detect payment cards', entities: 'CREDIT_CARD' },
  { id: 'r5', name: 'Detect physical address', entities: 'ADDRESS' },
  { id: 'r6', name: 'Redact in completions', entities: 'ALL' },
]

const policyYaml = `apiVersion: policy.plcy.io/v3
kind: PolicyPack
metadata:
  name: pii-redaction-standard
  version: 3.2.0-draft
  frameworks: [GDPR, CCPA]

defaults:
  mode: block
  severity: high

rules:
  - id: redact-email
    match:
      channel: [prompt, completion]
      entities:
        - EMAIL_ADDRESS
    conditions:
      confidence: ">= 0.85"
    actions:
      - type: redact
        replacement: "[EMAIL]"
      - type: audit
        sink: governance-log

  - id: redact-ssn
    match:
      channel: [prompt, completion]
      entities:
        - US_SSN
        - NATIONAL_ID
    conditions:
      confidence: ">= 0.90"
    actions:
      - type: redact
        replacement: "[REDACTED_SSN]"
      - type: alert
        severity: critical

  - id: redact-payment-card
    match:
      entities: [CREDIT_CARD]
    conditions:
      luhn_valid: true
    actions:
      - type: block
        reason: "PCI data must not reach the model"`

const testInput =
  'Please email the report to jane.doe@meridian.com and call me at (415) 555-0184. My card is 4242 4242 4242 4242.'

const testMatches = [
  { rule: 'redact-email', entity: 'EMAIL_ADDRESS', action: 'redact', conf: '0.97' },
  { rule: 'redact-phone', entity: 'PHONE_NUMBER', action: 'redact', conf: '0.91' },
  { rule: 'redact-payment-card', entity: 'CREDIT_CARD', action: 'block', conf: '1.00' },
]

const modes = ['Monitor', 'Warn', 'Block'] as const
const codeLines = policyYaml.split('\n')

export default function PolicyEditor() {
  const [activeRule, setActiveRule] = useState('r1')
  const [mode, setMode] = useState<(typeof modes)[number]>('Block')
  const [severity, setSeverity] = useState('high')
  const [confidence, setConfidence] = useState('0.85')
  const [logMatches, setLogMatches] = useState(true)
  const scopeCount = instances.filter((i) => i.policyPacks >= 5).length

  return (
    <>
      <PageHeader
        title="Policy Editor"
        description="Author, validate, and publish enforcement rules"
      />

      {/* Toolbar */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink-900">PII Redaction Standard</h2>
            <p className="text-xs text-ink-400">Privacy · GDPR, CCPA</p>
          </div>
          <Badge tone="orange">v3.2 draft</Badge>
          <Badge tone="green" dot>
            Valid
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <Play className="h-4 w-4" />
            Test
          </button>
          <button className="btn-primary">
            <UploadCloud className="h-4 w-4" />
            Publish
          </button>
        </div>
      </Card>

      {/* Editor layout */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_260px]">
        {/* LEFT — rule outline */}
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <FileCode2 className="h-4 w-4 text-ink-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Rules</span>
          </div>
          <ul className="p-2">
            {ruleOutline.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setActiveRule(r.id)}
                  className={
                    'w-full rounded-lg px-3 py-2 text-left transition-colors ' +
                    (activeRule === r.id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-700 hover:bg-slate-50')
                  }
                >
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-400">{r.entities}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* CENTER — code editor + test console */}
        <div className="flex flex-col gap-4">
          <Card padded={false} className="overflow-hidden bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                <span className="ml-2 font-mono text-xs text-slate-400">pii-redaction-standard.yaml</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">YAML · UTF-8</span>
            </div>
            <div className="flex overflow-x-auto">
              <div className="select-none border-r border-slate-800 bg-slate-900 px-3 py-4 text-right font-mono text-[13px] leading-relaxed text-slate-600">
                {codeLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="flex-1 overflow-x-auto px-4 py-4 text-[13px] leading-relaxed text-slate-100">
                {policyYaml}
              </pre>
            </div>
          </Card>

          {/* Test console */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-ink-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Test console
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> 3 rules matched · 41ms
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="mb-1 text-xs font-medium text-ink-400">Sample input</p>
                <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-ink-700">
                  {testInput}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-400">Evaluation result</p>
                <div className="space-y-1.5">
                  {testMatches.map((m) => (
                    <div
                      key={m.rule}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                    >
                      <span className="font-mono text-xs text-ink-700">{m.rule}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-ink-400">{m.entity}</span>
                        <Badge tone={m.action === 'block' ? 'red' : 'blue'}>{m.action}</Badge>
                        <span className="font-mono text-[11px] text-ink-400">{m.conf}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT — properties panel */}
        <Card padded={false} className="h-fit overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Sparkles className="h-4 w-4 text-ink-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Properties</span>
          </div>
          <div className="space-y-5 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">Enforcement mode</label>
              <div className="flex rounded-lg bg-slate-100 p-1">
                {modes.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={
                      'flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ' +
                      (mode === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700')
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">Severity</label>
              <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">Confidence threshold</label>
              <select className="input" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
                <option value="0.7">0.70</option>
                <option value="0.85">0.85</option>
                <option value="0.9">0.90</option>
                <option value="0.95">0.95</option>
              </select>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium text-ink-500">Scope</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">
                Applies to {scopeCount} instances
              </p>
              <p className="mt-0.5 text-xs text-ink-400">Production &amp; staging environments</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
              <span className="text-xs font-medium text-ink-700">Log matches</span>
              <button
                onClick={() => setLogMatches((v) => !v)}
                aria-pressed={logMatches}
                aria-label="Log matches"
                className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
                  logMatches ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'
                }`}
              >
                <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
