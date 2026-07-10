import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Boxes, ShieldCheck, ShieldAlert, CircleAlert, Eye, ScanLine, FileText, Download, AlertTriangle, FileBarChart } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Modal } from '@/components/ui'
import { images, cves, opsTotals } from '@/data/ops'
import type { Image, PatchStatus, Cve } from '@/data/ops'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)', fontSize: 12 }

const SEV = { critical: '#ef4444', high: '#f59e0b', medium: '#fbbf24', slate: '#94a3b8' } as const

const patchTone: Record<PatchStatus, 'green' | 'orange' | 'red'> = {
  'Up to date': 'green',
  'Patch available': 'orange',
  'Critical patch': 'red',
}
const sevTone: Record<Cve['severity'], 'red' | 'orange' | 'yellow'> = {
  Critical: 'red',
  High: 'orange',
  Medium: 'yellow',
}
const cveStatusTone: Record<Cve['status'], 'red' | 'orange' | 'green'> = {
  Open: 'red',
  Mitigated: 'orange',
  Patched: 'green',
}

const severityData = [
  { name: 'Critical', value: images.reduce((s, i) => s + i.criticalCves, 0), fill: SEV.critical },
  { name: 'High', value: images.reduce((s, i) => s + i.highCves, 0), fill: SEV.high },
  { name: 'Medium', value: images.reduce((s, i) => s + i.mediumCves, 0), fill: SEV.medium },
]

function CveCounts({ c, h, m }: { c: number; h: number; m: number }) {
  if (c + h + m === 0) return <span className="text-xs text-ink-400">—</span>
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs font-semibold">
      {c > 0 && <span className="text-rose-600">{c}c</span>}
      {h > 0 && <span className="text-orange-600">{h}h</span>}
      {m > 0 && <span className="text-amber-500">{m}m</span>}
    </span>
  )
}

function SevTile({ label, value, tone }: { label: string; value: number; tone: 'rose' | 'orange' | 'amber' }) {
  const styles = {
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  }
  return (
    <div className={`rounded-xl border p-3 text-center ${styles[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs font-medium">{label}</p>
    </div>
  )
}

export default function SupplyChain() {
  const [sel, setSel] = useState<Image | null>(null)
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Supply Chain"
        description="SBOM, image signing, and vulnerability posture for platform images. Proof that the software PLCY ships is genuine and safe: a signed inventory of what's inside each image (the SBOM), cryptographic signatures proving it hasn't been tampered with, and any known security vulnerabilities."
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate('/reports/security')}><FileBarChart className="h-4 w-4" />Generate report</button>
            <button className="btn-primary"><ScanLine className="h-4 w-4" />Run scan</button>
          </>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Container images" value={opsTotals.images} icon={Boxes} tone="blue" footer="Platform images" />
        <StatCard label="Signed" value={`${opsTotals.signedImages}/${opsTotals.images}`} icon={ShieldCheck} tone="green" footer="All Cosign-signed" />
        <StatCard label="Critical CVEs" value={opsTotals.criticalCves} icon={ShieldAlert} tone="red" footer="Across all images" />
        <StatCard label="Open CVEs" value={opsTotals.openCves} icon={CircleAlert} tone="orange" footer="Unresolved" />
      </div>

      {/* CVEs by severity */}
      <Card className="mt-6">
        <CardTitle title="CVEs by severity" subtitle="Total findings across all platform images" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v: number) => `${v} CVEs`} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {severityData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Images table */}
      <Card className="mt-6">
        <CardTitle title="Images" subtitle="Signed platform images with SBOM and vulnerability posture" />
        <Table columns={['Image', 'Version', 'Components', 'CVEs', 'Signed', 'SLSA', 'Patch status', 'Last scan', '']}>
          {images.map((img) => (
            <Tr key={img.id}>
              <Td className="font-mono text-sm font-semibold text-ink-900">{img.name}</Td>
              <Td className="font-mono text-xs text-ink-500">{img.version}</Td>
              <Td className="text-sm text-ink-700">{img.components}</Td>
              <Td><CveCounts c={img.criticalCves} h={img.highCves} m={img.mediumCves} /></Td>
              <Td>
                {img.signed ? (
                  <Badge tone="green"><ShieldCheck className="h-3 w-3" />Cosign</Badge>
                ) : (
                  <span className="text-xs text-ink-400">—</span>
                )}
              </Td>
              <Td><Badge tone="slate">SLSA L{img.slsa}</Badge></Td>
              <Td><Badge tone={patchTone[img.patchStatus]} dot>{img.patchStatus}</Badge></Td>
              <Td className="text-xs text-ink-500">{img.lastScan}</Td>
              <Td>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${img.name}`} onClick={() => setSel(img)}>
                  <Eye className="h-4 w-4" />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* CVE register */}
      <Card className="mt-6">
        <CardTitle title="CVE register" subtitle="Tracked vulnerabilities across platform images" />
        <Table columns={['CVE ID', 'Severity', 'Component', 'Image', 'Status', 'Published', 'Fixed in']}>
          {cves.map((c) => (
            <Tr key={c.id}>
              <Td className="font-mono text-sm font-semibold text-ink-900">{c.id}</Td>
              <Td><Badge tone={sevTone[c.severity]}>{c.severity}</Badge></Td>
              <Td className="text-sm text-ink-700">{c.component}</Td>
              <Td className="font-mono text-xs text-ink-500">{c.image}</Td>
              <Td><Badge tone={cveStatusTone[c.status]} dot>{c.status}</Badge></Td>
              <Td className="text-xs text-ink-500">{c.published}</Td>
              <Td className="font-mono text-xs text-ink-700">{c.fixedIn}</Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Image detail modal */}
      {sel && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={<span className="font-mono">{sel.name}</span>}
          subtitle={`${sel.components} components · scanned ${sel.lastScan}`}
          headerRight={<Badge tone={patchTone[sel.patchStatus]} dot>{sel.patchStatus}</Badge>}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setSel(null)}>Close</button>
              <button className="btn-secondary"><FileText className="h-4 w-4" />View SBOM</button>
              {sel.patchStatus !== 'Up to date' && (
                <button className="btn-primary"><Download className="h-4 w-4" />Apply patch</button>
              )}
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <KV label="Version" value={sel.version} mono />
              <KV label="Components" value={String(sel.components)} />
              <KV label="Signed" value="Cosign verified" />
              <KV label="SLSA" value={`Level ${sel.slsa}`} />
              <KV label="Patch status" value={sel.patchStatus} />
              <KV label="Last scan" value={sel.lastScan} />
            </div>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">CVE severity breakdown</h4>
              <div className="grid grid-cols-3 gap-3">
                <SevTile label="Critical" value={sel.criticalCves} tone="rose" />
                <SevTile label="High" value={sel.highCves} tone="orange" />
                <SevTile label="Medium" value={sel.mediumCves} tone="amber" />
              </div>
            </section>

            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm text-blue-900">
                This image is <strong>Cosign-signed with SLSA Level {sel.slsa} provenance</strong>. The SBOM is attested
                and verified at admission, so only signed, provenance-backed artifacts run in the fleet.
              </p>
            </div>

            {sel.patchStatus !== 'Up to date' && (
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  sel.patchStatus === 'Critical patch'
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${sel.patchStatus === 'Critical patch' ? 'text-rose-600' : 'text-amber-600'}`} />
                <p className="text-sm">
                  {sel.patchStatus === 'Critical patch'
                    ? 'A critical patch is available. Apply it and roll a new signed build across the fleet as soon as possible.'
                    : 'A patch is available for this image. Schedule a rebuild to clear the outstanding findings.'}
                </p>
              </div>
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
