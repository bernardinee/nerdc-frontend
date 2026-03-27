import { useLocation } from 'react-router-dom'
import { Shield, ChevronDown, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/ui/NotificationPanel'

const pageLabels: Record<string, string> = {
  '/dashboard': 'Operations Dashboard',
  '/incidents/new': 'Record Incident',
  '/dispatch': 'Dispatch Control',
  '/tracking': 'Vehicle Tracking',
  '/analytics': 'Analytics',
  '/profile': 'Profile',
}

export function Topbar() {
  const { pathname } = useLocation()
  const admin = useAuthStore((s) => s.admin)
  const [showMenu, setShowMenu] = useState(false)
  const { theme, toggle } = useThemeStore()

  const label = pageLabels[pathname] ?? 'NERDC'

  return (
    <header className="h-14 flex items-center justify-between px-6 glass border-b border-white/[0.06] flex-shrink-0 relative z-10">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">{label}</h1>
        <p className="text-[10px] text-slate-500 leading-none mt-0.5">
          National Emergency Response &amp; Dispatch Centre
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/8 transition-all border border-transparent hover:border-white/10"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Admin menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((s) => !s)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition-all duration-200"
          >
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Shield className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-slate-200 hidden sm:block">{admin?.name}</span>
            <ChevronDown className={cn('w-3 h-3 text-slate-400 transition-transform', showMenu && 'rotate-180')} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 z-20 glass rounded-xl shadow-glass-lg border border-white/8 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8">
                  <p className="text-xs font-semibold text-white">{admin?.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{admin?.email}</p>
                </div>
                <div className="p-1">
                  <div className="px-3 py-2 rounded-lg text-xs text-slate-400 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-cyan-500/15 text-cyan-400 rounded-md text-[10px] font-semibold capitalize">
                      {admin?.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
