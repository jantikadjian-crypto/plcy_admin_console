import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { CustomerScopeProvider } from '@/context/CustomerScope'
import { CustomersProvider } from '@/context/Customers'
import { EmployeesProvider } from '@/context/Employees'
import { SessionProvider } from '@/context/Session'
import { ProvisioningProvider } from '@/context/Provisioning'
import { PolicyProvider } from '@/context/Policy'
import OnboardingReturnBanner from './OnboardingReturnBanner'

/** Reset scroll to the top of the page on every route change. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SessionProvider>
    <CustomersProvider>
    <EmployeesProvider>
    <ProvisioningProvider>
    <PolicyProvider>
    <CustomerScopeProvider>
      <ScrollToTop />
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setSidebarOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <OnboardingReturnBanner />
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </CustomerScopeProvider>
    </PolicyProvider>
    </ProvisioningProvider>
    </EmployeesProvider>
    </CustomersProvider>
    </SessionProvider>
  )
}
