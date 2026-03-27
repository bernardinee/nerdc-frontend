/**
 * Analytics Service
 *
 * Endpoint map:
 *   getResponseTimes()         GET /analytics/response-times
 *   getIncidentsByRegion()     GET /analytics/incidents-by-region
 *   getResourceUtilization()   GET /analytics/resource-utilization
 *   getAnalyticsOverview()     Aggregates all three (used by the analytics page)
 */

import type { AnalyticsOverview, IncidentType } from '@/types'
import { incidentStore, vehicleStore } from '../mocks/mockStore'
import { sleep } from '@/lib/utils'
import { subDays, format } from 'date-fns'

export const analyticsService = {

  // GET /analytics/response-times
  async getResponseTimes() {
    await sleep(300)
    const resolved = incidentStore.getAll().filter((i) => i.status === 'resolved' && i.responseTimeMinutes)
    const times = resolved.map((i) => i.responseTimeMinutes!)
    const avg = times.length > 0 ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : 0
    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i)
      const base = 8 + Math.sin(i) * 3 + Math.random() * 4
      return {
        date: format(d, 'MMM d'),
        avgMinutes: Math.round(base),
        minMinutes: Math.round(base * 0.6),
        maxMinutes: Math.round(base * 1.8),
      }
    })
    return {
      avgMinutes: avg,
      minMinutes: times.length > 0 ? Math.min(...times) : 0,
      maxMinutes: times.length > 0 ? Math.max(...times) : 0,
      trend,
    }
  },

  // GET /analytics/incidents-by-region
  async getIncidentsByRegion() {
    await sleep(300)
    const incidents = incidentStore.getAll()
    const map: Record<string, { count: number; byType: Partial<Record<IncidentType, number>> }> = {}
    for (const inc of incidents) {
      if (!map[inc.location.region]) map[inc.location.region] = { count: 0, byType: {} }
      map[inc.location.region].count++
      map[inc.location.region].byType[inc.type] = (map[inc.location.region].byType[inc.type] ?? 0) + 1
    }
    return Object.entries(map).map(([region, data]) => ({ region, ...data }))
  },

  // GET /analytics/resource-utilization
  async getResourceUtilization() {
    await sleep(300)
    return vehicleStore.getAll().map((v) => ({
      vehicleId: v.id,
      callSign: v.callSign,
      stationId: v.stationId,
      type: v.type,
      hoursActive: Math.round(4 + Math.random() * 12),
      incidentsHandled: Math.round(1 + Math.random() * 5),
      utilizationPct: Math.round(30 + Math.random() * 65),
    }))
  },

  // Aggregated overview used by the analytics page UI
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    await sleep(500)
    const [responseTimes, byRegion, utilization] = await Promise.all([
      this.getResponseTimes(),
      this.getIncidentsByRegion(),
      this.getResourceUtilization(),
    ])

    const incidents = incidentStore.getAll()
    const resolved = incidents.filter((i) => i.status === 'resolved')
    const resolutionRate = incidents.length > 0 ? Math.round((resolved.length / incidents.length) * 100) : 0

    const typeCounts: Record<string, number> = {}
    for (const inc of incidents) typeCounts[inc.type] = (typeCounts[inc.type] ?? 0) + 1
    const incidentsByType = Object.entries(typeCounts).map(([type, count]) => ({
      type: type as IncidentType,
      count,
      percentage: Math.round((count / Math.max(incidents.length, 1)) * 100),
    }))

    const incidentsByRegion = byRegion.map(({ region, count }) => ({ region, count }))

    return {
      totalIncidents: incidents.length,
      resolvedIncidents: resolved.length,
      resolutionRate,
      avgResponseTime: responseTimes.avgMinutes,
      incidentsByType,
      incidentsByRegion,
      responseTimeTrend: responseTimes.trend,
      vehicleUtilization: utilization,
    }
  },
}
