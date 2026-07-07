import {
  LayoutDashboard,
  Users,
  Server,
  Bot,
  Database,
  ShieldCheck,
  Code2,
  SlidersHorizontal,
  Tags,
  Activity,
  FileBarChart,
  AlertOctagon,
  TriangleAlert,
  ScrollText,
  Lock,
  TerminalSquare,
  Crown,
  Settings,
  Package,
  Rocket,
  Boxes,
  Cpu,
  BadgeCheck,
  Globe,
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
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Customers', to: '/customers', icon: Users },
      { label: 'Instances', to: '/instances', icon: Server },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { label: 'Releases', to: '/releases', icon: Rocket },
      { label: 'Update Bundles', to: '/bundles', icon: Boxes },
      { label: 'Cluster Health', to: '/clusters', icon: Cpu },
      { label: 'Licensing', to: '/licensing', icon: BadgeCheck },
    ],
  },
  {
    title: 'Sovereignty',
    items: [{ label: 'Regions', to: '/regions', icon: Globe }],
  },
  {
    title: 'Governance',
    items: [
      { label: 'AI Models', to: '/models', icon: Bot },
      { label: 'Model Registry', to: '/model-registry', icon: Database },
      { label: 'Data Classification', to: '/data-classification', icon: Tags },
    ],
  },
  {
    title: 'Policy',
    items: [
      { label: 'Policy Packs', to: '/policy-packs', icon: Package },
      { label: 'Policy Editor', to: '/policy-editor', icon: Code2 },
      { label: 'Enforcement Controls', to: '/enforcement', icon: SlidersHorizontal },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Observability', to: '/observability', icon: Activity },
      { label: 'Compliance Reporting', to: '/compliance', icon: FileBarChart },
      { label: 'Incident Management', to: '/incidents', icon: AlertOctagon },
      { label: 'Risk Assessment', to: '/risk', icon: TriangleAlert },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Audit Log', to: '/audit-log', icon: ScrollText },
      { label: 'Admin Security', to: '/admin-security', icon: Lock },
      { label: 'Developer Tools', to: '/developer-tools', icon: TerminalSquare },
      { label: 'Super Admin', to: '/super-admin', icon: Crown },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export const flatNav = navGroups.flatMap((g) => g.items)
export { ShieldCheck }
