import { useEffect, useRef, useState } from 'react'
import { Send, Radio, Volume2, VolumeX, CheckCheck, Wifi } from 'lucide-react'
import { communicationService } from '@/services/adapters/communicationService'
import { useAuthStore } from '@/store/useAuthStore'
import type { DispatchMessage, RadioChannel, Vehicle } from '@/types'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils'

const CHANNEL_CONFIG: Record<RadioChannel, { label: string; color: string; bg: string; border: string }> = {
  all:     { label: 'ALL UNITS', color: 'text-white',       bg: 'bg-slate-500/20',  border: 'border-slate-500/30' },
  alpha:   { label: 'ALPHA',     color: 'text-cyan-300',    bg: 'bg-cyan-500/15',   border: 'border-cyan-500/25' },
  bravo:   { label: 'BRAVO',     color: 'text-red-300',     bg: 'bg-red-500/15',    border: 'border-red-500/25'  },
  charlie: { label: 'CHARLIE',   color: 'text-amber-300',   bg: 'bg-amber-500/15',  border: 'border-amber-500/25'},
  command: { label: 'COMMAND',   color: 'text-purple-300',  bg: 'bg-purple-500/15', border: 'border-purple-500/25'},
}

const QUICK_COMMANDS = [
  'All units stand by.',
  'Proceed to scene immediately.',
  'Return to base when clear.',
  'Situation report required.',
  'Medical unit requested on scene.',
  'Perimeter established. All clear.',
]

interface Props {
  vehicles: Vehicle[]
  selectedVehicle: Vehicle | null
  className?: string
}

export function CommunicationPanel({ vehicles, selectedVehicle, className }: Props) {
  const admin = useAuthStore((s) => s.admin)
  const [messages, setMessages] = useState<DispatchMessage[]>([])
  const [channel, setChannel] = useState<RadioChannel>('all')
  const [toId, setToId] = useState<string>('ALL')
  const [toName, setToName] = useState<string>('All Units')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [muted, setMuted] = useState(false)
  const [unread, setUnread] = useState(0)
  const logRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  // Load messages + live subscribe
  useEffect(() => {
    communicationService.getMessages().then(setMessages)
    const unsub = communicationService.subscribeToMessages((msgs) => {
      setMessages(msgs)
      const newCount = msgs.length
      if (newCount > prevCountRef.current) {
        setUnread((u) => u + (newCount - prevCountRef.current))
      }
      prevCountRef.current = newCount
    })
    // Start background radio chatter
    const stopChatter = communicationService.startRadioChatter(40000)
    return () => { unsub(); stopChatter() }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
      setUnread(0)
    }
  }, [messages])

  // When selected vehicle changes, auto-target it
  useEffect(() => {
    if (selectedVehicle) {
      setToId(selectedVehicle.id)
      setToName(selectedVehicle.callSign)
      setChannel(selectedVehicle.channel)
    }
  }, [selectedVehicle])

  // Filter messages by current channel
  const filtered = channel === 'all'
    ? messages
    : messages.filter((m) => m.channel === channel || m.channel === 'all')

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await communicationService.sendMessage({
        toId,
        toName,
        content: input.trim(),
        channel,
        senderName: admin?.name ?? 'NERDC Command',
      })
      setInput('')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const channels: RadioChannel[] = ['all', 'alpha', 'bravo', 'charlie', 'command']

  return (
    <div className={cn('flex flex-col glass rounded-2xl shadow-glass overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-cyan-400" />
            {!muted && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">Dispatch Radio</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500 text-white text-[10px] font-bold">{unread}</span>
          )}
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        {channels.map((ch) => {
          const cfg = CHANNEL_CONFIG[ch]
          return (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={cn(
                'flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all',
                channel === ch ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Message log */}
      <div ref={logRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-600 text-xs gap-2 py-8">
            <Wifi className="w-6 h-6" />
            <p>No traffic on this channel.</p>
          </div>
        ) : (
          filtered.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))
        )}
      </div>

      {/* Target selector */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">To:</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => { setToId('ALL'); setToName('All Units'); setChannel('all') }}
              className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all',
                toId === 'ALL'
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              All Units
            </button>
            {vehicles.filter((v) => v.status !== 'offline').slice(0, 8).map((v) => (
              <button
                key={v.id}
                onClick={() => { setToId(v.id); setToName(v.callSign); setChannel(v.channel) }}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all',
                  toId === v.id
                    ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                )}
              >
                {v.callSign}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick commands */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          {QUICK_COMMANDS.slice(0, 3).map((cmd) => (
            <button
              key={cmd}
              onClick={() => setInput(cmd)}
              className="px-2 py-1 rounded-lg bg-white/4 border border-white/8 text-[10px] text-slate-400 hover:text-white hover:bg-white/8 transition-all"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      <div className="px-3 pb-3 flex-shrink-0 border-t border-white/[0.06] pt-2">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${toName} on ${CHANNEL_CONFIG[channel].label}…`}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 resize-none outline-none focus:border-cyan-500/40 transition-colors"
            />
            <div className="absolute bottom-2 right-2 text-[10px] text-slate-600">⏎ Send</div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={cn(
              'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
              input.trim() && !sending
                ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-glow-cyan'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            )}
          >
            {sending
              ? <span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: DispatchMessage }) {
  const isOutbound = msg.direction === 'outbound'
  const isAlert = msg.type === 'alert'
  const isBroadcast = msg.type === 'broadcast'
  const ch = CHANNEL_CONFIG[msg.channel]

  if (isAlert || isBroadcast) {
    return (
      <div className={cn(
        'rounded-xl p-2.5 border text-[11px]',
        isAlert ? 'bg-red-500/10 border-red-500/20' : 'bg-cyan-500/8 border-cyan-500/15'
      )}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={cn('font-bold', isAlert ? 'text-red-400' : 'text-cyan-400')}>
            {isAlert ? '⚠ ALERT' : '📢 BROADCAST'}
          </span>
          <span className="text-slate-500 ml-auto">{formatTime(msg.timestamp)}</span>
        </div>
        <p className={cn('leading-relaxed', isAlert ? 'text-red-200' : 'text-slate-300')}>{msg.content}</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-0.5', isOutbound ? 'items-end' : 'items-start')}>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
        {!isOutbound && <span className="font-semibold text-slate-400">{msg.fromName}</span>}
        <span className={cn('px-1.5 py-0.5 rounded-sm font-bold uppercase text-[9px] border', ch.bg, ch.border, ch.color)}>
          {ch.label}
        </span>
        <span>{formatTime(msg.timestamp)}</span>
        {isOutbound && msg.acknowledged && <CheckCheck className="w-3 h-3 text-cyan-400" />}
      </div>
      <div className={cn(
        'max-w-[90%] rounded-xl px-3 py-2 text-[11px] leading-relaxed',
        isOutbound
          ? 'bg-cyan-500/15 border border-cyan-500/20 text-cyan-100 rounded-tr-sm'
          : 'bg-white/5 border border-white/8 text-slate-200 rounded-tl-sm'
      )}>
        {!isOutbound && msg.toId !== 'ALL' && (
          <span className="text-slate-500 text-[10px]">→ {msg.toName}  </span>
        )}
        {msg.content}
      </div>
    </div>
  )
}
