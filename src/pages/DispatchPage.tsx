import { useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Radio, Truck, Clock,
  RefreshCw, ChevronDown, Zap, X,
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { DispatchModal } from '@/components/ui/DispatchModal'
import { dispatchService } from '@/services/adapters/dispatchService'
import { incidentService } from '@/services/adapters/incidentService'
import { vehicleService } from '@/services/adapters/vehicleService'
import type { DispatchSummary, Incident, IncidentStatus, Vehicle } from '@/types'
import { timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, string> = {
  fire: '🔥', medical: '🏥', accident: '🚗', crime: '🔫',
  flood: '🌊', explosion: '💥', missing_person: '🔍', other: '⚠️',
}

const VEHICLE_EMOJI: Record<string, string> = {
  ambulance: '🚑', fire_truck: '🚒', police: '🚔', rescue: '🚐', command: '🛻',
}

const SEVERITY_BORDER: Record<string, string> = {
  low: 'border-l-green-500/60',
  medium: 'border-l-amber-500/60',
  high: 'border-l-orange-500/60',
  critical: 'border-l-red-500/70',
}

// Manual status transitions (no vehicle needed)
const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  created:     ['pending'],
  pending:     [],           // must be dispatched via the dispatch modal
  dispatched:  ['in_progress'],
  in_progress: ['resolved'],
  resolved:    [],
}

export default function DispatchPage() {
  const [summary, setSummary] = useState<DispatchSummary | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [recallingId, setRecallingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIncident, setModalIncident] = useState<Incident | null>(null)

  async function load() {
    const [s, i, v] = await Promise.all([
      dispatchService.getDispatchSummary(),
      incidentService.getIncidents(),
      vehicleService.getVehicles(),
    ])
    setSummary(s)
    setIncidents(i)
    setVehicles(v)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const unsubI = incidentService.subscribeToIncidents(async (updated) => {
      setIncidents(updated)
      const s = await dispatchService.getDispatchSummary()
      setSummary(s)
    })
    return unsubI
  }, [])

  function openDispatchModal(incident?: Incident) {
    setModalIncident(incident ?? null)
    setModalOpen(true)
  }

  async function updateStatus(id: string, status: IncidentStatus) {
    setUpdatingId(id)
    try {
      await incidentService.updateIncidentStatus(id, status)
      toast.success(`Incident marked "${status.replace('_', ' ')}"`)
    } catch {
      toast.error('Failed to update incident.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleRecall(vehicleId: string, vehicleCallSign: string) {
    setRecallingId(vehicleId)
    try {
      await vehicleService.recallVehicle(vehicleId)
      toast.success(`${vehicleCallSign} recalled to base`)
      await load()
    } catch {
      toast.error('Failed to recall unit.')
    } finally {
      setRecallingId(null)
    }
  }

  const filtered = filterStatus === 'all' ? incidents : incidents.filter((i) => i.status === filterStatus)
  const statuses: Array<IncidentStatus | 'all'> = ['all', 'created', 'pending', 'dispatched', 'in_progress', 'resolved']
  const availableCount = vehicles.filter((v) => v.status === 'available').length

  return (
    <div className="space-y-6 animate-fade-in">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : summary ? (
          <>
            <StatCard label="Open"            value={summary.openIncidents}              icon={AlertTriangle} color="red"    />
            <StatCard label="Dispatched"      value={summary.dispatchedIncidents}         icon={Radio}         color="cyan"   />
            <StatCard label="Active Units"    value={summary.activeVehicles}              icon={Truck}         color="amber"  />
            <StatCard label="Resolved"        value={summary.resolvedIncidents}           icon={CheckCircle2}  color="green"  />
            <StatCard label="Avg Response"    value={`${summary.avgResponseTimeMinutes}m`}icon={Clock}         color="purple" />
          </>
        ) : null}
      </div>

      {/* Dispatch queue */}
      <GlassCard className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <SectionHeader title="Dispatch Queue" subtitle={`${filtered.length} incidents · ${availableCount} units available`} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all border',
                  filterStatus === s
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                    : 'bg-white/3 border-white/8 text-slate-400 hover:bg-white/6 hover:text-slate-200'
                )}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
            <button onClick={load} className="p-1.5 rounded-lg bg-white/5 border border-white/8 text-slate-400 hover:text-white transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openDispatchModal()}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              <Zap className="w-3 h-3" />
              Dispatch Unit
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-white/3 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No incidents" description="No incidents match the selected filter." />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((inc) => {
              const transitions = STATUS_TRANSITIONS[inc.status]
              const isUnassigned = ['created', 'pending'].includes(inc.status) && !inc.assignedVehicleId
              const assignedVehicle = inc.assignedVehicleId
                ? vehicles.find((v) => v.id === inc.assignedVehicleId)
                : null

              return (
                <div
                  key={inc.id}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/6 border-l-4 hover:bg-white/[0.04] transition-all duration-200',
                    inc.severity ? SEVERITY_BORDER[inc.severity] : 'border-slate-500/30'
                  )}
                >
                  {/* Incident info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-lg flex-shrink-0">
                      {TYPE_ICONS[inc.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono text-[11px] text-slate-500">{inc.id}</span>
                        {inc.severity && <StatusBadge type="severity" value={inc.severity} />}
                        <StatusBadge type="incident-status" value={inc.status} />
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{inc.citizenName}</p>
                      <p className="text-xs text-slate-400 truncate">{inc.location.address}</p>

                      {/* Assigned vehicle chip */}
                      {assignedVehicle && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs">
                            <span>{VEHICLE_EMOJI[assignedVehicle.type]}</span>
                            <span className="text-cyan-300 font-semibold">{assignedVehicle.callSign}</span>
                            <StatusBadge type="vehicle-status" value={assignedVehicle.status} className="scale-90" />
                          </div>
                          {['dispatched', 'en_route'].includes(assignedVehicle.status) && (
                            <button
                              disabled={recallingId === assignedVehicle.id}
                              onClick={() => handleRecall(assignedVehicle.id, assignedVehicle.callSign)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              {recallingId === assignedVehicle.id
                                ? <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                                : <X className="w-2.5 h-2.5" />
                              }
                              Recall
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right hidden md:block mr-1">
                      <p className="text-xs text-slate-500">{timeAgo(inc.createdAt)}</p>
                      {inc.responseTimeMinutes && (
                        <p className="text-xs text-slate-400">{inc.responseTimeMinutes}m resp.</p>
                      )}
                    </div>

                    {/* Assign unit button for unassigned incidents */}
                    {isUnassigned && (
                      <button
                        onClick={() => openDispatchModal(inc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-all"
                      >
                        <Zap className="w-3 h-3" />
                        Assign Unit
                      </button>
                    )}

                    {/* Manual status dropdown for other transitions */}
                    {transitions.length > 0 && (
                      <div className="relative group">
                        <button
                          disabled={updatingId === inc.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 text-xs font-medium hover:bg-cyan-500/25 transition-all disabled:opacity-50"
                        >
                          {updatingId === inc.id && (
                            <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                          )}
                          Update
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 z-20 hidden group-hover:block">
                          <div className="glass rounded-xl shadow-glass-lg border border-white/10 overflow-hidden min-w-[150px]">
                            {transitions.map((next) => (
                              <button
                                key={next}
                                onClick={() => updateStatus(inc.id, next)}
                                className="block w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:bg-white/8 transition-colors capitalize"
                              >
                                → {next.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* Dispatch modal */}
      {modalOpen && (
        <DispatchModal
          preselectedIncident={modalIncident}
          incidents={incidents}
          vehicles={vehicles}
          onClose={() => setModalOpen(false)}
          onDispatched={load}
        />
      )}
    </div>
  )
}
