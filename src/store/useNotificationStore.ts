import { create } from 'zustand'

export type NotifType =
  | 'incident_created'
  | 'incident_unattended'
  | 'incident_resolved'
  | 'vehicle_returning'
  | 'vehicle_available'

export interface AppNotification {
  id: string
  type: NotifType
  title: string
  message: string
  timestamp: string
  read: boolean
  incidentId?: string
  vehicleId?: string
}

interface NotifStore {
  notifications: AppNotification[]
  add: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clear: () => void
  unreadCount: () => number
}

let seq = 0

export const useNotificationStore = create<NotifStore>((set, get) => ({
  notifications: [],

  add: (n) => {
    const notif: AppNotification = {
      ...n,
      id: `notif-${Date.now()}-${seq++}`,
      timestamp: new Date().toISOString(),
      read: false,
    }
    set((s) => ({ notifications: [notif, ...s.notifications].slice(0, 50) }))
  },

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
    })),

  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  clear: () => set({ notifications: [] }),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))
