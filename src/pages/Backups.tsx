import { useState } from 'react'
import { DatabaseBackup, Play, Eye, ShieldCheck, CircleCheck, CircleAlert, HardDrive, Gauge, AlertTriangle, Lock } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, StatusBadge, Table, Tr, Td, Modal } from '@/components/ui'
import { backups, opsTotals } from '@/data/ops'
import type { Backup } from '@/data/ops'
import { regionByCode, deploymentByCustomer } from '@/data/fleet'
import { loadPolicies, evaluateResidency } from '@/data/residency'
import type { ResidencyDecision } from '@/data/residency'
import { useCustomerScope } from '@/context/CustomerScope'

const decisionTone: Record<ResidencyDecision, 'green' | 'yellow' | 'red'> = { Allow: 'green', 'Require safeguard': 'yellow', Block: 'red' }
const residencyPolicies = loadPolicies()
/** Where the customer's primary data lives, vs. where this backup resides. */
function backupVerdict(b: Backup) {
  const primary = deploymentByCustomer(b.customer)?.regionCode ?? b.regionCode
  return evaluateResidency(residencyPolicies[primary], { sourceRegion: primary, operation: 'Backup', targetRegion: b.regionCode })
}

export default function Backups() {
  const { scope, isAll } = useCustomerScope()
  const [sel, setSel] = useState<Backup | null>(null)

  const scoped = isAll ? backups : backups.filter((b) => b.customer === scope)
  const healthy = scoped.filter((b) => b.status === 'Healthy').length
  const failed = scoped.filter((b) => b.status === 'Failed').length
  const avgRpo = scoped.length ? Math.round(scoped.reduce((s, b) => s + b.rpoMin, 0) / scoped.length) : 0

  return (
    <>
      <PageHeader
        title="Backups & DR"
        description={isAll ? "Backup posture and disaster-recovery readiness per client — are backups running and recent, and could we restore each customer quickly if their environment failed? DR = disaster recovery; the key numbers are how far back a restore would lose data (RPO) and how long recovery takes (RTO)." : `Backup posture for ${scope}`}
        actions={<button className="btn-primary"><Play className="h-4 w-4" />Run backup</button>}
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Protected" value={scoped.length} icon={DatabaseBackup} tone="blue" footer={isAll ? `${opsTotals.backupsTotal} total` : scope} />
        <StatCard label="Healthy" value={healthy} icon={CircleCheck} tone="green" footer="Backups green" />
        <StatCard label="Failed" value={failed} icon={CircleAlert} tone="red" footer="Need attention" />
        <StatCard label="Avg RPO" value={`${avgRpo} min`} icon={Gauge} tone="purple" footer="Recovery point" />
      </div>

      {/* Table */}
      <Card className="mt-6">
        <CardTitle title="Backup Posture" subtitle={`${scoped.length} protected environment${scoped.length === 1 ? '' : 's'}${isAll ? '' : ` · ${scope}`}`} />
        <Table columns={['Customer', 'Region', 'Residency', 'Last backup', 'Frequency', 'RPO', 'RTO', 'Retention', 'Restore points', 'Status', 'Encrypted', '']} noun="customers">
          {scoped.map((b) => {
            const v = backupVerdict(b)
            return (
            <Tr key={b.id}>
              <Td className="font-semibold text-ink-900">{b.customer}</Td>
              <Td>
                <p className="text-sm text-ink-700">{regionByCode(b.regionCode)?.name ?? b.regionCode}</p>
                <p className="font-mono text-xs text-ink-400">{b.regionCode}</p>
              </Td>
              <Td><Badge tone={decisionTone[v.decision]} dot>{v.decision === 'Allow' ? 'In-region' : v.decision}</Badge></Td>
              <Td className="text-sm text-ink-700">{b.lastBackup}</Td>
              <Td className="text-sm text-ink-700">{b.frequency}</Td>
              <Td className="font-mono text-xs text-ink-700">{b.rpoMin}m</Td>
              <Td className="font-mono text-xs text-ink-700">{b.rtoMin}m</Td>
              <Td className="font-mono text-xs text-ink-500">{b.retentionDays}d</Td>
              <Td className="font-mono text-xs text-ink-700">{b.restorePoints}</Td>
              <Td><StatusBadge status={b.status} /></Td>
              <Td>{b.encrypted && <Badge tone="green">AES-256</Badge>}</Td>
              <Td>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${b.customer}`} onClick={() => setSel(b)}>
                  <Eye className="h-4 w-4" />
                </button>
              </Td>
            </Tr>
            )
          })}
        </Table>
      </Card>

      {/* Detail drawer */}
      {sel && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={sel.customer}
          subtitle={`${regionByCode(sel.regionCode)?.name} · ${sel.regionCode}`}
          headerRight={<StatusBadge status={sel.status} />}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setSel(null)}>Close</button>
              <button className="btn-secondary"><ShieldCheck className="h-4 w-4" />Test DR restore</button>
              <button className="btn-primary"><Play className="h-4 w-4" />Run backup now</button>
            </>
          }
        >
          <div className="space-y-5">
            {sel.status === 'Failed' && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <p className="text-sm text-rose-900">Last backup failed — restore points stale. Investigate the backup agent and trigger a manual run.</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <KV label="Region" value={regionByCode(sel.regionCode)?.name ?? sel.regionCode} />
              <KV label="Frequency" value={sel.frequency} />
              <KV label="RPO" value={`${sel.rpoMin} min`} />
              <KV label="RTO" value={`${sel.rtoMin} min`} />
              <KV label="Retention" value={`${sel.retentionDays} days`} />
              <KV label="Restore points" value={`${sel.restorePoints}`} />
              <KV label="Size" value={`${sel.sizeGb} GB`} />
              <KV label="Last DR test" value={sel.lastDrTest} />
              <KV label="Encrypted" value={sel.encrypted ? 'AES-256' : 'No'} />
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
              <p className="text-sm text-ink-700">
                RPO of <strong>{sel.rpoMin}m</strong> {sel.rpoMin <= 15 ? 'meets' : 'exceeds'} the 15-minute target; RTO of <strong>{sel.rtoMin}m</strong> {sel.rtoMin <= 60 ? 'meets' : 'exceeds'} the 60-minute recovery target.
              </p>
            </div>

            {sel.frequency.toLowerCase().includes('local') && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">In-region local backups, no egress — data stays within the sovereign boundary and is never replicated across the region.</p>
              </div>
            )}

            {sel.encrypted && (
              <p className="flex items-center gap-2 text-xs text-ink-400"><Lock className="h-3.5 w-3.5" />Restore points encrypted at rest with customer-managed keys (BYOK).</p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 font-semibold text-ink-900 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
