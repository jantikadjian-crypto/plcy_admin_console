/**
 * In-app documentation / help center content. Grouped into four categories and
 * surfaced on the Documentation page (/docs) and the global ⌘K search. Articles
 * are plain structured content (no markdown runtime) so they render consistently
 * and stay searchable by title, summary, tags, and body text.
 */
export type DocCategory = 'System Usage' | 'Technical' | 'Features' | 'Policies'

export interface DocSection {
  heading?: string
  paras?: string[]
  bullets?: string[]
  /** Renders an inline-SVG figure (see components/diagrams.tsx). */
  diagram?: 'network' | 'architecture'
}

export interface DocArticle {
  id: string
  slug: string
  title: string
  category: DocCategory
  summary: string
  tags: string[]
  updated: string
  sections: DocSection[]
}

export const DOC_CATEGORIES: { key: DocCategory; icon: 'book' | 'cpu' | 'sparkles' | 'shield'; tone: 'blue' | 'purple' | 'green' | 'orange'; blurb: string }[] = [
  { key: 'System Usage', icon: 'book', tone: 'blue', blurb: 'Navigating and operating the console day to day.' },
  { key: 'Technical', icon: 'cpu', tone: 'purple', blurb: 'Architecture, deployment, and integration details.' },
  { key: 'Features', icon: 'sparkles', tone: 'green', blurb: 'How each major capability works.' },
  { key: 'Policies', icon: 'shield', tone: 'orange', blurb: 'Standards, controls, and compliance references.' },
]

