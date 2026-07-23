import { useMemo, useState } from 'react'
import { Swords, AlertOctagon, ShieldOff, Grid3x3, Plus, ExternalLink } from 'lucide-react'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useEvals, upsertCampaign, setFindingStatus, updateFinding, newId } from '@/data/evalsStore'
import {
  OWASP_LLM, owaspName, familyOf, bypassRate, connectedDeployments,
} from '@/data/evals'
import type { RedTeamCampaign, Finding, Severity } from '@/data/evals'

const sevTone: Record<Severity, 'red' | 'orange' | 'yellow' | 'slate'> = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'slate' }
const statusTone = (s: RedTeamCampaign['status']) => (s === 'Running' ? 'blue' : s === 'Triaging' ? 'orange' : 'green')
const SCOPES = ['PLCY SaaS platform', ...connectedDeployments.map((d) => `${d.customer} (${d.regionCode})`)]

export function RedTeam() {
  const { campaigns } = useEvals()
  const { logAction } = useSession()
  const [sel, setSel] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const openFindings = campaigns.flatMap((c) => c.findings).filter((f) => f.status === 'open')
  const critHigh = openFindings.filter((f) => f.severity === 'Critical' || f.severity === 'High').length
  const totalAttempts = campaigns.reduce((a, c) => a + c.attempts, 0)
  const totalBypasses = campaigns.reduce((a, c) => a + c.bypasses, 0)
  const covered = new Set(campaigns.flatMap((c) => c.taxonomy))

  const selected = campaigns.find((c) => c.id === sel)

  return (
    <div>
      <PageHeader
        title="Red-Team"
        description="Adversarial campaigns against PLCY's own SaaS platform and connected instances. Air-gapped deployments are tested via the separate offline process."
        actions={
          <GatedButton cap="evals.run" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New campaign
          </GatedButton>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active campaigns" value={campaigns.filter((c) => c.status !== 'Completed').length} icon={Swords} tone="blue" footer={`${campaigns.length} total`} />
        <StatCard label="Open findings" value={openFindings.length} icon={AlertOctagon} tone={critHigh ? 'red' : 'green'} footer={`${critHigh} critical/high`} />
        <StatCard label="Bypass rate" value={`${totalAttempts ? ((totalBypasses / totalAttempts) * 100).toFixed(1) : '0'}%`} icon={ShieldOff} tone="orange" footer={`${totalBypasses} of ${totalAttempts.toLocaleString()} attempts`} />
        <StatCard label="OWASP coverage" value={`${covered.size}/10`} icon={Grid3x3} tone="purple" footer="LLM Top-10 categories exercised" />
      </div>

      <Card className="mb-6">
        <CardTitle title="Campaigns" subtitle="Click a campaign for its findings" />
        <Table columns={['Campaign', 'Scope', 'Taxonomy', 'Attempts', 'Bypasses', 'Status', 'Owner']}>
          {campaigns.map((c) => (
            <Tr key={c.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSel(c.id)}>
              <Td>
                <p className="font-medium text-ink-900">{c.name}</p>
                <p className="text-xs text-ink-400">Started {c.startedAt}</p>
              </Td>
              <Td className="text-xs text-ink-600">{c.scope}</Td>
              <Td>
                <span className="flex flex-wrap gap-1">
                  {c.taxonomy.map((id) => <Badge key={id} tone="slate">{id}</Badge>)}
                </span>
              </Td>
              <Td className="tabular-nums text-ink-600">{c.attempts.toLocaleString()}</Td>
              <Td><Badge tone={c.bypasses > 20 ? 'red' : c.bypasses > 0 ? 'orange' : 'green'}>{c.bypasses} · {(bypassRate(c) * 100).toFixed(1)}%</Badge></Td>
              <Td><Badge tone={statusTone(c.status)} dot>{c.status}</Badge></Td>
              <Td className="text-xs text-ink-500">{c.owner}</Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <Card>
        <CardTitle title="OWASP LLM Top-10 coverage" subtitle="Which attack classes we've exercised across all campaigns" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {OWASP_LLM.map((o) => {
            const on = covered.has(o.id)
            const bypasses = campaigns.filter((c) => c.taxonomy.includes(o.id)).reduce((a, c) => a + c.bypasses, 0)
            return (
              <div key={o.id} className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-sm ${on ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/60'}`}>
                <span className="min-w-0">
                  <span className="font-mono text-xs font-semibold text-ink-700">{o.id}</span>
                  <span className={`ml-2 ${on ? 'text-ink-800' : 'text-ink-400'}`}>{o.name}</span>
                </span>
                {on ? <Badge tone={bypasses ? 'orange' : 'green'}>{bypasses ? `${bypasses} bypass${bypasses === 1 ? '' : 'es'}` : 'held'}</Badge> : <span className="text-xs text-ink-400">not exercised</span>}
              </div>
            )
          })}
        </div>
      </Card>

      {selected && <CampaignModal campaign={selected} onClose={() => setSel(null)} logAction={logAction} />}
      {creating && <NewCampaignModal onClose={() => setCreating(false)} logAction={logAction} />}
    </div>
  )
}

function CampaignModal({ campaign, onClose, logAction }: { campaign: RedTeamCampaign; onClose: () => void; logAction: (i: { action: string; target: string; category?: string }) => void }) {
  const { can } = useSession()
  const cycle = (f: Finding) => {
    const next: Finding['status'] = f.status === 'open' ? 'mitigated' : f.status === 'mitigated' ? 'accepted' : 'open'
    setFindingStatus(campaign.id, f.id, next)
    logAction({ action: 'evals.finding.update', target: `${f.id} → ${next}`, category: 'governance' })
  }
  const createIncident = (f: Finding) => {
    const incId = newId('INC')
    updateFinding(campaign.id, f.id, { linkedIncidentId: incId, status: 'mitigated' })
    logAction({ action: 'evals.incident.create', target: `${f.id} → ${incId}`, category: 'governance' })
  }
  return (
    <Modal
      open onClose={onClose}
      title={campaign.name}
      subtitle={`${campaign.scope} · ${campaign.attempts.toLocaleString()} attempts · ${campaign.bypasses} bypasses`}
      maxWidth="max-w-2xl"
      headerRight={<Badge tone={statusTone(campaign.status)} dot>{campaign.status}</Badge>}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-ink-900">Findings ({campaign.findings.length})</h4>
        {campaign.findings.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-ink-400">No findings yet — campaign in progress.</p>}
        {campaign.findings.map((f) => (
          <div key={f.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={sevTone[f.severity]}>{f.severity}</Badge>
                  <span className="font-mono text-xs text-ink-500">{f.attackType} · {owaspName(f.attackType)}</span>
                </div>
                <p className="mt-1.5 text-sm text-ink-700">{f.summary}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {f.linkedControlPrefix && <>Should be caught by <span className="font-mono text-ink-700">{f.linkedControlPrefix}</span> ({familyOf(f.linkedControlPrefix)}). </>}
                  {f.linkedIncidentId && <span className="font-medium text-brand-600">Linked incident {f.linkedIncidentId}</span>}
                </p>
              </div>
              <Badge tone={f.status === 'open' ? 'red' : f.status === 'mitigated' ? 'green' : 'slate'}>{f.status}</Badge>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <GatedButton cap="evals.run" showLock={false} className="btn-secondary px-2.5 py-1 text-xs" onClick={() => cycle(f)}>
                Advance status
              </GatedButton>
              {!f.linkedIncidentId && (
                <GatedButton cap="incident.manage" showLock={false} className="btn-secondary px-2.5 py-1 text-xs" onClick={() => createIncident(f)} disabled={!can('incident.manage')}>
                  <ExternalLink className="h-3.5 w-3.5" /> Create incident
                </GatedButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function NewCampaignModal({ onClose, logAction }: { onClose: () => void; logAction: (i: { action: string; target: string; category?: string }) => void }) {
  const [name, setName] = useState('')
  const [scope, setScope] = useState(SCOPES[0])
  const [tax, setTax] = useState<string[]>(['LLM01'])
  const toggle = (id: string) => setTax((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const valid = name.trim().length > 2 && tax.length > 0

  const launch = () => {
    const attempts = 300 + tax.length * 240
    const bypasses = Math.max(1, Math.round(attempts * 0.02))
    const c: RedTeamCampaign = {
      id: newId('rt'), name: name.trim(), taxonomy: tax, scope, attempts, bypasses,
      status: 'Running', owner: 'Trust & Safety', startedAt: new Date().toISOString().slice(0, 10), findings: [],
    }
    upsertCampaign(c)
    logAction({ action: 'evals.redteam.launch', target: `${c.name} · ${scope}`, category: 'governance' })
    onClose()
  }

  return (
    <Modal
      open onClose={onClose}
      title="Launch red-team campaign"
      subtitle="Runs against the connected fleet only — air-gapped is validated separately."
      maxWidth="max-w-lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary disabled:opacity-50" disabled={!valid} onClick={launch}>Launch</button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Campaign name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Injection Sweep" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Target scope</span>
          <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
            {SCOPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-600">Attack taxonomy (OWASP LLM Top-10)</span>
          <div className="flex flex-wrap gap-1.5">
            {OWASP_LLM.map((o) => (
              <button
                key={o.id} type="button" onClick={() => toggle(o.id)} title={o.name}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${tax.includes(o.id) ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-ink-600 ring-slate-500/10 hover:bg-slate-200/70'}`}
              >
                {o.id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
