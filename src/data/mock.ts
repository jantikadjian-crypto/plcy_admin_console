/**
 * Mock data for the PLCY admin console.
 * PLCY is an AI Governance & Policy Enforcement platform; this console is used
 * by the internal PLCY team to manage customers, their deployed instances,
 * the AI models under governance, and the policy packs that enforce controls.
 */
import type { ChannelConfig } from './notifications'

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */
export interface Customer {
  id: string
  name: string
  domain: string
  plan: 'Enterprise' | 'Business' | 'Growth' | 'Trial'
  status: 'Active' | 'Trial' | 'Suspended' | 'Churned'
  seats: number
  instances: number
  models: number
  mrr: number
  complianceScore: number
  region: string
  csm: string
  since: string
  notes?: string
  /** Where alerts about this customer are sent. Defaults derived if unset. */
  channels?: ChannelConfig[]
}

/** Per-customer notification contacts — stored edits if present, else sensible defaults. */
export function customerChannels(c: Customer): ChannelConfig[] {
  if (c.channels && c.channels.length) return c.channels
  return [
    { id: `${c.id}_email`, type: 'Email', target: `ops@${c.domain}`, endpoint: '', desc: 'Customer ops distribution', connected: true },
    { id: `${c.id}_slack`, type: 'Slack', target: 'Slack Connect', endpoint: '', desc: 'Shared incident channel', connected: false },
    { id: `${c.id}_webhook`, type: 'Webhook', target: 'Customer ITSM', endpoint: '', desc: 'ServiceNow / Jira webhook', connected: false },
    { id: `${c.id}_pd`, type: 'PagerDuty', target: '—', endpoint: '', desc: 'Customer PagerDuty', connected: false },
  ]
}

export const customers: Customer[] = [
  { id: 'cus_meridian', name: 'Meridian Bank', domain: 'meridian.com', plan: 'Enterprise', status: 'Active', seats: 240, instances: 4, models: 18, mrr: 42000, complianceScore: 96, region: 'US-East', csm: 'Dana Cole', since: '2023-04-11' },
  { id: 'cus_helix', name: 'Helix Health', domain: 'helixhealth.io', plan: 'Enterprise', status: 'Active', seats: 180, instances: 3, models: 12, mrr: 38500, complianceScore: 98, region: 'US-West', csm: 'Marcus Ihde', since: '2023-06-02' },
  { id: 'cus_northwind', name: 'Northwind Retail', domain: 'northwind.co', plan: 'Business', status: 'Active', seats: 96, instances: 2, models: 9, mrr: 14200, complianceScore: 89, region: 'EU-Central', csm: 'Dana Cole', since: '2024-01-19' },
  { id: 'cus_atlas', name: 'Atlas Logistics', domain: 'atlaslogistics.com', plan: 'Business', status: 'Active', seats: 64, instances: 2, models: 7, mrr: 11800, complianceScore: 84, region: 'US-East', csm: 'Priya Nair', since: '2024-03-08' },
  { id: 'cus_lumen', name: 'Lumen Media', domain: 'lumen.tv', plan: 'Growth', status: 'Active', seats: 32, instances: 1, models: 5, mrr: 4900, complianceScore: 78, region: 'US-West', csm: 'Priya Nair', since: '2024-07-22' },
  { id: 'cus_ferro', name: 'Ferro Manufacturing', domain: 'ferro.industries', plan: 'Growth', status: 'Active', seats: 28, instances: 1, models: 4, mrr: 4200, complianceScore: 81, region: 'EU-Central', csm: 'Marcus Ihde', since: '2024-09-14' },
  { id: 'cus_vertex', name: 'Vertex Capital', domain: 'vertexcap.com', plan: 'Enterprise', status: 'Active', seats: 150, instances: 3, models: 11, mrr: 33000, complianceScore: 94, region: 'APAC', csm: 'Dana Cole', since: '2023-11-30' },
  { id: 'cus_saffron', name: 'Saffron Foods', domain: 'saffron.co', plan: 'Trial', status: 'Trial', seats: 12, instances: 1, models: 2, mrr: 0, complianceScore: 62, region: 'EU-West', csm: 'Priya Nair', since: '2025-06-18' },
  { id: 'cus_orbit', name: 'Orbit Telecom', domain: 'orbittel.net', plan: 'Business', status: 'Suspended', seats: 80, instances: 2, models: 6, mrr: 0, complianceScore: 71, region: 'APAC', csm: 'Marcus Ihde', since: '2024-02-27' },
  { id: 'cus_pinecrest', name: 'Pinecrest Insurance', domain: 'pinecrest.com', plan: 'Business', status: 'Active', seats: 110, instances: 2, models: 8, mrr: 16400, complianceScore: 91, region: 'US-East', csm: 'Dana Cole', since: '2024-05-06' },
]

