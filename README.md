# NERDC — National Emergency Response & Dispatch Centre

Premium dark operations dashboard for emergency response management. Built with React + Vite + TypeScript + Tailwind CSS. Fully functional with mock services — backend-ready.

---

## Quick Start

```bash
npm install
cp .env.example .env        # optional: add Google Maps key
npm run dev                 # http://localhost:5173
```

## Demo Credentials

| Role        | Email                       | Password     |
|-------------|----------------------------|--------------|
| Super Admin | admin@nerdc.gov.gh          | Admin@1234   |
| Operator    | operator@nerdc.gov.gh       | Oper@1234    |

---

## Features

| Page              | Description                                                      |
|-------------------|------------------------------------------------------------------|
| Login             | Protected auth with validation, loading state, demo hint         |
| Dashboard         | KPI cards, incident table, status pie chart, quick actions       |
| Record Incident   | Full form with type/severity picker, map location selector       |
| Dispatch          | Live queue, status filters, one-click status transitions         |
| Vehicle Tracking  | Animated real-time vehicle map + side detail panel               |
| Analytics         | Response trends, type/region charts, unit utilization table      |
| Profile           | Admin info, session management, logout                           |

---

## Map Setup (Google Maps)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com/)
2. Enable **Maps JavaScript API** and **Geocoding API**
3. Create an API key with HTTP referer restrictions
4. Add to your `.env`:

```
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

Without a key, the app shows an accurate CSS/SVG fallback map — all features remain functional.

---

## Folder Structure

```
src/
├── app/                    # Router + App root
├── pages/                  # Route-level page components
├── components/             # AppShell, Sidebar, Topbar
│   └── ui/                 # GlassCard, StatCard, StatusBadge, MapPanel, ...
├── services/
│   ├── mocks/              # mockData.ts + mockStore.ts (in-memory state)
│   └── adapters/           # authService, incidentService, vehicleService, ...
├── store/                  # Zustand auth store
├── types/                  # Shared TypeScript types
├── lib/                    # utils (cn, formatDate, sleep, generateId)
└── styles/                 # globals.css (Tailwind + custom design tokens)
```

---

## Connecting the Real Backend

Each service adapter has a `// TODO` comment showing exactly which REST endpoint or WebSocket to replace:

| Service             | File                                    | Integration point                         |
|---------------------|-----------------------------------------|-------------------------------------------|
| Auth                | `services/adapters/authService.ts`      | `POST /auth/login`, `POST /auth/logout`   |
| Incidents           | `services/adapters/incidentService.ts`  | `GET/POST/PATCH /api/incidents`           |
| Dispatch summary    | `services/adapters/dispatchService.ts`  | `GET /api/dispatch/summary`               |
| Vehicle tracking    | `services/adapters/vehicleService.ts`   | WebSocket — replace `subscribeToVehicleUpdates` |
| Analytics           | `services/adapters/analyticsService.ts` | `GET /api/analytics/overview`             |

Steps when backend is ready:
1. Set `VITE_API_BASE_URL` in `.env`
2. Replace `sleep()` + mock logic in each adapter with `fetch()`/`axios` calls
3. Replace `vehicleStore.subscribe` with a real WebSocket connection
4. No component changes needed

---

## Environment Variables

```env
VITE_GOOGLE_MAPS_API_KEY=   # Google Maps JS API key (optional, fallback provided)
VITE_API_BASE_URL=           # Backend base URL (e.g. https://api.nerdc.gov.gh)
VITE_WS_URL=                 # WebSocket URL for live vehicle tracking
```

---

## Tech Stack

- React 18 + Vite 5 + TypeScript
- Tailwind CSS 3 (glassmorphism design system)
- React Router 6 (protected routes)
- Zustand (auth state)
- react-hook-form + zod (validated forms)
- Recharts (charts)
- @react-google-maps/api (map integration)
- react-hot-toast (notifications)
- lucide-react (icons)
- date-fns (date utilities)