export const docs: DocArticle[] = [
  /* ---------------- System Usage ---------------- */
  {
    id: 'doc_getting_started', slug: 'getting-started', title: 'Getting started & navigation', category: 'System Usage',
    summary: 'Orient yourself in the console — the sidebar groups, the top bar, and search.',
    tags: ['navigation', 'sidebar', 'search', 'onboarding', 'basics'], updated: '2026-07-14',
    sections: [
      { paras: ['The console is organized into sidebar groups: Overview, Customers, Fleet, Sovereignty, Governance, Policy, Operations, and Platform. Each item is a page; your role determines which actions you can take on it.'] },
      { heading: 'The top bar', bullets: [
        'Search (⌘K / Ctrl-K) — jump to any customer, model, policy, report, or documentation article.',
        '+ New — quick-create common records (customer, instance, invoice, incident) subject to your permissions.',
        'Notifications — the alert bell shows recent fleet signals; open it to reach the Notifications page.',
      ] },
      { heading: 'Customer scope', paras: ['The switcher at the top of the sidebar sets whether you are viewing the whole fleet ("All Customers") or a single account. Scope-aware pages and reports re-scope to your selection.'] },
    ],
  },
  {
    id: 'doc_scope', slug: 'customer-scope', title: 'Customer scope: fleet vs single customer', category: 'System Usage',
    summary: 'Switch between a fleet-wide view and a single customer to re-scope pages and reports.',
    tags: ['scope', 'customer', 'fleet', 'reports', 'filter'], updated: '2026-07-14',
    sections: [
      { paras: ['The customer switcher (top of the sidebar) controls the scope of scope-aware surfaces. With "All Customers" selected you see the whole fleet; pick a customer to narrow everything to that account.'] },
      { heading: 'What re-scopes', bullets: [
        'Reports (Fleet Posture, SLA, Cost & Margin, Incident, DSAR) generate for the selected scope.',
        'Cost & Margin, SLA, and Data Requests filter to the customer.',
        'Setting scope from a search result or a customer page follows you across the app.',
      ] },
    ],
  },
  {
    id: 'doc_reports', slug: 'reports', title: 'Generating & exporting reports', category: 'System Usage',
    summary: 'Produce point-in-time reports for exec reviews, auditors, and customers.',
    tags: ['reports', 'export', 'csv', 'markdown', 'pdf', 'compliance'], updated: '2026-07-15',
    sections: [
      { paras: ['The Reports hub (Overview → Reports) lists every generator. Scope-aware reports honor the customer selected in the sidebar. Each report opens with a RAG status banner and can be printed or exported.'] },
      { heading: 'Available reports', bullets: [
        'Fleet Governance Posture, Compliance Attestation, Security & Vulnerability.',
        'SLA & Credits, Cost & Margin (FinOps), Incident Post-Mortem, DSAR Fulfilment.',
        'Customer Account Report — a consolidated one-pager per customer.',
      ] },
      { heading: 'Exporting', paras: ['Use Download CSV or Download Markdown for a data or document copy, or Print / Save as PDF for the formatted report. Reports are also launchable from the page they summarize (e.g. Generate report on Cost & Margin).'] },
    ],
  },
  {
    id: 'doc_notifications', slug: 'notifications-oncall', title: 'Notifications & on-call', category: 'System Usage',
    summary: 'How live signals route to channels and page the on-call responder.',
    tags: ['notifications', 'on-call', 'routing', 'pagerduty', 'escalation', 'alerts'], updated: '2026-07-16',
    sections: [
      { paras: ['The Notifications page runs every live fleet signal through your routing rules so you can see exactly who gets notified — and which signals fall through the cracks (no rule, rule disabled, or below its severity floor).'] },
      { heading: 'Editing on-call', bullets: [
        'On-Call card → Edit reassigns Primary / Secondary / Manager from the team roster.',
        'The Primary responder drives every PagerDuty-routed signal and the "On-call now" tile.',
        'Upcoming Rotation is editable; "Make current" applies a week to the live assignment.',
      ] },
      { heading: 'Signals', paras: ['Cluster, supply-chain, SLA, billing (dunning, failed payments, disputes), and device-trust events all feed the router. Add a routing rule to close any coverage gap.'] },
    ],
  },

  /* ---------------- Technical ---------------- */
  {
    id: 'doc_architecture', slug: 'architecture', title: 'Architecture overview', category: 'Technical',
    summary: 'The SaaS console/control plane, the open-source data plane, and how they connect.',
    tags: ['architecture', 'control plane', 'data plane', 'design'], updated: '2026-07-17',
    sections: [
      { paras: ['PLCY pairs a SaaS governance console and control plane with an open-source data plane that runs inside the customer environment. The console configures policy; the data plane enforces it on every AI request in real time and streams evidence back.'] },
      { diagram: 'architecture' },
      { heading: 'Planes', bullets: [
        'Control plane (SaaS) — customer/policy management, billing, audit and compliance reporting, this console.',
        'Data plane (open source) — deployed in the customer cloud, VPC, sovereign infrastructure, or air-gapped network.',
        'Model access — BYOK (customer’s provider/AWS) by default, or a PLCY-managed credits layer.',
      ] },
      { paras: ['This console is a React/TypeScript SPA. For how the data plane is deployed inside a customer VPC, see the Network & deployment topology article.'] },
    ],
  },
  {
    id: 'doc_network', slug: 'network-topology', title: 'Network & deployment topology', category: 'Technical',
    summary: 'How the PLCY data plane runs inside a customer VPC — load balancing, EKS pods, sidecars, data stores, and observability.',
    tags: ['network', 'vpc', 'eks', 'kubernetes', 'alb', 'opa', 'otel', 'sidecar', 'redis', 's3', 'observability', 'topology'], updated: '2026-07-17',
    sections: [
      { paras: ['The PLCY data plane deploys into the customer’s own AWS VPC. Traffic enters through an Application Load Balancer, is routed by ingress rules to the PLCY gateway pod, and every request is governed in-line by an OPA sidecar before reaching model or backend services. Telemetry is exported via OpenTelemetry to the customer’s observability backend.'] },
      { diagram: 'network' },
      { heading: 'Request path', bullets: [
        'User → ALB — HTTPS enters the VPC through the AWS Application Load Balancer.',
        'ALB → Ingress rules — listener rules route frontend (/), backend (/api/*, /vault/*, /swagger/*), and socket (/socket/) traffic, managed by the AWS ALB Controller.',
        'Ingress → PLCY Gateway pod — the AI request hits the gateway, where the OPA sidecar evaluates policy in real time.',
        'Pod → services — governed requests reach backend microservices, the Node.js frontend, or background tasks; all application pods carry OPA & OTel sidecars, meshed with mTLS.',
      ] },
      { heading: 'Data & state', bullets: [
        'Amazon RDS (PostgreSQL) — relational state for the application.',
        'Amazon ElastiCache (Redis) — caching and fast lookups; cache hits reduce billable governed requests.',
        'Amazon S3 (multi-region) — data lake, backups, and media.',
        'AWS NAT Gateway — controlled egress for private subnets.',
      ] },
      { heading: 'Observability', bullets: [
        'OTel collector sidecars export traces and metrics to the observability backend.',
        'Amazon CloudWatch (logs, metrics), AWS X-Ray (tracing), and Amazon Managed Prometheus / Grafana.',
        'The same evidence stream feeds the control-plane audit and compliance surfaces.',
      ] },
    ],
  },
  {
    id: 'doc_deployment', slug: 'deployment-models', title: 'Deployment models', category: 'Technical',
    summary: 'Shared SaaS, dedicated single-tenant cloud, and air-gapped deployments.',
    tags: ['deployment', 'dedicated', 'air-gapped', 'sovereign', 'region', 'vpc'], updated: '2026-07-16',
    sections: [
      { heading: 'Options', bullets: [
        'Shared multi-tenant SaaS — the default for most plans.',
        'Dedicated Cloud — single-tenant; the customer selects an AWS region and a size tier (Small / Medium / Large), not individual nodes. Included on Enterprise Cloud; a priced add-on on other plans.',
        'Air-gapped single-tenant — the data plane runs with no outbound connectivity for the most sensitive environments.',
      ] },
      { heading: 'Region & size, not nodes', paras: ['Customers choose region and size tier; PLCY does not expose low-level compute-node selection. Region and connectivity changes are handled as provisioning change-requests and scheduled into a maintenance window.'] },
    ],
  },
  {
    id: 'doc_model_access', slug: 'model-access', title: 'Model access: BYOK vs PLCY-managed', category: 'Technical',
    summary: 'Who pays for inference, and how each mode is billed.',
    tags: ['byok', 'managed', 'model', 'bedrock', 'credits', 'inference'], updated: '2026-07-17',
    sections: [
      { heading: 'BYOK (default)', paras: ['The customer connects their own model provider / AWS account. PLCY governs, routes, and audits the traffic, but model tokens bill directly to the customer — PLCY takes no markup on inference. PLCY charges the platform subscription and the relevant entitlement.'] },
      { heading: 'PLCY-managed', paras: ['PLCY provisions model access (e.g. AWS Bedrock) and resells it as metered credits plus a service fee. Best for teams that want zero provider setup.'] },
      { heading: 'AWS Bedrock', paras: ['The Bedrock model catalog (Pricing & Plans → Bedrock models) lists which models are available, the plan tier that unlocks each, and whether it is customer-enabled (BYOK) or PLCY-offered (managed).'] },
    ],
  },
  {
    id: 'doc_api_keys', slug: 'api-keys', title: 'API keys & programmatic access', category: 'Technical',
    summary: 'Issue, scope, and rotate credentials for programmatic access.',
    tags: ['api', 'keys', 'tokens', 'scopes', 'rotation', 'security'], updated: '2026-07-14',
    sections: [
      { paras: ['Platform API keys are managed on Admin Security. Each key has least-privilege scopes (read / write / deploy / admin), a creation date, and last-used time.'] },
      { heading: 'Policy controls', bullets: [
        'Max token lifetime and auto-expire-unused windows are set in Settings → Security → API access.',
        'Scoped tokens can be required org-wide (no full-access keys).',
        'Rotate keys from Admin Security; expired keys are flagged for rotation.',
      ] },
    ],
  },

  /* ---------------- Features ---------------- */
  {
    id: 'doc_pricing', slug: 'pricing-quotes', title: 'Pricing & the quote builder', category: 'Features',
    summary: 'The plans catalog, add-ons with bulk packs, discount levers, and live quotes.',
    tags: ['pricing', 'plans', 'quote', 'add-ons', 'discounts', 'throughput', 'billing'], updated: '2026-07-17',
    sections: [
      { paras: ['Pricing & Plans is the catalog: plans (capacity + entitlements), add-ons with discounted bulk packs, global discount levers, named throughput tiers, and a Bedrock model catalog.'] },
      { heading: 'Quote builder', bullets: [
        'Pick a plan, billing cadence, and term; the plan’s capacity pre-fills the Demand fields.',
        'Overages are priced by the cheaper of unit vs pack; cache hits reduce billable requests.',
        'Toggle entitlements (immutable logs, HITL, Bedrock, custom models), add a Dedicated Cloud tier + region, and export the order form as CSV/Markdown.',
      ] },
      { heading: 'Reconciliation', paras: ['Existing customers map to catalog plans by tier (Growth → Team, Trial → Builder). Each plan card shows customers on it and their MRR; a customer’s Billing tab shows its catalog plan, entitlements, and list-vs-actual MRR.'] },
    ],
  },
  {
    id: 'doc_device_trust', slug: 'device-trust', title: 'Device trust & enrollment', category: 'Features',
    summary: 'Enroll managed devices with a hardware-bound ID, VPN, and posture checks.',
    tags: ['device', 'enrollment', 'mdm', 'posture', 'vpn', 'byok', 'security'], updated: '2026-07-16',
    sections: [
      { paras: ['Settings → Security → Managed devices governs which devices may reach the console. Enrolling a device issues a one-time code (with QR + install command); on check-in the device reports a hardware-bound Device ID (Hardware UUID + motherboard serial) and passes a posture check.'] },
      { heading: 'Posture checks', bullets: [
        'Disk encryption, current OS, screen lock, not jailbroken, MDM-enrolled, and connected via company VPN.',
        'A device passing all checks is Trusted; a drifted device is At risk; a non-compliant device is Blocked.',
        'When "Require managed devices" is on, only Trusted devices can access the console.',
      ] },
      { paras: ['A plaintext hardware fingerprint is a stable identifier, not a secret — the certificate/MDM attestation and the VPN gate are the real anti-spoofing anchors.'] },
    ],
  },
  {
    id: 'doc_security_posture', slug: 'security-posture', title: 'Security policy & posture score', category: 'Features',
    summary: 'The org security policy and the live posture score derived from it.',
    tags: ['security', 'posture', 'policy', 'mfa', 'sso', 'hardening'], updated: '2026-07-17',
    sections: [
      { paras: ['Settings → Security is the org-wide security policy: authentication (MFA, SSO, methods, step-up), sessions, network & devices, API access, and data protection. A live posture score (0–100, RAG-rated) reacts as you change controls.'] },
      { heading: 'Configure → observe', paras: ['The same posture score and its prioritized gaps appear on Admin Security and Fleet Posture, so what you set in the policy is what you see across the observability surfaces. The score is weighted — MFA, phishing-resistant factors, enforced SSO, and an enforced IP allowlist move it most.'] },
    ],
  },
  {
    id: 'doc_policy_packs', slug: 'policy-packs', title: 'Policy packs & enforcement', category: 'Features',
    summary: 'The Control ⊂ Primitive ⊂ Composite model and enforcement modes.',
    tags: ['policy', 'packs', 'primitives', 'controls', 'enforcement', 'hipaa'], updated: '2026-07-15',
    sections: [
      { paras: ['Policy is composed hierarchically: Controls are the atomic checks, Primitives bundle related controls, and Composite packs assemble primitives into deployable, market-ready bundles (e.g. HIPAA, Financial Services, EU AI Act).'] },
      { heading: 'Enforcement', bullets: [
        'Monitor — observe and log without blocking.',
        'Warn — flag and annotate the request.',
        'Block — stop the request before sensitive data leaves.',
      ] },
      { paras: ['Enforcement Controls and the Policy Editor manage how packs apply; the catalog is the source of truth referenced across the console.'] },
    ],
  },
  {
    id: 'doc_incidents_dsar', slug: 'incidents-dsar', title: 'Incidents & data requests (DSAR)', category: 'Features',
    summary: 'Triage AI-governance incidents and fulfil data-subject requests on their statutory SLA.',
    tags: ['incident', 'dsar', 'privacy', 'triage', 'regulatory', 'sla'], updated: '2026-07-15',
    sections: [
      { heading: 'Incidents', paras: ['Incident Management logs AI-governance incidents with severity, status, owner, timeline, root cause, and remediation. Edit status/severity/assignee in place; the Incident Post-Mortem report rolls them up with the regulatory obligations they trigger.'] },
      { heading: 'DSAR', paras: ['Data Requests tracks data-subject requests against their statutory deadline. The DSAR Fulfilment report scores each request (Breached / At risk / On track / Closed) and breaks the queue down by type and jurisdiction.'] },
    ],
  },

  /* ---------------- Policies ---------------- */
  {
    id: 'doc_pol_security', slug: 'policy-security-standards', title: 'Security policy standards', category: 'Policies',
    summary: 'Baseline authentication, session, network, and data-protection requirements.',
    tags: ['policy', 'security', 'mfa', 'sso', 'byok', 'standards'], updated: '2026-07-17',
    sections: [
      { heading: 'Baseline requirements', bullets: [
        'MFA is required for every admin; phishing-resistant factors (passkeys) are preferred and SMS is discouraged.',
        'SSO is enforced; local password login is disabled where the IdP governs access.',
        'Sessions time out, idle-lock, and cap concurrent sessions; the IP allowlist is enforced for privileged environments.',
        'Encryption at rest is always on; customer-managed keys (BYOK/HSM) are available.',
      ] },
      { paras: ['These map directly to the controls in Settings → Security. The posture score measures adherence and surfaces the highest-weight gaps first.'] },
    ],
  },
  {
    id: 'doc_pol_retention', slug: 'policy-data-retention', title: 'Data retention & residency', category: 'Policies',
    summary: 'How long data is kept, where it lives, and how transfers are governed.',
    tags: ['retention', 'residency', 'sovereignty', 'data', 'gdpr', 'region'], updated: '2026-07-14',
    sections: [
      { heading: 'Retention', paras: ['Log and evidence retention is set per plan (from 7 days on Free up to ~3 years on Enterprise Cloud) and in org settings. Retention windows are visible on each plan and in the customer’s deployment configuration.'] },
      { heading: 'Residency', bullets: [
        'Region selection pins data to a jurisdiction; Sovereign Cloud and air-gapped options exist for strict requirements.',
        'Cross-border transfers are governed on the Data Transfers and Residency Controls pages.',
        'Sub-processors are tracked and disclosed on the Sub-processors page.',
      ] },
    ],
  },
  {
    id: 'doc_pol_rbac', slug: 'policy-access-control', title: 'Access control (RBAC)', category: 'Policies',
    summary: 'Roles, capabilities, and how the console gates privileged actions.',
    tags: ['rbac', 'roles', 'permissions', 'access', 'least privilege', 'audit'], updated: '2026-07-15',
    sections: [
      { paras: ['Access is capability-based. Every privileged action checks a capability (e.g. policy.manage, provision.manage, license.manage, settings.modify); the acting role either holds it or the action is disabled with a lock affordance.'] },
      { heading: 'Administering roles', bullets: [
        'Settings → Roles & Permissions holds the production access matrix; click a cell to grant or revoke.',
        'Superuser holds every permission; changes are captured in a permission change log.',
        'Break-glass / privileged access is time-boxed and audited on the Privileged Access page.',
      ] },
      { paras: ['Every action across the console is recorded to the Audit Log for accountability.'] },
    ],
  },
  {
    id: 'doc_pol_compliance', slug: 'policy-compliance', title: 'Compliance frameworks', category: 'Policies',
    summary: 'The frameworks PLCY supports and where to find attestation evidence.',
    tags: ['compliance', 'soc 2', 'iso', 'hipaa', 'gdpr', 'eu ai act', 'audit'], updated: '2026-07-16',
    sections: [
      { paras: ['PLCY supports SOC 2, ISO 27001 / 42001, HIPAA, GDPR, and the EU AI Act, among others. Compliance Reporting and the Compliance Attestation report map controls to evidence for auditors.'] },
      { heading: 'Where to look', bullets: [
        'Compliance Reporting — framework coverage and control status.',
        'Compliance Attestation report — auditor-ready evidence export.',
        'Vertical PLCY Packs pre-configure controls for regulated markets (HIPAA/healthcare, finance, insurance, ISO).',
      ] },
    ],
  },
]

export const docBySlug = (slug: string): DocArticle | undefined => docs.find((d) => d.slug === slug)
export const docsByCategory = (cat: DocCategory): DocArticle[] => docs.filter((d) => d.category === cat)

/** Full searchable text for a doc — title, summary, tags, and body. */
export function docSearchText(d: DocArticle): string {
  const body = d.sections.flatMap((s) => [s.heading ?? '', ...(s.paras ?? []), ...(s.bullets ?? [])]).join(' ')
  return `${d.title} ${d.summary} ${d.tags.join(' ')} ${body}`.toLowerCase()
}