/* ------------------------------------------------------------------ */
/* Instances                                                           */
/* ------------------------------------------------------------------ */
export interface Instance {
  id: string
  name: string
  customer: string
  environment: 'Production' | 'Staging' | 'Sandbox'
  region: string
  version: string
  status: 'Healthy' | 'Degraded' | 'Provisioning' | 'Offline'
  uptime: number
  rps: number
  policyPacks: number
}

export const instances: Instance[] = [
  { id: 'inst_mrd_prod_1', name: 'meridian-prod-us1', customer: 'Meridian Bank', environment: 'Production', region: 'us-east-1', version: 'v4.8.2', status: 'Healthy', uptime: 99.98, rps: 1240, policyPacks: 6 },
  { id: 'inst_mrd_prod_2', name: 'meridian-prod-eu1', customer: 'Meridian Bank', environment: 'Production', region: 'eu-central-1', version: 'v4.8.2', status: 'Healthy', uptime: 99.95, rps: 610, policyPacks: 6 },
  { id: 'inst_hlx_prod', name: 'helix-prod-us1', customer: 'Helix Health', environment: 'Production', region: 'us-west-2', version: 'v4.8.2', status: 'Healthy', uptime: 99.99, rps: 890, policyPacks: 7 },
  { id: 'inst_hlx_stg', name: 'helix-staging', customer: 'Helix Health', environment: 'Staging', region: 'us-west-2', version: 'v4.9.0-rc1', status: 'Degraded', uptime: 98.10, rps: 45, policyPacks: 7 },
  { id: 'inst_nw_prod', name: 'northwind-prod-eu', customer: 'Northwind Retail', environment: 'Production', region: 'eu-central-1', version: 'v4.7.9', status: 'Healthy', uptime: 99.90, rps: 420, policyPacks: 4 },
  { id: 'inst_atl_prod', name: 'atlas-prod-us1', customer: 'Atlas Logistics', environment: 'Production', region: 'us-east-1', version: 'v4.7.9', status: 'Healthy', uptime: 99.87, rps: 310, policyPacks: 4 },
  { id: 'inst_vtx_prod', name: 'vertex-prod-ap', customer: 'Vertex Capital', environment: 'Production', region: 'ap-southeast-1', version: 'v4.8.2', status: 'Healthy', uptime: 99.94, rps: 720, policyPacks: 5 },
  { id: 'inst_saf_sbx', name: 'saffron-sandbox', customer: 'Saffron Foods', environment: 'Sandbox', region: 'eu-west-1', version: 'v4.9.0-rc1', status: 'Provisioning', uptime: 0, rps: 0, policyPacks: 2 },
  { id: 'inst_orb_prod', name: 'orbit-prod-ap', customer: 'Orbit Telecom', environment: 'Production', region: 'ap-southeast-1', version: 'v4.6.4', status: 'Offline', uptime: 0, rps: 0, policyPacks: 3 },
  { id: 'inst_pin_prod', name: 'pinecrest-prod-us', customer: 'Pinecrest Insurance', environment: 'Production', region: 'us-east-1', version: 'v4.8.2', status: 'Healthy', uptime: 99.92, rps: 540, policyPacks: 5 },
]

/* ------------------------------------------------------------------ */
/* AI Models                                                           */
/* ------------------------------------------------------------------ */
export interface AIModel {
  id: string
  name: string
  provider: string
  type: 'LLM' | 'Vision' | 'Embedding' | 'Classifier' | 'Speech'
  customer: string
  status: 'Active' | 'Review' | 'Deprecated' | 'Blocked'
  risk: 'Low' | 'Medium' | 'High'
  requests: number
  version: string
}

