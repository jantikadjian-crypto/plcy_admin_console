import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Instances from './pages/Instances'
import Releases from './pages/Releases'
import Bundles from './pages/Bundles'
import Clusters from './pages/Clusters'
import Licensing from './pages/Licensing'
import Regions from './pages/Regions'
import Transfers from './pages/Transfers'
import Subprocessors from './pages/Subprocessors'
import DSAR from './pages/DSAR'
import PrivilegedAccess from './pages/PrivilegedAccess'
import Provisioning from './pages/Provisioning'
import Backups from './pages/Backups'
import SupplyChain from './pages/SupplyChain'
import Models from './pages/Models'
import ModelRegistry from './pages/ModelRegistry'
import DataClassification from './pages/DataClassification'
import PolicyPacks from './pages/PolicyPacks'
import PolicyEditor from './pages/PolicyEditor'
import Enforcement from './pages/Enforcement'
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
        <Route path="/customers" element={<Customers />} />
        <Route path="/instances" element={<Instances />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/bundles" element={<Bundles />} />
        <Route path="/clusters" element={<Clusters />} />
        <Route path="/licensing" element={<Licensing />} />
        <Route path="/regions" element={<Regions />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/subprocessors" element={<Subprocessors />} />
        <Route path="/dsar" element={<DSAR />} />
        <Route path="/privileged-access" element={<PrivilegedAccess />} />
        <Route path="/provisioning" element={<Provisioning />} />
        <Route path="/backups" element={<Backups />} />
        <Route path="/supply-chain" element={<SupplyChain />} />
        <Route path="/models" element={<Models />} />
        <Route path="/model-registry" element={<ModelRegistry />} />
        <Route path="/data-classification" element={<DataClassification />} />
        <Route path="/policy-packs" element={<PolicyPacks />} />
        <Route path="/policy-editor" element={<PolicyEditor />} />
        <Route path="/enforcement" element={<Enforcement />} />
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
