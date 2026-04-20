/**
 * Entry point — seeds demo zone data and starts the HTTP + static file server.
 * Run: node dist/server.js
 */
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { InMemoryStore } from "./dashboard/api/store.js";
import { createServer } from "./dashboard/api/server.js";
import { CorrelationEngine } from "./engine/CorrelationEngine.js";
import { AuditStore } from "./audit/AuditStore.js";

import type { GVSResult, TrendResult, WeightConfig } from "./types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Project root is one level up from dist/ (where compiled server.js lives)
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ── Demo weight config ────────────────────────────────────────────────────────
const weights: WeightConfig = {
  version: "1.0.0",
  updatedAt: new Date().toISOString(),
  weights: {
    infrastructureTender: 1 / 7,
    cluChange: 1 / 7,
    metroHighway: 1 / 7,
    listingDensity: 1 / 7,
    pricingVelocity: 1 / 7,
    searchVolume: 1 / 7,
    rentalAbsorptionRate: 1 / 7,
  },
};

const engine = new CorrelationEngine({ initialWeights: weights });
const auditStore = new AuditStore();
const store = new InMemoryStore();
store.setWeightConfig(weights);

// ── Seed demo zones ───────────────────────────────────────────────────────────
const zones = [
  // Mumbai
  { id: "Bandra-Kurla Complex", gvs: 91, flags: ["Appreciating", "Undervalued"] as const, staleOffset: 0 },
  { id: "Andheri-West",         gvs: 82, flags: ["Appreciating"] as const,                staleOffset: 0 },
  { id: "Powai",                gvs: 67, flags: [] as const,                               staleOffset: 0 },
  { id: "Thane-West",           gvs: 74, flags: ["Undervalued"] as const,                  staleOffset: 0 },
  { id: "Navi Mumbai",          gvs: 78, flags: ["Appreciating"] as const,                 staleOffset: 0 },
  { id: "Chembur",              gvs: 61, flags: [] as const,                               staleOffset: 0 },
  { id: "Borivali-North",       gvs: 55, flags: ["Appreciating"] as const,                 staleOffset: 0 },
  { id: "Kurla",                gvs: 44, flags: ["Undervalued"] as const,                  staleOffset: 2 * 24 * 60 * 60 * 1000 },
  // Delhi NCR
  { id: "Gurugram-Sector-54",   gvs: 88, flags: ["Appreciating"] as const,                staleOffset: 0 },
  { id: "Noida-Sector-62",      gvs: 76, flags: ["Appreciating", "Undervalued"] as const,  staleOffset: 0 },
  { id: "Dwarka-Expressway",    gvs: 83, flags: ["Appreciating"] as const,                staleOffset: 0 },
  { id: "Greater-Noida-West",   gvs: 59, flags: ["Undervalued"] as const,                 staleOffset: 0 },
  // Bengaluru
  { id: "Whitefield",           gvs: 85, flags: ["Appreciating"] as const,                staleOffset: 0 },
  { id: "Sarjapur-Road",        gvs: 79, flags: ["Appreciating", "Undervalued"] as const,  staleOffset: 0 },
  { id: "Hebbal",               gvs: 71, flags: ["Appreciating"] as const,                staleOffset: 0 },
  { id: "Electronic-City",      gvs: 64, flags: [] as const,                               staleOffset: 0 },
  // Hyderabad
  { id: "Gachibowli",           gvs: 87, flags: ["Appreciating"] as const,                staleOffset: 0 },
  { id: "Kondapur",             gvs: 73, flags: ["Undervalued"] as const,                  staleOffset: 0 },
  { id: "Miyapur",              gvs: 58, flags: [] as const,                               staleOffset: 0 },
  // Pune
  { id: "Hinjewadi",            gvs: 80, flags: ["Appreciating"] as const,                staleOffset: 0 },
  { id: "Kharadi",              gvs: 69, flags: ["Undervalued"] as const,                  staleOffset: 0 },
  { id: "Wakad",                gvs: 62, flags: [] as const,                               staleOffset: 0 },
];