export const models: AIModel[] = [
  { id: 'mdl_1', name: 'GPT-4 Turbo', provider: 'OpenAI', type: 'LLM', customer: 'Meridian Bank', status: 'Active', risk: 'Medium', requests: 1_240_000, version: '2024-04' },
  { id: 'mdl_2', name: 'Claude Opus 4', provider: 'Anthropic', type: 'LLM', customer: 'Helix Health', status: 'Active', risk: 'Low', requests: 980_000, version: '4.0' },
  { id: 'mdl_3', name: 'Llama 3.1 70B', provider: 'Meta', type: 'LLM', customer: 'Northwind Retail', status: 'Active', risk: 'Medium', requests: 420_000, version: '3.1' },
  { id: 'mdl_4', name: 'text-embedding-3-large', provider: 'OpenAI', type: 'Embedding', customer: 'Meridian Bank', status: 'Active', risk: 'Low', requests: 3_100_000, version: 'v3' },
  { id: 'mdl_5', name: 'FraudScan-v2', provider: 'In-house', type: 'Classifier', customer: 'Vertex Capital', status: 'Review', risk: 'High', requests: 210_000, version: '2.3' },
  { id: 'mdl_6', name: 'Whisper Large v3', provider: 'OpenAI', type: 'Speech', customer: 'Atlas Logistics', status: 'Active', risk: 'Low', requests: 88_000, version: 'v3' },
  { id: 'mdl_7', name: 'MedVision-CT', provider: 'In-house', type: 'Vision', customer: 'Helix Health', status: 'Review', risk: 'High', requests: 54_000, version: '1.4' },
  { id: 'mdl_8', name: 'Gemini 1.5 Pro', provider: 'Google', type: 'LLM', customer: 'Lumen Media', status: 'Active', risk: 'Medium', requests: 310_000, version: '1.5' },
  { id: 'mdl_9', name: 'Legacy-Sentiment', provider: 'In-house', type: 'Classifier', customer: 'Orbit Telecom', status: 'Deprecated', risk: 'Medium', requests: 12_000, version: '0.9' },
  { id: 'mdl_10', name: 'ShadowGPT (unapproved)', provider: 'Unknown', type: 'LLM', customer: 'Saffron Foods', status: 'Blocked', risk: 'High', requests: 400, version: '—' },
]

/* ------------------------------------------------------------------ */
/* Policy Packs                                                        */
/* ------------------------------------------------------------------ */
export interface PolicyPack {
  id: string
  name: string
  category: 'Privacy' | 'Security' | 'Safety' | 'Compliance' | 'Fairness'
  version: string
  status: 'Published' | 'Draft' | 'Deprecated'
  rules: number
  appliedTo: number
  frameworks: string[]
  updated: string
  description: string
}

