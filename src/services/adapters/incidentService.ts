/**
 * Incident Service
 *
 * Mock mode:  uses in-memory store, auto-dispatches nearest unit on creation
 * Live mode:  calls real backend (VITE_INCIDENT_URL)
 *
 * Endpoint map:
 *   getIncidents()              GET  /incidents/open
 *   getOpenIncidents()          GET  /incidents/open
 *   getIncidentById(id)         GET  /incidents/:id
 *   createIncident(payload)     POST /incidents          (auto-assigns nearest unit)
 *   updateIncidentStatus(id)    PUT  /incidents/:id/status
 *   assignIncident(id, vehId)   PUT  /incidents/:id/assign
 */

import type { CreateIncidentPayload, Incident, IncidentStatus, IncidentType, VehicleType } from '@/types'
import { incidentStore, vehicleStore, messageStore } from '../mocks/mockStore'
import { sleep, generateId } from '@/lib/utils'
import { apiFetch, extractApiError } from '../apiClient'

// ─── Config ───────────────────────────────────────────────────────────────────

const INCIDENT_BASE = (import.meta.env.VITE_INCIDENT_URL as string | undefined)?.trim() ?? ''
const IS_MOCK = INCIDENT_BASE === ''

// ─── Live fetch helper ────────────────────────────────────────────────────────

function authFetch(path: string, init: RequestInit = {}) {
  return apiFetch(INCIDENT_BASE, path, init)
}

// ─── Type / status mappings ───────────────────────────────────────────────────

// Frontend type → backend UPPERCASE
const TYPE_TO_BACKEND: Record<string, string> = {
  medical:        'MEDICAL',
  accident:       'ACCIDENT',
  fire:           'FIRE',
  explosion:      'FIRE',
  crime:          'CRIME',
  flood:          'OTHER',
  missing_person: 'OTHER',
  other:          'OTHER',
}

// Backend UPPERCASE → frontend lowercase
const TYPE_FROM_BACKEND: Record<string, string> = {
  MEDICAL:  'medical',
  FIRE:     'fire',
  CRIME:    'crime',
  ACCIDENT: 'accident',
  OTHER:    'other',
}

const STATUS_FROM_BACKEND: Record<string, string> = {
  CREATED:     'created',
  DISPATCHED:  'dispatched',
  IN_PROGRESS: 'in_progress',
  RESOLVED:    'resolved',
}

const SEVERITY_FROM_BACKEND: Record<string, string> = {
  LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical',
}

const SEVERITY_TO_BACKEND: Record<string, string> = {
  low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
}

const STATUS_TO_BACKEND: Record<string, string> = {
  created:     'CREATED',
  pending:     'CREATED',
  dispatched:  'DISPATCHED',
  in_progress: 'IN_PROGRESS',
  resolved:    'RESOLVED',
}

// ─── Normalise backend response → Incident ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseIncident(data: any): Incident {
  return {
    id:               data.id,
    citizenName:      data.citizen_name,
    citizenPhone:     data.citizen_phone ?? undefined,
    type:             (TYPE_FROM_BACKEND[data.incident_type] ?? data.incident_type?.toLowerCase() ?? 'other') as IncidentType,
    severity:         (SEVERITY_FROM_BACKEND[data.severity] ?? data.severity?.toLowerCase() ?? undefined) as IncidentSeverity | undefined,
    status:           (STATUS_FROM_BACKEND[data.status] ?? data.status?.toLowerCase() ?? 'created') as IncidentStatus,
    location: {
      lat:     data.latitude ?? data.location?.lat ?? 5.6037,
      lng:     data.longitude ?? data.location?.lng ?? -0.187,
      address: data.address ?? data.location?.address ?? '',
      region:  data.region  ?? data.location?.region  ?? '',
    },
    notes:            data.notes ?? '',
    createdBy:        data.created_by ?? '',
    assignedVehicleId: data.assigned_unit_id ?? undefined,
    createdAt:        data.created_at,
    updatedAt:        data.updated_at,
    resolvedAt:       data.resolved_at ?? undefined,
  }
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const TYPE_TO_VEHICLE: Record<IncidentType, VehicleType[]> = {
  fire:           ['fire_truck'],
  explosion:      ['fire_truck', 'rescue'],
  medical:        ['ambulance'],
  accident:       ['ambulance', 'rescue'],
  crime:          ['police'],
  flood:          ['rescue'],
  missing_person: ['rescue', 'police'],
  other:          ['ambulance', 'rescue', 'police', 'fire_truck'],
}

