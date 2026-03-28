// Endpoint map:
//   getVehicles()                  GET  /vehicles
//   getVehicleById(id)             GET  /vehicles/:id
//   getVehicleLocation(id)         GET  /vehicles/:id/location
//   registerVehicle(payload)       POST /vehicles/register
//   dispatchVehicle(vId, incId)    PUT  /incidents/:id/assign
//   recallVehicle(vehicleId)       POST /vehicles/:id/recall

import type { Vehicle, VehicleType, RadioChannel } from '@/types'
import type { Incident } from '@/types'
import { vehicleStore, incidentStore, messageStore } from '../mocks/mockStore'
import { sleep, generateId } from '@/lib/utils'
import { apiFetch, extractApiError } from '../apiClient'

// ─── Config ───────────────────────────────────────────────────────────────────

const DISPATCH_BASE  = (import.meta.env.VITE_DISPATCH_URL as string | undefined)?.trim() ?? ''
const INCIDENT_BASE  = (import.meta.env.VITE_INCIDENT_URL as string | undefined)?.trim() ?? ''
const WS_BASE        = (import.meta.env.VITE_WS_URL as string | undefined)?.trim() ?? ''
const IS_MOCK        = DISPATCH_BASE === ''

// ─── Live fetch helpers ───────────────────────────────────────────────────────

function authFetch(path: string, init: RequestInit = {}) {
  return apiFetch(DISPATCH_BASE, path, init)
}

function incidentFetch(path: string, init: RequestInit = {}) {
  return apiFetch(INCIDENT_BASE, path, init)
}

// ─── Type / status mappings ───────────────────────────────────────────────────

const VTYPE_FROM_BACKEND: Record<string, string> = {
  AMBULANCE:  'ambulance',
  FIRE_TRUCK: 'fire_truck',
  POLICE:     'police',
}

const VSTATUS_FROM_BACKEND: Record<string, string> = {
  AVAILABLE:        'available',
  ON_DUTY:          'en_route',
  OUT_OF_SERVICE:   'offline',
}

// ─── Normalise backend response → Vehicle ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseVehicle(data: any): Vehicle {
  return {
    id:                 data.id,
    callSign:           data.registration_number ?? data.id,
    type:               (VTYPE_FROM_BACKEND[data.vehicle_type] ?? data.vehicle_type?.toLowerCase() ?? 'ambulance') as VehicleType,
    status:             (VSTATUS_FROM_BACKEND[data.status] ?? data.status?.toLowerCase() ?? 'available') as Vehicle['status'],
    stationId:          data.station_id ?? '',
    driverName:         data.driver_name ?? 'Unknown',
    unitName:           data.registration_number ?? data.id,
    coordinates:        { lat: data.latitude ?? 5.6037, lng: data.longitude ?? -0.187 },
    speed:              0,
    heading:            0,
    fuelLevel:          85,
    channel:            'command' as const,
    assignedIncidentId: data.current_incident_id ?? undefined,
    lastUpdated:        data.last_updated ?? new Date().toISOString(),
  }
}

// ─── Mock movement simulation ─────────────────────────────────────────────────

