import type { Admin, DispatchMessage, Incident, Vehicle } from '@/types'

// ─── Admin seed ───────────────────────────────────────────────────────────────

export const MOCK_ADMINS: Admin[] = [
  {
    id: 'adm-001',
    name: 'Kofi Mensah',
    email: 'admin@nerdc.gov.gh',
    role: 'system_admin',
    organization: 'NERDC — National Emergency Response & Dispatch Centre',
    lastLogin: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'adm-002',
    name: 'Abena Owusu',
    email: 'hospital@nerdc.gov.gh',
    role: 'hospital_admin',
    organization: 'Korle Bu Teaching Hospital',
    lastLogin: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'adm-003',
    name: 'Kweku Asante',
    email: 'police@nerdc.gov.gh',
    role: 'police_admin',
    organization: 'Ghana Police Service — Greater Accra',
    lastLogin: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 'adm-004',
    name: 'Ama Darko',
    email: 'fire@nerdc.gov.gh',
    role: 'fire_admin',
    organization: 'Ghana National Fire Service',
    lastLogin: new Date(Date.now() - 9000000).toISOString(),
  },
]

export const MOCK_CREDENTIALS = [
  { email: 'admin@nerdc.gov.gh',    password: 'Admin@1234',    adminId: 'adm-001' },
  { email: 'hospital@nerdc.gov.gh', password: 'Hospital@1234', adminId: 'adm-002' },
  { email: 'police@nerdc.gov.gh',   password: 'Police@1234',   adminId: 'adm-003' },
  { email: 'fire@nerdc.gov.gh',     password: 'Fire@1234',     adminId: 'adm-004' },
]

// ─── Incidents seed ──────────────────────────────────────────────────────────

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-2024-001',
    citizenName: 'Akosua Boateng',
    citizenPhone: '+233 20 123 4567',
    type: 'fire',
    severity: 'critical',
    status: 'in_progress',
    location: { lat: 5.6037, lng: -0.1870, address: '12 Liberation Rd, Accra', region: 'Greater Accra' },
    notes: 'Large structure fire at commercial building. Multiple floors affected.',
    createdBy: 'adm-001',
    assignedVehicleId: 'VEH-F-03',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    responseTimeMinutes: 8,
  },
  {
    id: 'INC-2024-002',
    citizenName: 'Kwame Asante',
    citizenPhone: '+233 24 987 6543',
    type: 'medical',
    severity: 'high',
    status: 'dispatched',
    location: { lat: 5.6145, lng: -0.2050, address: '5 Osu Oxford St, Accra', region: 'Greater Accra' },
    notes: 'Adult male, 52, suspected cardiac arrest. Bystander CPR in progress.',
    createdBy: 'adm-001',
    assignedVehicleId: 'VEH-A-01',
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    responseTimeMinutes: 6,
  },
  {
    id: 'INC-2024-003',
    citizenName: 'Yaa Frimpong',
    citizenPhone: '+233 27 555 0123',
    type: 'accident',
    severity: 'high',
    status: 'dispatched',
    location: { lat: 5.5560, lng: -0.1969, address: 'Ring Road East, Tema Motorway Junction', region: 'Greater Accra' },
    notes: 'Multi-vehicle collision. 3 vehicles involved, possible injuries.',
    createdBy: 'adm-001',
    assignedVehicleId: 'VEH-P-02',
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    responseTimeMinutes: 11,
  },
  {
    id: 'INC-2024-004',
    citizenName: 'Ama Darko',
    citizenPhone: '+233 20 777 8888',
    type: 'flood',
    severity: 'medium',
    status: 'pending',
    location: { lat: 5.5800, lng: -0.2100, address: 'Adabraka, Accra', region: 'Greater Accra' },
    notes: 'Flash flooding in residential area. Families trapped on upper floors.',
    createdBy: 'adm-001',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'INC-2024-005',
    citizenName: 'Kofi Duah',
    citizenPhone: '+233 54 321 9876',
    type: 'crime',
    severity: 'high',
    status: 'resolved',
    location: { lat: 5.6200, lng: -0.1750, address: 'Cantonments, Accra', region: 'Greater Accra' },
    notes: 'Armed robbery at ATM. Suspects fled scene. Victim treated for minor injuries.',
    createdBy: 'adm-001',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    responseTimeMinutes: 9,
  },
  {
    id: 'INC-2024-006',
    citizenName: 'Efua Mensah',
    citizenPhone: '+233 24 111 2222',
    type: 'medical',
    severity: 'medium',
    status: 'resolved',
    location: { lat: 5.5990, lng: -0.2230, address: 'Dansoman, Accra', region: 'Greater Accra' },
    notes: 'Elderly woman fell. Suspected hip fracture. Transported to Ridge Hospital.',
    createdBy: 'adm-001',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    responseTimeMinutes: 14,
  },
  {
    id: 'INC-2024-007',
    citizenName: 'Nana Adu',
    citizenPhone: '+233 50 900 1234',
    type: 'fire',
    severity: 'low',
    status: 'resolved',
    location: { lat: 5.6350, lng: -0.1900, address: 'East Legon, Accra', region: 'Greater Accra' },
    notes: 'Kitchen fire, contained quickly. No casualties.',
    createdBy: 'adm-001',
    createdAt: new Date(Date.now() - 7 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 6.5 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 6.5 * 3600000).toISOString(),
    responseTimeMinutes: 7,
  },
  {
    id: 'INC-2024-008',
    citizenName: 'Kwesi Boateng',
    citizenPhone: '+233 26 444 5555',
    type: 'medical',
    severity: 'critical',
    status: 'created',
    location: { lat: 5.5700, lng: -0.2400, address: 'Achimota, Accra', region: 'Greater Accra' },
    notes: 'Severe allergic reaction. Patient losing consciousness.',
    createdBy: 'adm-001',
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60000).toISOString(),
  },
]

