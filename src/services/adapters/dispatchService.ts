// TODO: Replace with real API when backend is ready.
// getDispatchSummary() → GET /api/dispatch/summary

import type { DispatchSummary } from '@/types'
import { incidentStore } from '../mocks/mockStore'
import { vehicleStore } from '../mocks/mockStore'
import { sleep } from '@/lib/utils'
import { authService } from './authService'

// ─── Config ───────────────────────────────────────────────────────────────────

const ANALYTICS_BASE = (import.meta.env.VITE_ANALYTICS_URL as string | undefined)?.trim() ?? ''
const INCIDENT_BASE  = (import.meta.env.VITE_INCIDENT_URL as string | undefined)?.trim() ?? ''
const DISPATCH_BASE  = (import.meta.env.VITE_DISPATCH_URL as string | undefined)?.trim() ?? ''
const IS_MOCK = INCIDENT_BASE === '' && DISPATCH_BASE === ''

// ─── Live fetch helper ────────────────────────────────────────────────────────

async function authFetch(base: string, path: string): Promise<Response> {
  const token = authService.getToken()
  return fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

// ─── Public service ───────────────────────────────────────────────────────────

export const dispatchService = {
  async getDispatchSummary(): Promise<DispatchSummary> {
    if (IS_MOCK) {
      await sleep(300)
      const incidents = incidentStore.getAll()
      const vehicles = vehicleStore.getAll()

      const open = incidents.filter((i) => i.status !== 'resolved').length
      const dispatched = incidents.filter((i) =>
        i.status === 'dispatched' || i.status === 'in_progress'
      ).length
      const resolved = incidents.filter((i) => i.status === 'resolved').length
      const activeVehicles = vehicles.filter(
        (v) => v.status !== 'available' && v.status !== 'offline'
      ).length
      const resolved_with_time = incidents.filter(
        (i) => i.status === 'resolved' && i.responseTimeMinutes
      )
      const avgResponseTime =
        resolved_with_time.length > 0
          ? Math.round(
              resolved_with_time.reduce((sum, i) => sum + (i.responseTimeMinutes ?? 0), 0) /
                resolved_with_time.length
            )
          : 0

      return { openIncidents: open, dispatchedIncidents: dispatched, activeVehicles, resolvedIncidents: resolved, avgResponseTimeMinutes: avgResponseTime }
    }

    // Live: combine open incidents + vehicles + analytics response-times
    const [incidentRes, vehicleRes, rtRes] = await Promise.all([
      INCIDENT_BASE  ? authFetch(INCIDENT_BASE,  '/incidents/open')             : Promise.resolve(null),
      DISPATCH_BASE  ? authFetch(DISPATCH_BASE,  '/vehicles')                   : Promise.resolve(null),
      ANALYTICS_BASE ? authFetch(ANALYTICS_BASE, '/analytics/response-times')  : Promise.resolve(null),
    ])

    const incidents: { status: string }[] = incidentRes?.ok ? await incidentRes.json() : []
    const vehicles:  { status: string }[] = vehicleRes?.ok  ? await vehicleRes.json()  : []
    const rt = rtRes?.ok ? await rtRes.json() : {}

    const openIncidents       = incidents.length  // /incidents/open only returns non-resolved
    const dispatchedIncidents = incidents.filter((i) => ['DISPATCHED', 'IN_PROGRESS'].includes(i.status)).length
    const activeVehicles      = vehicles.filter((v) => v.status === 'ON_DUTY').length
    const resolvedIncidents   = rt.total_resolved ?? 0
    const avgSecs             = rt.average_seconds ?? 0

    return {
      openIncidents,
      dispatchedIncidents,
      activeVehicles,
      resolvedIncidents,
      avgResponseTimeMinutes: Math.round(avgSecs / 60),
    }
  },
}
