import { useState } from 'react'
import {
  Plus,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Scale,
  Users,
  FileText,
  Server,
  Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, StatCard, StatusBadge, Badge, PageHeader, Modal } from '@/components/ui'
import type { Tone } from '@/components/ui'
import { policyPacks } from '@/data/mock'
import type { PolicyPack } from '@/data/mock'

type CategoryStyle = { icon: LucideIcon; box: string; tone: Tone }

const categoryStyles: Record<PolicyPack['category'], CategoryStyle> = {
  Privacy: { icon: Lock, box: 'bg-blue-50 text-blue-600', tone: 'blue' },
  Security: { icon: ShieldCheck, box: 'bg-violet-50 text-violet-600', tone: 'purple' },
  Safety: { icon: ShieldAlert, box: 'bg-orange-50 text-orange-600', tone: 'orange' },
  Compliance: { icon: Scale, box: 'bg-emerald-50 text-emerald-600', tone: 'green' },
  Fairness: { icon: Users, box: 'bg-emerald-50 text-emerald-600', tone: 'green' },
}

type ActionTone = 'red' | 'orange' | 'yellow' | 'blue'
interface ExampleRule {
  id: string
  desc: string
  action: string
  tone: ActionTone
}

const exampleRulesByCategory: Record<PolicyPack['category'], ExampleRule[]> = {
  Privacy: [
    { id: 'redact-email', desc: 'Detect email addresses → redact', action: 'Redact', tone: 'orange' },
    { id: 'redact-ssn', desc: 'Detect national IDs / SSN → redact', action: 'Redact', tone: 'orange' },
    { id: 'mask-phone', desc: 'Detect phone numbers → mask', action: 'Mask', tone: 'yellow' },
    { id: 'block-card', desc: 'Detect payment card numbers → block', action: 'Block', tone: 'red' },
  ],
  Security: [
    { id: 'block-injection', desc: 'Block prompt injection patterns', action: 'Block', tone: 'red' },
    { id: 'block-exfiltration', desc: 'Block system-prompt exfiltration attempts', action: 'Block', tone: 'red' },
    { id: 'flag-jailbreak', desc: 'Flag known jailbreak templates', action: 'Flag', tone: 'yellow' },
    { id: 'deny-tool-abuse', desc: 'Deny unauthorized tool invocation', action: 'Deny', tone: 'red' },
  ],
  Safety: [
    { id: 'harm-threshold', desc: 'Score toxicity → block above threshold', action: 'Block', tone: 'red' },
    { id: 'flag-selfharm', desc: 'Detect self-harm content → escalate', action: 'Escalate', tone: 'orange' },
    { id: 'flag-violence', desc: 'Detect violent content → flag', action: 'Flag', tone: 'yellow' },
    { id: 'warn-sensitive', desc: 'Warn on sensitive topics', action: 'Warn', tone: 'blue' },
  ],
  Compliance: [
    { id: 'advice-disclaimer', desc: 'Append required disclaimer to advice', action: 'Annotate', tone: 'blue' },
    { id: 'audit-decision', desc: 'Log every automated decision for audit', action: 'Log', tone: 'blue' },
    { id: 'block-unlicensed', desc: 'Block unlicensed regulated guidance', action: 'Block', tone: 'red' },
    { id: 'require-review', desc: 'Route high-risk output to human review', action: 'Review', tone: 'orange' },
  ],
  Fairness: [
    { id: 'parity-threshold', desc: 'Monitor demographic parity gap → alert', action: 'Alert', tone: 'orange' },
    { id: 'flag-proxy', desc: 'Flag protected-attribute proxy features', action: 'Flag', tone: 'yellow' },
    { id: 'block-disparate', desc: 'Block disparate-impact decisions', action: 'Block', tone: 'red' },
    { id: 'log-bias-eval', desc: 'Log continuous fairness evaluations', action: 'Log', tone: 'blue' },
  ],
}

const categories: Array<PolicyPack['category'] | 'All'> = [
  'All',
  'Privacy',
  'Security',
  'Safety',
  'Compliance',
  'Fairness',
]