export const policyPacks: PolicyPack[] = [
  { id: 'pp_pii', name: 'PII Redaction Standard', category: 'Privacy', version: 'v3.2', status: 'Published', rules: 42, appliedTo: 9, frameworks: ['GDPR', 'CCPA'], updated: '2025-06-20', description: 'Detects and redacts personal identifiers in prompts and completions.' },
  { id: 'pp_finreg', name: 'Financial Services Guardrails', category: 'Compliance', version: 'v2.8', status: 'Published', rules: 61, appliedTo: 4, frameworks: ['SOX', 'FINRA', 'SR 11-7'], updated: '2025-06-11', description: 'Model risk management controls for regulated financial workloads.' },
  { id: 'pp_hipaa', name: 'HIPAA PHI Protection', category: 'Privacy', version: 'v4.0', status: 'Published', rules: 55, appliedTo: 3, frameworks: ['HIPAA'], updated: '2025-05-28', description: 'Protected health information handling and de-identification.' },
  { id: 'pp_prompt', name: 'Prompt Injection Defense', category: 'Security', version: 'v1.9', status: 'Published', rules: 28, appliedTo: 10, frameworks: ['OWASP LLM Top 10'], updated: '2025-06-30', description: 'Blocks jailbreaks, injection, and data exfiltration attempts.' },
  { id: 'pp_bias', name: 'Bias & Fairness Monitor', category: 'Fairness', version: 'v2.1', status: 'Published', rules: 19, appliedTo: 6, frameworks: ['EU AI Act', 'NIST AI RMF'], updated: '2025-06-04', description: 'Continuous fairness evaluation across protected attributes.' },
  { id: 'pp_toxic', name: 'Content Safety Filter', category: 'Safety', version: 'v3.5', status: 'Published', rules: 34, appliedTo: 8, frameworks: ['Trust & Safety'], updated: '2025-06-22', description: 'Toxicity, self-harm, and violence classification thresholds.' },
  { id: 'pp_euaiact', name: 'EU AI Act Conformity', category: 'Compliance', version: 'v1.2', status: 'Draft', rules: 47, appliedTo: 0, frameworks: ['EU AI Act'], updated: '2025-07-01', description: 'High-risk system obligations and technical documentation.' },
  { id: 'pp_legacy', name: 'Legacy Keyword Blocklist', category: 'Safety', version: 'v0.8', status: 'Deprecated', rules: 12, appliedTo: 1, frameworks: [], updated: '2024-10-15', description: 'Superseded by Content Safety Filter v3.5.' },
]

/* ------------------------------------------------------------------ */
/* Incidents                                                           */
/* ------------------------------------------------------------------ */
export interface Incident {
  id: string
  title: string
  customer: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Open' | 'Investigating' | 'Resolved'
  opened: string
  owner: string
  category: string
}

export const incidents: Incident[] = [
  { id: 'INC-2041', title: 'PII leak detected in completion logs', customer: 'Northwind Retail', severity: 'Critical', status: 'Investigating', opened: '2025-07-05 14:22', owner: 'M. Ihde', category: 'Data Privacy' },
  { id: 'INC-2039', title: 'Prompt injection bypass on staging', customer: 'Helix Health', severity: 'High', status: 'Open', opened: '2025-07-05 09:10', owner: 'Security', category: 'Security' },
  { id: 'INC-2036', title: 'Elevated hallucination rate — FraudScan-v2', customer: 'Vertex Capital', severity: 'High', status: 'Investigating', opened: '2025-07-04 18:47', owner: 'D. Cole', category: 'Model Quality' },
  { id: 'INC-2030', title: 'Policy pack sync lag > 5m', customer: 'Atlas Logistics', severity: 'Medium', status: 'Resolved', opened: '2025-07-03 11:05', owner: 'Platform', category: 'Reliability' },
  { id: 'INC-2028', title: 'Fairness threshold breach (loan model)', customer: 'Pinecrest Insurance', severity: 'High', status: 'Resolved', opened: '2025-07-02 16:30', owner: 'P. Nair', category: 'Fairness' },
  { id: 'INC-2024', title: 'Unapproved model detected (ShadowGPT)', customer: 'Saffron Foods', severity: 'Medium', status: 'Resolved', opened: '2025-07-01 08:12', owner: 'Security', category: 'Shadow AI' },
]

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */
export interface AuditEntry {
  id: string
  actor: string
  action: string
  target: string
  category: string
  ip: string
  time: string
  result: 'Success' | 'Denied'
}

