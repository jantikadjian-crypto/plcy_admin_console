import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Boxes,
  ShieldCheck,
  ShieldAlert,
  Ban,
  ScanLine,
  ArrowUpCircle,
  Undo2,
  FileCode2,
  CircleDot,
  CheckCircle2,
  Cpu,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { registryImages, currentTagOf, sbomFor, totalCves } from '@/data/registry'
import type { RegistryImage, ImageTag } from '@/data/registry'
import { useRegistryPromoted, setPromotedTag } from '@/data/registryStore'
import { deployments } from '@/data/fleet'
import { imageAdoption, imageClusters } from '@/data/clusters'
import type { ImageClusterRow } from '@/data/clusters'
import { cves as allCves } from '@/data/ops'

function CvePills({ tag }: { tag: ImageTag }) {
  if (totalCves(tag) === 0) return <Badge tone="green" dot>Clean</Badge>
  return (
    <div className="flex flex-wrap gap-1">
      {tag.criticalCves > 0 && <Badge tone="red">{tag.criticalCves} crit</Badge>}
      {tag.highCves > 0 && <Badge tone="orange">{tag.highCves} high</Badge>}
      {tag.mediumCves > 0 && <Badge tone="yellow">{tag.mediumCves} med</Badge>}
    </div>
  )
}

type Override = Partial<Pick<RegistryImage, 'quarantined' | 'lastScan'>>

