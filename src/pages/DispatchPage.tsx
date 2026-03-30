import { useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Radio, Truck, Clock,
  RefreshCw, ChevronDown, Zap, X, Plus, MapPin, Globe,
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { DispatchModal } from '@/components/ui/DispatchModal'
import { dispatchService, recordResolutionTime } from '@/services/adapters/dispatchService'
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
  const [filterRegion, setFilterRegion] = useState<string>('all')

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
      // Capture incident before updating (needed for response-time calculation)
      const incident = incidents.find((i) => i.id === id)

      await incidentService.updateIncidentStatus(id, status)

      if (status === 'resolved') {
        // Record response time for analytics (createdAt → now)
        if (incident?.createdAt) {
          recordResolutionTime(incident.createdAt)
        }
        // Auto-recall all active units assigned to this incident
        const assigned = vehicles.filter(
          (v) => v.assignedIncidentId === id &&
            ['dispatched', 'en_route', 'on_scene'].includes(v.status)
        )
        if (assigned.length > 0) {
          await Promise.allSettled(assigned.map((v) => vehicleService.recallVehicle(v.id)))
          toast.success(`${assigned.length} unit${assigned.length > 1 ? 's' : ''} recalled to base`)
        }
      }

      toast.success(`Incident marked "${status.replace('_', ' ')}"`)
      await load()
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

  // Derive unique regions from incidents (uses location.region populated via localStorage extras)
  const regions = ['all', ...Array.from(new Set(
    incidents.map((i) => i.location.region).filter(Boolean)
  )).sort()]

  const filtered = incidents.filter((i) => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false
    if (filterRegion !== 'all' && i.location.region !== filterRegion) return false
    return true
  })
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

            {/* Region filter */}
            <div className="relative flex items-center">
              <Globe className="absolute left-2 w-3 h-3 text-slate-500 pointer-events-none" />
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className={cn(
                  'pl-6 pr-6 py-1 rounded-lg text-xs font-medium border appearance-none transition-all cursor-pointer',
                  filterRegion !== 'all'
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                    : 'bg-white/3 border-white/8 text-slate-400 hover:bg-white/6 hover:text-slate-200'
                )}
                style={{ background: 'transparent' }}
              >
                {regions.map((r) => (
                  <option key={r} value={r} className="bg-[#1c2128] text-slate-200">
                    {r === 'all' ? 'All Regions' : r}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 w-3 h-3 text-slate-500 pointer-events-none" />
            </div>

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
              const assignedVehicles = vehicles.filter((v) => v.assignedIncidentId === inc.id)
              const canAddUnits = !['resolved'].includes(inc.status)

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
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
                      {TYPE_ICONS[inc.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Row 1: ID + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[11px] text-slate-500">{inc.id}</span>
                        <StatusBadge type="incident-status" value={inc.status} />
                        {inc.severity
                          ? <StatusBadge type="severity" value={inc.severity} />
                          : <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-500 border border-slate-500/20">No severity</span>
                        }
                      </div>
                      {/* Row 2: Caller + type */}
                      <p className="text-sm font-semibold text-white">
                        {inc.citizenName}
                        {inc.citizenPhone && <span className="text-slate-400 font-normal text-xs ml-2">{inc.citizenPhone}</span>}
                      </p>
                      {/* Row 3: Location — prominent */}
                      <div className="flex items-center gap-1 mt-0.5 mb-1">
                        <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <p className="text-xs text-cyan-300 font-medium truncate">{inc.location.address || 'Location not specified'}</p>
                        {inc.location.region && <span className="text-[10px] text-slate-500 flex-shrink-0">· {inc.location.region}</span>}
                      </div>
                      {/* Row 4: Notes */}
                      {inc.notes && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed border-l-2 border-slate-600/50 pl-2 mt-1">
                          {inc.notes}
                        </p>
                      )}

                      {/* All assigned vehicles */}
                      {(() => {
                        const assignedVehicles = vehicles.filter((v) => v.assignedIncidentId === inc.id)
                        if (assignedVehicles.length === 0) return null
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {assignedVehicles.map((v) => (
                              <div key={v.id} className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs">
                                  <span>{VEHICLE_EMOJI[v.type]}</span>
                                  <span className="text-cyan-300 font-semibold">{v.callSign}</span>
                                  <StatusBadge type="vehicle-status" value={v.status} className="scale-90" />
                                </div>
                                {['dispatched', 'en_route', 'on_scene'].includes(v.status) && (
                                  <button
                                    disabled={recallingId === v.id}
                                    onClick={() => handleRecall(v.id, v.callSign)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                  >
                                    {recallingId === v.id
                                      ? <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                                      : <X className="w-2.5 h-2.5" />
                                    }
                                    Recall
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })()}
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

                    {/* Assign / add units button */}
                    {canAddUnits && (
                      <button
                        onClick={() => openDispatchModal(inc)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          assignedVehicles.length === 0
                            ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        )}
                      >
                        {assignedVehicles.length === 0
                          ? <><Zap className="w-3 h-3" /> Assign Units</>
                          : <><Plus className="w-3 h-3" /> Add Unit</>
                        }
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