// ─── Vehicles seed — 10 per service ──────────────────────────────────────────
// Spread across Greater Accra with realistic coordinates

export const MOCK_VEHICLES: Vehicle[] = [

  // ── Ambulances (Ghana National Ambulance Service) ─────────────────────────
  { id:'VEH-A-01', callSign:'AMB-01', type:'ambulance', status:'dispatched',    driverName:'Sgt. Emmanuel Tetteh',  unitName:'Alpha Medical Unit',    stationId:'STN-HOSP-01', coordinates:{lat:5.6100,lng:-0.2010}, speed:72,  heading:210, assignedIncidentId:'INC-2024-002', lastUpdated:new Date().toISOString(), fuelLevel:78,  channel:'alpha' },
  { id:'VEH-A-02', callSign:'AMB-02', type:'ambulance', status:'available',     driverName:'Pvt. Abena Antwi',      unitName:'Bravo Medical Unit',    stationId:'STN-HOSP-01', coordinates:{lat:5.6250,lng:-0.1800}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:92,  channel:'alpha' },
  { id:'VEH-A-03', callSign:'AMB-03', type:'ambulance', status:'returning',     driverName:'Cpl. Joseph Asare',     unitName:'Charlie Medical Unit',  stationId:'STN-HOSP-01', coordinates:{lat:5.5900,lng:-0.2150}, speed:55,  heading:90,  lastUpdated:new Date().toISOString(), fuelLevel:41,  channel:'alpha' },
  { id:'VEH-A-04', callSign:'AMB-04', type:'ambulance', status:'available',     driverName:'Pvt. Fatima Al-Hassan', unitName:'Delta Medical Unit',    stationId:'STN-HOSP-02', coordinates:{lat:5.6400,lng:-0.2200}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:87,  channel:'alpha' },
  { id:'VEH-A-05', callSign:'AMB-05', type:'ambulance', status:'on_scene',      driverName:'Sgt. Kofi Nkrumah',     unitName:'Echo Medical Unit',     stationId:'STN-HOSP-02', coordinates:{lat:5.5650,lng:-0.1950}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:63,  channel:'alpha' },
  { id:'VEH-A-06', callSign:'AMB-06', type:'ambulance', status:'available',     driverName:'Pvt. Ama Osei',         unitName:'Foxtrot Medical Unit',  stationId:'STN-HOSP-02', coordinates:{lat:5.6180,lng:-0.2350}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:95,  channel:'alpha' },
  { id:'VEH-A-07', callSign:'AMB-07', type:'ambulance', status:'en_route',      driverName:'Cpl. David Tawiah',     unitName:'Golf Medical Unit',     stationId:'STN-HOSP-03', coordinates:{lat:5.5800,lng:-0.1700}, speed:88,  heading:315, lastUpdated:new Date().toISOString(), fuelLevel:54,  channel:'alpha' },
  { id:'VEH-A-08', callSign:'AMB-08', type:'ambulance', status:'available',     driverName:'Pvt. Grace Boateng',    unitName:'Hotel Medical Unit',    stationId:'STN-HOSP-03', coordinates:{lat:5.6050,lng:-0.1600}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:100, channel:'alpha' },
  { id:'VEH-A-09', callSign:'AMB-09', type:'ambulance', status:'offline',       driverName:'Sgt. Frank Agyei',      unitName:'India Medical Unit',    stationId:'STN-HOSP-03', coordinates:{lat:5.6320,lng:-0.2080}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:15,  channel:'alpha' },
  { id:'VEH-A-10', callSign:'AMB-10', type:'ambulance', status:'available',     driverName:'Pvt. Yaa Mensah',       unitName:'Juliet Medical Unit',   stationId:'STN-HOSP-04', coordinates:{lat:5.5950,lng:-0.2450}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:82,  channel:'alpha' },

  // ── Fire Trucks (Ghana National Fire Service) ─────────────────────────────
  { id:'VEH-F-01', callSign:'FIRE-01', type:'fire_truck', status:'available',   driverName:'Cpt. Kwabena Osei',     unitName:'Alpha Fire Brigade',    stationId:'STN-FIRE-01', coordinates:{lat:5.5550,lng:-0.2100}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:88,  channel:'bravo' },
  { id:'VEH-F-02', callSign:'FIRE-02', type:'fire_truck', status:'available',   driverName:'Lt. Akua Sarpong',      unitName:'Bravo Fire Brigade',    stationId:'STN-FIRE-01', coordinates:{lat:5.6300,lng:-0.1850}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:76,  channel:'bravo' },
  { id:'VEH-F-03', callSign:'FIRE-03', type:'fire_truck', status:'on_scene',    driverName:'Cpl. Musa Ibrahim',     unitName:'Charlie Fire Brigade',  stationId:'STN-FIRE-01', coordinates:{lat:5.6037,lng:-0.1870}, speed:0,   heading:0,   assignedIncidentId:'INC-2024-001', lastUpdated:new Date().toISOString(), fuelLevel:45,  channel:'bravo' },
  { id:'VEH-F-04', callSign:'FIRE-04', type:'fire_truck', status:'en_route',    driverName:'Sgt. Patrick Owusu',    unitName:'Delta Fire Brigade',    stationId:'STN-FIRE-02', coordinates:{lat:5.5750,lng:-0.2000}, speed:75,  heading:30,  assignedIncidentId:'INC-2024-001', lastUpdated:new Date().toISOString(), fuelLevel:91,  channel:'bravo' },
  { id:'VEH-F-05', callSign:'FIRE-05', type:'fire_truck', status:'available',   driverName:'Pvt. Abena Quaye',      unitName:'Echo Fire Brigade',     stationId:'STN-FIRE-02', coordinates:{lat:5.6450,lng:-0.2100}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:67,  channel:'bravo' },
  { id:'VEH-F-06', callSign:'FIRE-06', type:'fire_truck', status:'returning',   driverName:'Lt. Kwame Darko',       unitName:'Foxtrot Fire Brigade',  stationId:'STN-FIRE-02', coordinates:{lat:5.5680,lng:-0.2300}, speed:48,  heading:180, lastUpdated:new Date().toISOString(), fuelLevel:33,  channel:'bravo' },
  { id:'VEH-F-07', callSign:'FIRE-07', type:'fire_truck', status:'available',   driverName:'Cpl. Esi Adjei',        unitName:'Golf Fire Brigade',     stationId:'STN-FIRE-03', coordinates:{lat:5.6150,lng:-0.1950}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:99,  channel:'bravo' },
  { id:'VEH-F-08', callSign:'FIRE-08', type:'fire_truck', status:'available',   driverName:'Pvt. Samuel Ofori',     unitName:'Hotel Fire Brigade',    stationId:'STN-FIRE-03', coordinates:{lat:5.5900,lng:-0.1800}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:72,  channel:'bravo' },
  { id:'VEH-F-09', callSign:'FIRE-09', type:'fire_truck', status:'offline',     driverName:'Sgt. Comfort Asante',   unitName:'India Fire Brigade',    stationId:'STN-FIRE-03', coordinates:{lat:5.6220,lng:-0.2400}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:8,   channel:'bravo' },
  { id:'VEH-F-10', callSign:'FIRE-10', type:'fire_truck', status:'available',   driverName:'Cpt. Fiifi Amoah',      unitName:'Juliet Fire Brigade',   stationId:'STN-FIRE-04', coordinates:{lat:5.5820,lng:-0.1600}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:84,  channel:'bravo' },

  // ── Police (Ghana Police Service) ─────────────────────────────────────────
  { id:'VEH-P-01', callSign:'POL-01', type:'police', status:'available',        driverName:'Insp. Adjoa Nyarko',    unitName:'Alpha Patrol Unit',     stationId:'STN-POL-01', coordinates:{lat:5.6080,lng:-0.1780}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:90,  channel:'charlie' },
  { id:'VEH-P-02', callSign:'POL-02', type:'police', status:'en_route',         driverName:'Sgt. Ben Asante',       unitName:'Bravo Patrol Unit',     stationId:'STN-POL-01', coordinates:{lat:5.5700,lng:-0.1980}, speed:85,  heading:45,  assignedIncidentId:'INC-2024-003', lastUpdated:new Date().toISOString(), fuelLevel:63,  channel:'charlie' },
  { id:'VEH-P-03', callSign:'POL-03', type:'police', status:'on_scene',         driverName:'Cpl. Adwoa Mensah',     unitName:'Charlie Patrol Unit',   stationId:'STN-POL-01', coordinates:{lat:5.6200,lng:-0.1750}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:57,  channel:'charlie' },
  { id:'VEH-P-04', callSign:'POL-04', type:'police', status:'available',        driverName:'Pvt. Kojo Aidoo',       unitName:'Delta Patrol Unit',     stationId:'STN-POL-02', coordinates:{lat:5.5500,lng:-0.2050}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:88,  channel:'charlie' },
  { id:'VEH-P-05', callSign:'POL-05', type:'police', status:'available',        driverName:'Sgt. Nana Amponsah',    unitName:'Echo Patrol Unit',      stationId:'STN-POL-02', coordinates:{lat:5.6350,lng:-0.2150}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:74,  channel:'charlie' },
  { id:'VEH-P-06', callSign:'POL-06', type:'police', status:'returning',        driverName:'Lt. Ama Boateng',       unitName:'Foxtrot Patrol Unit',   stationId:'STN-POL-02', coordinates:{lat:5.5850,lng:-0.1900}, speed:62,  heading:135, lastUpdated:new Date().toISOString(), fuelLevel:38,  channel:'charlie' },
  { id:'VEH-P-07', callSign:'POL-07', type:'police', status:'available',        driverName:'Insp. Kweku Poku',      unitName:'Golf Patrol Unit',      stationId:'STN-POL-03', coordinates:{lat:5.6420,lng:-0.1650}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:95,  channel:'charlie' },
  { id:'VEH-P-08', callSign:'POL-08', type:'police', status:'dispatched',       driverName:'Cpl. Efua Asare',       unitName:'Hotel Patrol Unit',     stationId:'STN-POL-03', coordinates:{lat:5.5620,lng:-0.2200}, speed:40,  heading:270, lastUpdated:new Date().toISOString(), fuelLevel:66,  channel:'charlie' },
  { id:'VEH-P-09', callSign:'POL-09', type:'police', status:'available',        driverName:'Pvt. Isaac Agyemang',   unitName:'India Patrol Unit',     stationId:'STN-POL-03', coordinates:{lat:5.6050,lng:-0.2300}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:82,  channel:'charlie' },
  { id:'VEH-P-10', callSign:'POL-10', type:'police', status:'offline',          driverName:'Sgt. Rose Dankwa',      unitName:'Juliet Patrol Unit',    stationId:'STN-POL-04', coordinates:{lat:5.5780,lng:-0.1550}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:11,  channel:'charlie' },

  // ── Rescue (NADMO / Search & Rescue) ─────────────────────────────────────
  { id:'VEH-R-01', callSign:'RSC-01', type:'rescue', status:'available',        driverName:'Lt. Fiifi Mensah',      unitName:'Alpha Rescue Squad',    stationId:'STN-RESC-01', coordinates:{lat:5.6000,lng:-0.2050}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:93,  channel:'alpha' },
  { id:'VEH-R-02', callSign:'RSC-02', type:'rescue', status:'en_route',         driverName:'Cpl. Akosua Frimpong',  unitName:'Bravo Rescue Squad',    stationId:'STN-RESC-01', coordinates:{lat:5.5820,lng:-0.2250}, speed:67,  heading:200, lastUpdated:new Date().toISOString(), fuelLevel:70,  channel:'alpha' },
  { id:'VEH-R-03', callSign:'RSC-03', type:'rescue', status:'available',        driverName:'Pvt. Yaw Ofori',        unitName:'Charlie Rescue Squad',  stationId:'STN-RESC-01', coordinates:{lat:5.6380,lng:-0.2000}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:86,  channel:'alpha' },
  { id:'VEH-R-04', callSign:'RSC-04', type:'rescue', status:'on_scene',         driverName:'Sgt. Naomi Quartey',    unitName:'Delta Rescue Squad',    stationId:'STN-RESC-02', coordinates:{lat:5.5700,lng:-0.2400}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:52,  channel:'alpha' },
  { id:'VEH-R-05', callSign:'RSC-05', type:'rescue', status:'available',        driverName:'Lt. Kofi Acheampong',   unitName:'Echo Rescue Squad',     stationId:'STN-RESC-02', coordinates:{lat:5.6150,lng:-0.1700}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:78,  channel:'alpha' },
  { id:'VEH-R-06', callSign:'RSC-06', type:'rescue', status:'available',        driverName:'Cpl. Abena Darko',      unitName:'Foxtrot Rescue Squad',  stationId:'STN-RESC-02', coordinates:{lat:5.5500,lng:-0.1900}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:97,  channel:'alpha' },
  { id:'VEH-R-07', callSign:'RSC-07', type:'rescue', status:'returning',        driverName:'Pvt. Eric Asante',      unitName:'Golf Rescue Squad',     stationId:'STN-RESC-03', coordinates:{lat:5.6280,lng:-0.2280}, speed:44,  heading:90,  lastUpdated:new Date().toISOString(), fuelLevel:29,  channel:'alpha' },
  { id:'VEH-R-08', callSign:'RSC-08', type:'rescue', status:'available',        driverName:'Sgt. Patricia Boadi',   unitName:'Hotel Rescue Squad',    stationId:'STN-RESC-03', coordinates:{lat:5.5950,lng:-0.1650}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:88,  channel:'alpha' },
  { id:'VEH-R-09', callSign:'RSC-09', type:'rescue', status:'offline',          driverName:'Lt. Samuel Tawiah',     unitName:'India Rescue Squad',    stationId:'STN-RESC-03', coordinates:{lat:5.6100,lng:-0.2380}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:5,   channel:'alpha' },
  { id:'VEH-R-10', callSign:'RSC-10', type:'rescue', status:'available',        driverName:'Cpl. Mercy Acquah',     unitName:'Juliet Rescue Squad',   stationId:'STN-RESC-04', coordinates:{lat:5.5650,lng:-0.2150}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:74,  channel:'alpha' },

  // ── Command & Control ─────────────────────────────────────────────────────
  { id:'VEH-C-01', callSign:'CMD-01', type:'command', status:'available',       driverName:'Maj. Akua Sarpong',     unitName:'Command Alpha',         stationId:'STN-CMD-01', coordinates:{lat:5.6050,lng:-0.2050}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:88,  channel:'command' },
  { id:'VEH-C-02', callSign:'CMD-02', type:'command', status:'en_route',        driverName:'Col. James Antwi',      unitName:'Command Bravo',         stationId:'STN-CMD-01', coordinates:{lat:5.5750,lng:-0.2100}, speed:55,  heading:60,  lastUpdated:new Date().toISOString(), fuelLevel:79,  channel:'command' },
  { id:'VEH-C-03', callSign:'CMD-03', type:'command', status:'available',       driverName:'Maj. Diana Asare',      unitName:'Command Charlie',       stationId:'STN-CMD-01', coordinates:{lat:5.6350,lng:-0.1750}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:96,  channel:'command' },
  { id:'VEH-C-04', callSign:'CMD-04', type:'command', status:'on_scene',        driverName:'Lt. Col. Peter Mensah', unitName:'Command Delta',         stationId:'STN-CMD-01', coordinates:{lat:5.6037,lng:-0.1870}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:61,  channel:'command' },
  { id:'VEH-C-05', callSign:'CMD-05', type:'command', status:'available',       driverName:'Maj. Ruth Acheampong',  unitName:'Command Echo',          stationId:'STN-CMD-01', coordinates:{lat:5.5880,lng:-0.2300}, speed:0,   heading:0,   lastUpdated:new Date().toISOString(), fuelLevel:85,  channel:'command' },
]

