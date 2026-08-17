/**
 * Glossary of terms, acronyms, and concepts used across the PLCY platform and
 * this console. Surfaced on the Documentation page (/docs/glossary) and indexed
 * into the global ⌘K search so any term resolves to its definition.
 */
export type GlossaryGroup =
  | 'Platform & Architecture'
  | 'Security & Access'
  | 'Billing & Pricing'
  | 'Compliance & Privacy'
  | 'Operations & Fleet'

export interface GlossaryTerm {
  /** Stable id (assigned by the glossary store; lets same-named acronyms coexist). */
  id?: string
  /** The term or acronym as shown. */
  term: string
  /** Expansion for an acronym, e.g. "Bring Your Own Key". */
  full?: string
  group: GlossaryGroup
  /** Plain-language definition. */
  def: string
  /** Where it shows up in the console. */
  where?: string
  /** Related terms (by `term`). */
  see?: string[]
}

export const GLOSSARY_GROUPS: { key: GlossaryGroup; tone: 'blue' | 'purple' | 'green' | 'orange' | 'red' }[] = [
  { key: 'Platform & Architecture', tone: 'purple' },
  { key: 'Security & Access', tone: 'red' },
  { key: 'Billing & Pricing', tone: 'green' },
  { key: 'Compliance & Privacy', tone: 'orange' },
  { key: 'Operations & Fleet', tone: 'blue' },
]

