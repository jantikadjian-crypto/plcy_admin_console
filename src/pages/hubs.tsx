import {
  Receipt, CreditCard, HeartPulse, Wallet, BadgeCheck,
  Rocket, Boxes, Cpu, Radar,
  Bot, Database, Route, Tags,
  Package, Code2, SlidersHorizontal,
  Globe, ShieldCheck, ArrowLeftRight, Network, Inbox,
  Lock, Fingerprint, ScrollText, PackageCheck,
  Target, Swords, FlaskConical, Crosshair, ClipboardCheck,
} from 'lucide-react'
import { Hub } from '@/components/Hub'
import Billing from './Billing'
import BillingIntegration from './BillingIntegration'
import BillingHealth from './BillingHealth'
import FinOps from './FinOps'
import Licensing from './Licensing'
import Releases from './Releases'
import Bundles from './Bundles'
import Clusters from './Clusters'
import FleetPosture from './FleetPosture'
import Models from './Models'
import ModelRegistry from './ModelRegistry'
import Routing from './Routing'
import DataClassification from './DataClassification'
import PolicyPacks from './PolicyPacks'
import PolicyEditor from './PolicyEditor'
import Enforcement from './Enforcement'
import Regions from './Regions'
import Residency from './Residency'
import Transfers from './Transfers'
import Subprocessors from './Subprocessors'
import DSAR from './DSAR'
import AdminSecurity from './AdminSecurity'
import PrivilegedAccess from './PrivilegedAccess'
import AuditLog from './AuditLog'
import SupplyChain from './SupplyChain'
import Registry from './Registry'
import { Efficacy } from './Efficacy'
import { RedTeam } from './RedTeam'
import { AttackLibrary } from './AttackLibrary'
import { EvalSuites } from './EvalSuites'
import { ModelScorecards } from './ModelScorecards'
import { ReviewQueue } from './ReviewQueue'

export function BillingHub() {
  return (
    <Hub
      defaultKey="usage"
      tabs={[
        { key: 'usage', label: 'Usage & Invoices', icon: Receipt, element: <Billing /> },
        { key: 'stripe', label: 'Stripe Integration', icon: CreditCard, element: <BillingIntegration /> },
        { key: 'health', label: 'Health', icon: HeartPulse, element: <BillingHealth /> },
        { key: 'finops', label: 'Cost & Margin', icon: Wallet, element: <FinOps /> },
        { key: 'licensing', label: 'Licensing', icon: BadgeCheck, element: <Licensing /> },
      ]}
    />
  )
}

export function ReleasesHub() {
  return (
    <Hub
      defaultKey="releases"
      tabs={[
        { key: 'releases', label: 'Releases', icon: Rocket, element: <Releases /> },
        { key: 'bundles', label: 'Update Bundles', icon: Boxes, element: <Bundles /> },
      ]}
    />
  )
}

export function ClustersHub() {
  return (
    <Hub
      defaultKey="health"
      tabs={[
        { key: 'health', label: 'Cluster Health', icon: Cpu, element: <Clusters /> },
        { key: 'posture', label: 'Fleet Posture', icon: Radar, element: <FleetPosture /> },
      ]}
    />
  )
}

export function ModelsHub() {
  return (
    <Hub
      defaultKey="models"
      tabs={[
        { key: 'models', label: 'AI Models', icon: Bot, element: <Models /> },
        { key: 'registry', label: 'Model Registry', icon: Database, element: <ModelRegistry /> },
        { key: 'routing', label: 'Model Routing', icon: Route, element: <Routing /> },
        { key: 'classification', label: 'Data Classification', icon: Tags, element: <DataClassification /> },
      ]}
    />
  )
}

export function PolicyHub() {
  return (
    <Hub
      defaultKey="packs"
      tabs={[
        { key: 'packs', label: 'Policy Packs', icon: Package, element: <PolicyPacks /> },
        { key: 'editor', label: 'Policy Editor', icon: Code2, element: <PolicyEditor /> },
        { key: 'enforcement', label: 'Enforcement', icon: SlidersHorizontal, element: <Enforcement /> },
      ]}
    />
  )
}

export function EvaluationsHub() {
  return (
    <Hub
      defaultKey="efficacy"
      tabs={[
        { key: 'efficacy', label: 'Efficacy', icon: Target, element: <Efficacy /> },
        { key: 'review', label: 'Review Queue', icon: ClipboardCheck, element: <ReviewQueue /> },
        { key: 'redteam', label: 'Red-Team', icon: Swords, element: <RedTeam /> },
        { key: 'library', label: 'Attack Library', icon: Crosshair, element: <AttackLibrary /> },
        { key: 'scorecards', label: 'Model Scorecards', icon: Bot, element: <ModelScorecards /> },
        { key: 'suites', label: 'Eval Suites', icon: FlaskConical, element: <EvalSuites /> },
      ]}
    />
  )
}

export function ResidencyHub() {
  return (
    <Hub
      defaultKey="regions"
      tabs={[
        { key: 'regions', label: 'Regions', icon: Globe, element: <Regions /> },
        { key: 'controls', label: 'Residency Controls', icon: ShieldCheck, element: <Residency /> },
        { key: 'transfers', label: 'Data Transfers', icon: ArrowLeftRight, element: <Transfers /> },
        { key: 'subprocessors', label: 'Sub-processors', icon: Network, element: <Subprocessors /> },
        { key: 'dsar', label: 'Data Requests', icon: Inbox, element: <DSAR /> },
      ]}
    />
  )
}

export function SecurityHub() {
  return (
    <Hub
      defaultKey="security"
      tabs={[
        { key: 'security', label: 'Admin Security', icon: Lock, element: <AdminSecurity /> },
        { key: 'privileged', label: 'Privileged Access', icon: Fingerprint, element: <PrivilegedAccess /> },
        { key: 'audit', label: 'Audit Log', icon: ScrollText, element: <AuditLog /> },
      ]}
    />
  )
}

export function SupplyChainHub() {
  return (
    <Hub
      defaultKey="supply"
      tabs={[
        { key: 'supply', label: 'Supply Chain', icon: PackageCheck, element: <SupplyChain /> },
        { key: 'registry', label: 'Container Registry', icon: Boxes, element: <Registry /> },
      ]}
    />
  )
}
