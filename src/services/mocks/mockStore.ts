import type { DispatchMessage, Incident, Vehicle } from '@/types'
import { MOCK_INCIDENTS, MOCK_MESSAGES, MOCK_VEHICLES } from './mockData'

// In-memory mock store — single source of truth for all mock services.
// When you add a real backend, replace these stores with API calls in the adapters.

let incidents: Incident[] = [...MOCK_INCIDENTS]
let vehicles: Vehicle[] = [...MOCK_VEHICLES]
let messages: DispatchMessage[] = [...MOCK_MESSAGES]

type Listener<T> = (data: T) => void
const listeners: {
  vehicles:  Array<Listener<Vehicle[]>>
  incidents: Array<Listener<Incident[]>>
  messages:  Array<Listener<DispatchMessage[]>>
} = { vehicles: [], incidents: [], messages: [] }

function notify<K extends keyof typeof listeners>(key: K) {
  const map = { vehicles, incidents, messages }
  const data = map[key]
  ;(listeners[key] as Array<Listener<typeof data>>).forEach((fn) => fn(data as typeof data))
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export const incidentStore = {
  getAll: () => [...incidents],
  getById: (id: string) => incidents.find((i) => i.id === id),
  add: (incident: Incident) => {
    incidents = [incident, ...incidents]
    notify('incidents')
  },
  update: (id: string, partial: Partial<Incident>) => {
    incidents = incidents.map((i) =>
      i.id === id ? { ...i, ...partial, updatedAt: new Date().toISOString() } : i
    )
    notify('incidents')
  },
  subscribe: (fn: Listener<Incident[]>) => {
    listeners.incidents.push(fn)
    return () => { listeners.incidents = listeners.incidents.filter((l) => l !== fn) }
  },
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export const vehicleStore = {
  getAll: () => [...vehicles],
  getById: (id: string) => vehicles.find((v) => v.id === id),
  add: (vehicle: Vehicle) => {
    vehicles = [...vehicles, vehicle]
    notify('vehicles')
  },
  update: (id: string, partial: Partial<Vehicle>) => {
    vehicles = vehicles.map((v) =>
      v.id === id ? { ...v, ...partial, lastUpdated: new Date().toISOString() } : v
    )
    notify('vehicles')
  },
  bulkUpdate: (updatedVehicles: Vehicle[]) => {
    vehicles = updatedVehicles.map((v) => ({ ...v, lastUpdated: new Date().toISOString() }))
    notify('vehicles')
  },
  subscribe: (fn: Listener<Vehicle[]>) => {
    listeners.vehicles.push(fn)
    return () => { listeners.vehicles = listeners.vehicles.filter((l) => l !== fn) }
  },
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messageStore = {
  getAll: () => [...messages],
  add: (msg: DispatchMessage) => {
    messages = [...messages, msg]
    notify('messages')
  },
  acknowledge: (id: string) => {
    messages = messages.map((m) => m.id === id ? { ...m, acknowledged: true } : m)
    notify('messages')
  },
  subscribe: (fn: Listener<DispatchMessage[]>) => {
    listeners.messages.push(fn)
    return () => { listeners.messages = listeners.messages.filter((l) => l !== fn) }
  },
}