export default function Registry() {
  const { logAction } = useSession()
  const promoted = useRegistryPromoted()
  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const [selId, setSelId] = useState<string | null>(null)
  const [scanning, setScanning] = useState<string | null>(null)

  // Current tag comes from the shared promoted-tag store (also read by the
  // cluster views); quarantine / last-scan are local session overrides.
  const images: RegistryImage[] = registryImages.map((im) => ({
    ...im,
    currentTag: promoted[im.id] ?? im.currentTag,
    ...overrides[im.id],
  }))
  const patch = (id: string, p: Override) => setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }))

  const promote = (img: RegistryImage, tag: string) => {
    const fromIdx = img.tags.findIndex((x) => x.tag === img.currentTag)
    const toIdx = img.tags.findIndex((x) => x.tag === tag)
    const action = toIdx < fromIdx ? 'image.promote' : 'image.rollback'
    setPromotedTag(img.id, tag)
    logAction({ action, target: `${img.name}:${tag}`, category: 'supply-chain' })
  }
  const rescan = (img: RegistryImage) => {
    setScanning(img.id)
    logAction({ action: 'image.rescan', target: img.name, category: 'supply-chain' })
    window.setTimeout(() => {
      patch(img.id, { lastScan: 'just now' })
      setScanning((s) => (s === img.id ? null : s))
    }, 1200)
  }
  const toggleQuarantine = (img: RegistryImage) => {
    patch(img.id, { quarantined: !img.quarantined })
    logAction({ action: img.quarantined ? 'image.release' : 'image.quarantine', target: `${img.name}:${img.currentTag}`, category: 'supply-chain' })
  }

  const signed = images.filter((i) => i.signed).length
  const withCritical = images.filter((i) => currentTagOf(i).criticalCves > 0).length
  const quarantined = images.filter((i) => i.quarantined).length

  const sel = images.find((i) => i.id === selId) ?? null

  return (
    <>
      <PageHeader title="Container Registry" description="Signed OCI images shipped to registry.plcy.app — tags, SBOMs, and vulnerability posture across the fleet" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Images" value={images.length} icon={Boxes} tone="blue" footer="In the registry" />
        <StatCard label="Signed" value={`${signed}/${images.length}`} icon={ShieldCheck} tone="green" footer="cosign · SLSA attested" />
        <StatCard label="Critical CVEs" value={withCritical} icon={ShieldAlert} tone="red" footer="Images on current tag" />
        <StatCard label="Quarantined" value={quarantined} icon={Ban} tone="orange" footer="Blocked from rollout" />
      </div>

      <Card className="mt-6">
        <CardTitle title="Images" subtitle="Promoted tag, fleet rollout, and vulnerability posture · click to inspect" />
        <Table columns={['Repository', 'Promoted tag', 'Fleet rollout', 'Signing', 'Vulnerabilities', 'Status', '']}>
          {images.map((img) => {
            const cur = currentTagOf(img)
            const ad = imageAdoption(img.id, deployments, promoted)
            return (
              <Tr key={img.id} onClick={() => setSelId(img.id)}>
                <Td>
                  <p className="font-mono text-xs text-ink-900">{img.name}</p>
                  <p className="font-mono text-[11px] text-ink-400">{img.repo}</p>
                </Td>
                <Td>
                  <span className="font-mono text-xs font-semibold text-ink-900">{img.currentTag}</span>
                  <Badge tone={cur.channel === 'rc' ? 'yellow' : 'slate'}>{cur.channel}</Badge>
                </Td>
                <Td>
                  {ad.live === 0 ? (
                    <span className="text-xs text-ink-400">Not deployed</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-ink-600">{ad.onPromoted}/{ad.live} clusters</span>
                      {ad.behind > 0 && <Badge tone="orange">{ad.behind} behind</Badge>}
                      {ad.ahead > 0 && <Badge tone="blue">{ad.ahead} ahead</Badge>}
                      {ad.behind === 0 && ad.ahead === 0 && <Badge tone="green" dot>in sync</Badge>}
                    </div>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    {img.signed && <span title="Signed"><ShieldCheck className="h-4 w-4 text-emerald-500" /></span>}
                    <span className="text-xs text-ink-500">SLSA L{img.slsa}</span>
                  </div>
                </Td>
                <Td><CvePills tag={cur} /></Td>
                <Td>{img.quarantined ? <Badge tone="red" dot>Quarantined</Badge> : <Badge tone="green" dot>Active</Badge>}</Td>
                <Td><CircleDot className="h-4 w-4 text-ink-300" /></Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {sel && (
        <ImageDrawer
          img={sel}
          promoted={promoted}
          scanning={scanning === sel.id}
          onClose={() => setSelId(null)}
          onPromote={(tag) => promote(sel, tag)}
          onRescan={() => rescan(sel)}
          onQuarantine={() => toggleQuarantine(sel)}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Image drawer                                                        */
/* ------------------------------------------------------------------ */
type DrawerTab = 'tags' | 'rollout' | 'sbom' | 'cves'

const clusterStatusTone = { 'In sync': 'green', Behind: 'orange', Ahead: 'blue', Untracked: 'slate' } as const

function ImageDrawer({ img, promoted, scanning, onClose, onPromote, onRescan, onQuarantine }: {
  img: RegistryImage
  promoted: Record<string, string>
  scanning: boolean
  onClose: () => void
  onPromote: (tag: string) => void
  onRescan: () => void
  onQuarantine: () => void
}) {
  const [tab, setTab] = useState<DrawerTab>('tags')
  const sbom = sbomFor(img)
  const imgCves = allCves.filter((c) => c.image === img.name)
  const clusters: ImageClusterRow[] = imageClusters(img.id, deployments, promoted)

  const tabs: { key: DrawerTab; label: string }[] = [
    { key: 'tags', label: `Tags · ${img.tags.length}` },
    ...(clusters.length ? [{ key: 'rollout' as DrawerTab, label: `Fleet rollout · ${clusters.length}` }] : []),
    { key: 'sbom', label: `SBOM · ${sbom.length}` },
    { key: 'cves', label: `CVEs · ${imgCves.length}` },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="font-mono text-lg">{img.name}</span>}
      subtitle={img.repo}
      maxWidth="max-w-3xl"
      headerRight={img.quarantined ? <Badge tone="red" dot>Quarantined</Badge> : <Badge tone="green" dot>Active</Badge>}
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-ink-400">Current: <span className="font-mono text-ink-600">{img.currentTag}</span></span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={onClose}>Close</button>
            <GatedButton cap="release.rollout" className="btn-secondary" onClick={onRescan} disabled={scanning}>
              <ScanLine className={`h-4 w-4 ${scanning ? 'animate-pulse' : ''}`} />
              {scanning ? 'Scanning…' : 'Re-scan'}
            </GatedButton>
            <GatedButton
              cap="release.rollout"
              className={img.quarantined ? 'btn-secondary' : 'btn-secondary text-rose-600'}
              onClick={onQuarantine}
            >
              {img.quarantined ? <><CheckCircle2 className="h-4 w-4" />Release</> : <><Ban className="h-4 w-4" />Quarantine</>}
            </GatedButton>
          </div>
        </div>
      }
    >
      {/* Tab nav */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tags' && (
        <div className="space-y-2">
          {img.tags.map((tg) => {
            const current = tg.tag === img.currentTag
            return (
              <div key={tg.tag} className={`rounded-xl border p-3 ${current ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-ink-900">{tg.tag}</span>
                    <Badge tone={tg.channel === 'rc' ? 'yellow' : 'slate'}>{tg.channel}</Badge>
                    {current && <Badge tone="blue" dot>current</Badge>}
                    <CvePills tag={tg} />
                  </div>
                  {!current && (
                    <GatedButton cap="release.rollout" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => onPromote(tg.tag)}>
                      {img.tags.findIndex((x) => x.tag === tg.tag) < img.tags.findIndex((x) => x.tag === img.currentTag)
                        ? <><ArrowUpCircle className="h-3.5 w-3.5" />Promote</>
                        : <><Undo2 className="h-3.5 w-3.5" />Roll back</>}
                    </GatedButton>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-ink-400">
                  <span className="font-mono">{tg.digest.slice(0, 23)}…</span>
                  <span>{tg.sizeMb} MB</span>
                  <span>pushed {tg.pushed}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'rollout' && (
        <div>
          <p className="mb-3 text-xs text-ink-500">
            Clusters running <span className="font-mono text-ink-700">{img.name}</span>, compared against the promoted tag{' '}
            <span className="font-mono font-semibold text-ink-900">{img.currentTag}</span>. Behind clusters are candidates for a staged rollout.
          </p>
          <div className="space-y-2">
            {clusters.map((c) => (
              <Link
                key={c.id}
                to={`/clusters/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Cpu className="h-4 w-4 shrink-0 text-ink-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{c.customer}</p>
                    <p className="font-mono text-[11px] text-ink-400">{c.regionCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink-600">{c.deployedTag}</span>
                  {c.offline ? (
                    <Badge tone="slate" dot>offline</Badge>
                  ) : (
                    <Badge tone={clusterStatusTone[c.status]} dot>{c.status}</Badge>
                  )}
                  <ArrowUpRight className="h-3.5 w-3.5 text-ink-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'sbom' && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th className="px-3 py-2">Component</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">License</th>
                <th className="px-3 py-2 text-right">CVEs</th>
              </tr>
            </thead>
            <tbody>
              {sbom.map((c) => (
                <tr key={c.name} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-ink-800">{c.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-600">{c.version}</td>
                  <td className="px-3 py-2 text-xs text-ink-500">{c.license}</td>
                  <td className="px-3 py-2 text-right">{c.cves > 0 ? <Badge tone="red">{c.cves}</Badge> : <span className="text-xs text-ink-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-2 text-xs text-ink-400">
            <FileCode2 className="h-3.5 w-3.5" /> Full SBOM (CycloneDX) attested at build · SLSA L{img.slsa}
          </div>
        </div>
      )}

      {tab === 'cves' && (
        imgCves.length === 0 ? (
          <p className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-ink-400">No known CVEs for this image.</p>
        ) : (
          <Table columns={['CVE', 'Severity', 'Component', 'Fixed in', 'Status']}>
            {imgCves.map((c) => (
              <Tr key={c.id}>
                <Td className="font-mono text-xs text-ink-700">{c.id}</Td>
                <Td><Badge tone={c.severity === 'Critical' ? 'red' : c.severity === 'High' ? 'orange' : 'yellow'}>{c.severity}</Badge></Td>
                <Td className="font-mono text-xs text-ink-600">{c.component}</Td>
                <Td className="font-mono text-xs text-ink-600">{c.fixedIn}</Td>
                <Td><Badge tone={c.status === 'Open' ? 'red' : c.status === 'Mitigated' ? 'orange' : 'green'} dot>{c.status}</Badge></Td>
              </Tr>
            ))}
          </Table>
        )
      )}
    </Modal>
  )
}
