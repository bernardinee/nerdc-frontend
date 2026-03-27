import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, Radio, Truck, CheckCircle2, Clock,
  FilePlus, ChevronRight, Activity, ShieldOff,
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CardSkeleton, TableRowSkeleton } from '@/components/ui/LoadingSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { dispatchService } from '@/services/adapters/dispatchService'
import { incidentService } from '@/services/adapters/incidentService'
import type { DispatchSummary, Incident } from '@/types'
import { timeAgo, formatDateTime } from '@/lib/utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  created: '#64748b',
  pending: '#f59e0b',
  dispatched: '#3b82f6',
  in_progress: '#00b8f5',
  resolved: '#22c55e',
}

const TYPE_ICONS: Record<string, string> = {
  fire: '🔥', medical: '🏥', accident: '🚗', crime: '🔫',
  flood: '🌊', explosion: '💥', missing_person: '🔍', other: '⚠️',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const unauthorised = searchParams.get('unauthorised') === '1'
  const [summary, setSummary] = useState<DispatchSummary | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [s, i] = await Promise.all([
        dispatchService.getDispatchSummary(),
        incidentService.getIncidents(),
      ])
      setSummary(s)
      setIncidents(i)
      setLoading(false)
    }
    load()

    // Live updates when incidents change
    const unsub = incidentService.subscribeToIncidents(async (updated) => {
      setIncidents(updated)
      const s = await dispatchService.getDispatchSummary()
      setSummary(s)
    })
    return unsub
  }, [])

  // Pie data from incidents
  const statusCounts = incidents.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  const recent = incidents.slice(0, 6)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Unauthorised notice */}
      {unauthorised && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
          <ShieldOff className="w-4 h-4 flex-shrink-0" />
          <span>You don&apos;t have permission to access that page.</span>
          <button
            onClick={() => setSearchParams({})}
            className="ml-auto text-red-400/60 hover:text-red-300 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : summary ? (
          <>
            <StatCard label="Open Incidents"      value={summary.openIncidents}            icon={AlertTriangle} color="red"    className="col-span-1" />
            <StatCard label="Dispatched"          value={summary.dispatchedIncidents}       icon={Radio}         color="cyan"   />
            <StatCard label="Active Vehicles"     value={summary.activeVehicles}            icon={Truck}         color="amber"  />
            <StatCard label="Resolved Today"      value={summary.resolvedIncidents}         icon={CheckCircle2}  color="green"  />
            <StatCard label="Avg Response"        value={`${summary.avgResponseTimeMinutes}m`} icon={Clock}      color="purple" subtext="minutes per incident" />
          </>
        ) : null}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent incidents table */}
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader
            title="Recent Incidents"
            subtitle={`${incidents.length} total incidents`}
            className="mb-4"
            action={
              <button
                onClick={() => navigate('/incidents/new')}
                className="btn-primary text-xs px-3 py-1.5"
              >
                <FilePlus className="w-3.5 h-3.5" />
                Record New
              </button>
            }
          />
          {loading ? (
            <table className="w-full"><tbody>{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}</tbody></table>
          ) : recent.length === 0 ? (
            <EmptyState title="No incidents yet" description="Record your first incident to get started." />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    {['ID', 'Citizen', 'Type', 'Severity', 'Status', 'Time'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {recent.map((inc) => (
                    <tr
                      key={inc.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => navigate('/dispatch')}
                    >
                      <td className="px-3 py-3 font-mono text-xs text-slate-400">{inc.id}</td>
                      <td className="px-3 py-3 text-white text-xs font-medium max-w-[120px] truncate">{inc.citizenName}</td>
                      <td className="px-3 py-3 text-xs text-slate-300">
                        <span>{TYPE_ICONS[inc.type]} </span>
                        <span className="capitalize">{inc.type}</span>
                      </td>
                      <td className="px-3 py-3">
                        {inc.severity && <StatusBadge type="severity" value={inc.severity} />}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge type="incident-status" value={inc.status} />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{timeAgo(inc.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {incidents.length > 6 && (
            <button
              onClick={() => navigate('/dispatch')}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors py-2 border-t border-white/6"
            >
              View all {incidents.length} incidents <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </GlassCard>

        {/* Status distribution */}
        <GlassCard className="p-5 flex flex-col">
          <SectionHeader title="Status Distribution" className="mb-4" />
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse" />
            </div>
          ) : pieData.length === 0 ? (
            <EmptyState icon={Activity} title="No data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#475569'} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(val, name) => [val, String(name).replace('_', ' ')]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[entry.name] }} />
                      <span className="text-slate-400 capitalize">{entry.name.replace('_', ' ')}</span>
                    </div>
                    <span className="text-white font-semibold">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {/* Quick actions */}
      <GlassCard className="p-5">
        <SectionHeader title="Quick Actions" className="mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Incident', icon: FilePlus, color: 'text-cyan-400', bg: 'bg-cyan-500/10', to: '/incidents/new' },
            { label: 'Dispatch Board', icon: Radio, color: 'text-blue-400', bg: 'bg-blue-500/10', to: '/dispatch' },
            { label: 'Live Tracking', icon: Truck, color: 'text-amber-400', bg: 'bg-amber-500/10', to: '/tracking' },
            { label: 'Analytics', icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10', to: '/analytics' },
          ].map(({ label, icon: Icon, color, bg, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={`flex flex-col items-center gap-2.5 p-4 rounded-xl ${bg} border border-white/6 hover:border-white/12 transition-all duration-200 hover:scale-[1.02] group`}
            >
              <Icon className={`w-6 h-6 ${color} group-hover:scale-110 transition-transform`} />
              <span className="text-xs font-semibold text-slate-300">{label}</span>
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
