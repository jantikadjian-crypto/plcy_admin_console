import {
  LayoutDashboard,
  LayoutGrid,
  Users,
  Server,
  Bot,
  ShieldCheck,
  Activity,
  FileBarChart,
  AlertOctagon,
  TriangleAlert,
  Lock,
  TerminalSquare,
  Crown,
  Settings,
  Package,
  Rocket,
  Cpu,
  Globe,
  ServerCog,
  DatabaseBackup,
  PackageCheck,
  BellRing,
  Layers,
  Gauge,
  Receipt,
  UserCog,
  BadgeDollarSign,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Fleet Overview', to: '/fleet', icon: LayoutGrid },
      { label: 'Reports', to: '/reports', icon: FileBarChart },
    ],
  },
  {
    title: 'Customers & Billing',
    items: [
      { label: 'Customers', to: '/customers', icon: Users },
      { label: 'Instances', to: '/instances', icon: Server },
      { label: 'Pricing & Plans', to: '/pricing', icon: BadgeDollarSign },
      { label: 'Billing', to: '/billing', icon: Receipt },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { label: 'Provisioning', to: '/provisioning', icon: ServerCog },
      { label: 'Bulk Operations', to: '/bulk-ops', icon: Layers },
      { label: 'Releases', to: '/releases', icon: Rocket },
      { label: 'Clusters', to: '/clusters', icon: Cpu },
      { label: 'Backups & DR', to: '/backups', icon: DatabaseBackup },
    ],
  },
  {
    title: 'Governance',
    items: [
      { label: 'Models', to: '/models', icon: Bot },
      { label: 'Policy', to: '/policy', icon: Package },
      { label: 'Residency', to: '/residency', icon: Globe },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Observability', to: '/observability', icon: Activity },
      { label: 'Compliance Reporting', to: '/compliance', icon: FileBarChart },
      { label: 'Incident Management', to: '/incidents', icon: AlertOctagon },
      { label: 'SLA & Maintenance', to: '/sla', icon: Gauge },
      { label: 'Risk Assessment', to: '/risk', icon: TriangleAlert },
      { label: 'Notifications', to: '/notifications', icon: BellRing },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Security', to: '/admin-security', icon: Lock },
      { label: 'Supply Chain', to: '/supply-chain', icon: PackageCheck },
      { label: 'Team', to: '/team', icon: UserCog },
      { label: 'Developer Tools', to: '/developer-tools', icon: TerminalSquare },
      { label: 'Documentation', to: '/docs', icon: BookOpen },
      { label: 'Super Admin', to: '/super-admin', icon: Crown },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export const flatNav = navGroups.flatMap((g) => g.items)

/**
 * Individual pages that now live inside a section hub as a `?tab=`. Kept here so
 * the ⌘K search can still find each one by its familiar name and deep-link to
 * the right tab, even though the sidebar shows only the hub.
 */
export const hubSubPages: { label: string; to: string }[] = [
  { label: 'Billing & Usage', to: '/billing?tab=usage' },
  { label: 'Stripe Integration', to: '/billing?tab=stripe' },
  { label: 'Billing Health', to: '/billing?tab=health' },
  { label: 'Cost & Margin (FinOps)', to: '/billing?tab=finops' },
  { label: 'Licensing', to: '/billing?tab=licensing' },
  { label: 'Releases', to: '/releases?tab=releases' },
  { label: 'Update Bundles', to: '/releases?tab=bundles' },
  { label: 'Cluster Health', to: '/clusters?tab=health' },
  { label: 'Fleet Posture', to: '/clusters?tab=posture' },
  { label: 'AI Models', to: '/models?tab=models' },
  { label: 'Model Registry', to: '/models?tab=registry' },
  { label: 'Model Routing', to: '/models?tab=routing' },
  { label: 'Data Classification', to: '/models?tab=classification' },
  { label: 'Policy Packs', to: '/policy?tab=packs' },
  { label: 'Policy Editor', to: '/policy?tab=editor' },
  { label: 'Enforcement Controls', to: '/policy?tab=enforcement' },
  { label: 'Regions', to: '/residency?tab=regions' },
  { label: 'Residency Controls', to: '/residency?tab=controls' },
  { label: 'Data Transfers', to: '/residency?tab=transfers' },
  { label: 'Sub-processors', to: '/residency?tab=subprocessors' },
  { label: 'Data Requests (DSAR)', to: '/residency?tab=dsar' },
  { label: 'Admin Security', to: '/admin-security?tab=security' },
  { label: 'Privileged Access', to: '/admin-security?tab=privileged' },
  { label: 'Audit Log', to: '/admin-security?tab=audit' },
  { label: 'Supply Chain', to: '/supply-chain?tab=supply' },
  { label: 'Container Registry', to: '/supply-chain?tab=registry' },
]

export { ShieldCheck }
