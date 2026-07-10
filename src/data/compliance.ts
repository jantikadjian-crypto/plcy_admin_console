/**
 * Compliance framework coverage and control evidence. Shared by the Compliance
 * Reporting page and the downloadable Compliance Attestation report so both read
 * one source of truth.
 */
export type FrameworkStatus = 'Compliant' | 'In progress' | 'Gap'

export interface Framework {
  name: string
  score: number
  status: FrameworkStatus
  passed: number
  total: number
}

export interface ComplianceControl {
  id: string
  framework: string
  description: string
  status: string
  owner: string
  checked: string
}

export const frameworks: Framework[] = [
  { name: 'SOC 2 Type II', score: 98, status: 'Compliant', passed: 61, total: 62 },
  { name: 'GDPR', score: 96, status: 'Compliant', passed: 48, total: 50 },
  { name: 'HIPAA', score: 94, status: 'Compliant', passed: 42, total: 45 },
  { name: 'EU AI Act', score: 71, status: 'In progress', passed: 34, total: 48 },
  { name: 'ISO/IEC 42001', score: 82, status: 'In progress', passed: 39, total: 47 },
  { name: 'NIST AI RMF', score: 58, status: 'Gap', passed: 26, total: 45 },
]

export const complianceControls: ComplianceControl[] = [
  { id: 'CC6.1', framework: 'SOC 2', description: 'Logical access controls restrict governed model endpoints', status: 'Passed', owner: 'Security', checked: '2025-07-04' },
  { id: 'CC7.2', framework: 'SOC 2', description: 'Continuous monitoring of anomalous inference traffic', status: 'Passed', owner: 'Platform', checked: '2025-07-05' },
  { id: 'Art.30', framework: 'GDPR', description: 'Records of processing activities for AI workloads', status: 'Passed', owner: 'D. Cole', checked: '2025-07-02' },
  { id: 'Art.35', framework: 'GDPR', description: 'Data protection impact assessment on file', status: 'Passed', owner: 'Legal', checked: '2025-06-28' },
  { id: '164.312', framework: 'HIPAA', description: 'PHI de-identification in prompts and completions', status: 'Passed', owner: 'M. Ihde', checked: '2025-07-01' },
  { id: 'AIA-9', framework: 'EU AI Act', description: 'High-risk system technical documentation complete', status: 'Failed', owner: 'P. Nair', checked: '2025-07-03' },
  { id: 'AIA-14', framework: 'EU AI Act', description: 'Human oversight mechanisms for automated decisions', status: 'Failed', owner: 'Governance', checked: '2025-07-03' },
  { id: 'A.8.3', framework: 'ISO 42001', description: 'AI system impact assessment lifecycle documented', status: 'Passed', owner: 'Governance', checked: '2025-06-30' },
  { id: 'MAP-2', framework: 'NIST AI RMF', description: 'Context of model deployment mapped and classified', status: 'Failed', owner: 'D. Cole', checked: '2025-07-04' },
  { id: 'GOV-4', framework: 'NIST AI RMF', description: 'Third-party model risk governance policy enforced', status: 'N/A', owner: 'Security', checked: '2025-06-25' },
]

export const complianceTotals = {
  passed: frameworks.reduce((s, f) => s + f.passed, 0),
  total: frameworks.reduce((s, f) => s + f.total, 0),
  overall: Math.round(frameworks.reduce((s, f) => s + f.score, 0) / frameworks.length),
  compliant: frameworks.filter((f) => f.status === 'Compliant').length,
  gaps: frameworks.filter((f) => f.status === 'Gap').length,
}

export const frameworkStatusTone: Record<FrameworkStatus, 'green' | 'orange' | 'red'> = {
  Compliant: 'green',
  'In progress': 'orange',
  Gap: 'red',
}

export function scoreTone(score: number): 'green' | 'blue' | 'orange' | 'red' {
  if (score >= 90) return 'green'
  if (score >= 80) return 'blue'
  if (score >= 65) return 'orange'
  return 'red'
}
