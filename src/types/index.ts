// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = 'system_admin' | 'hospital_admin' | 'police_admin' | 'fire_admin'

export interface Admin {
  id: string
  name: string
  email: string
  role: UserRole
  organization: string
  avatar?: string
  lastLogin?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  role: UserRole
  organization?: string
}

export interface AuthState {
  admin: Admin | null
  token: string | null
  isAuthenticated: boolean
}

// ─── Incidents ───────────────────────────────────────────────────────────────

export type IncidentStatus = 'created' | 'pending' | 'dispatched' | 'in_progress' | 'resolved'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentType =
  | 'fire'
  | 'medical'
  | 'accident'
  | 'crime'
  | 'flood'
  | 'explosion'
  | 'missing_person'
  | 'other'

export interface IncidentLocation {
  lat: number
  lng: number
  address: string
  region: string
}

export interface Incident {
  id: string
  citizenName: string
  citizenPhone?: string          // optional — not in spec but kept for UI
  type: IncidentType
  severity?: IncidentSeverity    // optional — kept for UI display
  status: IncidentStatus
  location: IncidentLocation
  notes: string
  createdBy: string              // Admin ID — NEW, required by spec
  assignedVehicleId?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  responseTimeMinutes?: number
}

export interface CreateIncidentPayload {
  citizenName: string
  citizenPhone?: string
  type: IncidentType
  severity?: IncidentSeverity
  location: IncidentLocation
  notes: string
  createdBy: string              // Admin ID — NEW
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

export type VehicleStatus = 'available' | 'dispatched' | 'en_route' | 'on_scene' | 'returning' | 'offline'
export type VehicleType = 'ambulance' | 'fire_truck' | 'police' | 'rescue' | 'command'

export interface Vehicle {
  id: string
  callSign: string
  type: VehicleType
  status: VehicleStatus
  driverName: string
  unitName: string
  stationId: string              // Hospital/Police/Fire Station ID — NEW
  coordinates: { lat: number; lng: number }
  speed: number
  heading: number
  assignedIncidentId?: string
  lastUpdated: string
  fuelLevel: number
  /** Radio channel this unit monitors */
  channel: RadioChannel
}

// ─── Communications ───────────────────────────────────────────────────────────

export type RadioChannel = 'alpha' | 'bravo' | 'charlie' | 'command' | 'all'
export type MessageType = 'command' | 'acknowledgment' | 'status_update' | 'alert' | 'broadcast'
export type MessageDirection = 'outbound' | 'inbound'

export interface DispatchMessage {
  id: string
  /** 'COMMAND' or a vehicleId */
  fromId: string
  fromName: string
  /** vehicleId, 'ALL', or 'SERVICE:ambulance' etc */
  toId: string
  toName: string
  content: string
  type: MessageType
  channel: RadioChannel
  timestamp: string
  acknowledged: boolean
  direction: MessageDirection
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

export interface DispatchSummary {
  openIncidents: number
  dispatchedIncidents: number
  activeVehicles: number
  resolvedIncidents: number
  avgResponseTimeMinutes: number
}

// ─── Fleet summary ────────────────────────────────────────────────────────────

export interface FleetServiceGroup {
  type: VehicleType
  label: string
  icon: string
  total: number
  available: number
  active: number
  offline: number
  color: string
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface IncidentsByType {
  type: IncidentType
  count: number
  percentage: number
}

export interface IncidentsByRegion {
  region: string
  count: number
}

export interface ResponseTimeTrend {
  date: string
  avgMinutes: number
  minMinutes: number
  maxMinutes: number
}

export interface VehicleUtilization {
  vehicleId: string
  callSign: string
  hoursActive: number
  incidentsHandled: number
  utilizationPct: number
}

export interface AnalyticsOverview {
  totalIncidents: number
  resolvedIncidents: number
  resolutionRate: number
  avgResponseTime: number
  incidentsByType: IncidentsByType[]
  incidentsByRegion: IncidentsByRegion[]
  responseTimeTrend: ResponseTimeTrend[]
  vehicleUtilization: VehicleUtilization[]
}

export interface ResponseTimesData {
  avgMinutes: number
  minMinutes: number
  maxMinutes: number
  trend: { date: string; avgMinutes: number; minMinutes: number; maxMinutes: number }[]
}

export type IncidentsByRegionData = {
  region: string
  count: number
  byType: Partial<Record<IncidentType, number>>
}[]

export interface ResourceUtilizationData {
  vehicleId: string
  callSign: string
  stationId: string
  type: VehicleType
  hoursActive: number
  incidentsHandled: number
  utilizationPct: number
}
