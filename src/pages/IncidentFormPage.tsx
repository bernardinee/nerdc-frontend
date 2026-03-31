import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MapPin, User, Phone, FileText, AlertTriangle, ChevronDown, Loader2, CheckCircle2, Zap } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { MapPanel } from '@/components/ui/MapPanel'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { incidentService } from '@/services/adapters/incidentService'
import { reverseGeocode, deriveLocationFromCoords } from '@/services/adapters/geocodingService'
import { useAuthStore } from '@/store/useAuthStore'
import type { IncidentType, IncidentSeverity } from '@/types'
import { cn } from '@/lib/utils'

const GHANA_REGIONS = [
  'Greater Accra','Ashanti','Western','Eastern','Central','Volta',
  'Northern','Upper East','Upper West','Brong-Ahafo','Oti',
  'Savannah','Bono East','North East','Ahafo','Western North',
]

const schema = z.object({
  citizenName:  z.string().min(2, 'Name must be at least 2 characters.'),
  citizenPhone: z.string().min(10, 'Enter a valid phone number.'),
  type:     z.enum(['fire','medical','accident','crime','flood','explosion','missing_person','other'] as const),
  severity: z.enum(['low','medium','high','critical'] as const),
  address:  z.string().min(5, 'Address is required.'),
  region:   z.string().min(2, 'Region is required.'),
  lat:      z.coerce.number().min(-90).max(90),
  lng:      z.coerce.number().min(-180).max(180),
  notes:    z.string().min(10, 'Please provide more detail (min 10 chars).'),
  createdBy: z.string(),
})

type FormValues = z.infer<typeof schema>

const incidentTypes: { value: IncidentType; label: string; icon: string }[] = [
  { value: 'fire',           label: 'Fire',           icon: '🔥' },
  { value: 'medical',        label: 'Medical',        icon: '🏥' },
  { value: 'accident',       label: 'Accident',       icon: '🚗' },
  { value: 'crime',          label: 'Crime',          icon: '🔫' },
  { value: 'flood',          label: 'Flood',          icon: '🌊' },
  { value: 'explosion',      label: 'Explosion',      icon: '💥' },
  { value: 'missing_person', label: 'Missing Person', icon: '🔍' },
  { value: 'other',          label: 'Other',          icon: '⚠️' },
]

