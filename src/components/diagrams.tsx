/**
 * Hand-authored inline-SVG diagrams for the documentation. Crisp at any zoom,
 * theme-consistent with the console, and self-contained (no runtime deps). Two
 * figures: the AWS network / deployment topology, and the logical PLCY
 * control-plane / data-plane architecture.
 */
import type { ReactNode } from 'react'

export type DiagramKind = 'network' | 'architecture'

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */
const INK = '#0f172a'
const MUT = '#64748b'
const LINE = '#94a3b8'

function Defs() {
  return (
    <defs>
      <marker id="arrow" markerWidth={9} markerHeight={9} refX={7} refY={3} orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L7,3 L0,6 Z" fill={LINE} />
      </marker>
      <marker id="arrowb" markerWidth={9} markerHeight={9} refX={7} refY={3} orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L7,3 L0,6 Z" fill="#3b82f6" />
      </marker>
    </defs>
  )
}

function Group({ x, y, w, h, title, fill, head }: { x: number; y: number; w: number; h: number; title: string; fill: string; head: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={LINE} strokeWidth={1.2} />
      <rect x={x} y={y} width={w} height={30} rx={12} fill={head} />
      <rect x={x} y={y + 16} width={w} height={14} fill={head} />
      <text x={x + w / 2} y={y + 20} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#fff">{title}</text>
    </g>
  )
}

function Node({ x, y, w, h, title, sub, fill = '#ffffff', accent = '#e2e8f0' }: { x: number; y: number; w: number; h: number; title: string; sub?: string; fill?: string; accent?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={accent} strokeWidth={1.2} />
      <text x={x + w / 2} y={sub ? y + h / 2 - 3 : y + h / 2 + 4} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={INK}>{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize={10} fill={MUT}>{sub}</text>}
    </g>
  )
}

function Cyl({ cx, y, w, h, label }: { cx: number; y: number; w: number; h: number; label: string[] }) {
  const x = cx - w / 2
  const ry = 7
  return (
    <g>
      <path d={`M${x},${y + ry} a${w / 2},${ry} 0 0,1 ${w},0 v${h - 2 * ry} a${w / 2},${ry} 0 0,1 ${-w},0 Z`} fill="#eef2ff" stroke="#818cf8" strokeWidth={1.2} />
      <ellipse cx={cx} cy={y + ry} rx={w / 2} ry={ry} fill="#e0e7ff" stroke="#818cf8" strokeWidth={1.2} />
      {label.map((l, i) => (
        <text key={i} x={cx} y={y + h + 14 + i * 12} textAnchor="middle" fontSize={9.5} fill={MUT}>{l}</text>
      ))}
    </g>
  )
}

