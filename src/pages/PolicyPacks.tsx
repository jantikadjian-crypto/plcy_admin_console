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
import { Card, StatCard, StatusBadge, Badge, PageHeader } from '@/components/ui'
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

const categories: Array<PolicyPack['category'] | 'All'> = [
  'All',
  'Privacy',
  'Security',
  'Safety',
  'Compliance',
  'Fairness',
]

export default function PolicyPacks() {
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
            <Card key={pack.id} className="flex flex-col transition-shadow hover:shadow-cardhover">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.box}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">{pack.name}</h3>
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
          )
        })}
      </div>
    </>
  )
}
