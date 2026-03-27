import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Eye, EyeOff, Shield, AlertCircle, Zap,
  Lock, Mail, User, Building2,
  ShieldCheck, Hospital, Siren, Flame,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'

const ROLES: { value: UserRole; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { value: 'system_admin',   label: 'System Administrator',         description: 'Full platform access and user management',           icon: ShieldCheck, color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'   },
  { value: 'hospital_admin', label: 'Hospital Administrator',       description: 'Manages ambulance fleet and medical incidents',       icon: Hospital,    color: 'border-green-500/40 bg-green-500/10 text-green-300' },
  { value: 'police_admin',   label: 'Police Administrator',         description: 'Manages police units and crime incidents',            icon: Siren,       color: 'border-blue-500/40 bg-blue-500/10 text-blue-300'    },
  { value: 'fire_admin',     label: 'Fire Service Administrator',   description: 'Manages fire trucks and fire/explosion incidents',    icon: Flame,       color: 'border-orange-500/40 bg-orange-500/10 text-orange-300' },
]

const schema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters.'),
  email:        z.string().email('Enter a valid email address.'),
  organization: z.string().min(2, 'Organisation name is required.'),
  role:         z.enum(['system_admin','hospital_admin','police_admin','fire_admin'] as const),
  password:     z.string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Must contain at least one number.'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
})

type FormValues = z.infer<typeof schema>

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-red-400 text-xs mt-1.5">{msg}</p>
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser, isLoading, error, isAuthenticated, clearError } = useAuthStore()
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'hospital_admin' },
  })

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  // Clear store error when user starts editing
  useEffect(() => { clearError() }, [clearError])

  async function onSubmit(values: FormValues) {
    await registerUser({
      name:         values.name,
      email:        values.email,
      password:     values.password,
      role:         values.role,
      organization: values.organization,
    })
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/[0.06] rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/[0.05] rounded-full blur-3xl translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-600/[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56,206,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,206,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="w-full max-w-lg relative z-10 animate-fade-in py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 mb-4 shadow-glow-cyan">
            <Zap className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">National Emergency Response &amp; Dispatch Centre</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl shadow-glass-lg border border-white/[0.07] p-8">
          <div className="flex items-center gap-2 mb-7">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operator Registration</span>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name + Organisation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    {...register('name')}
                    placeholder="Your full name"
                    className={cn('input-field pl-10', errors.name && 'input-error')}
                    autoComplete="name"
                  />
                </div>
                <FieldError msg={errors.name?.message} />
              </div>
              <div>
                <label className="label">Organisation</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    {...register('organization')}
                    placeholder="e.g. NERDC HQ"
                    className={cn('input-field pl-10', errors.organization && 'input-error')}
                    autoComplete="organization"
                  />
                </div>
                <FieldError msg={errors.organization?.message} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@nerdc.gov.gh"
                  className={cn('input-field pl-10', errors.email && 'input-error')}
                  autoComplete="email"
                />
              </div>
              <FieldError msg={errors.email?.message} />
            </div>

            {/* Role */}
            <div>
              <label className="label">Access Role</label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map((r) => {
                      const Icon = r.icon
                      const active = field.value === r.value
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => field.onChange(r.value)}
                          className={cn(
                            'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-150',
                            active
                              ? r.color
                              : 'bg-white/3 border-white/8 text-slate-400 hover:bg-white/6 hover:text-slate-200'
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-semibold leading-tight">{r.label}</span>
                          <span className="text-[10px] leading-tight opacity-70">{r.description}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              />
              <FieldError msg={errors.role?.message} />
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn('input-field pl-10 pr-10', errors.password && 'input-error')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError msg={errors.password?.message} />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    {...register('confirmPassword')}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn('input-field pl-10 pr-10', errors.confirmPassword && 'input-error')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError msg={errors.confirmPassword?.message} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating Account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Sign in link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          © {new Date().getFullYear()} National Emergency Response &amp; Dispatch Centre
        </p>
      </div>
    </div>
  )
}
