import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No data yet',
  description = 'Nothing to display here.',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
        <Icon className="w-7 h-7 text-slate-500" />
      </div>
      <div>
        <p className="font-semibold text-slate-300 text-sm">{title}</p>
        <p className="text-slate-500 text-xs mt-1 max-w-xs">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
