import { useEffect, useState } from 'react'
import { X, AlertTriangle, Truck, Zap, Battery, MapPin, CheckCircle2, ChevronRight, Plus, Info } from 'lucide-react'
import type { Incident, Vehicle, VehicleType } from '@/types'
import { vehicleService, recordVehicleDispatch } from '@/services/adapters/vehicleService'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// Which vehicle types are recommended per incident type
const RECOMMENDED_TYPES: Record<string, VehicleType[]> = {
  fire:           ['fire_truck', 'ambulance'],
  medical:        ['ambulance'],
  accident:       ['ambulance', 'police', 'fire_truck'],
  crime:          ['police'],
  flood:          ['ambulance', 'police'],
  explosion:      ['fire_truck', 'ambulance', 'police'],
  missing_person: ['police'],
  other:          ['ambulance', 'police', 'fire_truck'],
}

// Suggested unit counts per incident type
const SUGGESTED_COUNTS: Record<string, Partial<Record<VehicleType, number>>> = {
  fire:      { fire_truck: 2, ambulance: 1 },
  medical:   { ambulance: 1 },
  accident:  { ambulance: 2, police: 1, fire_truck: 1 },
  crime:     { police: 2 },
  flood:     { ambulance: 2, police: 1 },
  explosion: { fire_truck: 2, ambulance: 2, police: 1 },
  missing_person: { police: 2 },
  other:     { ambulance: 1, police: 1 },
}

