import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { CustomerScopeProvider } from '@/context/CustomerScope'
import { SessionProvider } from '@/context/Session'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SessionProvider>
    <CustomerScopeProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setSidebarOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </CustomerScopeProvider>
    </SessionProvider>
  )
}
