// Endpoint map:
//   getVehicles()                  GET  /vehicles
//   getVehicleById(id)             GET  /vehicles/:id
//   getVehicleLocation(id)         GET  /vehicles/:id/location
//   registerVehicle(payload)       POST /vehicles/register
//   dispatchVehicle(vId, incId)    PUT  /incidents/:id/assign
//   recallVehicle(vehicleId)       POST /vehicles/:id/recall

import type { Vehicle, VehicleType, RadioChannel } from '@/types'
import { vehicleStore, incidentStore, messageStore } from '../mocks/mockStore'
import { sleep, generateId } from '@/lib/utils'

function simulateMovement(vehicle: Vehicle): Vehicle {
  if (['available', 'offline'].includes(vehicle.status) || vehicle.speed === 0) return vehicle

  const speedFactor = (vehicle.speed / 3600) * 0.001
  const radians = (vehicle.heading * Math.PI) / 180
  const dlat = Math.cos(radians) * speedFactor * (0.8 + Math.random() * 0.4)
  const dlng = Math.sin(radians) * speedFactor * (0.8 + Math.random() * 0.4)
  const newSpeed = Math.max(0, vehicle.speed + (Math.random() - 0.5) * 5)
  const newHeading = (vehicle.heading + (Math.random() - 0.5) * 10 + 360) % 360

  return {
    ...vehicle,
    coordinates: { lat: vehicle.coordinates.lat + dlat, lng: vehicle.coordinates.lng + dlng },
    speed: Math.round(newSpeed),
    heading: Math.round(newHeading),
  }
}

export const vehicleService = {
  async getVehicles(): Promise<Vehicle[]> {
    await sleep(350)
    return vehicleStore.getAll()
  },

  async getVehicleById(id: string): Promise<Vehicle | undefined> {
    await sleep(200)
    return vehicleStore.getById(id)
  },

  // GET /vehicles/:id/location
  async getVehicleLocation(id: string): Promise<{ lat: number; lng: number; updatedAt: string } | undefined> {
    await sleep(150)
    const v = vehicleStore.getById(id)
    if (!v) return undefined
    return { lat: v.coordinates.lat, lng: v.coordinates.lng, updatedAt: v.lastUpdated }
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
   * Updates vehicle status → en_route, links incident, fires a radio message.
   * PUT /incidents/:id/assign
   */
  async dispatchVehicle(vehicleId: string, incidentId: string): Promise<void> {
    await sleep(500)

    const vehicle = vehicleStore.getById(vehicleId)
    const incident = incidentStore.getById(incidentId)
    if (!vehicle || !incident) throw new Error('Vehicle or incident not found.')
    if (vehicle.status === 'offline') throw new Error('Cannot dispatch an offline unit.')

    // Update vehicle
    vehicleStore.update(vehicleId, {
      status: 'en_route',
      assignedIncidentId: incidentId,
      speed: Math.round(60 + Math.random() * 30),
      heading: Math.round(Math.random() * 360),
    })

    // Update incident
    incidentStore.update(incidentId, {
      status: 'dispatched',
      assignedVehicleId: vehicleId,
    })

    // Auto radio message
    const eta = Math.round(4 + Math.random() * 10)
    messageStore.add({
      id: `MSG-${generateId()}`,
      fromId: 'COMMAND',
      fromName: 'NERDC Command',
      toId: vehicleId,
      toName: vehicle.callSign,
      content: `${vehicle.callSign}, you are dispatched to ${incidentId} — ${incident.location.address}. Proceed immediately. ETA estimate ${eta} minutes.`,
      type: 'command',
      channel: vehicle.channel,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      direction: 'outbound',
    })

    // Vehicle acknowledges after a short delay
    setTimeout(() => {
      const v = vehicleStore.getById(vehicleId)
      if (!v) return
      messageStore.add({
        id: `MSG-${generateId()}`,
        fromId: vehicleId,
        fromName: vehicle.callSign,
        toId: 'COMMAND',
        toName: 'NERDC Command',
        content: `${vehicle.callSign} copies. En route to ${incidentId}. ETA ${eta} minutes. Over.`,
        type: 'acknowledgment',
        channel: vehicle.channel,
        timestamp: new Date().toISOString(),
        acknowledged: true,
        direction: 'inbound',
      })
    }, 2500 + Math.random() * 2000)
  },

  /**
   * Recall a dispatched vehicle back to base.
   * POST /vehicles/:id/recall
   */
  async recallVehicle(vehicleId: string): Promise<void> {
    await sleep(400)

    const vehicle = vehicleStore.getById(vehicleId)
    if (!vehicle) throw new Error('Vehicle not found.')

    const previousIncidentId = vehicle.assignedIncidentId

    // Free the vehicle
    vehicleStore.update(vehicleId, {
      status: 'returning',
      assignedIncidentId: undefined,
      speed: Math.round(40 + Math.random() * 20),
      heading: Math.round(Math.random() * 360),
    })

    // Revert incident to pending if it was only dispatched (not in_progress)
    if (previousIncidentId) {
      const incident = incidentStore.getById(previousIncidentId)
      if (incident && incident.status === 'dispatched') {
        incidentStore.update(previousIncidentId, {
          status: 'pending',
          assignedVehicleId: undefined,
        })
      }
    }

    // Radio message
    messageStore.add({
      id: `MSG-${generateId()}`,
      fromId: 'COMMAND',
      fromName: 'NERDC Command',
      toId: vehicleId,
      toName: vehicle.callSign,
      content: `${vehicle.callSign}, you are recalled. Return to base and stand by.`,
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
        content: `${vehicle.callSign} returning to base. Copy.`,
        type: 'acknowledgment',
        channel: vehicle.channel,
        timestamp: new Date().toISOString(),
        acknowledged: true,
        direction: 'inbound',
      })
    }, 1800 + Math.random() * 1500)
  },

  subscribeToVehicleUpdates(cb: (vehicles: Vehicle[]) => void, intervalMs = 2000): () => void {
    const unsubStore = vehicleStore.subscribe(cb)
    const timer = setInterval(() => {
      vehicleStore.bulkUpdate(vehicleStore.getAll().map(simulateMovement))
    }, intervalMs)
    return () => { clearInterval(timer); unsubStore() }
  },
}
