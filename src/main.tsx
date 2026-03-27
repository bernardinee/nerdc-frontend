import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './app/App'
import './styles/globals.css'
import { startNotificationService } from './services/notificationService'
import { applyTheme } from './store/useThemeStore'

// Apply saved theme before first render
applyTheme((localStorage.getItem('nerdc_theme') as 'dark' | 'light') ?? 'dark')

startNotificationService()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1c2128',
          color: '#e6edf3',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          fontSize: '13px',
          padding: '12px 16px',
        },
        success: { iconTheme: { primary: '#22c55e', secondary: '#0d1117' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#0d1117' } },
      }}
    />
  </React.StrictMode>,
)
