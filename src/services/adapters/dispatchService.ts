// TODO: Replace with real API when backend is ready.
// getDispatchSummary() → GET /api/dispatch/summary

import type { DispatchSummary } from '@/types'
import { incidentStore } from '../mocks/mockStore'
import { vehicleStore } from '../mocks/mockStore'
import { sleep } from '@/lib/utils'
import { apiFetch } from '../apiClient'

// ─── Config ───────────────────────────────────────────────────────────────────

const ANALYTICS_BASE = (import.meta.env.VITE_ANALYTICS_URL as string | undefined)?.trim() ?? ''
const INCIDENT_BASE  = (import.meta.env.VITE_INCIDENT_URL as string | undefined)?.trim() ?? ''
const DISPATCH_BASE  = (import.meta.env.VITE_DISPATCH_URL as string | undefined)?.trim() ?? ''
const IS_MOCK = INCIDENT_BASE === '' && DISPATCH_BASE === ''

// ─── Session response-time collector ─────────────────────────────────────────
// Collects response times (minutes) from incidents resolved in this browser
// session, used as a client-side fallback when the analytics backend returns 0.

const sessionResponseTimes: number[] = []

export function recordResolutionTime(createdAtIso: string) {
  const minutes = Math.round((Date.now() - new Date(createdAtIso).getTime()) / 60000)
  if (minutes > 0) sessionResponseTimes.push(minutes)
}

export function sessionAvgResponseTime(): number {
  if (sessionResponseTimes.length === 0) return 0
  return Math.round(sessionResponseTimes.reduce((a, b) => a + b, 0) / sessionResponseTimes.length)
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
      INCIDENT_BASE  ? apiFetch(INCIDENT_BASE,  '/incidents/open')            : Promise.resolve(null),
      DISPATCH_BASE  ? apiFetch(DISPATCH_BASE,  '/vehicles')                  : Promise.resolve(null),
      ANALYTICS_BASE ? apiFetch(ANALYTICS_BASE, '/analytics/response-times') : Promise.resolve(null),
    ])

    const incidents: { status: string }[] = incidentRes?.ok ? await incidentRes.json() : []
    const vehicles:  { status: string }[] = vehicleRes?.ok  ? await vehicleRes.json()  : []
    const rt = rtRes?.ok ? await rtRes.json() : {}

    const openIncidents       = incidents.length  // /incidents/open only returns non-resolved
    const dispatchedIncidents = incidents.filter((i) => ['DISPATCHED', 'IN_PROGRESS'].includes(i.status)).length
    const activeVehicles      = vehicles.filter((v) => v.status === 'ON_DUTY').length
    const resolvedIncidents = rt.total_resolved ?? 0
    const analyticsAvg      = Math.round((rt.average_seconds ?? 0) / 60)
    // Use analytics avg if available, fall back to session-collected times
    const avgResponseTimeMinutes = analyticsAvg || sessionAvgResponseTime()

    return {
      openIncidents,
      dispatchedIncidents,
      activeVehicles,
      resolvedIncidents,
      avgResponseTimeMinutes,
    }
  },
}