for (const z of zones) {
  const computedAt = new Date(Date.now() - z.staleOffset).toISOString();

  const gvsResult: GVSResult = {
    zoneId: z.id,
    computedAt,
    score: z.gvs,
    projectionHorizon: 36,
    confidenceLevel: "High",
    signalBreakdown: [
      { signalName: "infrastructureTender", rawValue: z.gvs / 10, weight: 1 / 7, weightedContribution: (z.gvs / 10 / 10) * (1 / 7) * 100 },
      { signalName: "cluChange",            rawValue: z.gvs > 60 ? 1 : 0, weight: 1 / 7, weightedContribution: (z.gvs > 60 ? 1 : 0) * (1 / 7) * 100 },
      { signalName: "metroHighway",         rawValue: z.gvs > 70 ? 1 : 0, weight: 1 / 7, weightedContribution: (z.gvs > 70 ? 1 : 0) * (1 / 7) * 100 },
      { signalName: "listingDensity",       rawValue: z.gvs * 8,          weight: 1 / 7, weightedContribution: (z.gvs * 8 / 1000) * (1 / 7) * 100 },
      { signalName: "pricingVelocity",      rawValue: z.gvs * 400,        weight: 1 / 7, weightedContribution: (z.gvs * 400 / 50000) * (1 / 7) * 100 },
      { signalName: "searchVolume",         rawValue: z.gvs * 900,        weight: 1 / 7, weightedContribution: (z.gvs * 900 / 100000) * (1 / 7) * 100 },
      { signalName: "rentalAbsorptionRate", rawValue: z.gvs / 100,        weight: 1 / 7, weightedContribution: (z.gvs / 100) * (1 / 7) * 100 },
    ],
    weightsSnapshot: weights,
    inputRecordIds: [`decl-${z.id}-1`, `snap-${z.id}-1`],
  };

  const trendResult: TrendResult = {
    zoneId: z.id,
    computedAt,
    pricingVelocityRTM: z.gvs > 50 ? (z.gvs - 50) / 20 : "Insufficient History",
    pricingVelocityUC:  z.gvs > 50 ? (z.gvs - 48) / 22 : "Insufficient History",
    rentalYieldDelta:   z.gvs > 60 ? (z.gvs - 60) / 30 : "Insufficient History",
    flags: [...z.flags],
    rank: null,
  };

  store.setGVSResult(gvsResult);
  store.setTrendResult(trendResult);
}

// ── Static file server (serves frontend) ─────────────────────────────────────
const FRONTEND_DIR = path.resolve(PROJECT_ROOT, "src", "dashboard", "frontend");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".svg":  "image/svg+xml",
};

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const rawUrl = req.url ?? "/";
  const urlPath = rawUrl.split("?")[0];

  // Route "/" → landing page, "/dashboard" → dashboard app
  let filePath: string;
  if (urlPath === "/" || urlPath === "") {
    filePath = path.join(FRONTEND_DIR, "landing.html");
  } else if (urlPath === "/dashboard" || urlPath === "/dashboard/") {
    filePath = path.join(FRONTEND_DIR, "index.html");
  } else {
    filePath = path.join(FRONTEND_DIR, urlPath);
  }

  // Security: ensure path stays within FRONTEND_DIR
  if (!filePath.startsWith(FRONTEND_DIR)) return false;

  if (!fs.existsSync(filePath)) return false;

  const ext = path.extname(filePath);
  const mime = MIME[ext] ?? "application/octet-stream";

  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": mime });
  res.end(content);
  return true;
}

// ── Combined server ───────────────────────────────────────────────────────────
const apiServer = createServer(store, engine);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const combinedServer = http.createServer((req, res) => {
  const url = req.url ?? "/";

  // API routes
  if (url.startsWith("/api/")) {
    apiServer.emit("request", req, res);
    return;
  }

  // Static frontend files
  if (!serveStatic(req, res)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

combinedServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀  PropSight India`);
  console.log(`   Landing:   http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   API:       http://localhost:${PORT}/api/zones`);
  console.log(`   ${zones.length} demo zones loaded\n`);
});
