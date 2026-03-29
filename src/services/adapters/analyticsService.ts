/**
 * Analytics Service
 *
 * Endpoint map:
 *   getResponseTimes()         GET /analytics/response-times
 *   getIncidentsByRegion()     GET /analytics/incidents-by-region
 *   getResourceUtilization()   GET /analytics/resource-utilization
 *   getAnalyticsOverview()     Aggregates all three (used by the analytics page)
 */

import type { AnalyticsOverview, IncidentType, VehicleType } from '@/types'
import { incidentStore, vehicleStore } from '../mocks/mockStore'
import { sleep } from '@/lib/utils'
import { subDays, format } from 'date-fns'
import { apiFetch } from '../apiClient'
import { sessionAvgResponseTime } from './dispatchService'

// ─── Config ───────────────────────────────────────────────────────────────────

const ANALYTICS_BASE = (import.meta.env.VITE_ANALYTICS_URL as string | undefined)?.trim() ?? ''
const INCIDENT_BASE   = (import.meta.env.VITE_INCIDENT_URL  as string | undefined)?.trim() ?? ''
const IS_MOCK_ANALYTICS = ANALYTICS_BASE === ''

// ─── Live fetch helpers ───────────────────────────────────────────────────────

function authFetch(path: string) {
  return apiFetch(ANALYTICS_BASE, path)
}

function incidentFetch(path: string) {
  return apiFetch(INCIDENT_BASE, path)
}

// ─── Public service ───────────────────────────────────────────────────────────

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
    if (IS_MOCK_ANALYTICS) {
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
    }

    // Live mode
    const [rtRes, regionRes, utilRes, openRes] = await Promise.all([
      authFetch('/analytics/response-times'),
      authFetch('/analytics/incidents-by-region'),
      authFetch('/analytics/resource-utilization'),
      incidentFetch('/incidents/open'),
    ])

    const rt         = rtRes.ok   ? await rtRes.json()     : {}
    const regionData: { region: string; incident_type: string; count: number }[]
                     = regionRes.ok ? await regionRes.json() : []
    const utilData: { unit_type: string; unit_id: string; total_dispatches: number }[]
                     = utilRes.ok  ? await utilRes.json()  : []
    const openList: { id: string; type: string; status: string }[]
                     = openRes.ok  ? await openRes.json()  : []

    // Total incidents: open/active (from incident service) + resolved (from analytics)
    const resolvedCount = rt.total_resolved ?? 0
    const openCount     = Array.isArray(openList) ? openList.length : 0
    const totalIncidents = openCount + resolvedCount

    // Response times — use analytics avg if available, fall back to session data
    const avgResponseTime = Math.round((rt.average_seconds ?? 0) / 60) || sessionAvgResponseTime()

    // Incidents by type — built from the real incident list (accurate)
    const typeCounts: Record<string, number> = {}
    for (const inc of openList) {
      const t = inc.type?.toLowerCase() ?? 'other'
      typeCounts[t] = (typeCounts[t] ?? 0) + 1
    }
    // Supplement with region data for any resolved incidents
    for (const r of regionData) {
      const type = r.incident_type?.toLowerCase() ?? 'other'
      typeCounts[type] = (typeCounts[type] ?? 0) + r.count
    }
    const incidentsByType = Object.entries(typeCounts).map(([type, count]) => ({
      type: type as IncidentType,
      count,
      percentage: Math.round((count / Math.max(totalIncidents, 1)) * 100),
    }))

    // Incidents by region (from analytics — only populated when region is stored)
    const regionCounts: Record<string, number> = {}
    for (const r of regionData) regionCounts[r.region] = (regionCounts[r.region] ?? 0) + r.count
    const incidentsByRegion = Object.entries(regionCounts).map(([region, count]) => ({ region, count }))

    // Resource utilization
    const vehicleUtilization = utilData.map((u) => ({
      vehicleId:        u.unit_id,
      callSign:         `${u.unit_type}-${u.unit_id.slice(-4).toUpperCase()}`,
      stationId:        '',
      type:             (u.unit_type?.toLowerCase().replace(' ', '_') ?? 'ambulance') as VehicleType,
      hoursActive:      Math.round(u.total_dispatches * 1.5),
      incidentsHandled: u.total_dispatches,
      utilizationPct:   Math.min(100, Math.round(u.total_dispatches * 10)),
    }))

    // Response time trend across 7 days
    const responseTimeTrend = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i)
      return {
        date:       format(d, 'MMM d'),
        avgMinutes: avgResponseTime,
        minMinutes: Math.round((rt.min_seconds ?? 0) / 60),
        maxMinutes: Math.round((rt.max_seconds ?? 0) / 60),
      }
    })

    return {
      totalIncidents,
      resolvedIncidents:  resolvedCount,
      resolutionRate:     totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0,
      avgResponseTime,
      incidentsByType,
      incidentsByRegion,
      responseTimeTrend,
      vehicleUtilization,
    }
  },
}