function autoSelectVehicle(incidentType: IncidentType, lat: number, lng: number): string | null {
  const available = vehicleStore.getAll().filter((v) => v.status === 'available')
  if (available.length === 0) return null

  const preferred = TYPE_TO_VEHICLE[incidentType] ?? ['ambulance']

  for (const vtype of preferred) {
    const candidates = available.filter((v) => v.type === vtype)
    if (candidates.length === 0) continue
    return candidates.reduce((best, v) => {
      return haversine(lat, lng, v.coordinates.lat, v.coordinates.lng) <
        haversine(lat, lng, best.coordinates.lat, best.coordinates.lng)
        ? v
        : best
    }).id
  }

  // fallback: closest available of any type
  return available.reduce((best, v) =>
    haversine(lat, lng, v.coordinates.lat, v.coordinates.lng) <
    haversine(lat, lng, best.coordinates.lat, best.coordinates.lng)
      ? v
      : best
  ).id
}

// ─── Public service ───────────────────────────────────────────────────────────

export const incidentService = {
  // GET /incidents/open (live) | all mock incidents
  async getIncidents(): Promise<Incident[]> {
    if (IS_MOCK) {
      await sleep(400)
      return incidentStore.getAll()
    }
    const res = await authFetch('/incidents/open')
    if (!res.ok) throw new Error(`Failed to fetch incidents (HTTP ${res.status})`)
    const data = await res.json()
    return data.map(normaliseIncident)
  },

  // GET /incidents/open
  async getOpenIncidents(): Promise<Incident[]> {
    if (IS_MOCK) {
      await sleep(300)
      return incidentStore.getAll().filter((i) => i.status !== 'resolved')
    }
    const res = await authFetch('/incidents/open')
    if (!res.ok) throw new Error(`Failed to fetch open incidents (HTTP ${res.status})`)
    const data = await res.json()
    return data.map(normaliseIncident)
  },

  // GET /incidents/:id
  async getIncidentById(id: string): Promise<Incident | undefined> {
    if (IS_MOCK) {
      await sleep(250)
      return incidentStore.getById(id)
    }
    const res = await authFetch(`/incidents/${id}`)
    if (!res.ok) return undefined
    return normaliseIncident(await res.json())
  },

  // POST /incidents — creates incident then auto-assigns nearest appropriate unit (mock only)
  async createIncident(payload: CreateIncidentPayload): Promise<Incident> {
    if (IS_MOCK) {
      await sleep(700)
      const incident: Incident = {
        id: `INC-${new Date().getFullYear()}-${generateId()}`,
        ...payload,
        status: 'created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      incidentStore.add(incident)

      // Auto-dispatch nearest appropriate vehicle
      const vehicleId = autoSelectVehicle(payload.type, payload.location.lat, payload.location.lng)
      if (vehicleId) {
        const vehicle = vehicleStore.getById(vehicleId)!
        vehicleStore.update(vehicleId, {
          status: 'en_route',
          assignedIncidentId: incident.id,
          speed: Math.round(60 + Math.random() * 30),
          heading: Math.round(Math.random() * 360),
        })
        incidentStore.update(incident.id, {
          status: 'dispatched',
          assignedVehicleId: vehicleId,
          updatedAt: new Date().toISOString(),
        })
        // Radio dispatch message
        const eta = Math.round(4 + Math.random() * 10)
        messageStore.add({
          id: `MSG-${generateId()}`,
          fromId: 'COMMAND',
          fromName: 'NERDC Command',
          toId: vehicleId,
          toName: vehicle.callSign,
          content: `${vehicle.callSign}, auto-dispatched to ${incident.id} — ${incident.location.address}. Nearest available unit. ETA ~${eta} min.`,
          type: 'command',
          channel: vehicle.channel,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          direction: 'outbound',
        })
        setTimeout(() => {
          messageStore.add({
            id: `MSG-${generateId()}`,
            fromId: vehicleId,
            fromName: vehicle.callSign,
            toId: 'COMMAND',
            toName: 'NERDC Command',
            content: `${vehicle.callSign} copies. En route. ETA ${eta} minutes. Over.`,
            type: 'acknowledgment',
            channel: vehicle.channel,
            timestamp: new Date().toISOString(),
            acknowledged: true,
            direction: 'inbound',
          })
        }, 2500 + Math.random() * 2000)
      }

      return incidentStore.getById(incident.id)!
    }

    // Live mode
    const res = await authFetch('/incidents', {
      method: 'POST',
      body: JSON.stringify({
        citizen_name:  payload.citizenName,
        citizen_phone: payload.citizenPhone || null,
        incident_type: TYPE_TO_BACKEND[payload.type] ?? 'OTHER',
        severity:      payload.severity ? SEVERITY_TO_BACKEND[payload.severity] : null,
        latitude:      payload.location.lat,
        longitude:     payload.location.lng,
        address:       payload.location.address || null,
        region:        payload.location.region  || null,
        notes:         payload.notes || null,
      }),
    })
    if (!res.ok) throw new Error(await extractApiError(res, 'Failed to create incident'))
    return normaliseIncident(await res.json())
  },

  // PUT /incidents/:id/status
  async updateIncidentStatus(id: string, status: IncidentStatus): Promise<Incident> {
    if (IS_MOCK) {
      await sleep(400)
      const patch: Partial<Incident> = { status, updatedAt: new Date().toISOString() }
      if (status === 'resolved') patch.resolvedAt = new Date().toISOString()
      incidentStore.update(id, patch)
      return incidentStore.getById(id)!
    }

    // Live mode
    const res = await authFetch(`/incidents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: STATUS_TO_BACKEND[status] ?? status.toUpperCase() }),
    })
    if (!res.ok) throw new Error(await extractApiError(res, 'Failed to update status'))
    return normaliseIncident(await res.json())
  },

  // PUT /incidents/:id/assign
  async assignIncident(incidentId: string, vehicleId: string, vehicleType?: string): Promise<Incident> {
    if (IS_MOCK) {
      await sleep(400)
      incidentStore.update(incidentId, {
        assignedVehicleId: vehicleId,
        status: 'dispatched',
        updatedAt: new Date().toISOString(),
      })
      return incidentStore.getById(incidentId)!
    }

    // Map frontend vehicle type to backend enum
    const VTYPE_TO_BACKEND: Record<string, string> = {
      ambulance:  'AMBULANCE',
      fire_truck: 'FIRE_TRUCK',
      police:     'POLICE',
      rescue:     'AMBULANCE',  // fallback
      command:    'POLICE',     // fallback
    }
    const res = await authFetch(`/incidents/${incidentId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({
        assigned_unit_id:   vehicleId,
        assigned_unit_type: VTYPE_TO_BACKEND[vehicleType ?? 'ambulance'] ?? 'AMBULANCE',
      }),
    })
    if (!res.ok) throw new Error(await extractApiError(res, 'Failed to assign vehicle'))
    return normaliseIncident(await res.json())
  },

  subscribeToIncidents(fn: (incidents: Incident[]) => void) {
    if (IS_MOCK) return incidentStore.subscribe(fn)

    // Live mode: poll every 15s for incident list changes
    const poll = async () => {
      try {
        const res = await authFetch('/incidents/open')
        if (res.ok) {
          const data = await res.json()
          fn(data.map(normaliseIncident))
        }
      } catch { /* ignore */ }
    }
    const timer = setInterval(poll, 15_000)
    return () => clearInterval(timer)
  },
}
