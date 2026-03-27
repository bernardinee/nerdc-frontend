import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from './GlassCard'

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  color?: 'cyan' | 'red' | 'green' | 'amber' | 'purple' | 'default'
  className?: string
}

const colorMap = {
  cyan:    { icon: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'rgba(0,184,245,0.15)' },
  red:     { icon: 'text-red-400',  bg: 'bg-red-500/10',  border: 'border-red-500/20',  glow: 'rgba(239,68,68,0.15)' },
  green:   { icon: 'text-green-400',bg: 'bg-green-500/10',border: 'border-green-500/20',glow: 'rgba(34,197,94,0.12)' },
  amber:   { icon: 'text-amber-400',bg: 'bg-amber-500/10',border: 'border-amber-500/20',glow: 'rgba(245,158,11,0.12)' },
  purple:  { icon: 'text-purple-400',bg:'bg-purple-500/10',border:'border-purple-500/20',glow:'rgba(168,85,247,0.12)'},
  default: { icon: 'text-slate-400', bg: 'bg-white/5',     border: 'border-white/10',    glow: 'transparent' },
}

export function StatCard({ label, value, subtext, icon: Icon, trend, color = 'default', className }: StatCardProps) {
  const c = colorMap[color]
  return (
    <GlassCard className={cn('p-5', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', c.bg, c.border)}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-lg',
              trend.value >= 0
                ? 'text-green-400 bg-green-500/10'
                : 'text-red-400 bg-red-500/10'
            )}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        <div className="text-sm font-medium text-slate-400">{label}</div>
        {subtext && <div className="text-xs text-slate-500">{subtext}</div>}
      </div>
    </GlassCard>
  )
}
