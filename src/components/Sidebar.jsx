import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Laptop, Users, FileText,
  RotateCcw, Receipt, Settings, LogOut, Menu, X, UserCog,
} from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

const baseNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Laptop, label: 'Inventory' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/challans', icon: FileText, label: 'Delivery Challans' },
  { to: '/returns', icon: RotateCcw, label: 'Return Receipts' },
  { to: '/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const { role } = useAuthStore()

  const navItems = role === 'admin'
    ? [...baseNavItems, { to: '/users', icon: UserCog, label: 'User Management' }]
    : baseNavItems

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-indigo-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <Laptop className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">GLS Infotech</p>
            <p className="text-indigo-300 text-xs">Lease Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Role badge */}
      {role && (
        <div className="px-4 py-2">
          <span className="text-xs text-indigo-300 bg-white/10 px-2 py-1 rounded-full">
            {role === 'admin' ? '⚙ Admin' : '👤 Staff'}
          </span>
        </div>
      )}

      {/* Logout */}
      <div className="px-3 py-4 border-t border-indigo-700/50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-indigo-900 text-white shadow-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-indigo-900 to-blue-900 transform transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gradient-to-b from-indigo-900 to-blue-900">
        <SidebarContent />
      </div>
    </>
  )
}