// ─── Seed radio messages ──────────────────────────────────────────────────────

const t = (offsetMinutes: number) =>
  new Date(Date.now() - offsetMinutes * 60000).toISOString()

export const MOCK_MESSAGES: DispatchMessage[] = [
  { id:'MSG-001', fromId:'COMMAND', fromName:'NERDC Command', toId:'ALL',      toName:'All Units',        content:'All units, good morning. Daily briefing at 07:30. Please confirm availability status.',      type:'broadcast',     channel:'all',     timestamp:t(95), acknowledged:true,  direction:'outbound' },
  { id:'MSG-002', fromId:'VEH-A-01', fromName:'AMB-01',       toId:'COMMAND', toName:'NERDC Command',    content:'AMB-01 to Command. En route to INC-2024-002. ETA 6 minutes. Over.',                         type:'status_update', channel:'alpha',   timestamp:t(18), acknowledged:true,  direction:'inbound'  },
  { id:'MSG-003', fromId:'COMMAND', fromName:'NERDC Command', toId:'VEH-A-01',toName:'AMB-01',           content:'AMB-01, copy that. Patient reported unconscious. Proceed with caution. BRAVO medical is on standby.', type:'command', channel:'alpha',   timestamp:t(17), acknowledged:true,  direction:'outbound' },
  { id:'MSG-004', fromId:'VEH-F-03', fromName:'FIRE-03',      toId:'COMMAND', toName:'NERDC Command',    content:'FIRE-03 on scene at Liberation Rd. Heavy smoke, three floors involved. Requesting FIRE-04 backup. Over.', type:'status_update', channel:'bravo', timestamp:t(43), acknowledged:true,  direction:'inbound'  },
  { id:'MSG-005', fromId:'COMMAND', fromName:'NERDC Command', toId:'VEH-F-04',toName:'FIRE-04',          content:'FIRE-04, proceed immediately to Liberation Rd to support FIRE-03. INC-2024-001. Acknowledge.',type:'command',       channel:'bravo',   timestamp:t(42), acknowledged:true,  direction:'outbound' },
  { id:'MSG-006', fromId:'VEH-F-04', fromName:'FIRE-04',      toId:'COMMAND', toName:'NERDC Command',    content:'FIRE-04 copies. En route to Liberation Rd. ETA 8 minutes.',                                 type:'acknowledgment',channel:'bravo',   timestamp:t(41), acknowledged:true,  direction:'inbound'  },
  { id:'MSG-007', fromId:'VEH-P-02', fromName:'POL-02',       toId:'COMMAND', toName:'NERDC Command',    content:'POL-02 to Command. Approaching motorway junction. Advise on traffic control approach.',       type:'status_update', channel:'charlie', timestamp:t(32), acknowledged:true,  direction:'inbound'  },
  { id:'MSG-008', fromId:'COMMAND', fromName:'NERDC Command', toId:'VEH-P-02',toName:'POL-02',           content:'POL-02, establish perimeter 100m from collision. POL-03 is coordinating from Cantonments side.', type:'command',    channel:'charlie', timestamp:t(31), acknowledged:true,  direction:'outbound' },
  { id:'MSG-009', fromId:'VEH-A-05', fromName:'AMB-05',       toId:'COMMAND', toName:'NERDC Command',    content:'AMB-05 on scene. Two casualties. One critical, one stable. Transporting critical to Korle Bu. ETA 12 minutes.', type:'status_update', channel:'alpha', timestamp:t(12), acknowledged:false, direction:'inbound'  },
  { id:'MSG-010', fromId:'COMMAND', fromName:'NERDC Command', toId:'ALL',      toName:'All Units',        content:'Attention all units — heavy rain expected from 14:00. Exercise caution on Ring Road and Spintex corridor. Stay safe.',  type:'alert', channel:'all', timestamp:t(5),  acknowledged:false, direction:'outbound' },
]
