# PropSight India

A geospatial analytics engine for predictive urban growth modeling in Indian real estate markets. It ingests municipal declarations and live market data, computes a **Growth Velocity Score (GVS)** for urban zones, and surfaces insights through an interactive web dashboard.

---

## How It Works

1. Municipal portals and market APIs are configured as sources (`config/sources.json`)
2. The pipeline runs scheduled ingestion cycles — fetching declarations and market snapshots
3. Parsed data is deduplicated and accumulated per zone as a signal bundle
4. The `CorrelationEngine` computes a GVS (0–100) using a weighted combination of 7 signals
5. The `TrendAnalyzer` derives pricing velocity and rental yield metrics
6. The `AlertingService` fires notifications when GVS changes exceed thresholds
7. Results are served via a REST API and visualized on an interactive Leaflet map

---

## GVS Signals

Each signal is normalized to a 0–100 range and combined using configurable weights (must sum to 1.0):

| Signal | Description |
|---|---|
| `infrastructureTender` | Count of active infrastructure tenders |
| `cluChange` | Land-use change declarations |
| `metroHighway` | Metro/highway project declarations |
| `listingDensity` | Active property listings count |
| `pricingVelocity` | % price change per month (RTM + UC) |
| `searchVolume` | Portal search interest |
| `rentalAbsorptionRate` | Rented / active rental listings ratio |

Default weight: `1/7` each.

---

## Project Structure

```
src/
├── server.ts              # Entry point — seeds demo data, starts HTTP server
├── engine/                # CorrelationEngine — GVS computation & weight management
├── analyzer/              # TrendAnalyzer — pricing velocity & rental yield
├── harvester/             # MunicipalParser & MarketAggregator — data ingestion
├── pipeline/              # Pipeline, EventBus, Scheduler — orchestration
├── alerting/              # AlertingService — threshold alerts & notifications
├── audit/                 # AuditStore — append-only audit log with lineage
├── config/                # ConfigManager — YAML/JSON source config loading
├── dashboard/
│   ├── api/               # REST API router, in-memory store, type definitions
│   └── frontend/          # Leaflet map UI, zone cards, ROI calculator
└── types/                 # Shared TypeScript interfaces
config/
└── sources.example.json   # Example source configuration
```

---

## Getting Started

**Prerequisites:** Node.js 20+, npm

```bash
# Install dependencies
npm install

# Build
npm run build

# Start the server
npm start
```

The dashboard will be available at `http://localhost:3000`.

---

## Configuration

Copy the example config and fill in your source details:

```bash
cp config/sources.example.json config/sources.json
```

```json
{
  "sources": {
    "municipal": [
      {
        "id": "mcgm-portal",
        "portalUrl": "https://mcgm.gov.in/tenders",
        "schedule": "0 6 * * *",
        "documentTypeFilters": ["infrastructure_tender", "clu_change"],
        "enabled": true
      }
    ],
    "market": [
      {
        "id": "99acres-mumbai",
        "sourceName": "99acres",
        "endpoint": "https://api.99acres.com/v1/listings",
        "authCredentialRef": "secret:99acres-api-key",
        "schedule": "0 */4 * * *",
        "enabled": true
      }
    ]
  }
}
```

---

## REST API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/zones` | List all zones with GVS scores and flags |
| `GET` | `/api/zones/:id` | Zone detail — signal breakdown, pricing velocity, rental metrics |
| `GET` | `/api/zones/:id/trajectory` | 24–60 month GVS projection |
| `PUT` | `/api/config/weights` | Update signal weights (must sum to 1.0) |

---

## Development

```bash
# Type-check without emitting
npm run typecheck

# Run tests (single pass)
npm test

# Watch mode
npm run test:watch
```

Tests use [Vitest](https://vitest.dev/) with property-based testing via [fast-check](https://fast-check.dev/).

---

## Tech Stack

- **Runtime:** Node.js 20, TypeScript (ES2022, NodeNext modules)
- **Frontend:** Vanilla JS, [Leaflet](https://leafletjs.com/), [Chart.js](https://www.chartjs.org/)
- **HTTP:** Node.js built-in `http` module (no framework)
- **Config parsing:** [js-yaml](https://github.com/nodeca/js-yaml)
- **Testing:** Vitest + fast-check
