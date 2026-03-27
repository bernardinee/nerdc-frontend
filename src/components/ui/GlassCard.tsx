import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  glow?: 'cyan' | 'red' | 'green' | 'amber' | 'none'
  hover?: boolean
  onClick?: () => void
}

const glowMap = {
  cyan:  'hover:shadow-glow-cyan',
  red:   'hover:shadow-glow-red',
  green: 'hover:shadow-glow-green',
  amber: 'hover:shadow-glow-amber',
  none:  '',
}

export function GlassCard({ children, className, style, glow = 'none', hover = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        'glass rounded-2xl shadow-glass transition-all duration-200',
        hover && 'glass-hover cursor-pointer',
        glow !== 'none' && glowMap[glow],
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
