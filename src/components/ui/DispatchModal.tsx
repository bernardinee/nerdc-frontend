import { useEffect, useState } from 'react'
import { X, AlertTriangle, Truck, Zap, Battery, Gauge, MapPin, CheckCircle2, ChevronRight } from 'lucide-react'
import type { Incident, Vehicle, VehicleType } from '@/types'
import { vehicleService } from '@/services/adapters/vehicleService'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// Which vehicle types are best suited per incident type
const RECOMMENDED_TYPES: Record<string, VehicleType[]> = {
  fire:           ['fire_truck', 'rescue', 'command'],
  medical:        ['ambulance', 'rescue'],
  accident:       ['ambulance', 'police', 'rescue'],
  crime:          ['police', 'command'],
  flood:          ['rescue', 'ambulance', 'command'],
  explosion:      ['fire_truck', 'rescue', 'ambulance'],
  missing_person: ['police', 'rescue'],
  other:          ['ambulance', 'police', 'rescue', 'fire_truck', 'command'],
}

const TYPE_CONFIG: Record<VehicleType, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  ambulance:  { emoji: '🚑', label: 'Ambulance',  color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20'   },
  fire_truck: { emoji: '🚒', label: 'Fire',        color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  police:     { emoji: '🚔', label: 'Police',      color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  rescue:     { emoji: '🚐', label: 'Rescue',      color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
  command:    { emoji: '🛻', label: 'Command',     color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
}

const TYPE_ICONS: Record<string, string> = {
  fire: '🔥', medical: '🏥', accident: '🚗', crime: '🔫',
  flood: '🌊', explosion: '💥', missing_person: '🔍', other: '⚠️',
}

const SEVERITY_COLOR: Record<string, string> = {
  low: 'text-green-400', medium: 'text-amber-400', high: 'text-orange-400', critical: 'text-red-400',
}

interface Props {
  /** Pre-select an incident (from dispatch page) */
  preselectedIncident?: Incident | null
  /** Pre-select a vehicle (from tracking page) */
  preselectedVehicle?: Vehicle | null
  incidents: Incident[]
  vehicles: Vehicle[]
  onClose: () => void
  onDispatched: () => void
}

export function DispatchModal({
  preselectedIncident,
  preselectedVehicle,
  incidents,
  vehicles,
  onClose,
  onDispatched,
}: Props) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(preselectedIncident ?? null)
  const [selectedVehicle, setSelectedVehicle]   = useState<Vehicle | null>(preselectedVehicle ?? null)
  const [typeFilter, setTypeFilter]             = useState<VehicleType | 'all'>('all')
  const [dispatching, setDispatching]           = useState(false)
  const [step, setStep]                         = useState<'incident' | 'vehicle'>(
    preselectedIncident ? 'vehicle' : 'incident'
  )

  // Available (not assigned, not offline) vehicles
  const availableVehicles = vehicles.filter(
    (v) => v.status === 'available' && !v.assignedIncidentId
  )

  // Open incidents (not yet dispatched and not resolved)
  const openIncidents = incidents.filter(
    (i) => ['created', 'pending'].includes(i.status)
  )

  // Recommended types for the selected incident
  const recommended = selectedIncident
    ? RECOMMENDED_TYPES[selectedIncident.type] ?? []
    : []

  const filteredVehicles = availableVehicles
    .filter((v) => typeFilter === 'all' || v.type === typeFilter)
    .sort((a, b) => {
      // Sort recommended types first
      const aRec = recommended.includes(a.type) ? 0 : 1
      const bRec = recommended.includes(b.type) ? 0 : 1
      if (aRec !== bRec) return aRec - bRec
      return b.fuelLevel - a.fuelLevel
    })

  // Auto-advance when vehicle is preselected and incident selected
  useEffect(() => {
    if (preselectedVehicle && selectedIncident) setStep('vehicle')
  }, [selectedIncident, preselectedVehicle])

  async function handleDispatch() {
    if (!selectedIncident || !selectedVehicle) return
    setDispatching(true)
    try {
      await vehicleService.dispatchVehicle(selectedVehicle.id, selectedIncident.id)
      toast.success(
        `${selectedVehicle.callSign} dispatched to ${selectedIncident.id}`,
        { icon: '🚨' }
      )
      onDispatched()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dispatch failed.')
    } finally {
      setDispatching(false)
    }
  }

  const canDispatch = selectedIncident && selectedVehicle && !dispatching

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl glass rounded-2xl shadow-glass-lg border border-white/10 flex flex-col max-h-[90vh] animate-fade-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Dispatch Unit to Incident</h2>
              <p className="text-[11px] text-slate-500">Select an incident and an available unit to deploy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex px-6 pt-3 gap-1 flex-shrink-0">
          {(['incident', 'vehicle'] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border',
                step === s
                  ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300'
                  : 'bg-white/3 border-white/8 text-slate-400 hover:text-slate-200'
              )}
            >
              <span className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold',
                step === s ? 'bg-cyan-500 text-white' : 'bg-white/10 text-slate-400'
              )}>
                {i + 1}
              </span>
              {s === 'incident' ? 'Select Incident' : 'Select Unit'}
              {s === 'incident' && selectedIncident && (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              )}
              {s === 'vehicle' && selectedVehicle && (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">

          {/* ── Step 1: Pick incident ─────────────────────────────────────── */}
          {step === 'incident' && (
            <div className="space-y-2">
              {openIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                  <p className="text-sm font-semibold text-slate-300">No open incidents</p>
                  <p className="text-xs">All incidents are dispatched or resolved.</p>
                </div>
              ) : (
                openIncidents.map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => { setSelectedIncident(inc); setStep('vehicle') }}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left',
                      selectedIncident?.id === inc.id
                        ? 'bg-cyan-500/10 border-cyan-500/30'
                        : 'bg-white/[0.02] border-white/6 hover:bg-white/5 hover:border-white/12'
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                      {TYPE_ICONS[inc.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[11px] text-slate-500">{inc.id}</span>
                        {inc.severity && <StatusBadge type="severity" value={inc.severity} />}
                        <StatusBadge type="incident-status" value={inc.status} />
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{inc.citizenName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <p className="text-xs text-slate-400 truncate">{inc.location.address}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex gap-1">
                        {(RECOMMENDED_TYPES[inc.type] ?? []).slice(0, 3).map((t) => (
                          <span key={t} className="text-base" title={TYPE_CONFIG[t].label}>
                            {TYPE_CONFIG[t].emoji}
                          </span>
                        ))}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── Step 2: Pick vehicle ─────────────────────────────────────── */}
          {step === 'vehicle' && (
            <div>
              {/* Selected incident summary */}
              {selectedIncident && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8 mb-4">
                  <span className="text-xl">{TYPE_ICONS[selectedIncident.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-500">{selectedIncident.id}</span>
                      {selectedIncident.severity && (
                        <span className={cn('text-xs font-bold', SEVERITY_COLOR[selectedIncident.severity])}>
                          {selectedIncident.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{selectedIncident.citizenName}</p>
                    <p className="text-xs text-slate-400 truncate">{selectedIncident.location.address}</p>
                  </div>
                  <button
                    onClick={() => setStep('incident')}
                    className="text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Type filter */}
              <div className="flex gap-1.5 mb-3 flex-wrap">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={cn('px-3 py-1 rounded-lg text-xs font-semibold border transition-all',
                    typeFilter === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                  )}
                >
                  All ({availableVehicles.length})
                </button>
                {(Object.keys(TYPE_CONFIG) as VehicleType[]).map((t) => {
                  const count = availableVehicles.filter((v) => v.type === t).length
                  if (count === 0) return null
                  const cfg = TYPE_CONFIG[t]
                  const isRecommended = recommended.includes(t)
                  return (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1',
                        typeFilter === t ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-transparent text-slate-500 hover:text-slate-300'
                      )}
                    >
                      {cfg.emoji} {cfg.label} ({count})
                      {isRecommended && <span className="text-[9px] text-amber-400">★</span>}
                    </button>
                  )
                })}
              </div>

              {/* Recommended note */}
              {selectedIncident && recommended.length > 0 && (
                <p className="text-[11px] text-amber-400/80 mb-3 flex items-center gap-1">
                  <span>★</span>
                  Recommended for {selectedIncident.type.replace('_', ' ')}: {recommended.map((t) => TYPE_CONFIG[t].label).join(', ')}
                </p>
              )}

              {/* Vehicle list */}
              {filteredVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
                  <Truck className="w-8 h-8" />
                  <p className="text-sm font-semibold text-slate-400">No available units</p>
                  <p className="text-xs">All units of this type are currently deployed.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredVehicles.map((v) => {
                    const cfg = TYPE_CONFIG[v.type]
                    const isRec = recommended.includes(v.type)
                    const isSelected = selectedVehicle?.id === v.id
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVehicle(isSelected ? null : v)}
                        className={cn(
                          'p-3.5 rounded-xl border transition-all duration-200 text-left relative',
                          isSelected
                            ? `${cfg.bg} ${cfg.border}`
                            : 'bg-white/[0.02] border-white/6 hover:bg-white/5 hover:border-white/12'
                        )}
                      >
                        {isRec && (
                          <span className="absolute top-2 right-2 text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                            RECOMMENDED
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{cfg.emoji}</span>
                          <span className={cn('font-bold text-sm', isSelected ? cfg.color : 'text-white')}>{v.callSign}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mb-2">{v.driverName}</p>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Battery className={cn('w-3 h-3',
                              v.fuelLevel < 25 ? 'text-red-400' : v.fuelLevel < 50 ? 'text-amber-400' : 'text-slate-500'
                            )} />
                            <span className={v.fuelLevel < 25 ? 'text-red-400' : v.fuelLevel < 50 ? 'text-amber-400' : ''}>
                              {v.fuelLevel}%
                            </span>
                          </span>
                          <span className="text-slate-600">Ch. {v.channel.toUpperCase()}</span>
                        </div>
                        {v.fuelLevel < 25 && (
                          <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Low fuel
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-white/[0.07] flex-shrink-0">
          {/* Summary */}
          <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
            {selectedIncident ? (
              <span className="flex items-center gap-1.5">
                <span className="text-base">{TYPE_ICONS[selectedIncident.type]}</span>
                <span className="text-white font-semibold truncate">{selectedIncident.id}</span>
              </span>
            ) : (
              <span className="text-slate-600">No incident selected</span>
            )}
            {selectedIncident && selectedVehicle && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                <span className="flex items-center gap-1.5">
                  <span>{TYPE_CONFIG[selectedVehicle.type].emoji}</span>
                  <span className="text-white font-semibold">{selectedVehicle.callSign}</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onClose} className="btn-secondary px-4 py-2 text-xs">
              Cancel
            </button>
            <button
              onClick={handleDispatch}
              disabled={!canDispatch}
              className="btn-primary px-5 py-2 text-xs disabled:opacity-40"
            >
              {dispatching ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Dispatching…
                </span>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  {selectedIncident && selectedVehicle
                    ? `Dispatch ${selectedVehicle.callSign}`
                    : 'Dispatch Unit'
                  }
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