export const auditLog: AuditEntry[] = [
  { id: 'a1', actor: 'ci-bot@plcy.app', action: 'image.promote', target: 'plcy/policy-engine:v4.8.2', category: 'supply-chain', ip: '10.8.0.4', time: '2026-07-09 06:12:44', result: 'Success' },
  { id: 'a2', actor: 'marcus.ihde@plcy.app', action: 'release.stage', target: 'Helix Health → v4.8.2', category: 'release', ip: '10.4.1.9', time: '2026-07-09 05:58:10', result: 'Success' },
  { id: 'a3', actor: 'marcus.ihde@plcy.app', action: 'workload.sync', target: 'plcy-model-gateway → v4.8.2 · Atlas Logistics', category: 'operations', ip: '10.4.1.9', time: '2026-07-09 05:41:22', result: 'Success' },
  { id: 'a4', actor: 'priya.nair@plcy.app', action: 'image.quarantine', target: 'plcy/data-pipeline:v4.9.0-rc1', category: 'supply-chain', ip: '10.4.2.7', time: '2026-07-09 04:33:07', result: 'Success' },
  { id: 'a5', actor: 'jack@plcy.app', action: 'notification.rule.create', target: 'Billing past due (Billing)', category: 'notifications', ip: '10.4.1.2', time: '2026-07-09 03:20:55', result: 'Success' },
  { id: 'a6', actor: 'system', action: 'sla.breach.detected', target: 'Orbit Telecom · 96.2% uptime', category: 'reliability', ip: '—', time: '2026-07-09 02:47:31', result: 'Success' },
  { id: 'a7', actor: 'nora.fields@plcy.app', action: 'invoice.mark-paid', target: 'INV-2026-0706 · Meridian Bank', category: 'billing', ip: '10.4.3.5', time: '2026-07-08 22:14:09', result: 'Success' },
  { id: 'a8', actor: 'tom.becker@plcy.app', action: 'cluster.config.update', target: 'Vertex Capital cluster', category: 'operations', ip: '73.55.20.8', time: '2026-07-08 21:02:40', result: 'Denied' },
  { id: 'a9', actor: 'dana.cole@plcy.app', action: 'customer.channel.update', target: 'Northwind Retail · Slack', category: 'customer', ip: '10.4.1.22', time: '2026-07-08 19:48:17', result: 'Success' },
  { id: 'a10', actor: 'jack@plcy.app', action: 'employee.access.update', target: 'Sofia Alvarez → Analyst', category: 'team', ip: '10.4.1.2', time: '2026-07-08 18:31:52', result: 'Success' },
  { id: 'a11', actor: 'priya.nair@plcy.app', action: 'residency.policy.update', target: 'EU-Central · block cross-border', category: 'sovereignty', ip: '10.4.2.7', time: '2026-07-08 17:09:23', result: 'Success' },
  { id: 'a12', actor: 'priya.nair@plcy.app', action: 'transfer.approve', target: 'TR-2019 · Helix → de-sov-1', category: 'sovereignty', ip: '10.4.2.7', time: '2026-07-08 16:55:41', result: 'Success' },
  { id: 'a13', actor: 'external.integration', action: 'api.key.rotate', target: 'helix-prod-us1', category: 'security', ip: '52.9.44.10', time: '2026-07-08 15:20:48', result: 'Denied' },
  { id: 'a14', actor: 'liang.wei@plcy.app', action: 'helm.apply', target: 'plcy-platform · Vertex Capital', category: 'operations', ip: '203.116.8.44', time: '2026-07-08 14:12:30', result: 'Success' },
  { id: 'a15', actor: 'liang.wei@plcy.app', action: 'namespace.guardrails.update', target: 'plcy-system · Saffron Foods', category: 'operations', ip: '203.116.8.44', time: '2026-07-08 13:47:05', result: 'Success' },
  { id: 'a16', actor: 'dana.cole@plcy.app', action: 'user.invite', target: 'analyst@meridian.com', category: 'team', ip: '10.4.1.22', time: '2026-07-08 12:44:02', result: 'Success' },
  { id: 'a17', actor: 'jack@plcy.app', action: 'break-glass.request', target: 'root · Helix Health (air-gapped)', category: 'access', ip: '10.4.1.2', time: '2026-07-08 11:30:18', result: 'Success' },
  { id: 'a18', actor: 'marcus.ihde@plcy.app', action: 'customer.suspend', target: 'Orbit Telecom', category: 'customer', ip: '10.4.1.9', time: '2026-07-08 10:15:33', result: 'Success' },
  { id: 'a19', actor: 'priya.nair@plcy.app', action: 'model.block', target: 'ShadowGPT (unapproved)', category: 'governance', ip: '10.4.2.7', time: '2026-07-08 08:52:11', result: 'Success' },
  { id: 'a20', actor: 'sofia.alvarez@plcy.app', action: 'model.register', target: 'FraudScan-v3 · Vertex Capital', category: 'governance', ip: '68.12.4.90', time: '2026-07-08 08:20:44', result: 'Success' },
  { id: 'a21', actor: 'jack@plcy.app', action: 'enforcement.mode.change', target: 'Prompt Injection Defense → block', category: 'security', ip: '10.4.1.2', time: '2026-07-07 22:03:19', result: 'Success' },
  { id: 'a22', actor: 'dana.cole@plcy.app', action: 'policy_pack.publish', target: 'PII Redaction Standard v3.2', category: 'governance', ip: '10.4.1.22', time: '2026-07-07 20:41:02', result: 'Success' },
  { id: 'a23', actor: 'sofia.alvarez@plcy.app', action: 'privileged.access.request', target: 'Meridian Bank prod', category: 'access', ip: '68.12.4.90', time: '2026-07-07 19:22:56', result: 'Denied' },
  { id: 'a24', actor: 'system', action: 'backup.completed', target: 'meridian-prod-us1 · daily snapshot', category: 'operations', ip: '—', time: '2026-07-07 06:30:00', result: 'Success' },
  { id: 'a25', actor: 'system', action: 'compliance.report.generate', target: 'Q2 SOC 2 evidence', category: 'system', ip: '—', time: '2026-07-07 06:00:00', result: 'Success' },
]

