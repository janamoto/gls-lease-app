import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/useAuthStore'

export default function Layout() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <div className="px-4 pt-16 pb-8 lg:pt-8 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
