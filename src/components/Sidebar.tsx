import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FilePlus, Radio, MapPin, BarChart3,
  UserCircle, LogOut, Shield, Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { GhanaFlag } from '@/components/ui/GhanaFlag'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',       page: 'dashboard'  },
  { to: '/incidents/new',icon: FilePlus,         label: 'Record Incident', page: 'incidents'  },
  { to: '/dispatch',     icon: Radio,            label: 'Dispatch',        page: 'dispatch'   },
  { to: '/tracking',     icon: MapPin,           label: 'Vehicle Tracking',page: 'tracking'   },
  { to: '/analytics',    icon: BarChart3,        label: 'Analytics',       page: 'analytics'  },
]

interface SidebarProps { collapsed: boolean }

export function Sidebar({ collapsed }: SidebarProps) {
  const admin     = useAuthStore((s) => s.admin)
  const logout    = useAuthStore((s) => s.logout)
  const canAccess = useAuthStore((s) => s.canAccess)
  const navigate  = useNavigate()

  async function handleLogout() {
    await logout()
    toast.success('Signed out.')
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full glass border-r border-white/[0.06] transition-all duration-300 ease-in-out flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]', collapsed && 'px-3 justify-center')}>
        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-cyan-400" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white tracking-tight leading-tight">NERDC</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <GhanaFlag width={18} height={12} />
              <div className="text-[10px] text-slate-500 leading-tight">Emergency Response</div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.filter(({ page }) => canAccess(page)).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                collapsed ? 'justify-center px-2' : '',
                isActive
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )
            }
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-cyan-400' : 'text-current')} />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: profile + logout */}
      <div className="border-t border-white/[0.06] px-2 py-3 space-y-0.5">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              collapsed ? 'justify-center px-2' : '',
              isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            )
          }
          title={collapsed ? 'Profile' : undefined}
        >
          <UserCircle className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Profile</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200',
            collapsed ? 'justify-center px-2' : ''
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* Admin chip */}
        {!collapsed && admin && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/[0.05]">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{admin.name}</p>
              <p className="text-[10px] text-slate-500 truncate capitalize">{admin.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