/* ------------------------------------------------------------------ */
/* Time-series & chart data                                            */
/* ------------------------------------------------------------------ */
export const usageTrend = [
  { day: 'Jun 30', requests: 4200, tokens: 640000 },
  { day: 'Jul 1', requests: 5050, tokens: 760000 },
  { day: 'Jul 2', requests: 4780, tokens: 705000 },
  { day: 'Jul 3', requests: 5480, tokens: 830000 },
  { day: 'Jul 4', requests: 6220, tokens: 940000 },
  { day: 'Jul 5', requests: 5890, tokens: 890000 },
  { day: 'Jul 6', requests: 6410, tokens: 970000 },
]

export const riskDistribution = [
  { name: 'Low Risk', value: 65, color: '#10b981' },
  { name: 'Medium Risk', value: 25, color: '#f59e0b' },
  { name: 'High Risk', value: 10, color: '#ef4444' },
]

export const complianceScores = [
  { name: 'Data Privacy', score: 96 },
  { name: 'Model Transparency', score: 88 },
  { name: 'Bias Detection', score: 92 },
  { name: 'Security Standards', score: 98 },
  { name: 'User Consent', score: 85 },
]

export const recentActivity = [
  { title: 'New model deployed', detail: 'GPT-4 Turbo · Meridian Bank', time: '2 hours ago', tone: 'green' as const },
  { title: 'Policy pack published', detail: 'PII Redaction Standard v3.2', time: '4 hours ago', tone: 'blue' as const },
  { title: 'Customer suspended', detail: 'Orbit Telecom · billing hold', time: '6 hours ago', tone: 'red' as const },
  { title: 'Critical incident opened', detail: 'INC-2041 · PII leak · Northwind', time: '8 hours ago', tone: 'orange' as const },
  { title: 'Instance provisioned', detail: 'saffron-sandbox · eu-west-1', time: '1 day ago', tone: 'purple' as const },
]

/* ------------------------------------------------------------------ */
/* Aggregate helpers                                                   */
/* ------------------------------------------------------------------ */
export const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n)
export const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
export const fmtCompact = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export const totals = {
  customers: customers.length,
  activeCustomers: customers.filter((c) => c.status === 'Active').length,
  instances: instances.length,
  healthyInstances: instances.filter((i) => i.status === 'Healthy').length,
  models: models.length,
  policyPacks: policyPacks.filter((p) => p.status === 'Published').length,
  mrr: customers.reduce((s, c) => s + c.mrr, 0),
  openIncidents: incidents.filter((i) => i.status !== 'Resolved').length,
  avgCompliance: Math.round(customers.reduce((s, c) => s + c.complianceScore, 0) / customers.length),
  dailyRequests: usageTrend[usageTrend.length - 1].requests,
  dailyTokens: usageTrend[usageTrend.length - 1].tokens,
}