function Edge({ points, label, dashed, blue, lx, ly }: { points: [number, number][]; label?: string; dashed?: boolean; blue?: boolean; lx?: number; ly?: number }) {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const mid = points[Math.floor(points.length / 2) - (points.length % 2 === 0 ? 1 : 0)] ?? points[0]
  return (
    <g>
      <path d={d} fill="none" stroke={blue ? '#3b82f6' : LINE} strokeWidth={1.5} strokeDasharray={dashed ? '5 4' : undefined} markerEnd={`url(#${blue ? 'arrowb' : 'arrow'})`} />
      {label && (
        <text x={lx ?? mid[0]} y={ly ?? mid[1] - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill={blue ? '#2563eb' : MUT}>{label}</text>
      )}
    </g>
  )
}

function Figure({ title, viewBox, minWidth, children }: { title: string; viewBox: string; minWidth: number; children: ReactNode }) {
  return (
    <figure className="my-2">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
        <svg viewBox={viewBox} width="100%" style={{ minWidth, display: 'block' }} role="img" aria-label={title} fontFamily="ui-sans-serif, system-ui, sans-serif">
          {children}
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-ink-400">{title}</figcaption>
    </figure>
  )
}

/* ------------------------------------------------------------------ */
/* Network / deployment topology                                       */
/* ------------------------------------------------------------------ */
function NetworkDiagram() {
  return (
    <Figure title="AWS network & deployment topology — the PLCY data plane inside a customer VPC. Labels are illustrative; adjust to your environment." viewBox="0 0 980 620" minWidth={520}>
      <Defs />

      {/* User */}
      <circle cx={40} cy={300} r={26} fill="#f1f5f9" stroke={LINE} strokeWidth={1.2} />
      <text x={40} y={304} textAnchor="middle" fontSize={11} fontWeight={600} fill={INK}>User</text>

      {/* VPC */}
      <Group x={95} y={24} w={610} h={580} title="Amazon VPC · Virtual Private Cloud" fill="#f8fafc" head="#334155" />

      {/* Load balancer */}
      <Group x={115} y={72} w={230} h={82} title="Load Balancer" fill="#ffffff" head="#64748b" />
      <Node x={127} y={110} w={206} h={36} title="AWS Application Load Balancer" sub="ALB" fill="#eff6ff" accent="#93c5fd" />

      {/* Ingress rules */}
      <g>
        <rect x={115} y={176} width={230} height={120} rx={8} fill="#ffffff" stroke="#e2e8f0" strokeWidth={1.2} />
        <text x={230} y={194} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>Ingress · ALB Listener Rules</text>
        <text x={127} y={214} fontSize={10} fill={MUT}>frontend  →  /</text>
        <text x={127} y={230} fontSize={10} fill={MUT}>backend  →  /api/* · /vault/* · /swagger/*</text>
        <text x={127} y={246} fontSize={10} fill={MUT}>socket  →  /socket/</text>
        <text x={127} y={270} fontSize={9.5} fontStyle="italic" fill={LINE}>Managed by AWS ALB Controller</text>
      </g>

      {/* NAT */}
      <Node x={115} y={316} w={150} h={34} title="AWS NAT Gateway" fill="#ffffff" accent="#e2e8f0" />

      {/* Data stores */}
      <Cyl cx={160} y={380} w={86} h={58} label={['Amazon RDS', '(PostgreSQL)']} />
      <Cyl cx={275} y={380} w={86} h={58} label={['Amazon ElastiCache', '(Redis)']} />

      {/* S3 */}
      <Node x={115} y={500} w={215} h={72} title="Amazon S3 · Multi-Region" sub="Data Lake · Backups · Media" fill="#f0fdf4" accent="#86efac" />

      {/* EKS cluster */}
      <Group x={380} y={72} w={305} h={380} title="Amazon EKS Cluster · PLCY App" fill="#f8fafc" head="#2563eb" />

      {/* Pod */}
      <g>
        <rect x={398} y={118} width={270} height={150} rx={10} fill="#faf5ff" stroke="#c4b5fd" strokeWidth={1.2} />
        <text x={533} y={136} textAnchor="middle" fontSize={11} fontWeight={700} fill="#6d28d9">Kubernetes Pod</text>
        <Node x={410} y={148} w={118} h={40} title="PLCY Gateway" fill="#ffffff" accent="#ddd6fe" />
        <Node x={538} y={148} w={118} h={40} title="OPA Sidecar" fill="#ffffff" accent="#ddd6fe" />
        <Node x={410} y={196} w={118} h={44} title="OTel Collector" sub="sidecar" fill="#ffffff" accent="#ddd6fe" />
        <Node x={538} y={196} w={118} h={44} title="OPA Gateway" sub="service mesh" fill="#ffffff" accent="#ddd6fe" />
      </g>

      {/* Workload pods */}
      <Node x={398} y={300} w={90} h={50} title="Backend" sub="microservices" fill="#ffffff" accent="#e2e8f0" />
      <Node x={493} y={300} w={86} h={50} title="Node.js" sub="frontend" fill="#ffffff" accent="#e2e8f0" />
      <Node x={584} y={300} w={84} h={50} title="Background" sub="tasks" fill="#ffffff" accent="#e2e8f0" />
      <text x={533} y={378} textAnchor="middle" fontSize={9.5} fontStyle="italic" fill={MUT}>All application pods include OPA &amp; OTel sidecars</text>
      <rect x={398} y={392} width={270} height={42} rx={8} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={1} />
      <text x={533} y={417} textAnchor="middle" fontSize={10} fill={MUT}>Service mesh · mTLS between pods</text>

      {/* Observability */}
      <Group x={740} y={118} w={222} h={212} title="AWS Observability Backend" fill="#f8fafc" head="#0f172a" />
      <Node x={756} y={156} w={190} h={42} title="Amazon CloudWatch" sub="Logs · Metrics" fill="#ffffff" accent="#e2e8f0" />
      <Node x={756} y={206} w={190} h={38} title="AWS X-Ray" fill="#ffffff" accent="#e2e8f0" />
      <Node x={756} y={252} w={190} h={48} title="Amazon Managed" sub="Prometheus / Grafana" fill="#ffffff" accent="#e2e8f0" />

      {/* Edges */}
      <Edge points={[[66, 296], [127, 128]]} label="HTTPS" lx={92} ly={198} />
      <Edge points={[[230, 154], [230, 176]]} />
      <Edge points={[[345, 224], [398, 200]]} blue label="AI request" lx={372} ly={205} />
      <Edge points={[[230, 296], [230, 316]]} />
      <Edge points={[[190, 350], [165, 373]]} />
      <Edge points={[[240, 350], [270, 373]]} />
      <Edge points={[[210, 438], [210, 500]]} />
      <Edge points={[[668, 218], [740, 224]]} blue label="Trace export" lx={704} ly={214} />
      <Edge points={[[756, 300], [500, 300], [500, 350]]} dashed label="metrics scrape" lx={640} ly={294} />
    </Figure>
  )
}

