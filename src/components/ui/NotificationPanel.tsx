import { useNotificationStore, AppNotification, NotifType } from '@/store/useNotificationStore'
import { Bell, X, CheckCheck, Trash2, AlertTriangle, CheckCircle2, RotateCcw, Truck, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

const TYPE_META: Record<NotifType, { icon: React.ElementType; color: string; bg: string }> = {
  incident_created:    { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  incident_unattended: { icon: Clock,         color: 'text-red-400',    bg: 'bg-red-500/10'    },
  incident_resolved:   { icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
  vehicle_returning:   { icon: RotateCcw,     color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  vehicle_available:   { icon: Truck,         color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
}

function NotifItem({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const meta = TYPE_META[n.type]
  const Icon = meta.icon
  return (
    <button
      onClick={() => onRead(n.id)}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5',
        !n.read && 'bg-white/[0.03]'
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', meta.bg)}>
        <Icon className={cn('w-4 h-4', meta.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-xs font-semibold truncate', n.read ? 'text-slate-400' : 'text-white')}>{n.title}</p>
          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-[10px] text-slate-600 mt-1">
          {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
        </p>
      </div>
    </button>
  )
}

export function NotificationBell() {
  const { notifications, markRead, markAllRead, clear, unreadCount } = useNotificationStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const count = unreadCount()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/8 transition-all border border-transparent hover:border-white/10"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 glass rounded-2xl border border-white/10 shadow-glass-lg overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <span className="text-sm font-semibold text-white">Notifications</span>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button onClick={markAllRead} title="Mark all read" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={clear} title="Clear all" className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-white/[0.04]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Bell className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotifItem key={n.id} n={n} onRead={markRead} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