const severities: { value: IncidentSeverity; label: string; color: string }[] = [
  { value: 'low',      label: 'Low',      color: 'border-green-500/40 bg-green-500/10 text-green-400' },
  { value: 'medium',   label: 'Medium',   color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  { value: 'high',     label: 'High',     color: 'border-orange-500/40 bg-orange-500/10 text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'border-red-500/40 bg-red-500/10 text-red-400' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-red-400 text-xs mt-1.5">{msg}</p>
}

export default function IncidentFormPage() {
  const navigate   = useNavigate()
  const { admin }  = useAuthStore()
  const [submitting, setSubmitting]           = useState(false)
  const [geocoding, setGeocoding]             = useState(false)
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [selectedLocation, setSelectedLocation]   = useState<{ lat: number; lng: number } | null>(null)

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:      'medical',
      severity:  'medium',
      lat:       5.6037,
      lng:       -0.1870,
      region:    'Greater Accra',
      createdBy: '',
    },
  })

  const lat = watch('lat')
  const lng = watch('lng')

  // Called whenever the user clicks/drags a pin on the map
  async function handleMapClick(clickedLat: number, clickedLng: number) {
    // Immediately set coordinates so the pin moves
    setSelectedLocation({ lat: clickedLat, lng: clickedLng })
    setValue('lat', clickedLat,  { shouldValidate: true })
    setValue('lng', clickedLng, { shouldValidate: true })
    setLocationConfirmed(false)

    // Reverse geocode to fill address + region
    setGeocoding(true)
    try {
      const result = await reverseGeocode(clickedLat, clickedLng)

      setValue('address', result.address, { shouldValidate: true })

      // Only update region if we got a valid Ghana region back
      if (result.region) {
        const match = GHANA_REGIONS.find(
          (r) => r.toLowerCase() === result.region.toLowerCase()
        )
        setValue('region', match ?? result.region, { shouldValidate: true })
      }

      setLocationConfirmed(true)
    } catch {
      // Nominatim failed — derive region silently from bounding boxes, leave
      // address blank so the user enters the real street address
      const derived = deriveLocationFromCoords(clickedLat, clickedLng)
      const match = GHANA_REGIONS.find(
        (r) => r.toLowerCase() === derived.region.toLowerCase()
      )
      setValue('region', match ?? derived.region, { shouldValidate: true })
      toast.error('Could not fetch street address. Please type it in below.', { duration: 4000 })
    } finally {
      setGeocoding(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      await incidentService.createIncident({
        citizenName:  values.citizenName,
        citizenPhone: values.citizenPhone,
        type:     values.type,
        severity: values.severity,
        location: {
          lat:     values.lat,
          lng:     values.lng,
          address: values.address,
          region:  values.region,
        },
        notes:     values.notes,
        createdBy: admin?.id ?? '',
      })
      toast.success('Incident recorded successfully.')
      navigate('/dispatch')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record incident. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Record New Incident</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Click anywhere on the map — address and region fill automatically.
          </p>
        </div>
        <button onClick={() => navigate('/dispatch')} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <div className="lg:col-span-5 flex items-center gap-2.5 bg-cyan-500/8 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-cyan-300">
          <Zap className="w-4 h-4 flex-shrink-0 text-cyan-400" />
          <span>The nearest available unit will be <strong>automatically dispatched</strong> based on incident type and location upon submission.</span>
        </div>

        {/* ── Left: form fields ──────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Caller */}
          <GlassCard className="p-5 space-y-4">
            <SectionHeader title="Caller Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Citizen Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    {...register('citizenName')}
                    placeholder="Full name"
                    className={cn('input-field pl-10', errors.citizenName && 'input-error')}
                  />
                </div>
                <FieldError msg={errors.citizenName?.message} />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    {...register('citizenPhone')}
                    placeholder="+233 20 000 0000"
                    className={cn('input-field pl-10', errors.citizenPhone && 'input-error')}
                  />
                </div>
                <FieldError msg={errors.citizenPhone?.message} />
              </div>
            </div>
          </GlassCard>

          {/* Classification */}
          <GlassCard className="p-5 space-y-4">
            <SectionHeader title="Incident Classification" />
            <div>
              <label className="label">Incident Type</label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {incidentTypes.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => field.onChange(t.value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all duration-150',
                          field.value === t.value
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                            : 'bg-white/3 border-white/8 text-slate-400 hover:bg-white/6 hover:text-slate-200'
                        )}
                      >
                        <span className="text-lg leading-none">{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div>
              <label className="label">Severity</label>
              <Controller
                control={control}
                name="severity"
                render={({ field }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {severities.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => field.onChange(s.value)}
                        className={cn(
                          'py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150',
                          field.value === s.value ? s.color : 'bg-white/3 border-white/8 text-slate-400 hover:bg-white/6'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
          </GlassCard>

          {/* Location — all fields auto-fill on map click */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeader
                title="Location"
                subtitle="Click the map → all fields fill automatically"
              />
              {geocoding && (
                <span className="flex items-center gap-1.5 text-[11px] text-cyan-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Looking up address…
                </span>
              )}
              {locationConfirmed && !geocoding && (
                <span className="flex items-center gap-1.5 text-[11px] text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Address confirmed
                </span>
              )}
            </div>

            {/* Street address — auto-filled but editable */}
            <div>
              <label className="label">Street Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                {geocoding && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin z-10" />
                )}
                <input
                  {...register('address')}
                  placeholder="Click the map to auto-fill, or type manually"
                  className={cn(
                    'input-field pl-10',
                    geocoding && 'pr-10 opacity-60',
                    errors.address && 'input-error',
                    locationConfirmed && !geocoding && 'border-green-500/30'
                  )}
                  readOnly={geocoding}
                />
              </div>
              <FieldError msg={errors.address?.message} />
            </div>

            {/* Region — auto-selected but overridable */}
            <div>
              <label className="label">Region</label>
              <div className="relative">
                <select
                  {...register('region')}
                  className={cn(
                    'input-field appearance-none pr-8',
                    locationConfirmed && !geocoding && 'border-green-500/30'
                  )}
                >
                  {GHANA_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Coordinates — auto-filled on map click */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Latitude</label>
                <input
                  {...register('lat')}
                  type="number"
                  step="0.00001"
                  className={cn(
                    'input-field',
                    errors.lat && 'input-error',
                    locationConfirmed && !geocoding && 'border-green-500/30'
                  )}
                />
                <FieldError msg={errors.lat?.message} />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  {...register('lng')}
                  type="number"
                  step="0.00001"
                  className={cn(
                    'input-field',
                    errors.lng && 'input-error',
                    locationConfirmed && !geocoding && 'border-green-500/30'
                  )}
                />
                <FieldError msg={errors.lng?.message} />
              </div>
            </div>

            {/* Hint */}
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {selectedLocation
                ? 'Location set — you can still drag the pin or edit any field above.'
                : 'Click anywhere on the map to pin the incident location.'
              }
            </p>
          </GlassCard>

          {/* Notes */}
          <GlassCard className="p-5 space-y-4">
            <SectionHeader title="Incident Notes" />
            <div>
              <label className="label">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <textarea
                  {...register('notes')}
                  rows={4}
                  placeholder="Describe the incident in detail…"
                  className={cn('input-field pl-10 resize-none', errors.notes && 'input-error')}
                />
              </div>
              <FieldError msg={errors.notes?.message} />
            </div>
          </GlassCard>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Recording Incident…
              </span>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Submit Incident Report
              </>
            )}
          </button>
        </div>

        {/* ── Right: map ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <GlassCard className="p-4 sticky top-0" style={{ height: 540 }}>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader title="Pin Location" subtitle="Click or drag the pin" />
              {selectedLocation && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </span>
              )}
            </div>

            {/* Map */}
            <div className="rounded-xl overflow-hidden" style={{ height: 454 }}>
              <MapPanel
                mode="picker"
                center={{ lat: lat ?? 5.6037, lng: lng ?? -0.1870 }}
                onLocationSelect={handleMapClick}
                selectedLocation={selectedLocation ?? (lat && lng ? { lat, lng } : null)}
                className="w-full h-full"
              />
            </div>

            {/* Geocoding overlay status */}
            {geocoding && (
              <div className="absolute inset-0 rounded-2xl flex items-end justify-center pb-6 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-cyan-300 border border-cyan-500/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Fetching address from map…
                </div>
              </div>
            )}
          </GlassCard>
        </div>

      </form>
    </div>
  )
}
