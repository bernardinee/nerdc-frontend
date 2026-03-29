import { incidentStore, vehicleStore } from './mocks/mockStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { apiFetch } from './apiClient'
import toast from 'react-hot-toast'

const UNATTENDED_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutes
const LIVE_POLL_INTERVAL_MS   = 30 * 1000      // poll live API every 30s

const INCIDENT_BASE = (import.meta.env.VITE_INCIDENT_URL as string | undefined)?.trim() ?? ''
const DISPATCH_BASE = (import.meta.env.VITE_DISPATCH_URL as string | undefined)?.trim() ?? ''
const IS_LIVE = INCIDENT_BASE !== '' && DISPATCH_BASE !== ''

// Track seen IDs so we don't re-notify on same state
const seenIncidentStatuses = new Map<string, string>()
const seenVehicleStatuses  = new Map<string, string>()

function notify(n: Parameters<ReturnType<typeof useNotificationStore.getState>['add']>[0]) {
  useNotificationStore.getState().add(n)
}

function toastForType(type: string, title: string) {
  switch (type) {
    case 'incident_created':     toast(title, { icon: '🚨', duration: 4000 }); break
    case 'incident_unattended':  toast(title, { icon: '⏰', duration: 5000 }); break
    case 'incident_resolved':    toast.success(title, { duration: 4000 });     break
    case 'vehicle_returning':    toast(title, { icon: '🔄', duration: 3500 }); break
    case 'vehicle_available':    toast(title, { icon: '✅', duration: 3500 }); break
  }
}

function processIncidents(incidents: { id: string; type: string; status: string; citizenName?: string; citizen_name?: string; location?: { address?: string } | string; created_at?: string; createdAt?: string }[]) {
  const now = Date.now()

  for (const inc of incidents) {
    const prev = seenIncidentStatuses.get(inc.id)
    const status = inc.status?.toLowerCase() ?? ''

    if (!prev) {
      // Brand-new (not seen before this session)
      seenIncidentStatuses.set(inc.id, status)
      // Only fire "new" notification for recently created incidents (within last 5 min)
      const createdAt = inc.createdAt ?? inc.created_at
      const age = createdAt ? now - new Date(createdAt).getTime() : Infinity
      if (age < 5 * 60 * 1000) {
        const name    = inc.citizenName ?? inc.citizen_name ?? 'Unknown'
        const address = typeof inc.location === 'object' ? inc.location?.address ?? '' : (inc.location ?? '')
        const n = {
          type:       'incident_created' as const,
          title:      'New Incident Recorded',
          message:    `${inc.type?.replace('_', ' ')} reported by ${name} at ${address}.`,
          incidentId: inc.id,
        }
        notify(n)
        toastForType(n.type, n.title)
      }
      continue
    }

    if (prev !== status) {
      seenIncidentStatuses.set(inc.id, status)
      if (status === 'resolved') {
        const n = {
          type:       'incident_resolved' as const,
          title:      'Incident Resolved',
          message:    `Incident ${inc.id} (${inc.type?.replace('_', ' ')}) has been resolved.`,
          incidentId: inc.id,
        }
        notify(n)
        toastForType(n.type, n.title)
      }
    }
  }

  // Unattended: only incidents with status 'created' older than threshold
  const unattended = incidents.filter((i) => {
    if ((i.status?.toLowerCase() ?? '') !== 'created') return false
    const createdAt = i.createdAt ?? i.created_at
    if (!createdAt) return false
    return now - new Date(createdAt).getTime() > UNATTENDED_THRESHOLD_MS
  })

  if (unattended.length > 0) {
    const n = {
      type:    'incident_unattended' as const,
      title:   `${unattended.length} Incident${unattended.length > 1 ? 's' : ''} Awaiting Dispatch`,
      message: `${unattended.length} incident${unattended.length > 1 ? 's have' : ' has'} not been attended to yet.`,
    }
    notify(n)
    toastForType(n.type, n.title)
  }
}

function processVehicles(vehicles: { id: string; status: string; callSign?: string; call_sign?: string }[]) {
  for (const v of vehicles) {
    const status = v.status?.toLowerCase() ?? ''
    const prev   = seenVehicleStatuses.get(v.id)
    if (prev === status) continue
    seenVehicleStatuses.set(v.id, status)
    if (!prev) continue // skip first-run init

    const callSign = v.callSign ?? v.call_sign ?? v.id

    if (status === 'returning') {
      const n = {
        type:      'vehicle_returning' as const,
        title:     'Unit Returning to Base',
        message:   `${callSign} is returning to base.`,
        vehicleId: v.id,
      }
      notify(n)
      toastForType(n.type, n.title)
    }

    if (status === 'available') {
      const n = {
        type:      'vehicle_available' as const,
        title:     'Unit Now Available',
        message:   `${callSign} is available and ready for dispatch.`,
        vehicleId: v.id,
      }
      notify(n)
      toastForType(n.type, n.title)
    }
  }
}

// ─── Live polling ─────────────────────────────────────────────────────────────

async function pollLive() {
  try {
    const [incRes, vehRes] = await Promise.all([
      apiFetch(INCIDENT_BASE, '/incidents/open').catch(() => null),
      apiFetch(DISPATCH_BASE, '/vehicles').catch(() => null),
    ])
    if (incRes?.ok) {
      const data = await incRes.json()
      processIncidents(Array.isArray(data) ? data : [])
    }
    if (vehRes?.ok) {
      const data = await vehRes.json()
      processVehicles(Array.isArray(data) ? data : [])
    }
  } catch {
    // Silently ignore poll errors — don't spam the user with notification failures
  }
}

// ─── Mock subscriptions ───────────────────────────────────────────────────────

function startMockListeners() {
  incidentStore.subscribe((incidents) => {
    processIncidents(
      incidents.map((i) => ({
        id:         i.id,
        type:       i.type,
        status:     i.status,
        citizenName: i.citizenName,
        location:   i.location,
        createdAt:  i.createdAt,
      }))
    )
  })

  vehicleStore.subscribe((vehicles) => {
    processVehicles(vehicles.map((v) => ({ id: v.id, status: v.status, callSign: v.callSign })))
  })

  // Periodic unattended check for mock mode
  setInterval(() => {
    const incidents = incidentStore.getAll().map((i) => ({
      id: i.id, type: i.type, status: i.status, citizenName: i.citizenName,
      location: i.location, createdAt: i.createdAt,
    }))
    processIncidents(incidents)
  }, UNATTENDED_THRESHOLD_MS)

  // Seed initial state so we don't fire "new" notifications for pre-existing data
  for (const inc of incidentStore.getAll()) seenIncidentStatuses.set(inc.id, inc.status)
  for (const v of vehicleStore.getAll())    seenVehicleStatuses.set(v.id, v.status)
}

// ─── Entry point ─────────────────────────────────────────────────────────────

let started = false

export function startNotificationService() {
  if (started) return
  started = true

  if (IS_LIVE) {
    // Seed seen state from an initial poll (so existing incidents don't all fire "new")
    pollLive().then(() => {
      // After seeding, start regular polling
      setInterval(pollLive, LIVE_POLL_INTERVAL_MS)
    })
  } else {
    startMockListeners()
  }
}
