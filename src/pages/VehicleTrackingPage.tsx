import { useEffect, useState, useMemo } from 'react'
import { vehicleService } from '@/services/adapters/vehicleService'
import { incidentService } from '@/services/adapters/incidentService'
import type { Incident, Vehicle, VehicleType, FleetServiceGroup } from '@/types'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MapPanel } from '@/components/ui/MapPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { CommunicationPanel } from '@/components/ui/CommunicationPanel'
import { DispatchModal } from '@/components/ui/DispatchModal'
import { cn } from '@/lib/utils'
import {
  Pause, Play, MapPin, Gauge, Battery, Clock, Truck,
  Ambulance, Flame, Shield, LifeBuoy, Radio,
  ChevronRight, Users, Zap, X, CheckCircle2,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── Service group config ─────────────────────────────────────────────────────

const SERVICE_CONFIG: Record<VehicleType, {
  label: string; icon: React.ElementType; emoji: string
  color: string; bg: string; border: string; channel: string
}> = {
  ambulance:  { label: 'Ambulance Service', icon: Ambulance, emoji: '🚑', color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   channel: 'Alpha' },
  fire_truck: { label: 'Fire Service',      icon: Flame,     emoji: '🚒', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    channel: 'Bravo' },
  police:     { label: 'Police Service',    icon: Shield,    emoji: '🚔', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   channel: 'Charlie' },
  rescue:     { label: 'Rescue / NADMO',    icon: LifeBuoy,  emoji: '🚐', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  channel: 'Alpha' },
  command:    { label: 'Command & Control', icon: Radio,     emoji: '🛻', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', channel: 'Command' },
}

const TYPE_ORDER: VehicleType[] = ['ambulance', 'fire_truck', 'police', 'rescue', 'command']

function buildFleetGroups(vehicles: Vehicle[]): FleetServiceGroup[] {
  return TYPE_ORDER.map((type) => {
    const group = vehicles.filter((v) => v.type === type)
    const cfg = SERVICE_CONFIG[type]
    return {
      type,
      label: cfg.label,
      icon: cfg.emoji,
      total: group.length,
      available: group.filter((v) => v.status === 'available').length,
      active: group.filter((v) => ['dispatched', 'en_route', 'on_scene', 'returning'].includes(v.status)).length,
      offline: group.filter((v) => v.status === 'offline').length,
      color: cfg.color,
    }
  })
}

type FilterType = VehicleType | 'all'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehicleTrackingPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showComms, setShowComms] = useState(true)
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false)
  const [recallingId, setRecallingId] = useState<string | null>(null)

  async function loadAll() {
    const [v, i] = await Promise.all([vehicleService.getVehicles(), incidentService.getIncidents()])
    setVehicles(v)
    setIncidents(i)
    return { v, i }
  }

  useEffect(() => {
    loadAll().then(({ v }) => {
      setSelected(v.find((x) => x.status !== 'offline') ?? v[0] ?? null)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRecall(vehicleId: string) {
    const v = vehicles.find((x) => x.id === vehicleId)
    if (!v) return
    setRecallingId(vehicleId)
    try {
      await vehicleService.recallVehicle(vehicleId)
      toast.success(`${v.callSign} recalled to base`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Recall failed.')
    } finally {
      setRecallingId(null)
    }
  }

  useEffect(() => {
    if (paused) return
    const unsub = vehicleService.subscribeToVehicleUpdates((updated) => {
      setVehicles(updated)
      setSelected((prev) => prev ? (updated.find((v) => v.id === prev.id) ?? prev) : null)
    })
    return unsub
  }, [paused])

  const fleetGroups = useMemo(() => buildFleetGroups(vehicles), [vehicles])

  const filteredVehicles = useMemo(
    () => filter === 'all' ? vehicles : vehicles.filter((v) => v.type === filter),
    [vehicles, filter]
  )

  const assignedIncident = selected?.assignedIncidentId
    ? incidents.find((i) => i.id === selected.assignedIncidentId)
    : null

  const totalActive = vehicles.filter((v) => ['dispatched', 'en_route', 'on_scene'].includes(v.status)).length
  const totalAvailable = vehicles.filter((v) => v.status === 'available').length
  const totalOffline = vehicles.filter((v) => v.status === 'offline').length

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-3.5rem-3rem)] animate-fade-in overflow-hidden">

      {/* ── Fleet summary strip ─────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-shrink-0 overflow-x-auto pb-1">
        {/* Total overview */}
        <GlassCard className="flex-shrink-0 px-4 py-3 flex items-center gap-3 min-w-[160px]">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-none">{vehicles.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total Fleet</p>
          </div>
          <div className="ml-2 flex flex-col gap-0.5 text-[10px]">
            <span className="text-green-400">{totalAvailable} available</span>
            <span className="text-cyan-400">{totalActive} active</span>
            <span className="text-slate-500">{totalOffline} offline</span>
          </div>
        </GlassCard>

        {/* Per-service group cards */}
        {fleetGroups.map((g) => {
          const cfg = SERVICE_CONFIG[g.type]
          const Icon = cfg.icon
          return (
            <GlassCard
              key={g.type}
              hover
              onClick={() => setFilter(filter === g.type ? 'all' : g.type)}
              className={cn(
                'flex-shrink-0 px-4 py-3 flex items-center gap-3 min-w-[170px] cursor-pointer transition-all',
                filter === g.type ? `${cfg.bg} ${cfg.border}` : ''
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg, 'border', cfg.border)}>
                <Icon className={cn('w-4 h-4', cfg.color)} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-bold leading-none', cfg.color)}>{g.total}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{g.label}</p>
                <div className="flex gap-2 mt-1 text-[10px]">
                  <span className="text-green-400">{g.available} free</span>
                  <span className="text-cyan-400">{g.active} active</span>
                  {g.offline > 0 && <span className="text-slate-500">{g.offline} off</span>}
                </div>
              </div>
              {filter === g.type && <Zap className={cn('w-3 h-3 ml-auto flex-shrink-0', cfg.color)} />}
            </GlassCard>
          )
        })}
      </div>

      {/* ── Main panel row ──────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">

        {/* ── Fleet list ─────────────────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3 overflow-hidden">
          <GlassCard className="px-4 py-2.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">
                {filteredVehicles.length} unit{filteredVehicles.length !== 1 ? 's' : ''}
                {filter !== 'all' && <span className="text-slate-500 ml-1">({SERVICE_CONFIG[filter].label})</span>}
              </span>
            </div>
            <button
              onClick={() => setPaused((p) => !p)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
                paused
                  ? 'bg-amber-500/15 border-amber-500/25 text-amber-300'
                  : 'bg-green-500/10 border-green-500/20 text-green-400'
              )}
            >
              {paused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
              {paused ? 'PAUSED' : 'LIVE'}
            </button>
          </GlassCard>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[72px] rounded-xl bg-white/3 animate-pulse" />
              ))
            ) : filteredVehicles.length === 0 ? (
              <EmptyState icon={Truck} title="No vehicles" />
            ) : (
              filteredVehicles.map((v) => {
                const cfg = SERVICE_CONFIG[v.type]
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelected(v)}
                    className={cn(
                      'p-2.5 rounded-xl border cursor-pointer transition-all duration-200 group',
                      selected?.id === v.id
                        ? `${cfg.bg} ${cfg.border}`
                        : 'bg-white/[0.02] border-white/6 hover:bg-white/5 hover:border-white/10'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{cfg.emoji}</span>
                        <span className={cn('text-xs font-bold', selected?.id === v.id ? cfg.color : 'text-white')}>
                          {v.callSign}
                        </span>
                      </div>
                      <StatusBadge type="vehicle-status" value={v.status} />
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mb-1">{v.driverName}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-600">
                      <span><Gauge className="w-2.5 h-2.5 inline mr-0.5" />{v.speed} km/h</span>
                      <span>
                        <Battery className={cn('w-2.5 h-2.5 inline mr-0.5',
                          v.fuelLevel < 20 ? 'text-red-400' : v.fuelLevel < 40 ? 'text-amber-400' : 'text-slate-500'
                        )} />
                        <span className={v.fuelLevel < 20 ? 'text-red-400' : v.fuelLevel < 40 ? 'text-amber-400' : ''}>
                          {v.fuelLevel}%
                        </span>
                      </span>
                      <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Map ────────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
          <GlassCard className="flex-1 p-3 overflow-hidden">
            <MapPanel
              mode="tracking"
              vehicles={vehicles}
              center={selected?.coordinates ?? { lat: 5.6037, lng: -0.2070 }}
              zoom={12}
              className="w-full h-full"
            />
          </GlassCard>
        </div>

        {/* ── Right panel: vehicle detail + comms toggle ───────────────────── */}
        <div className="w-[280px] flex-shrink-0 flex flex-col gap-3 overflow-hidden">

          {/* Comms toggle */}
          <GlassCard className="flex-shrink-0 px-3 py-2 flex items-center gap-2">
            <button
              onClick={() => setShowComms(false)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                !showComms ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              Unit Detail
            </button>
            <button
              onClick={() => setShowComms(true)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1',
                showComms ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Radio className="w-3 h-3" />
              Radio
            </button>
          </GlassCard>

          {showComms ? (
            <CommunicationPanel
              vehicles={vehicles.filter((v) => v.status !== 'offline')}
              selectedVehicle={selected}
              className="flex-1 min-h-0"
            />
          ) : (
            <VehicleDetailPanel
              vehicle={selected}
              incident={assignedIncident ?? null}
              recallingId={recallingId}
              onDispatch={() => setDispatchModalOpen(true)}
              onRecall={handleRecall}
            />
          )}
        </div>
      </div>

      {/* Dispatch modal */}
      {dispatchModalOpen && (
        <DispatchModal
          preselectedVehicle={selected?.status === 'available' ? selected : null}
          incidents={incidents}
          vehicles={vehicles}
          onClose={() => setDispatchModalOpen(false)}
          onDispatched={loadAll}
        />
      )}
    </div>
  )
}

// ─── Vehicle detail panel ─────────────────────────────────────────────────────

function VehicleDetailPanel({
  vehicle, incident, recallingId, onDispatch, onRecall,
}: {
  vehicle: Vehicle | null
  incident: Incident | null
  recallingId: string | null
  onDispatch: () => void
  onRecall: (id: string) => void
}) {
  if (!vehicle) {
    return (
      <GlassCard className="flex-1 flex items-center justify-center p-6 min-h-0">
        <EmptyState icon={Truck} title="Select a unit" description="Click any vehicle in the fleet list to view details." />
      </GlassCard>
    )
  }

  const cfg = SERVICE_CONFIG[vehicle.type]
  const Icon = cfg.icon
  const canDispatch = vehicle.status === 'available'
  const canRecall   = ['dispatched', 'en_route'].includes(vehicle.status)
  const isRecalling = recallingId === vehicle.id

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">
      {/* Identity */}
      <GlassCard className="p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl border', cfg.bg, cfg.border)}>
            {cfg.emoji}
          </div>
          <div className="min-w-0">
            <h2 className={cn('font-bold text-lg leading-none', cfg.color)}>{vehicle.callSign}</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{vehicle.unitName}</p>
            <p className="text-[11px] text-slate-500 truncate">{cfg.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge type="vehicle-status" value={vehicle.status} />
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', cfg.bg, cfg.border, cfg.color)}>
            Ch. {cfg.channel}
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          {canDispatch && (
            <button
              onClick={onDispatch}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              Dispatch Unit
            </button>
          )}
          {canRecall && (
            <button
              disabled={isRecalling}
              onClick={() => onRecall(vehicle.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              {isRecalling
                ? <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                : <X className="w-3.5 h-3.5" />
              }
              {isRecalling ? 'Recalling…' : 'Recall Unit'}
            </button>
          )}
          {vehicle.status === 'on_scene' && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              On Scene
            </div>
          )}
          {vehicle.status === 'returning' && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              Returning
            </div>
          )}
          {vehicle.status === 'offline' && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-bold">
              Offline — Unavailable
            </div>
          )}
        </div>
      </GlassCard>

      {/* Live telemetry */}
      <GlassCard className="p-4 flex-shrink-0">
        <SectionHeader title="Live Telemetry" className="mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <TelemetryTile label="Speed" value={`${vehicle.speed} km/h`} icon={Gauge} accent={vehicle.speed > 80 ? 'text-amber-400' : 'text-slate-300'} />
          <TelemetryTile
            label="Fuel"
            value={`${vehicle.fuelLevel}%`}
            icon={Battery}
            accent={vehicle.fuelLevel < 20 ? 'text-red-400' : vehicle.fuelLevel < 40 ? 'text-amber-400' : 'text-green-400'}
          />
          <TelemetryTile label="Lat" value={vehicle.coordinates.lat.toFixed(4)} icon={MapPin} />
          <TelemetryTile label="Lng" value={vehicle.coordinates.lng.toFixed(4)} icon={MapPin} />
          <TelemetryTile label="Heading" value={`${vehicle.heading}°`} icon={Zap} />
          <TelemetryTile label="Updated" value={timeAgo(vehicle.lastUpdated)} icon={Clock} />
        </div>
      </GlassCard>

      {/* Driver */}
      <GlassCard className="p-4 flex-shrink-0">
        <SectionHeader title="Crew" className="mb-3" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{vehicle.driverName}</p>
            <p className="text-[11px] text-slate-500">{vehicle.id} · {vehicle.type.replace('_', ' ')}</p>
          </div>
        </div>
      </GlassCard>

      {/* Fuel bar */}
      <GlassCard className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Fuel Level</span>
          <span className={cn('text-xs font-bold',
            vehicle.fuelLevel < 20 ? 'text-red-400' :
            vehicle.fuelLevel < 40 ? 'text-amber-400' : 'text-green-400'
          )}>{vehicle.fuelLevel}%</span>
        </div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500',
              vehicle.fuelLevel < 20 ? 'bg-red-500' :
              vehicle.fuelLevel < 40 ? 'bg-amber-500' : 'bg-green-500'
            )}
            style={{ width: `${vehicle.fuelLevel}%` }}
          />
        </div>
        {vehicle.fuelLevel < 25 && (
          <p className="text-[10px] text-red-400 mt-1.5">⚠ Low fuel — refuelling recommended</p>
        )}
      </GlassCard>

      {/* Assigned incident */}
      {incident && (
        <GlassCard className="p-4 flex-shrink-0 border border-cyan-500/15">
          <SectionHeader title="Active Assignment" className="mb-3" />
          <div className="space-y-1.5">
            <p className="font-mono text-[11px] text-slate-500">{incident.id}</p>
            <p className="text-sm font-semibold text-white">{incident.citizenName}</p>
            <p className="text-xs text-slate-400 truncate">{incident.location.address}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge type="incident-status" value={incident.status} />
              {incident.severity && <StatusBadge type="severity" value={incident.severity} />}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  )
}

function TelemetryTile({ label, value, icon: Icon, accent = 'text-slate-300' }: {
  label: string; value: string; icon: React.ElementType; accent?: string
}) {
  return (
    <div className="bg-white/3 rounded-xl p-2.5 border border-white/6">
      <div className="flex items-center gap-1 mb-1">
        <Icon className="w-2.5 h-2.5 text-slate-500" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-sm font-bold leading-none', accent)}>{value}</p>
    </div>
  )
}
