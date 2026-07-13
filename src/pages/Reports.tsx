import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, FileCheck2, ShieldAlert, Timer, Building2, Wallet, ArrowRight, FileBarChart } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, PageHeader, Badge } from '@/components/ui'
import { useCustomerScope, ALL } from '@/context/CustomerScope'
import { useCustomers } from '@/context/Customers'
import { reports, reportCategoryTone } from '@/data/reports'
import type { ReportDef } from '@/data/reports'

const ICONS: Record<ReportDef['icon'], LucideIcon> = {
  gauge: Gauge,
  'file-check': FileCheck2,
  'shield-alert': ShieldAlert,
  timer: Timer,
  building: Building2,
  wallet: Wallet,
}

export default function Reports() {
  const navigate = useNavigate()
  const { scope, isAll } = useCustomerScope()
  const { list: customers } = useCustomers()
  // Default the account-report picker to the active scope, else the first customer.
  const [pick, setPick] = useState<string>(!isAll ? (customers.find((c) => c.name === scope)?.id ?? '') : (customers[0]?.id ?? ''))

  const open = (r: ReportDef) => {
    if (r.needsCustomer) {
      if (pick) navigate(`/reports/customer/${pick}`)
    } else if (r.to) {
      navigate(r.to)
    }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate point-in-time reports for exec reviews, auditors, and customers. Scope-aware reports honor the customer selected in the sidebar."
      />

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-ink-600">
        <FileBarChart className="h-4 w-4 shrink-0 text-ink-400" />
        <span>
          Current scope:{' '}
          <span className="font-semibold text-ink-900">{isAll ? ALL : scope}</span>
          {' '}· change it from the sidebar customer switcher to re-scope the fleet reports.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => {
          const Icon = ICONS[r.icon]
          return (
            <Card key={r.key} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-ink-600">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge tone={reportCategoryTone[r.category]}>{r.category}</Badge>
              </div>
              <h3 className="mt-3 text-base font-semibold text-ink-900">{r.title}</h3>
              <p className="mt-1 flex-1 text-sm text-ink-500">{r.description}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="slate">{r.scope}</Badge>
              </div>
              <p className="mt-2 text-[11px] text-ink-400">Also available from: {r.launchedFrom}</p>

              {r.needsCustomer ? (
                <div className="mt-4 flex items-center gap-2">
                  <select
                    className="input flex-1"
                    value={pick}
                    onChange={(e) => setPick(e.target.value)}
                    aria-label="Choose customer"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button className="btn-primary shrink-0" onClick={() => open(r)} disabled={!pick}>
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button className="btn-primary mt-4 w-full" onClick={() => open(r)}>
                  Generate report
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}
