import { cn } from '@/lib/utils'
import type { IncidentStatus, VehicleStatus, IncidentSeverity } from '@/types'

const incidentStatusConfig: Record<IncidentStatus, { label: string; classes: string }> = {
  created:     { label: 'New',        classes: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  pending:     { label: 'Pending',    classes: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  dispatched:  { label: 'Dispatched', classes: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  in_progress: { label: 'In Progress',classes: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  resolved:    { label: 'Resolved',   classes: 'bg-green-500/20 text-green-300 border-green-500/30' },
}

const vehicleStatusConfig: Record<VehicleStatus, { label: string; classes: string }> = {
  available:  { label: 'Available',  classes: 'bg-green-500/20 text-green-300 border-green-500/30' },
  dispatched: { label: 'Dispatched', classes: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  en_route:   { label: 'En Route',   classes: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  on_scene:   { label: 'On Scene',   classes: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  returning:  { label: 'Returning',  classes: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  offline:    { label: 'Offline',    classes: 'bg-slate-600/30 text-slate-400 border-slate-600/30' },
}

const severityConfig: Record<IncidentSeverity, { label: string; classes: string; dot: string }> = {
  low:      { label: 'Low',      classes: 'bg-green-500/15 text-green-400 border-green-500/25', dot: 'bg-green-400' },
  medium:   { label: 'Medium',   classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25', dot: 'bg-amber-400' },
  high:     { label: 'High',     classes: 'bg-orange-500/15 text-orange-400 border-orange-500/25', dot: 'bg-orange-400' },
  critical: { label: 'Critical', classes: 'bg-red-500/15 text-red-400 border-red-500/25', dot: 'bg-red-400' },
}

interface Props {
  type: 'incident-status' | 'vehicle-status' | 'severity'
  value: string
  className?: string
}

export function StatusBadge({ type, value, className }: Props) {
  let config: { label: string; classes: string; dot?: string } | undefined

  if (type === 'incident-status') config = incidentStatusConfig[value as IncidentStatus]
  else if (type === 'vehicle-status') config = vehicleStatusConfig[value as VehicleStatus]
  else config = severityConfig[value as IncidentSeverity]

  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        config.classes,
        className
      )}
    >
      {config.dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      )}
      {config.label}
    </span>
  )
}
