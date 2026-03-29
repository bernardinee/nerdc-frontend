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

// ─── Frontend dispatch registry ──────────────────────────────────────────────
//
// The backend may not immediately reflect current_incident_id on the vehicle
// record after dispatch. We keep our own map so the animation layer always
// knows which incident a vehicle is heading to, regardless of backend lag.

const frontendDispatchMap = new Map<string, string>() // vehicleId → incidentId

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
   * Add an additional unit to an already-dispatched incident.
   * Only updates vehicle status — does NOT overwrite the incident's primary assignment.
   */
  async addVehicleToIncident(vehicleId: string, incidentId: string): Promise<void> {
    if (IS_MOCK) {
      await sleep(400)
      const vehicle = vehicleStore.getById(vehicleId)
      if (!vehicle) throw new Error('Vehicle not found.')
      vehicleStore.update(vehicleId, {
        status: 'en_route',
        assignedIncidentId: incidentId,
        speed: Math.round(60 + Math.random() * 30),
        heading: Math.round(Math.random() * 360),
      })
      return
    }
    const res = await authFetch(`/vehicles/${vehicleId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'ON_DUTY', incident_id: incidentId }),
    })
    if (!res.ok) throw new Error(await extractApiError(res, 'Failed to add unit to incident'))
    frontendDispatchMap.set(vehicleId, incidentId)
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

    // Register in frontend map immediately so animation starts without waiting for backend echo
    frontendDispatchMap.set(vehicleId, incidentId)

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
    frontendDispatchMap.delete(vehicleId)
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

    // ── Live mode ───────────────────────────────────────────────────────────
    //
    // The backend stores the real GPS position but drivers have no app to push
    // updates. We keep a local animation layer for ON_DUTY vehicles:
    //   • Backend poll  → source of truth for status, assigned incident, base position
    //   • localState    → animated position that moves toward the incident each tick
    //
    // If a real GPS push ever arrives via WebSocket, we snap the local position
    // to the actual coordinates so the two stay in sync.

    interface LocalState {
      lat: number; lng: number
      speed: number; heading: number
      status: Vehicle['status']
    }

    const localState = new Map<string, LocalState>()
    let lastBackendVehicles: Vehicle[] = []
    // Quick incident destination store (id → lat/lng)
    const incidentDestinations = new Map<string, { lat: number; lng: number }>()

    let stopped = false
    const wsConnections = new Map<string, WebSocket>()

    // Fetch destination for a specific incident by ID (works for any status)
    async function ensureDestination(incidentId: string) {
      if (!INCIDENT_BASE || incidentDestinations.has(incidentId)) return
      try {
        const res = await incidentFetch(`/incidents/${incidentId}`)
        if (!res.ok) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inc: any = await res.json()
        // Handle multiple backend response formats for coordinates
        const lat = inc.latitude ?? inc.location?.lat ?? inc.lat
        const lng = inc.longitude ?? inc.location?.lng ?? inc.lng
        if (lat != null && lng != null) {
          // Use incidentId as key (not inc.id) so lookup always works even if backend returns different id format
          incidentDestinations.set(incidentId, { lat: Number(lat), lng: Number(lng) })
        }
      } catch { /* ignore */ }
    }

    // Merge backend ground truth with local animation state
    function applySimulation(backendVehicles: Vehicle[]): Vehicle[] {
      return backendVehicles.map((bv) => {
        // Accept en_route OR dispatched (in case backend returns different status string)
        const isActive = bv.status === 'en_route' || bv.status === 'dispatched'
        // Prefer backend's assignedIncidentId; fall back to our own dispatch registry
        const incidentId = bv.assignedIncidentId ?? frontendDispatchMap.get(bv.id)

        if (!isActive || !incidentId) {
          localState.delete(bv.id)
          // If vehicle was recalled (status available/offline), remove from frontend map
          if (bv.status === 'available' || bv.status === 'offline') {
            frontendDispatchMap.delete(bv.id)
          }
          return bv
        }

        const dest = incidentDestinations.get(incidentId)
        if (!dest) return bv

        // Initialise local state from backend position on first sight
        if (!localState.has(bv.id)) {
          localState.set(bv.id, {
            lat:     bv.coordinates.lat,
            lng:     bv.coordinates.lng,
            speed:   Math.round(60 + Math.random() * 30),
            heading: Math.round(Math.random() * 360),
            status:  'en_route',
          })
        }

        const local = localState.get(bv.id)!

        // Build a synthetic incident so simulateMovement can compute bearing
        const syntheticIncident: Incident = {
          ...({} as Incident),
          id: incidentId,
          location: { lat: dest.lat, lng: dest.lng, address: '', region: '' },
        }

        const animated = simulateMovement(
          {
            ...bv,
            assignedIncidentId: incidentId,   // ensure lookup matches synthetic incident
            coordinates: { lat: local.lat, lng: local.lng },
            speed:   local.speed,
            heading: local.heading,
            status:  local.status,
          },
          [syntheticIncident],
        )

        localState.set(bv.id, {
          lat:     animated.coordinates.lat,
          lng:     animated.coordinates.lng,
          speed:   animated.speed,
          heading: animated.heading,
          status:  animated.status,
        })

        return animated
      })
    }

    // Poll backend for vehicle list + fetch any missing incident destinations
    let pollCount = 0
    async function pollBackend() {
      try {
        const res = await authFetch('/vehicles')
        if (!res.ok) return
        lastBackendVehicles = (await res.json()).map(normaliseVehicle)

        // For every active vehicle, ensure we have its incident's coordinates.
        // Use backend's current_incident_id OR our frontend dispatch registry as fallback.
        const activeVehicles = lastBackendVehicles.filter(
          (v) => v.status === 'en_route' || v.status === 'dispatched'
        )
        const activeIncidentIds = [
          ...new Set(
            activeVehicles
              .map((v) => v.assignedIncidentId ?? frontendDispatchMap.get(v.id))
              .filter(Boolean) as string[]
          ),
        ]
        // Also include any incidents in frontendDispatchMap whose vehicles haven't been polled yet
        for (const [, incId] of frontendDispatchMap) {
          if (!activeIncidentIds.includes(incId)) activeIncidentIds.push(incId)
        }
        await Promise.all(activeIncidentIds.map(ensureDestination))

        // Clean up destinations that are genuinely no longer needed
        // (only remove if not in frontendDispatchMap either)
        const frontendIncidentIds = new Set(frontendDispatchMap.values())
        const activeSet = new Set(activeIncidentIds)
        for (const id of incidentDestinations.keys()) {
          if (!activeSet.has(id) && !frontendIncidentIds.has(id)) {
            incidentDestinations.delete(id)
          }
        }

        // WebSocket for each active vehicle (real GPS if driver has app)
        if (WS_BASE) {
          for (const v of lastBackendVehicles) {
            if (v.status === 'en_route' && !wsConnections.has(v.id)) {
              const ws = new WebSocket(`${WS_BASE}/vehicles/${v.id}/ws`)
              ws.onmessage = (evt) => {
                try {
                  const loc = JSON.parse(evt.data as string)
                  if (loc.latitude != null && loc.longitude != null) {
                    const existing = localState.get(v.id)
                    if (existing) {
                      localState.set(v.id, { ...existing, lat: loc.latitude, lng: loc.longitude })
                    }
                  }
                } catch { /* ignore bad frames */ }
              }
              ws.onclose = () => wsConnections.delete(v.id)
              wsConnections.set(v.id, ws)
            }
          }
        }
      } catch { /* ignore */ }
    }

    // Animation tick — runs every intervalMs, backend poll every ~5 ticks
    async function tick() {
      pollCount++
      if (pollCount === 1 || pollCount % 5 === 0) {
        await pollBackend()
      }
      if (lastBackendVehicles.length > 0) {
        cb(applySimulation(lastBackendVehicles))
      }
    }

    tick()
    const timer = setInterval(() => { if (!stopped) tick() }, intervalMs)

    return () => {
      stopped = true
      clearInterval(timer)
      wsConnections.forEach((ws) => ws.close())
      wsConnections.clear()
    }
  },
}