function simulateMovement(vehicle: Vehicle, incidents: Incident[]): Vehicle {
  if (['available', 'offline'].includes(vehicle.status) || vehicle.speed === 0) return vehicle

  // En-route: move toward the assigned incident
  if ((vehicle.status === 'en_route' || vehicle.status === 'dispatched') && vehicle.assignedIncidentId) {
    const incident = incidents.find((i) => i.id === vehicle.assignedIncidentId)
    if (incident) {
      const tLat = incident.location.lat
      const tLng = incident.location.lng
      const dLat = tLat - vehicle.coordinates.lat
      const dLng = tLng - vehicle.coordinates.lng
      const dist = Math.sqrt(dLat * dLat + dLng * dLng)

      if (dist < 0.0005) {
        // Arrived — mark on_scene
        return { ...vehicle, coordinates: { lat: tLat, lng: tLng }, status: 'on_scene', speed: 0 }
      }

      const step = 0.0003 + Math.random() * 0.0002
      const ratio = step / dist
      return {
        ...vehicle,
        coordinates: {
          lat: vehicle.coordinates.lat + dLat * ratio,
          lng: vehicle.coordinates.lng + dLng * ratio,
        },
        speed:   Math.round(50 + Math.random() * 30),
        heading: Math.round(((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360),
        lastUpdated: new Date().toISOString(),
      }
    }
  }

  // Default drift for returning / other moving vehicles
  const speedFactor = (vehicle.speed / 3600) * 0.001
  const radians = (vehicle.heading * Math.PI) / 180
  return {
    ...vehicle,
    coordinates: {
      lat: vehicle.coordinates.lat + Math.cos(radians) * speedFactor * (0.8 + Math.random() * 0.4),
      lng: vehicle.coordinates.lng + Math.sin(radians) * speedFactor * (0.8 + Math.random() * 0.4),
    },
    speed:   Math.round(Math.max(0, vehicle.speed + (Math.random() - 0.5) * 5)),
    heading: Math.round((vehicle.heading + (Math.random() - 0.5) * 10 + 360) % 360),
    lastUpdated: new Date().toISOString(),
  }
}

// ─── Public service ───────────────────────────────────────────────────────────

export const vehicleService = {
  async getVehicles(): Promise<Vehicle[]> {
    if (IS_MOCK) {
      await sleep(350)
      return vehicleStore.getAll()
    }
    const res = await authFetch('/vehicles')
    if (!res.ok) throw new Error(`Failed to fetch vehicles (HTTP ${res.status})`)
    const data = await res.json()
    return data.map(normaliseVehicle)
  },

  async getVehicleById(id: string): Promise<Vehicle | undefined> {
    if (IS_MOCK) {
      await sleep(200)
      return vehicleStore.getById(id)
    }
    const res = await authFetch(`/vehicles/${id}`)
    if (!res.ok) return undefined
    return normaliseVehicle(await res.json())
  },

  // GET /vehicles/:id/location
  async getVehicleLocation(id: string): Promise<{ lat: number; lng: number; updatedAt: string } | undefined> {
    if (IS_MOCK) {
      await sleep(150)
      const v = vehicleStore.getById(id)
      if (!v) return undefined
      return { lat: v.coordinates.lat, lng: v.coordinates.lng, updatedAt: v.lastUpdated }
    }
    const res = await authFetch(`/vehicles/${id}/location`)
    if (!res.ok) return undefined
    const data = await res.json()
    return { lat: data.latitude, lng: data.longitude, updatedAt: data.last_updated }
  },

  // POST /vehicles/register
  async registerVehicle(payload: {
    callSign: string
    type: VehicleType
    driverName: string
    unitName: string
    stationId: string
    channel: RadioChannel
    coordinates: { lat: number; lng: number }
  }): Promise<Vehicle> {
    await sleep(500)
    const prefixes: Record<string, string> = {
      ambulance: 'AMB', fire_truck: 'FIRE', police: 'POL', rescue: 'RSC', command: 'CMD',
    }
    const prefix = prefixes[payload.type] ?? 'VEH'
    const vehicle: Vehicle = {
      id: `VEH-${prefix}-${generateId()}`,
      ...payload,
      status: 'available',
      speed: 0,
      heading: 0,
      fuelLevel: 100,
      lastUpdated: new Date().toISOString(),
    }
    vehicleStore.add(vehicle)
    return vehicle
  },

  /**
   * Dispatch a vehicle to an incident.
   * Live: PUT /vehicles/:id/status + PUT /incidents/:id/assign
   */
  async dispatchVehicle(vehicleId: string, incidentId: string): Promise<void> {
    if (IS_MOCK) {
      await sleep(500)
      const vehicle = vehicleStore.getById(vehicleId)
      const incident = incidentStore.getById(incidentId)
      if (!vehicle || !incident) throw new Error('Vehicle or incident not found.')
      if (vehicle.status === 'offline') throw new Error('Cannot dispatch an offline unit.')

      vehicleStore.update(vehicleId, {
        status: 'en_route',
        assignedIncidentId: incidentId,
        speed: Math.round(60 + Math.random() * 30),
        heading: Math.round(Math.random() * 360),
      })
      incidentStore.update(incidentId, { status: 'dispatched', assignedVehicleId: vehicleId })

      const eta = Math.round(4 + Math.random() * 10)
      messageStore.add({
        id: `MSG-${generateId()}`,
        fromId: 'COMMAND', fromName: 'NERDC Command',
        toId: vehicleId, toName: vehicle.callSign,
        content: `${vehicle.callSign}, you are dispatched to ${incidentId} — ${incident.location.address}. Proceed immediately. ETA estimate ${eta} minutes.`,
        type: 'command', channel: vehicle.channel,
        timestamp: new Date().toISOString(), acknowledged: false, direction: 'outbound',
      })
      setTimeout(() => {
        const v = vehicleStore.getById(vehicleId)
        if (!v) return
        messageStore.add({
          id: `MSG-${generateId()}`,
          fromId: vehicleId, fromName: vehicle.callSign,
          toId: 'COMMAND', toName: 'NERDC Command',
          content: `${vehicle.callSign} copies. En route to ${incidentId}. ETA ${eta} minutes. Over.`,
          type: 'acknowledgment', channel: vehicle.channel,
          timestamp: new Date().toISOString(), acknowledged: true, direction: 'inbound',
        })
      }, 2500 + Math.random() * 2000)
      return
    }

    // Live: mark vehicle ON_DUTY
    const statusRes = await authFetch(`/vehicles/${vehicleId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'ON_DUTY', incident_id: incidentId }),
    })
    if (!statusRes.ok) throw new Error(await extractApiError(statusRes, 'Failed to dispatch vehicle'))

    // Assign vehicle to incident (best-effort — incident service may auto-assign)
    if (INCIDENT_BASE) {
      const vehicle = await this.getVehicleById(vehicleId)
      const VTYPE_TO_BACKEND: Record<string, string> = {
        ambulance: 'AMBULANCE', fire_truck: 'FIRE_TRUCK', police: 'POLICE',
        rescue: 'AMBULANCE', command: 'POLICE',
      }
      await incidentFetch(`/incidents/${incidentId}/assign`, {
        method: 'PUT',
        body: JSON.stringify({
          assigned_unit_id:   vehicleId,
          assigned_unit_type: VTYPE_TO_BACKEND[vehicle?.type ?? 'ambulance'] ?? 'AMBULANCE',
        }),
      })
    }
  },

  /**
   * Recall a dispatched vehicle back to base.
   * Live: PUT /vehicles/:id/status → AVAILABLE
   */
  async recallVehicle(vehicleId: string): Promise<void> {
    if (IS_MOCK) {
      await sleep(400)
      const vehicle = vehicleStore.getById(vehicleId)
      if (!vehicle) throw new Error('Vehicle not found.')
      const previousIncidentId = vehicle.assignedIncidentId

      vehicleStore.update(vehicleId, {
        status: 'returning', assignedIncidentId: undefined,
        speed: Math.round(40 + Math.random() * 20),
        heading: Math.round(Math.random() * 360),
      })

      if (previousIncidentId) {
        const incident = incidentStore.getById(previousIncidentId)
        if (incident && incident.status === 'dispatched') {
          incidentStore.update(previousIncidentId, { status: 'pending', assignedVehicleId: undefined })
        }
      }

      messageStore.add({
        id: `MSG-${generateId()}`,
        fromId: 'COMMAND', fromName: 'NERDC Command',
        toId: vehicleId, toName: vehicle.callSign,
        content: `${vehicle.callSign}, you are recalled. Return to base and stand by.`,
        type: 'command', channel: vehicle.channel,
        timestamp: new Date().toISOString(), acknowledged: false, direction: 'outbound',
      })
      setTimeout(() => {
        messageStore.add({
          id: `MSG-${generateId()}`,
          fromId: vehicleId, fromName: vehicle.callSign,
          toId: 'COMMAND', toName: 'NERDC Command',
          content: `${vehicle.callSign} returning to base. Copy.`,
          type: 'acknowledgment', channel: vehicle.channel,
          timestamp: new Date().toISOString(), acknowledged: true, direction: 'inbound',
        })
      }, 1800 + Math.random() * 1500)
      return
    }

    // Live: mark vehicle AVAILABLE
    const res = await authFetch(`/vehicles/${vehicleId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'AVAILABLE', incident_id: null }),
    })
    if (!res.ok) throw new Error(await extractApiError(res, 'Failed to recall vehicle'))
  },

  subscribeToVehicleUpdates(cb: (vehicles: Vehicle[]) => void, intervalMs = 2000): () => void {
    if (IS_MOCK) {
      const unsubStore = vehicleStore.subscribe(cb)
      const timer = setInterval(() => {
        const incidents = incidentStore.getAll()
        vehicleStore.bulkUpdate(vehicleStore.getAll().map((v) => simulateMovement(v, incidents)))
      }, intervalMs)
      return () => { clearInterval(timer); unsubStore() }
    }

    // Live mode: poll REST + WebSocket for active vehicles
    let stopped = false
    const wsConnections = new Map<string, WebSocket>()

    async function poll() {
      try {
        const res = await authFetch('/vehicles')
        if (!res.ok) return
        const data = await res.json()
        const vehicles: Vehicle[] = data.map(normaliseVehicle)
        cb(vehicles)

        // Open WebSocket for each ON_DUTY vehicle
        if (WS_BASE) {
          for (const v of vehicles) {
            if (v.status === 'en_route' && !wsConnections.has(v.id)) {
              const ws = new WebSocket(`${WS_BASE}/vehicles/${v.id}/ws`)
              ws.onmessage = async () => {
                // Re-poll on any location update
                const r = await authFetch('/vehicles')
                if (r.ok) cb((await r.json()).map(normaliseVehicle))
              }
              ws.onclose = () => wsConnections.delete(v.id)
              wsConnections.set(v.id, ws)
            }
          }
        }
      } catch { /* ignore */ }
    }

    poll()
    const timer = setInterval(() => { if (!stopped) poll() }, intervalMs)

    return () => {
      stopped = true
      clearInterval(timer)
      wsConnections.forEach((ws) => ws.close())
      wsConnections.clear()
    }
  },
}
