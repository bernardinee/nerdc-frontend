import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Shield, Mail, Building2, LogOut, Clock, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime } from '@/lib/utils'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { admin, logout } = useAuthStore()

  async function handleLogout() {
    await logout()
    toast.success('Signed out successfully.')
    navigate('/login')
  }

  if (!admin) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Avatar / header */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shadow-glow-cyan flex-shrink-0">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{admin.name}</h2>
            <p className="text-sm text-slate-400 capitalize mt-0.5">{admin.role.replace('_', ' ')}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              Active Session
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Details */}
      <GlassCard className="p-6">
        <SectionHeader title="Account Details" className="mb-5" />
        <div className="space-y-4">
          <ProfileRow icon={Mail} label="Email" value={admin.email} />
          <ProfileRow icon={Shield} label="Role" value={admin.role.replace('_', ' ')} capitalize />
          <ProfileRow icon={Building2} label="Organization" value={admin.organization} />
          <ProfileRow icon={Clock} label="Last Login" value={formatDateTime(admin.lastLogin ?? new Date().toISOString())} />
          <ProfileRow icon={Key} label="Account ID" value={admin.id} mono />
        </div>
      </GlassCard>

      {/* Actions */}
      <GlassCard className="p-6">
        <SectionHeader title="Session" className="mb-4" />
        <button onClick={handleLogout} className="btn-danger w-full">
          <LogOut className="w-4 h-4" />
          Sign Out of Command Centre
        </button>
      </GlassCard>
    </div>
  )
}

function ProfileRow({
  icon: Icon, label, value, capitalize, mono,
}: {
  icon: React.ElementType; label: string; value: string; capitalize?: boolean; mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-sm text-white mt-0.5 ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}
