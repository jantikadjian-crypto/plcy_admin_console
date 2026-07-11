import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FleetOverview from './pages/FleetOverview'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Team from './pages/Team'
import EmployeeDetail from './pages/EmployeeDetail'
import Instances from './pages/Instances'
import Releases from './pages/Releases'
import Bundles from './pages/Bundles'
import Clusters from './pages/Clusters'
import ClusterDetail from './pages/ClusterDetail'
import FleetPosture from './pages/FleetPosture'
import Licensing from './pages/Licensing'
import Regions from './pages/Regions'
import Residency from './pages/Residency'
import Routing from './pages/Routing'
import Transfers from './pages/Transfers'
import Subprocessors from './pages/Subprocessors'
import DSAR from './pages/DSAR'
import PrivilegedAccess from './pages/PrivilegedAccess'
import Notifications from './pages/Notifications'
import Provisioning from './pages/Provisioning'
import BulkOps from './pages/BulkOps'
import Sla from './pages/Sla'
import Billing from './pages/Billing'
import BillingIntegration from './pages/BillingIntegration'
import FinOps from './pages/FinOps'
import Backups from './pages/Backups'
import SupplyChain from './pages/SupplyChain'
import Registry from './pages/Registry'
import Models from './pages/Models'
import ModelRegistry from './pages/ModelRegistry'
import DataClassification from './pages/DataClassification'
import PolicyPacks from './pages/PolicyPacks'
import PolicyEditor from './pages/PolicyEditor'
import Enforcement from './pages/Enforcement'
import PostureReport from './pages/PostureReport'
import ComplianceReport from './pages/ComplianceReport'
import SecurityReport from './pages/SecurityReport'
import SlaReport from './pages/SlaReport'
import CustomerReport from './pages/CustomerReport'
import Observability from './pages/Observability'
import Compliance from './pages/Compliance'
import Incidents from './pages/Incidents'
import Risk from './pages/Risk'
import AuditLog from './pages/AuditLog'
import AdminSecurity from './pages/AdminSecurity'
import DeveloperTools from './pages/DeveloperTools'
import SuperAdmin from './pages/SuperAdmin'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/fleet" element={<FleetOverview />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/team" element={<Team />} />
        <Route path="/team/:id" element={<EmployeeDetail />} />
        <Route path="/instances" element={<Instances />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/bundles" element={<Bundles />} />
        <Route path="/clusters" element={<Clusters />} />
        <Route path="/clusters/:id" element={<ClusterDetail />} />
        <Route path="/fleet-posture" element={<FleetPosture />} />
        <Route path="/licensing" element={<Licensing />} />
        <Route path="/regions" element={<Regions />} />
        <Route path="/residency" element={<Residency />} />
        <Route path="/routing" element={<Routing />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/subprocessors" element={<Subprocessors />} />
        <Route path="/dsar" element={<DSAR />} />
        <Route path="/privileged-access" element={<PrivilegedAccess />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/provisioning" element={<Provisioning />} />
        <Route path="/bulk-ops" element={<BulkOps />} />
        <Route path="/sla" element={<Sla />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/billing-integration" element={<BillingIntegration />} />
        <Route path="/finops" element={<FinOps />} />
        <Route path="/backups" element={<Backups />} />
        <Route path="/supply-chain" element={<SupplyChain />} />
        <Route path="/registry" element={<Registry />} />
        <Route path="/models" element={<Models />} />
        <Route path="/model-registry" element={<ModelRegistry />} />
        <Route path="/data-classification" element={<DataClassification />} />
        <Route path="/policy-packs" element={<PolicyPacks />} />
        <Route path="/policy-editor" element={<PolicyEditor />} />
        <Route path="/enforcement" element={<Enforcement />} />
        <Route path="/reports/posture" element={<PostureReport />} />
        <Route path="/reports/compliance" element={<ComplianceReport />} />
        <Route path="/reports/security" element={<SecurityReport />} />
        <Route path="/reports/sla" element={<SlaReport />} />
        <Route path="/reports/customer/:id" element={<CustomerReport />} />
        <Route path="/observability" element={<Observability />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/risk" element={<Risk />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/admin-security" element={<AdminSecurity />} />
        <Route path="/developer-tools" element={<DeveloperTools />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
