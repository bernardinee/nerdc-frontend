// TODO: Replace with real API when backend is ready.
// getDispatchSummary() → GET /api/dispatch/summary

import type { DispatchSummary } from '@/types'
import { incidentStore } from '../mocks/mockStore'
import { vehicleStore } from '../mocks/mockStore'
import { sleep } from '@/lib/utils'

export const dispatchService = {
  async getDispatchSummary(): Promise<DispatchSummary> {
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
  },
}