const raw: GlossaryTerm[] = [
  /* ---------------- Platform & Architecture ---------------- */
  { term: 'PLCY', group: 'Platform & Architecture', def: 'The AI Governance & Policy Enforcement platform. It enforces security, privacy, compliance, and human-oversight policies on every AI request in real time.', where: 'The whole product; this console operates it.' },
  { term: 'Control plane', group: 'Platform & Architecture', def: 'The PLCY-hosted SaaS side — customer & policy management, billing, audit, and compliance reporting. This console is its front end. It configures policy but does not sit in the request path.', where: 'This console; Architecture doc.', see: ['Data plane'] },
  { term: 'Data plane', group: 'Platform & Architecture', def: 'The open-source enforcement layer that runs inside the customer environment and evaluates every AI request in real time against the configured policy, then streams evidence back to the control plane.', where: 'Deployed in the customer cloud/VPC; Architecture doc.', see: ['Control plane', 'OPA'] },
  { term: 'SaaS', full: 'Software as a Service', group: 'Platform & Architecture', def: 'Software delivered as a hosted, multi-tenant service rather than installed by the customer. PLCY’s control plane is SaaS; the data plane is customer-hosted.' },
  { term: 'BYOK', full: 'Bring Your Own Key', group: 'Platform & Architecture', def: 'The default model-access mode: the customer connects their own model provider / AWS account, so inference tokens bill directly to them. PLCY governs and audits the traffic but takes no markup on inference.', where: 'Pricing → Quote (model access); Model access doc.', see: ['PLCY-managed', 'Bedrock'] },
  { term: 'PLCY-managed', group: 'Platform & Architecture', def: 'The alternative to BYOK: PLCY provisions model access (e.g. Bedrock) and resells it as metered credits plus a service fee — zero provider setup for the customer.', where: 'Pricing → Quote (model access).', see: ['BYOK'] },
  { term: 'Air-gapped', group: 'Platform & Architecture', def: 'A single-tenant deployment with no outbound network connectivity, for the most sensitive environments. The data plane runs fully disconnected.', where: 'Deployment models doc; Regions.', see: ['Sovereign Cloud'] },
  { term: 'Sovereign Cloud', group: 'Platform & Architecture', def: 'A deployment pinned to a specific jurisdiction’s infrastructure to satisfy data-sovereignty requirements.', where: 'Regions; Residency Controls.', see: ['Residency', 'Air-gapped'] },
  { term: 'Dedicated Cloud', group: 'Platform & Architecture', def: 'A single-tenant deployment where the customer picks an AWS region and a size tier (Small/Medium/Large) — not individual nodes. Included on Enterprise Cloud; a priced add-on otherwise.', where: 'Pricing → Quote (Dedicated Cloud); Deployment models doc.' },
  { term: 'VPC', full: 'Virtual Private Cloud', group: 'Platform & Architecture', def: 'An isolated private network within a cloud provider. PLCY’s data plane typically runs inside the customer’s own VPC.', where: 'Deployment models doc; Architecture diagram.' },
  { term: 'EKS', full: 'Elastic Kubernetes Service', group: 'Platform & Architecture', def: 'AWS’s managed Kubernetes. PLCY’s data plane runs as pods on an EKS cluster inside the customer VPC.', where: 'Architecture diagram; Cluster Health.', see: ['Sidecar', 'PSA'] },
  { term: 'ALB', full: 'Application Load Balancer', group: 'Platform & Architecture', def: 'AWS’s HTTP/HTTPS load balancer. It fronts the cluster and routes API and socket traffic to the PLCY gateway via ingress/listener rules.', where: 'Architecture diagram.' },
  { term: 'OPA', full: 'Open Policy Agent', group: 'Platform & Architecture', def: 'The open-source policy engine PLCY uses to evaluate governance policy at request time. It runs as a sidecar / gateway next to each application pod.', where: 'Architecture diagram; Policy Packs / Enforcement.', see: ['Sidecar', 'Data plane'] },
  { term: 'OTel', full: 'OpenTelemetry', group: 'Platform & Architecture', def: 'The open standard for telemetry (traces, metrics, logs). An OTel collector sidecar exports evidence and traces to the observability backend.', where: 'Architecture diagram; Observability.', see: ['Observability'] },
  { term: 'Sidecar', group: 'Platform & Architecture', def: 'A helper container that runs alongside an application container in the same pod. PLCY ships OPA and OTel sidecars with every app pod to enforce policy and emit telemetry.', where: 'Architecture diagram.', see: ['OPA', 'OTel', 'Service mesh'] },
  { term: 'Service mesh', group: 'Platform & Architecture', def: 'An infrastructure layer that manages pod-to-pod traffic (routing, security, observability) transparently via sidecars, so services don’t implement it themselves.', where: 'Architecture diagram.', see: ['Sidecar'] },
  { term: 'Redis / ElastiCache', group: 'Platform & Architecture', def: 'An in-memory data store used for caching and fast lookups. Managed via Amazon ElastiCache for Redis in the customer VPC.', where: 'Architecture diagram.', see: ['Cache-hit discount'] },
  { term: 'Throughput tier', group: 'Platform & Architecture', def: 'A named performance band on a plan (Standard / High / Burst / Dedicated) that sets sustained request throughput; higher tiers carry a price uplift.', where: 'Pricing → Plans / Quote.' },
  { term: 'HITL', full: 'Human-in-the-loop', group: 'Platform & Architecture', def: 'A control that routes a flagged AI action to a human for review or approval before it proceeds.', where: 'Pricing entitlements; Policy enforcement.' },
  { term: 'Model routing', group: 'Platform & Architecture', def: 'Rules that decide which model or region an AI request is sent to — used to honour residency, cost, and capability requirements.', where: 'Model Routing (Sovereignty).', see: ['Residency'] },

  /* ---------------- Security & Access ---------------- */
  { term: 'RBAC', full: 'Role-Based Access Control', group: 'Security & Access', def: 'Access model where permissions attach to roles and roles to users. Every privileged action in the console checks a capability the acting role must hold.', where: 'Settings → Roles & Permissions; Access-control doc.', see: ['Capability'] },
  { term: 'Capability', group: 'Security & Access', def: 'A single named permission (e.g. policy.manage, provision.manage, settings.modify). If the acting role lacks it, the action is disabled with a lock affordance.', where: 'Throughout; access matrix in Settings.', see: ['RBAC'] },
  { term: 'MFA', full: 'Multi-Factor Authentication', group: 'Security & Access', def: 'Requiring more than a password to sign in (e.g. an authenticator or passkey). Required for every admin; phishing-resistant factors are preferred.', where: 'Settings → Security; Admin Security.', see: ['Passkey', 'SSO'] },
  { term: 'SSO', full: 'Single Sign-On', group: 'Security & Access', def: 'Signing in through a central identity provider instead of a local password. When enforced, local password login is disabled.', where: 'Settings → Security; Admin Security.', see: ['SAML', 'IdP', 'SCIM'] },
  { term: 'SCIM', full: 'System for Cross-domain Identity Management', group: 'Security & Access', def: 'A standard for auto-provisioning and de-provisioning user accounts from an identity provider, so joiners/leavers sync automatically.', where: 'Settings → Security (auto-provision).', see: ['SSO', 'IdP'] },
  { term: 'SAML', full: 'Security Assertion Markup Language', group: 'Security & Access', def: 'The XML-based standard used for browser SSO between an identity provider and an application. PLCY’s SSO uses SAML 2.0.', where: 'Admin Security (Okta SAML 2.0).', see: ['SSO', 'IdP'] },
  { term: 'IdP', full: 'Identity Provider', group: 'Security & Access', def: 'The system of record for identity (e.g. Okta) that authenticates users and asserts who they are to applications.', where: 'Admin Security; Settings → Security.', see: ['SSO', 'SAML', 'SCIM'] },
  { term: 'Passkey', group: 'Security & Access', def: 'A phishing-resistant, cryptographic sign-in credential (WebAuthn/FIDO2) that replaces passwords. Preferred over SMS or app codes.', where: 'Settings → Security (authentication factors).', see: ['MFA'] },
  { term: 'Device trust', group: 'Security & Access', def: 'Only letting known, healthy devices reach the console. Enrolled devices report a hardware-bound Device ID and pass a posture check on each check-in.', where: 'Settings → Security → Managed devices; Device-trust doc.', see: ['Device ID', 'MDM', 'Posture score'] },
  { term: 'Device ID', group: 'Security & Access', def: 'A hardware-bound identifier (Hardware UUID + motherboard serial) a managed device reports to prove it’s the same machine. A stable identifier, not a secret — the MDM attestation and VPN gate are the anti-spoofing anchors.', where: 'Managed devices panel.', see: ['Device trust', 'MDM'] },
  { term: 'MDM', full: 'Mobile Device Management', group: 'Security & Access', def: 'A system that enrolls and manages endpoints, enforcing settings like disk encryption and screen lock. MDM enrollment is one of the device posture checks.', where: 'Managed devices (posture checks).', see: ['Device trust'] },
  { term: 'Posture score', group: 'Security & Access', def: 'A live 0–100, RAG-rated measure of how hardened the org security policy is, weighted by control. It reacts as you change controls and surfaces the highest-weight gaps first.', where: 'Settings → Security; Admin Security; Fleet Posture.', see: ['RAG'] },
  { term: 'Break-glass', group: 'Security & Access', def: 'Emergency elevated access that is time-boxed and fully audited, used only when normal access is insufficient.', where: 'Privileged Access.', see: ['Capability'] },
  { term: 'API key', group: 'Security & Access', def: 'A credential for programmatic access, issued with least-privilege scopes (read / write / deploy / admin), a creation date, and last-used time; rotated from Admin Security.', where: 'Admin Security → API Keys; API-keys doc.' },
  { term: 'HSM', full: 'Hardware Security Module', group: 'Security & Access', def: 'A tamper-resistant device that stores and manages encryption keys. Available for customer-managed keys (BYOK/HSM) at rest.', where: 'Settings → Security (data protection).' },
  { term: 'IP allowlist', group: 'Security & Access', def: 'A list of network ranges permitted to reach the console. When enforced, requests from other addresses are blocked — a high-weight posture control.', where: 'Settings → Security (network).', see: ['Posture score'] },
  { term: 'Audit log', group: 'Security & Access', def: 'The immutable record of every action taken in the console (who, what, when, target), for accountability and investigations.', where: 'Audit Log.' },

  /* ---------------- Billing & Pricing ---------------- */
  { term: 'MRR', full: 'Monthly Recurring Revenue', group: 'Billing & Pricing', def: 'The predictable subscription revenue billed each month. Plan cards show customers on a plan and their MRR; a customer’s Billing tab shows list-vs-actual MRR.', where: 'Pricing; Customer → Billing; Dashboard.' },
  { term: 'Entitlement', group: 'Billing & Pricing', def: 'A capability a plan grants, usually a yes/no toggle (SSO, SCIM, immutable logs, advanced reporting, HITL, Bedrock, custom models).', where: 'Pricing → Plans / Quote.' },
  { term: 'Add-on', group: 'Billing & Pricing', def: 'An optional priced item on top of a plan, billed per unit or as a discounted bulk pack. Overages are charged at the cheaper of unit vs pack.', where: 'Pricing → Add-ons / Quote.', see: ['Overage'] },
  { term: 'Overage', group: 'Billing & Pricing', def: 'Usage beyond what a plan includes, billed at the add-on rate (cheaper of unit price vs bulk pack). Cache hits reduce billable requests first.', where: 'Pricing → Quote.', see: ['Add-on', 'Governed request', 'Cache-hit discount'] },
  { term: 'Governed request', group: 'Billing & Pricing', def: 'A single AI request evaluated by PLCY, counted at PLCY ingress. The core usage unit for capacity and overage.', where: 'Pricing → Quote (Demand).', see: ['Overage'] },
  { term: 'Cache-hit discount', group: 'Billing & Pricing', def: 'A reduction applied because a request was served from cache rather than re-evaluated, lowering the billable request count.', where: 'Pricing → Quote.', see: ['Redis / ElastiCache', 'Overage'] },
  { term: 'Dunning', group: 'Billing & Pricing', def: 'The automated retry-and-remind process after a payment fails, escalating toward suspension if unresolved. Dunning events route to Notifications.', where: 'Billing Health; Notifications.', see: ['Dispute'] },
  { term: 'Dispute', group: 'Billing & Pricing', def: 'A customer-initiated chargeback contesting a charge with their card network. Disputes route to on-call as a billing signal.', where: 'Billing Health; Notifications.', see: ['Dunning'] },
  { term: 'FinOps', group: 'Billing & Pricing', def: 'Cost & margin management — attributing infrastructure cost to revenue to see per-customer profitability.', where: 'Cost & Margin; FinOps report.' },
  { term: 'Quote builder', group: 'Billing & Pricing', def: 'The live pricing tool: pick a plan, cadence, and term; set demand and options; and export an order form. Reconciles to customers and Stripe MRR.', where: 'Pricing → Quote; Pricing doc.' },

  /* ---------------- Compliance & Privacy ---------------- */
  { term: 'DSAR', full: 'Data Subject Access Request', group: 'Compliance & Privacy', def: 'A request by an individual to access, export, or delete their personal data, tracked against a statutory deadline (e.g. GDPR).', where: 'Data Requests; DSAR Fulfilment report; Incidents-DSAR doc.', see: ['GDPR', 'PII'] },
  { term: 'PII', full: 'Personally Identifiable Information', group: 'Compliance & Privacy', def: 'Data that identifies a person. Detecting and controlling PII in AI traffic is a core enforcement job; a PII leak is a governance incident.', where: 'Data Classification; Incidents.', see: ['Data classification'] },
  { term: 'GDPR', full: 'General Data Protection Regulation', group: 'Compliance & Privacy', def: 'The EU data-protection law governing personal-data processing, consent, transfers, and data-subject rights (including DSARs).', where: 'Compliance Reporting; Residency.', see: ['DSAR', 'Residency'] },
  { term: 'HIPAA', full: 'Health Insurance Portability and Accountability Act', group: 'Compliance & Privacy', def: 'The US law protecting health information (PHI). A vertical PLCY Pack pre-configures controls for HIPAA/healthcare.', where: 'Policy Packs; Compliance Reporting.' },
  { term: 'SOC 2', group: 'Compliance & Privacy', def: 'An audit framework attesting controls for security, availability, confidentiality, processing integrity, and privacy.', where: 'Compliance Reporting; Compliance Attestation report.' },
  { term: 'ISO 27001 / 42001', group: 'Compliance & Privacy', def: 'International standards for an information-security management system (27001) and an AI management system (42001).', where: 'Compliance Reporting.' },
  { term: 'EU AI Act', group: 'Compliance & Privacy', def: 'The EU regulation classifying AI systems by risk and imposing obligations on higher-risk uses. PLCY packs map controls to it.', where: 'Policy Packs; Compliance Reporting.' },
  { term: 'Residency', group: 'Compliance & Privacy', def: 'The requirement that data stay in a chosen jurisdiction. Region selection pins data; cross-border movement is governed on Data Transfers.', where: 'Residency Controls; Data Transfers; Regions.', see: ['Sovereign Cloud', 'Sub-processor'] },
  { term: 'Sub-processor', group: 'Compliance & Privacy', def: 'A third party that processes customer data on PLCY’s behalf. Sub-processors are tracked and disclosed for compliance.', where: 'Sub-processors.', see: ['Residency'] },
  { term: 'Data classification', group: 'Compliance & Privacy', def: 'Labelling data by sensitivity (e.g. public, internal, confidential, PII) so policy can treat each level appropriately.', where: 'Data Classification.', see: ['PII'] },

  /* ---------------- Operations & Fleet ---------------- */
  { term: 'SLA', full: 'Service Level Agreement', group: 'Operations & Fleet', def: 'A committed service target (e.g. uptime). Missing it can trigger service credits.', where: 'SLA & Maintenance; SLA report.', see: ['SLA credit'] },
  { term: 'SLA credit', group: 'Operations & Fleet', def: 'A billing credit owed to a customer when an SLA target is breached.', where: 'SLA & Maintenance; Dashboard.', see: ['SLA'] },
  { term: 'Drift', group: 'Operations & Fleet', def: 'When a cluster is not running what it should — an image behind the promoted tag, or infrastructure that differs from Terraform.', where: 'Fleet Posture; Cluster Health.', see: ['Terraform drift'] },
  { term: 'Terraform', group: 'Operations & Fleet', def: 'HashiCorp’s infrastructure-as-code (IaC) tool: cloud infrastructure is declared in configuration and applied reproducibly, rather than changed by hand. PLCY tracks when a cluster’s real infrastructure drifts from its Terraform definition.', where: 'Fleet Posture (drift); Provisioning.', see: ['Terraform drift', 'Drift'] },
  { term: 'Terraform drift', full: 'TF drift', group: 'Operations & Fleet', def: 'Infrastructure that no longer matches its Terraform definition, shown as a count of drifted resources.', where: 'Fleet Posture (TF · N res).', see: ['Terraform', 'Drift'] },
  { term: 'PSA', full: 'Pod Security Admission', group: 'Operations & Fleet', def: 'The Kubernetes control that enforces pod-security standards per namespace (privileged / baseline / restricted), in enforce/audit/warn modes.', where: 'Fleet Posture; Cluster guardrails.', see: ['EKS'] },
  { term: 'Quota pressure', group: 'Operations & Fleet', def: 'How close a namespace is to its CPU / memory / pod limits. "Hot" means at or above 90% and at risk of hitting the ceiling.', where: 'Fleet Posture.' },
  { term: 'CVE', full: 'Common Vulnerabilities and Exposures', group: 'Operations & Fleet', def: 'A publicly catalogued security vulnerability, referenced by ID. Critical CVEs on a running image trigger a re-scan or quarantine.', where: 'Supply Chain; Dashboard.', see: ['SBOM'] },
  { term: 'SBOM', full: 'Software Bill of Materials', group: 'Operations & Fleet', def: 'An inventory of every component in a build, used to trace vulnerabilities and provenance across the supply chain.', where: 'Supply Chain.', see: ['CVE'] },
  { term: 'DR', full: 'Disaster Recovery', group: 'Operations & Fleet', def: 'The plan and tooling to restore service and data after a major failure — backups, restore drills, and recovery targets.', where: 'Backups & DR.' },
  { term: 'On-call', group: 'Operations & Fleet', def: 'The responder currently responsible for incidents. The Primary drives every routed signal; roles are Primary / Secondary / Manager.', where: 'Notifications; Notifications-on-call doc.', see: ['Rotation', 'Escalation', 'PagerDuty'] },
  { term: 'Rotation', group: 'Operations & Fleet', def: 'The schedule that moves on-call responsibility between people over time. "Make current" applies a week to the live assignment.', where: 'Notifications (Upcoming Rotation).', see: ['On-call'] },
  { term: 'Escalation', group: 'Operations & Fleet', def: 'The path a signal follows if the first responder doesn’t acknowledge — up to Secondary, then Manager.', where: 'Notifications.', see: ['On-call'] },
  { term: 'PagerDuty', group: 'Operations & Fleet', def: 'The paging tool that routes urgent signals to the on-call responder’s phone. PLCY signals feed it via routing rules.', where: 'Notifications.', see: ['On-call'] },
  { term: 'Maintenance window', group: 'Operations & Fleet', def: 'A scheduled period for changes (upgrades, region moves) with customer notice, so disruption is expected and bounded.', where: 'SLA & Maintenance; Provisioning.', see: ['Provisioning change-request'] },
  { term: 'Provisioning change-request', group: 'Operations & Fleet', def: 'A tracked request to change a deployment (region, size, connectivity) that’s reviewed and scheduled into a maintenance window.', where: 'Provisioning; Customer detail.', see: ['Maintenance window'] },
  { term: 'Policy pack', group: 'Operations & Fleet', def: 'A composable governance bundle: Controls (atomic checks) ⊂ Primitives (grouped controls) ⊂ Composite packs (deployable, market-ready — e.g. HIPAA, Financial Services).', where: 'Policy Packs; Policy-packs doc.', see: ['Enforcement mode'] },
  { term: 'Enforcement mode', group: 'Operations & Fleet', def: 'How a policy acts on a matching request: Monitor (log only), Warn (flag/annotate), or Block (stop before sensitive data leaves).', where: 'Enforcement Controls; Policy Editor.', see: ['Policy pack'] },
  { term: 'Observability', group: 'Operations & Fleet', def: 'Seeing what the system is doing from its telemetry (metrics, traces, logs). PLCY exports evidence and traces via OTel to CloudWatch, X-Ray, and Prometheus/Grafana.', where: 'Observability.', see: ['OTel'] },
  { term: 'RAG', full: 'Red / Amber / Green', group: 'Operations & Fleet', def: 'The status language used throughout the console: green = healthy, amber/orange = warning, red = danger. (Not to be confused with Retrieval-Augmented Generation.)', where: 'Everywhere (status badges).', see: ['Posture score'] },
  { term: 'RAG', full: 'Retrieval-Augmented Generation', group: 'Platform & Architecture', def: 'An AI technique where a model retrieves relevant documents or data and includes them in its prompt to ground the response in real sources. PLCY governs RAG pipelines like any other AI request — both the retrieved context and the prompt are subject to policy enforcement.', where: 'Governed like any AI request.', see: ['Data plane', 'Data classification'] },
  { term: 'Incident', group: 'Operations & Fleet', def: 'A logged AI-governance event with severity, status, owner, timeline, root cause, and remediation; rolled up in the Post-Mortem report with the obligations it triggers.', where: 'Incident Management; Incident report.', see: ['DSAR'] },
  { term: 'Licensing', group: 'Operations & Fleet', def: 'The entitlement and seat/usage limits granted to a customer’s deployment, tracked and enforced per tenant.', where: 'Licensing.' },
]

export const glossary: GlossaryTerm[] = [...raw].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }))

/** URL-safe id for a term, used for ⌘K deep-linking (?term=…) and anchors. */
export function glossaryId(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Full searchable text for a term — term, expansion, group, definition, and related. */
export function glossarySearchText(t: GlossaryTerm): string {
  return `${t.term} ${t.full ?? ''} ${t.group} ${t.def} ${(t.see ?? []).join(' ')} ${t.where ?? ''}`.toLowerCase()
}