/* ------------------------------------------------------------------ */
/* Logical architecture (control plane / data plane)                   */
/* ------------------------------------------------------------------ */
function ArchitectureDiagram() {
  return (
    <Figure title="PLCY logical architecture — SaaS control plane, customer-hosted data plane, and model access. Mirrors the topology above at the product level." viewBox="0 0 980 520" minWidth={520}>
      <Defs />

      {/* Actors */}
      <Node x={20} y={150} w={150} h={46} title="PLCY team" sub="Admin Console" fill="#eff6ff" accent="#93c5fd" />
      <Node x={20} y={300} w={150} h={46} title="Customer admins" fill="#eff6ff" accent="#93c5fd" />

      {/* Control plane */}
      <Group x={215} y={40} w={300} h={440} title="PLCY SaaS · Control Plane" fill="#f8fafc" head="#2563eb" />
      <Node x={235} y={84} w={260} h={46} title="Admin Console" sub="this repo · React SPA" fill="#faf5ff" accent="#c4b5fd" />
      <Node x={235} y={146} w={260} h={46} title="Control-plane API" sub="planned · Go" fill="#ffffff" accent="#e2e8f0" />
      <Node x={235} y={208} w={260} h={44} title="Policy & governance engine" sub="evidence" fill="#ffffff" accent="#e2e8f0" />
      <Node x={235} y={266} w={260} h={44} title="Billing · Stripe" sub="pricing catalog" fill="#ffffff" accent="#e2e8f0" />
      <Node x={235} y={324} w={260} h={44} title="Audit · compliance reporting" fill="#ffffff" accent="#e2e8f0" />

      {/* Customer environment */}
      <Group x={565} y={40} w={270} h={300} title="Customer environment" fill="#f8fafc" head="#334155" />
      <text x={700} y={86} textAnchor="middle" fontSize={9.5} fill={MUT}>Cloud · VPC · Sovereign · Air-gapped</text>
      <Node x={585} y={100} w={230} h={60} title="Open-source data plane" sub="real-time enforcement" fill="#f0fdf4" accent="#86efac" />
      <Node x={585} y={180} w={230} h={52} title="Customer AI apps" sub="agents · workflows" fill="#ffffff" accent="#e2e8f0" />

      {/* Model access */}
      <Group x={565} y={368} w={270} h={112} title="Model access" fill="#f8fafc" head="#64748b" />
      <Node x={585} y={404} w={110} h={60} title="BYOK" sub="provider / Bedrock" fill="#fff7ed" accent="#fdba74" />
      <Node x={705} y={404} w={110} h={60} title="PLCY-managed" sub="metered credits" fill="#fff7ed" accent="#fdba74" />

      {/* Edges */}
      <Edge points={[[170, 173], [235, 107]]} />
      <Edge points={[[170, 323], [215, 169]]} label="" />
      <Edge points={[[365, 130], [365, 146]]} />
      <Edge points={[[365, 192], [365, 208]]} />
      <Edge points={[[495, 230], [585, 130]]} blue label="policies / config" lx={548} ly={168} />
      <Edge points={[[585, 150], [515, 240]]} dashed label="telemetry" lx={548} ly={214} />
      <Edge points={[[700, 160], [700, 180]]} label="enforced" lx={730} ly={174} />
      <Edge points={[[640, 232], [640, 404]]} blue />
      <Edge points={[[760, 232], [760, 404]]} blue />
    </Figure>
  )
}

export function Diagram({ kind }: { kind: DiagramKind }) {
  return kind === 'network' ? <NetworkDiagram /> : <ArchitectureDiagram />
}