const TYPE_CONFIG: Record<VehicleType, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  ambulance:  { emoji: '🚑', label: 'Ambulance',  color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20'   },
  fire_truck: { emoji: '🚒', label: 'Fire Truck', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  police:     { emoji: '🚔', label: 'Police',     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  rescue:     { emoji: '🚐', label: 'Rescue',     color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
  command:    { emoji: '🛻', label: 'Command',    color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
}

const TYPE_ICONS: Record<string, string> = {
  fire: '🔥', medical: '🏥', accident: '🚗', crime: '🔫',
  flood: '🌊', explosion: '💥', missing_person: '🔍', other: '⚠️',
}

const SEVERITY_COLOR: Record<string, string> = {
  low: 'text-green-400', medium: 'text-amber-400', high: 'text-orange-400', critical: 'text-red-400',
}

interface Props {
  preselectedIncident?: Incident | null
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
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>(
    preselectedVehicle ? [preselectedVehicle] : []
  )
  const [typeFilter, setTypeFilter] = useState<VehicleType | 'all'>('all')
  const [dispatching, setDispatching]  = useState(false)
  const [step, setStep] = useState<'incident' | 'vehicle'>(
    preselectedIncident ? 'vehicle' : 'incident'
  )

  // Available vehicles (not offline, not already assigned)
  const availableVehicles = vehicles.filter(
    (v) => v.status === 'available' && !v.assignedIncidentId
  )

  // Open incidents (not resolved)
  const openIncidents = incidents.filter(
    (i) => ['created', 'pending'].includes(i.status)
  )

  const recommended   = selectedIncident ? (RECOMMENDED_TYPES[selectedIncident.type] ?? []) : []
  const suggestedCount = selectedIncident ? (SUGGESTED_COUNTS[selectedIncident.type] ?? {}) : {}

  const filteredVehicles = availableVehicles
    .filter((v) => {
      if (typeFilter !== 'all' && v.type !== typeFilter) return false
      // Don't show already-selected vehicles in the list
      return !selectedVehicles.some((s) => s.id === v.id)
    })
    .sort((a, b) => {
      const aRec = recommended.includes(a.type) ? 0 : 1
      const bRec = recommended.includes(b.type) ? 0 : 1
      if (aRec !== bRec) return aRec - bRec
      return (b.fuelLevel ?? 100) - (a.fuelLevel ?? 100)
    })

  useEffect(() => {
    if (preselectedVehicle && selectedIncident) setStep('vehicle')
  }, [selectedIncident, preselectedVehicle])

  function toggleVehicle(v: Vehicle) {
    setSelectedVehicles((prev) =>
      prev.some((s) => s.id === v.id)
        ? prev.filter((s) => s.id !== v.id)
        : [...prev, v]
    )
  }

  async function handleDispatch() {
    if (!selectedIncident || selectedVehicles.length === 0) return
    setDispatching(true)

    let successCount = 0
    const errors: string[] = []

    for (let i = 0; i < selectedVehicles.length; i++) {
      const v = selectedVehicles[i]
      try {
        if (i === 0) {
          // First vehicle: sets incident's primary assignment
          await vehicleService.dispatchVehicle(v.id, selectedIncident.id)
        } else {
          // Additional vehicles: only update vehicle status
          await vehicleService.addVehicleToIncident(v.id, selectedIncident.id)
        }
        successCount++
        recordVehicleDispatch(v.id, v.callSign, v.type, v.stationId)
      } catch (err) {
        errors.push(`${v.callSign}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }

    setDispatching(false)

    if (successCount > 0) {
      const names = selectedVehicles.slice(0, successCount).map((v) => v.callSign).join(', ')
      toast.success(
        successCount === 1
          ? `${names} dispatched to ${selectedIncident.location.address}`
          : `${successCount} units dispatched to ${selectedIncident.location.address}: ${names}`,
        { icon: '🚨', duration: 4000 }
      )
    }
    if (errors.length > 0) {
      toast.error(errors.join('\n'), { duration: 5000 })
    }

    if (successCount > 0) {
      onDispatched()
      onClose()
    }
  }

  const canDispatch = selectedIncident && selectedVehicles.length > 0 && !dispatching

  // Build a suggestion string for the incident type
  const suggestionText = selectedIncident
    ? Object.entries(suggestedCount)
        .map(([type, count]) => `${count}× ${TYPE_CONFIG[type as VehicleType]?.label ?? type}`)
        .join(', ')
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl glass rounded-2xl shadow-glass-lg border border-white/10 flex flex-col max-h-[90vh] animate-fade-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Dispatch Units to Incident</h2>
              <p className="text-[11px] text-slate-500">Select multiple units — police, ambulance, fire as needed</p>
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
              {s === 'incident' ? 'Select Incident' : 'Select Units'}
              {s === 'incident' && selectedIncident && <CheckCircle2 className="w-3 h-3 text-green-400" />}
              {s === 'vehicle' && selectedVehicles.length > 0 && (
                <span className="bg-cyan-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {selectedVehicles.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">

          {/* Step 1: Pick incident */}
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
                          <span key={t} className="text-base" title={TYPE_CONFIG[t]?.label}>
                            {TYPE_CONFIG[t]?.emoji}
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

          {/* Step 2: Pick vehicles (multi-select) */}
          {step === 'vehicle' && (
            <div>
              {/* Selected incident summary */}
              {selectedIncident && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8 mb-3">
                  <span className="text-xl">{TYPE_ICONS[selectedIncident.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
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

              {/* Suggestion banner */}
              {suggestionText && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-300 text-[11px] mb-3">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    <strong>Recommended for {selectedIncident?.type.replace('_', ' ')}:</strong> {suggestionText}. Select all units needed before dispatching.
                  </span>
                </div>
              )}

              {/* Selected vehicles queue */}
              {selectedVehicles.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">
                    {selectedVehicles.length} unit{selectedVehicles.length > 1 ? 's' : ''} queued for dispatch
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVehicles.map((v) => {
                      const cfg = TYPE_CONFIG[v.type]
                      return (
                        <div
                          key={v.id}
                          className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold', cfg.bg, cfg.border, cfg.color)}
                        >
                          <span>{cfg.emoji}</span>
                          <span>{v.callSign}</span>
                          <button
                            onClick={() => toggleVehicle(v)}
                            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
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
                  All ({availableVehicles.length - selectedVehicles.length})
                </button>
                {(Object.keys(TYPE_CONFIG) as VehicleType[]).map((t) => {
                  const count = availableVehicles.filter((v) => v.type === t && !selectedVehicles.some((s) => s.id === v.id)).length
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

              {/* Vehicle grid */}
              {filteredVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                  <Truck className="w-8 h-8" />
                  <p className="text-sm font-semibold text-slate-400">
                    {availableVehicles.length === selectedVehicles.length
                      ? 'All available units selected'
                      : 'No available units of this type'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredVehicles.map((v) => {
                    const cfg = TYPE_CONFIG[v.type]
                    const isRec = recommended.includes(v.type)
                    const isSelected = selectedVehicles.some((s) => s.id === v.id)
                    return (
                      <button
                        key={v.id}
                        onClick={() => toggleVehicle(v)}
                        className={cn(
                          'p-3.5 rounded-xl border transition-all duration-200 text-left relative',
                          isSelected
                            ? `${cfg.bg} ${cfg.border}`
                            : 'bg-white/[0.02] border-white/6 hover:bg-white/5 hover:border-white/12'
                        )}
                      >
                        {isRec && !isSelected && (
                          <span className="absolute top-2 right-2 text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                            RECOMMENDED
                          </span>
                        )}
                        {isSelected && (
                          <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-green-400" />
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{cfg.emoji}</span>
                          <span className={cn('font-bold text-sm', isSelected ? cfg.color : 'text-white')}>{v.callSign}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mb-2">{v.driverName}</p>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Battery className={cn('w-3 h-3',
                              (v.fuelLevel ?? 100) < 25 ? 'text-red-400' : (v.fuelLevel ?? 100) < 50 ? 'text-amber-400' : 'text-slate-500'
                            )} />
                            <span className={(v.fuelLevel ?? 100) < 25 ? 'text-red-400' : (v.fuelLevel ?? 100) < 50 ? 'text-amber-400' : ''}>
                              {v.fuelLevel ?? 100}%
                            </span>
                          </span>
                          <span className="text-slate-600 capitalize">{v.stationId?.split(' ')[0]}</span>
                        </div>
                        {(v.fuelLevel ?? 100) < 25 && (
                          <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Low fuel
                          </p>
                        )}
                        {/* Add/remove indicator */}
                        <div className={cn(
                          'absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all',
                          isSelected ? 'bg-green-500/20' : 'bg-white/10'
                        )}>
                          {isSelected
                            ? <X className="w-2.5 h-2.5 text-green-400" />
                            : <Plus className="w-2.5 h-2.5 text-slate-400" />
                          }
                        </div>
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
          <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0 flex-wrap">
            {selectedIncident ? (
              <span className="flex items-center gap-1.5">
                <span className="text-base">{TYPE_ICONS[selectedIncident.type]}</span>
                <span className="text-white font-semibold">{selectedIncident.citizenName}</span>
              </span>
            ) : (
              <span className="text-slate-600">No incident selected</span>
            )}
            {selectedVehicles.length > 0 && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                <span className="text-white font-semibold">
                  {selectedVehicles.length} unit{selectedVehicles.length > 1 ? 's' : ''} selected
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
                  {selectedVehicles.length > 0
                    ? `Dispatch ${selectedVehicles.length} Unit${selectedVehicles.length > 1 ? 's' : ''}`
                    : 'Dispatch'
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
