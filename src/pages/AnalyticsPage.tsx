import { useEffect, useState, useCallback } from 'react'
import { analyticsService } from '@/services/adapters/analyticsService'
import type { AnalyticsOverview } from '@/types'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CardSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import {
  CheckCircle2, Clock, AlertTriangle, TrendingUp,
  BarChart3, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const TYPE_COLORS = ['#00b8f5','#22c55e','#f59e0b','#ef4444','#a855f7','#06b6d4','#84cc16','#f97316']
const UTIL_COLOR = '#00b8f5'

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-3 py-2.5 shadow-glass-lg border border-white/8 text-xs">
      {label && <p className="text-slate-400 mb-1.5 font-semibold">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300 capitalize">{p.name.replace('_', ' ')}</span>
          <span className="text-white font-semibold ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const d = await analyticsService.getAnalyticsOverview()
      setData(d)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load analytics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 60s so counts stay current after incident status changes
    const timer = setInterval(() => fetchData(), 60_000)
    return () => clearInterval(timer)
  }, [fetchData])

  return (
    <div className="space-y-6 animate-fade-in">
      {loadError && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      )}
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">Auto-refreshes every 60 seconds</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : data ? (
          <>
            <StatCard label="Total Incidents"  value={data.totalIncidents}       icon={AlertTriangle}  color="red"    />
            <StatCard label="Resolved"         value={data.resolvedIncidents}    icon={CheckCircle2}   color="green"  />
            <StatCard label="Resolution Rate"  value={`${data.resolutionRate}%`} icon={TrendingUp}     color="cyan"   />
            <StatCard label="Avg Response"     value={`${data.avgResponseTime}m`}icon={Clock}          color="amber"  />
          </>
        ) : null}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Response time trend */}
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader title="Response Time Trend" subtitle="Last 7 days (minutes)" className="mb-5" />
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : data?.responseTimeTrend.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.responseTimeTrend}>
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00b8f5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00b8f5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="avgMinutes" name="Avg (min)" stroke="#00b8f5" strokeWidth={2} fill="url(#cyanGrad)" dot={{ fill: '#00b8f5', r: 3, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="maxMinutes" name="Max (min)" stroke="#ef4444" strokeWidth={1} fill="none" strokeDasharray="4 2" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No trend data" />
          )}
        </GlassCard>

        {/* Incidents by type */}
        <GlassCard className="p-5">
          <SectionHeader title="By Type" className="mb-4" />
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : data?.incidentsByType.length ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.incidentsByType} cx="50%" cy="50%" outerRadius={70} dataKey="count" paddingAngle={3}>
                    {data.incidentsByType.map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {data.incidentsByType.map((item, i) => (
                  <div key={item.type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                      <span className="text-slate-400 capitalize">{item.type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{item.count}</span>
                      <span className="text-slate-500">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={BarChart3} title="No data" />
          )}
        </GlassCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by region */}
        <GlassCard className="p-5">
          <SectionHeader title="Incidents by Region" className="mb-5" />
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : data?.incidentsByRegion.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.incidentsByRegion} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="region" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Incidents" fill="#00b8f5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No region data" />
          )}
        </GlassCard>

        {/* Vehicle utilization */}
        <GlassCard className="p-5">
          <SectionHeader title="Vehicle Utilization" subtitle="% of time active" className="mb-5" />
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : data?.vehicleUtilization.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.vehicleUtilization}>
                <XAxis dataKey="callSign" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} domain={[0, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="utilizationPct" name="Utilization" fill={UTIL_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No utilization data" />
          )}
        </GlassCard>
      </div>

      {/* Vehicle table */}
      {!loading && data?.vehicleUtilization && (
        <GlassCard className="p-5">
          <SectionHeader title="Unit Performance" className="mb-4" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  {['Call Sign', 'Hours Active', 'Incidents Handled', 'Utilization'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.vehicleUtilization.map((v) => (
                  <tr key={v.vehicleId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 font-semibold text-white">{v.callSign}</td>
                    <td className="px-3 py-3 text-slate-300">{v.hoursActive}h</td>
                    <td className="px-3 py-3 text-slate-300">{v.incidentsHandled}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${v.utilizationPct}%`,
                              background: v.utilizationPct > 70 ? '#22c55e' : v.utilizationPct > 40 ? '#00b8f5' : '#f59e0b',
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-300 font-semibold">{v.utilizationPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
