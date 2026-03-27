import { useEffect, useRef, useState } from 'react'
import { MapPin, AlertCircle } from 'lucide-react'
import type { Vehicle } from '@/types'

// Leaflet is imported dynamically to avoid SSR issues and keep bundle clean
import type * as L from 'leaflet'

interface MapPanelProps {
  center?: { lat: number; lng: number }
  zoom?: number
  vehicles?: Vehicle[]
  onLocationSelect?: (lat: number, lng: number) => void
  mode?: 'tracking' | 'picker'
  selectedLocation?: { lat: number; lng: number } | null
  className?: string
}

const DEFAULT_CENTER = { lat: 5.6037, lng: -0.2070 }

// CartoDB Dark Matter — completely free, no API key, no account needed
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

function vehicleColor(status: string): string {
  if (status === 'available') return '#22c55e'
  if (status === 'on_scene') return '#a855f7'
  if (status === 'offline') return '#64748b'
  return '#00b8f5'
}

// Build a circular SVG icon for each vehicle marker
function makeVehicleIconSvg(status: string, label: string): string {
  const color = vehicleColor(status)
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2"/>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2" filter="url(#glow)" opacity="0.5"/>
      <text x="14" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="Inter,sans-serif">${label}</text>
    </svg>
  `.trim()
}

export function MapPanel({
  center, zoom = 13, vehicles, onLocationSelect, mode, selectedLocation,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const pickerMarkerRef = useRef<L.Marker | null>(null)
  const [leafletReady, setLeafletReady] = useState(false)
  const leafletRef = useRef<typeof L | null>(null)

  // ── Load Leaflet CSS + module once ──────────────────────────────────────────
  useEffect(() => {
    // Inject Leaflet CSS if not already present
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then((L) => {
      // Fix default icon paths that Vite breaks
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      leafletRef.current = L
      setLeafletReady(true)
    })
  }, [])

  // ── Initialise map ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !containerRef.current || mapRef.current) return
    const L = leafletRef.current!
    const c = center ?? DEFAULT_CENTER

    const map = L.map(containerRef.current, {
      center: [c.lat, c.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    // Style the attribution to match dark theme
    map.attributionControl.setPrefix('')

    if (mode === 'picker') {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onLocationSelect?.(
          parseFloat(e.latlng.lat.toFixed(5)),
          parseFloat(e.latlng.lng.toFixed(5)),
        )
      })
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      vehicleMarkersRef.current.clear()
      pickerMarkerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady])

  // ── Pan when center prop changes (e.g. selecting a vehicle) ─────────────────
  useEffect(() => {
    if (!mapRef.current || !center) return
    mapRef.current.panTo([center.lat, center.lng], { animate: true, duration: 0.5 })
  }, [center])

  // ── Vehicle markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !vehicles) return
    const L = leafletRef.current
    const map = mapRef.current

    const seen = new Set<string>()

    for (const v of vehicles) {
      seen.add(v.id)
      const pos: L.LatLngExpression = [v.coordinates.lat, v.coordinates.lng]
      const svgStr = makeVehicleIconSvg(v.status, v.callSign.slice(0, 1))
      const icon = L.divIcon({
        html: svgStr,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
      })

      const existing = vehicleMarkersRef.current.get(v.id)
      if (existing) {
        existing.setLatLng(pos)
        existing.setIcon(icon)
      } else {
        const marker = L.marker(pos, { icon })
          .bindPopup(
            `<div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.6;color:#e2e8f0;background:#1c2128;padding:4px">
              <strong>${v.callSign}</strong><br/>
              ${v.unitName}<br/>
              <span style="color:#94a3b8">${v.status.replace('_', ' ')} · ${v.speed} km/h</span>
            </div>`,
            { className: 'nerdc-popup' }
          )
          .addTo(map)
        vehicleMarkersRef.current.set(v.id, marker)
      }
    }

    // Remove stale markers
    vehicleMarkersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.remove()
        vehicleMarkersRef.current.delete(id)
      }
    })
  }, [vehicles])

  // ── Picker marker ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || mode !== 'picker') return
    const L = leafletRef.current

    pickerMarkerRef.current?.remove()
    pickerMarkerRef.current = null

    if (!selectedLocation) return

    const icon = L.divIcon({
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        <circle cx="14" cy="13" r="11" fill="#00b8f5" stroke="white" stroke-width="2"/>
        <line x1="14" y1="24" x2="14" y2="34" stroke="#00b8f5" stroke-width="2"/>
        <circle cx="14" cy="13" r="4" fill="white"/>
      </svg>`,
      className: '',
      iconSize: [28, 36],
      iconAnchor: [14, 34],
    })

    pickerMarkerRef.current = L.marker(
      [selectedLocation.lat, selectedLocation.lng],
      { icon, draggable: true }
    ).addTo(mapRef.current)

    pickerMarkerRef.current.on('dragend', () => {
      const pos = pickerMarkerRef.current?.getLatLng()
      if (pos) {
        onLocationSelect?.(
          parseFloat(pos.lat.toFixed(5)),
          parseFloat(pos.lng.toFixed(5)),
        )
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation])

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      {/* Map container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading state */}
      {!leafletReady && (
        <div className="absolute inset-0 bg-[#0d1624] rounded-2xl flex items-center justify-center gap-2 text-slate-500 z-10">
          <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-cyan-400 animate-spin" />
          <span className="text-sm">Loading map…</span>
        </div>
      )}

      {/* Free / no-key badge */}
      {leafletReady && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-[10px] text-slate-400 px-2 py-0.5 rounded-full z-[1000] pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          OpenStreetMap · Free
        </div>
      )}
    </div>
  )
}