export default function PolicyPacks() {
  const [sel, setSel] = useState<PolicyPack | null>(null)
  const published = policyPacks.filter((p) => p.status === 'Published').length
  const drafts = policyPacks.filter((p) => p.status === 'Draft').length
  const totalRules = policyPacks.reduce((s, p) => s + p.rules, 0)
  const totalApplied = policyPacks.reduce((s, p) => s + p.appliedTo, 0)

  return (
    <>
      <PageHeader
        title="Policy Packs"
        description="Reusable governance controls applied across customer instances"
        actions={
          <button className="btn-primary">
            <Plus className="h-4 w-4" />
            Create policy pack
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published packs" value={published} icon={ShieldCheck} tone="green" footer="Enforced in production" />
        <StatCard label="Total rules" value={totalRules} icon={FileText} tone="blue" footer="Across all packs" />
        <StatCard label="Applied enforcements" value={totalApplied} icon={Server} tone="purple" footer="Instance attachments" />
        <StatCard label="Drafts" value={drafts} icon={Clock} tone="orange" footer="Pending review" />
      </div>

      {/* Category filter chips (static) */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {categories.map((c, i) => (
          <button
            key={c}
            className={
              i === 0
                ? 'rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white'
                : 'rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-ink-700 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50'
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* Pack grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {policyPacks.map((pack) => {
          const style = categoryStyles[pack.category]
          const Icon = style.icon
          return (
            <button
              key={pack.id}
              className="text-left"
              onClick={() => setSel(pack)}
              aria-label={`View ${pack.name}`}
            >
              <Card className="flex h-full flex-col transition-shadow hover:shadow-cardhover">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.box}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ink-900 hover:text-brand-600">{pack.name}</h3>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {pack.category} · {pack.version}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={pack.status} />
                </div>

                <p className="mt-3 flex-1 text-sm text-ink-700">{pack.description}</p>

                <div className="mt-4 flex items-center gap-4 text-xs font-medium text-ink-500">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-ink-400" />
                    {pack.rules} rules
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-ink-400" />
                    {pack.appliedTo} applied
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  {pack.frameworks.length > 0 ? (
                    pack.frameworks.map((f) => (
                      <Badge key={f} tone="slate">
                        {f}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-ink-400">No frameworks mapped</span>
                  )}
                </div>
              </Card>
            </button>
          )
        })}
      </div>

      {sel && <PolicyPackModal pack={sel} onClose={() => setSel(null)} />}
    </>
  )
}

function PolicyPackModal({ pack, onClose }: { pack: PolicyPack; onClose: () => void }) {
  const style = categoryStyles[pack.category]
  const Icon = style.icon
  const rules = exampleRulesByCategory[pack.category]

  const facts: { label: string; value: string }[] = [
    { label: 'Rules', value: String(pack.rules) },
    { label: 'Applied to', value: `${pack.appliedTo} instances` },
    { label: 'Last updated', value: pack.updated },
    { label: 'Category', value: pack.category },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={pack.name}
      subtitle={`${pack.category} · ${pack.version}`}
      headerRight={<StatusBadge status={pack.status} />}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary">Edit pack</button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.box}`}>
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-sm text-ink-600">{pack.description}</p>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium text-ink-500">{f.label}</p>
              <p className="mt-0.5 font-semibold text-ink-900">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Frameworks */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Mapped frameworks</h4>
          <div className="flex flex-wrap items-center gap-1.5">
            {pack.frameworks.length > 0 ? (
              pack.frameworks.map((fw) => (
                <Badge key={fw} tone="slate">{fw}</Badge>
              ))
            ) : (
              <span className="text-xs text-ink-400">No frameworks mapped</span>
            )}
          </div>
        </section>

        {/* Example rules */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Example rules</h4>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-ink-600">{r.id}</span>
                  <p className="mt-1 text-sm text-ink-700">{r.desc}</p>
                </div>
                <Badge tone={r.tone}>{r.action}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
