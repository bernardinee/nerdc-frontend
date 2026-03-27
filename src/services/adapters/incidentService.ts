/**
 * Incident Service
 *
 * Mock mode:  uses in-memory store, auto-dispatches nearest unit on creation
 * Live mode:  calls real backend
 *
 * Endpoint map:
 *   getIncidents()              GET  /incidents
 *   getOpenIncidents()          GET  /incidents/open
 *   getIncidentById(id)         GET  /incidents/:id
 *   createIncident(payload)     POST /incidents          (auto-assigns nearest unit)
 *   updateIncidentStatus(id)    PUT  /incidents/:id/status
 *   assignIncident(id, vehId)   PUT  /incidents/:id/assign
 */

import type { CreateIncidentPayload, Incident, IncidentStatus, IncidentType, VehicleType } from '@/types'
import { incidentStore, vehicleStore, messageStore } from '../mocks/mockStore'
import { sleep, generateId } from '@/lib/utils'

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

export const incidentService = {
  // GET /incidents
  async getIncidents(): Promise<Incident[]> {
    await sleep(400)
    return incidentStore.getAll()
  },

  // GET /incidents/open
  async getOpenIncidents(): Promise<Incident[]> {
    await sleep(300)
    return incidentStore.getAll().filter((i) => i.status !== 'resolved')
  },

  // GET /incidents/:id
  async getIncidentById(id: string): Promise<Incident | undefined> {
    await sleep(250)
    return incidentStore.getById(id)
  },

  // POST /incidents — creates incident then auto-assigns nearest appropriate unit
  async createIncident(payload: CreateIncidentPayload): Promise<Incident> {
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
  },

  // PUT /incidents/:id/status
  async updateIncidentStatus(id: string, status: IncidentStatus): Promise<Incident> {
    await sleep(400)
    const patch: Partial<Incident> = { status, updatedAt: new Date().toISOString() }
    if (status === 'resolved') patch.resolvedAt = new Date().toISOString()
    incidentStore.update(id, patch)
    return incidentStore.getById(id)!
  },

  // PUT /incidents/:id/assign
  async assignIncident(incidentId: string, vehicleId: string): Promise<Incident> {
    await sleep(400)
    incidentStore.update(incidentId, {
      assignedVehicleId: vehicleId,
      status: 'dispatched',
      updatedAt: new Date().toISOString(),
    })
    return incidentStore.getById(incidentId)!
  },

  subscribeToIncidents(fn: (incidents: Incident[]) => void) {
    return incidentStore.subscribe(fn)
  },
}
