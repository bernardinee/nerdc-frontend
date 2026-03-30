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
import { sessionAvgResponseTime, sessionResolvedCount } from './dispatchService'

// ─── Config ───────────────────────────────────────────────────────────────────

const ANALYTICS_BASE = (import.meta.env.VITE_ANALYTICS_URL as string | undefined)?.trim() ?? ''
const INCIDENT_BASE   = (import.meta.env.VITE_INCIDENT_URL  as string | undefined)?.trim() ?? ''
const DISPATCH_BASE   = (import.meta.env.VITE_DISPATCH_URL  as string | undefined)?.trim() ?? ''
const IS_MOCK_ANALYTICS = ANALYTICS_BASE === ''

// ─── Live fetch helpers ───────────────────────────────────────────────────────

function authFetch(path: string) {
  return apiFetch(ANALYTICS_BASE, path)
}

function incidentFetch(path: string) {
  return apiFetch(INCIDENT_BASE, path)
}

function dispatchFetch(path: string) {
  return apiFetch(DISPATCH_BASE, path)
}

// ─── Backend → frontend type mapping ─────────────────────────────────────────

const TYPE_FROM_BACKEND: Record<string, string> = {
  MEDICAL: 'medical', FIRE: 'fire', CRIME: 'crime', ACCIDENT: 'accident', OTHER: 'other',
}

const VTYPE_FROM_BACKEND: Record<string, string> = {
  AMBULANCE: 'ambulance', FIRE_TRUCK: 'fire_truck', POLICE: 'police',
}

// ─── localStorage extras (region/severity stored by incidentService) ──────────

function loadExtrasRegion(): Record<string, string> {
  try {
    const all = JSON.parse(localStorage.getItem('nerdc_incident_extras') ?? '{}') as
      Record<string, { region?: string }>
    const out: Record<string, string> = {}
    for (const [id, v] of Object.entries(all)) if (v.region) out[id] = v.region
    return out
  } catch { return {} }
}

// ─── Client-side vehicle dispatch tracking ────────────────────────────────────

interface DispatchRecord {
  callSign: string
  vehicleType: string
  stationId: string
  count: number
  lastDispatch: string
}

function loadVehicleDispatches(): Record<string, DispatchRecord> {
  try { return JSON.parse(localStorage.getItem('nerdc_vehicle_dispatches') ?? '{}') } catch { return {} }
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
    const [rtRes, utilRes, openRes, vehicleRes] = await Promise.all([
      authFetch('/analytics/response-times'),
      authFetch('/analytics/resource-utilization'),
      incidentFetch('/incidents/open'),
      DISPATCH_BASE ? dispatchFetch('/vehicles') : Promise.resolve(null),
    ])

    const rt       = rtRes.ok  ? await rtRes.json()  : {}
    const utilData: { unit_type: string; unit_id: string; total_dispatches: number }[]
                   = utilRes.ok ? await utilRes.json() : []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openList: any[] = openRes.ok ? await openRes.json() : []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicleList: any[] = vehicleRes?.ok ? await vehicleRes.json() : []

    // Total incidents: open (from incident service) + resolved (from analytics)
    const resolvedCount  = rt.total_resolved ?? 0
    const openCount      = Array.isArray(openList) ? openList.length : 0
    const totalIncidents = openCount + resolvedCount

    // Response times — use analytics avg if available, fall back to session data
    const avgResponseTime = Math.round((rt.average_seconds ?? 0) / 60) || sessionAvgResponseTime()

    // Incidents by type — backend sends `incident_type` (uppercase), map to frontend names
    const typeCounts: Record<string, number> = {}
    for (const inc of openList) {
      const raw = inc.incident_type ?? inc.type ?? 'OTHER'
      const t = TYPE_FROM_BACKEND[raw.toUpperCase()] ?? raw.toLowerCase()
      typeCounts[t] = (typeCounts[t] ?? 0) + 1
    }
    const incidentsByType = Object.entries(typeCounts).map(([type, count]) => ({
      type: type as IncidentType,
      count,
      percentage: Math.round((count / Math.max(totalIncidents, 1)) * 100),
    }))

    // Incidents by region — backend drops region field, so read from localStorage extras
    const regionExtras = loadExtrasRegion()
    const regionCounts: Record<string, number> = {}
    for (const inc of openList) {
      const region = regionExtras[inc.id] ?? inc.region ?? ''
      if (region) regionCounts[region] = (regionCounts[region] ?? 0) + 1
    }
    const incidentsByRegion = Object.entries(regionCounts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)

    // Resource utilization — built from client-side dispatch tracking (localStorage).
    // Only vehicles that have actually been dispatched appear here.
    // Falls back to analytics backend data if it ever starts returning results.
    const dispatchTracking = loadVehicleDispatches()
    const trackedIds = Object.keys(dispatchTracking)

    const vehicleUtilization = trackedIds.length > 0
      ? trackedIds.map((id) => {
          const d = dispatchTracking[id]
          // Try to enrich with live vehicle data (call sign, station)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const live: any = vehicleList.find((v: any) => v.id === id)
          return {
            vehicleId:        id,
            callSign:         live?.registration_number ?? d.callSign,
            stationId:        live?.station_id ?? d.stationId,
            type:             (VTYPE_FROM_BACKEND[live?.vehicle_type ?? ''] ?? d.vehicleType ?? 'ambulance') as VehicleType,
            hoursActive:      Math.round(d.count * 1.5),
            incidentsHandled: d.count,
            utilizationPct:   Math.min(100, d.count * 20),
          }
        }).sort((a, b) => b.incidentsHandled - a.incidentsHandled)
      : utilData.map((u) => ({
          vehicleId:        u.unit_id,
          callSign:         `${u.unit_type}-${u.unit_id.slice(-4).toUpperCase()}`,
          stationId:        '',
          type:             (VTYPE_FROM_BACKEND[u.unit_type] ?? 'ambulance') as VehicleType,
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

    const resolvedIncidents = Math.max(resolvedCount, sessionResolvedCount)
    return {
      totalIncidents,
      resolvedIncidents,
      resolutionRate:     totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0,
      avgResponseTime,
      incidentsByType,
      incidentsByRegion,
      responseTimeTrend,
      vehicleUtilization,
    }
  },
}
