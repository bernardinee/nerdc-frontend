// Uses Nominatim — OpenStreetMap's free reverse geocoding API.
// No API key, no account, no billing required.
// Rate limit: 1 request/second (fine for manual map clicks).
//
// TODO: When backend is ready you can optionally proxy this through your server
// to avoid CORS restrictions in production, or swap for a paid geocoding API.

export interface ReverseGeocodeResult {
  /** Formatted street address (house number + road) */
  address: string
  /** Full display name from Nominatim */
  displayName: string
  /** Ghana region, normalised to match the form's select options */
  region: string
  /** City / town */
  city: string
  /** Country */
  country: string
}

// Map Nominatim state/region strings → form select values
const REGION_MAP: Record<string, string> = {
  'greater accra':  'Greater Accra',
  'ashanti':        'Ashanti',
  'western':        'Western',
  'eastern':        'Eastern',
  'central':        'Central',
  'volta':          'Volta',
  'northern':       'Northern',
  'upper east':     'Upper East',
  'upper west':     'Upper West',
  'brong-ahafo':    'Brong-Ahafo',
  'bono':           'Brong-Ahafo',   // older Bono region maps here
  'oti':            'Oti',
  'savannah':       'Savannah',
  'bono east':      'Bono East',
  'north east':     'North East',
  'ahafo':          'Ahafo',
  'western north':  'Western North',
}

function normaliseRegion(raw: string | undefined): string {
  if (!raw) return 'Greater Accra'
  // Strip " Region" suffix Nominatim sometimes appends
  const cleaned = raw.replace(/\s*region$/i, '').trim().toLowerCase()
  return REGION_MAP[cleaned] ?? raw.replace(/\s*region$/i, '').trim()
}

interface NominatimAddress {
  house_number?: string
  road?: string
  suburb?: string
  neighbourhood?: string
  village?: string
  town?: string
  city?: string
  county?: string
  state?: string
  country?: string
}

interface NominatimResponse {
  display_name?: string
  address?: NominatimAddress
  error?: string
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'NERDC-Emergency-Dashboard/1.0' },
  })

  if (!res.ok) throw new Error(`Geocoding failed: ${res.statusText}`)

  const data: NominatimResponse = await res.json()

  if (data.error) throw new Error(data.error)

  const a = data.address ?? {}

  // Build street address from available parts
  const parts: string[] = []
  if (a.house_number) parts.push(a.house_number)
  if (a.road)         parts.push(a.road)
  else if (a.suburb)  parts.push(a.suburb)
  else if (a.neighbourhood) parts.push(a.neighbourhood)
  else if (a.village) parts.push(a.village)

  const city = a.city ?? a.town ?? a.county ?? ''
  if (city && !parts.includes(city)) parts.push(city)

  const address = parts.join(', ') || data.display_name?.split(',').slice(0, 2).join(',').trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`

  return {
    address,
    displayName: data.display_name ?? address,
    region: normaliseRegion(a.state),
    city,
    country: a.country ?? 'Ghana',
  }
}
