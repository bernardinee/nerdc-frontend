import { incidentStore, vehicleStore } from './mocks/mockStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import toast from 'react-hot-toast'

const UNATTENDED_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutes

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

let started = false

export function startNotificationService() {
  if (started) return
  started = true

  // ── Incident changes ──────────────────────────────────────────────────────
  incidentStore.subscribe((incidents) => {
    for (const inc of incidents) {
      const prev = seenIncidentStatuses.get(inc.id)

      if (!prev) {
        // Brand-new incident
        seenIncidentStatuses.set(inc.id, inc.status)
        const n = {
          type: 'incident_created' as const,
          title: 'New Incident Recorded',
          message: `${inc.type.replace('_', ' ')} reported by ${inc.citizenName} at ${inc.location.address}.`,
          incidentId: inc.id,
        }
        notify(n)
        toastForType(n.type, n.title)
        continue
      }

      if (prev !== inc.status) {
        seenIncidentStatuses.set(inc.id, inc.status)

        if (inc.status === 'resolved') {
          const n = {
            type: 'incident_resolved' as const,
            title: 'Incident Resolved',
            message: `Incident ${inc.id} (${inc.type.replace('_', ' ')}) has been resolved.`,
            incidentId: inc.id,
          }
          notify(n)
          toastForType(n.type, n.title)
        }
      }
    }
  })

  // ── Vehicle changes ───────────────────────────────────────────────────────
  vehicleStore.subscribe((vehicles) => {
    for (const v of vehicles) {
      const prev = seenVehicleStatuses.get(v.id)
      if (prev === v.status) continue
      seenVehicleStatuses.set(v.id, v.status)
      if (!prev) continue // skip first-run init

      if (v.status === 'returning') {
        const n = {
          type: 'vehicle_returning' as const,
          title: 'Unit Returning to Base',
          message: `${v.callSign} is returning to base.`,
          vehicleId: v.id,
        }
        notify(n)
        toastForType(n.type, n.title)
      }

      if (v.status === 'available') {
        const n = {
          type: 'vehicle_available' as const,
          title: 'Unit Now Available',
          message: `${v.callSign} is available and ready for dispatch.`,
          vehicleId: v.id,
        }
        notify(n)
        toastForType(n.type, n.title)
      }
    }
  })

  // ── Periodic: unattended incidents every 3 minutes ───────────────────────
  setInterval(() => {
    const now = Date.now()
    const unattended = incidentStore
      .getAll()
      .filter(
        (i) =>
          i.status === 'created' &&
          now - new Date(i.createdAt).getTime() > UNATTENDED_THRESHOLD_MS
      )

    if (unattended.length > 0) {
      const n = {
        type: 'incident_unattended' as const,
        title: `${unattended.length} Incident${unattended.length > 1 ? 's' : ''} Awaiting Dispatch`,
        message: `${unattended.length} incident${unattended.length > 1 ? 's have' : ' has'} not been attended to yet.`,
      }
      notify(n)
      toastForType(n.type, n.title)
    }
  }, UNATTENDED_THRESHOLD_MS)

  // Seed initial state so we don't fire "new" notifications for existing data on load
  for (const inc of incidentStore.getAll()) seenIncidentStatuses.set(inc.id, inc.status)
  for (const v of vehicleStore.getAll())   seenVehicleStatuses.set(v.id, v.status)
}
