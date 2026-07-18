import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FleetOverview from './pages/FleetOverview'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import EmployeeDetail from './pages/EmployeeDetail'
import Instances from './pages/Instances'
import ClusterDetail from './pages/ClusterDetail'
import Pricing from './pages/Pricing'
import Provisioning from './pages/Provisioning'
import BulkOps from './pages/BulkOps'
import Sla from './pages/Sla'
import Backups from './pages/Backups'
import Observability from './pages/Observability'
import Compliance from './pages/Compliance'
import Incidents from './pages/Incidents'
import Risk from './pages/Risk'
import Notifications from './pages/Notifications'
import DeveloperTools from './pages/DeveloperTools'
import SuperAdmin from './pages/SuperAdmin'
import Settings from './pages/Settings'
import Docs from './pages/Docs'
import Reports from './pages/Reports'
import PostureReport from './pages/PostureReport'
import ComplianceReport from './pages/ComplianceReport'
import SecurityReport from './pages/SecurityReport'
import SlaReport from './pages/SlaReport'
import FinopsReport from './pages/FinopsReport'
import IncidentReport from './pages/IncidentReport'
import DsarReport from './pages/DsarReport'
import CustomerReport from './pages/CustomerReport'
import NotFound from './pages/NotFound'
import {
  BillingHub,
  ReleasesHub,
  ClustersHub,
  ModelsHub,
  PolicyHub,
  ResidencyHub,
  SecurityHub,
  SupplyChainHub,
} from './pages/hubs'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/fleet" element={<FleetOverview />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/team" element={<Navigate to="/settings?tab=Team" replace />} />
        <Route path="/team/:id" element={<EmployeeDetail />} />
        <Route path="/instances" element={<Instances />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/provisioning" element={<Provisioning />} />
        <Route path="/bulk-ops" element={<BulkOps />} />
        <Route path="/backups" element={<Backups />} />
        <Route path="/sla" element={<Sla />} />
        <Route path="/observability" element={<Observability />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/risk" element={<Risk />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/developer-tools" element={<DeveloperTools />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/settings" element={<Settings />} />

        {/* Documentation */}
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/glossary" element={<Docs />} />
        <Route path="/docs/:slug" element={<Docs />} />

        {/* Reports */}
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/posture" element={<PostureReport />} />
        <Route path="/reports/compliance" element={<ComplianceReport />} />
        <Route path="/reports/security" element={<SecurityReport />} />
        <Route path="/reports/sla" element={<SlaReport />} />
        <Route path="/reports/finops" element={<FinopsReport />} />
        <Route path="/reports/incidents" element={<IncidentReport />} />
        <Route path="/reports/dsar" element={<DsarReport />} />
        <Route path="/reports/customer/:id" element={<CustomerReport />} />

        {/* Section hubs (tabbed) */}
        <Route path="/billing" element={<BillingHub />} />
        <Route path="/releases" element={<ReleasesHub />} />
        <Route path="/clusters" element={<ClustersHub />} />
        <Route path="/clusters/:id" element={<ClusterDetail />} />
        <Route path="/models" element={<ModelsHub />} />
        <Route path="/policy" element={<PolicyHub />} />
        <Route path="/residency" element={<ResidencyHub />} />
        <Route path="/admin-security" element={<SecurityHub />} />
        <Route path="/supply-chain" element={<SupplyChainHub />} />

        {/* Redirects — old standalone routes now live as hub tabs */}
        <Route path="/billing-integration" element={<Navigate to="/billing?tab=stripe" replace />} />
        <Route path="/billing-health" element={<Navigate to="/billing?tab=health" replace />} />
        <Route path="/finops" element={<Navigate to="/billing?tab=finops" replace />} />
        <Route path="/licensing" element={<Navigate to="/billing?tab=licensing" replace />} />
        <Route path="/bundles" element={<Navigate to="/releases?tab=bundles" replace />} />
        <Route path="/fleet-posture" element={<Navigate to="/clusters?tab=posture" replace />} />
        <Route path="/model-registry" element={<Navigate to="/models?tab=registry" replace />} />
        <Route path="/routing" element={<Navigate to="/models?tab=routing" replace />} />
        <Route path="/data-classification" element={<Navigate to="/models?tab=classification" replace />} />
        <Route path="/policy-packs" element={<Navigate to="/policy?tab=packs" replace />} />
        <Route path="/policy-editor" element={<Navigate to="/policy?tab=editor" replace />} />
        <Route path="/enforcement" element={<Navigate to="/policy?tab=enforcement" replace />} />
        <Route path="/regions" element={<Navigate to="/residency?tab=regions" replace />} />
        <Route path="/transfers" element={<Navigate to="/residency?tab=transfers" replace />} />
        <Route path="/subprocessors" element={<Navigate to="/residency?tab=subprocessors" replace />} />
        <Route path="/dsar" element={<Navigate to="/residency?tab=dsar" replace />} />
        <Route path="/privileged-access" element={<Navigate to="/admin-security?tab=privileged" replace />} />
        <Route path="/audit-log" element={<Navigate to="/admin-security?tab=audit" replace />} />
        <Route path="/registry" element={<Navigate to="/supply-chain?tab=registry" replace />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
