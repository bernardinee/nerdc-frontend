import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

function getInitial(): Theme {
  try {
    return (localStorage.getItem('nerdc_theme') as Theme) ?? 'dark'
  } catch { return 'dark' }
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getInitial(),

  setTheme: (theme) => {
    localStorage.setItem('nerdc_theme', theme)
    applyTheme(theme)
    set({ theme })
  },

  toggle: () => {
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('nerdc_theme', next)
      applyTheme(next)
      return { theme: next }
    })
  },
}))

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.remove('dark')
    root.classList.add('light')
  } else {
    root.classList.remove('light')
    root.classList.add('dark')
  }
}
