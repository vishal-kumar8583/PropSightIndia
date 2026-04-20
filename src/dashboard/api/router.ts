import type { IncomingMessage, ServerResponse } from "node:http";
import type { InMemoryStore } from "./store.js";
import type { CorrelationEngine } from "../../engine/CorrelationEngine.js";
import type { ZoneSummary, ZoneDetail } from "./types.js";
import type { WeightConfig } from "../../types/index.js";

const WEIGHT_SUM_TOLERANCE = 1e-9;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function parseQueryParams(url: string): Record<string, string> {
  const idx = url.indexOf("?");
  if (idx === -1) return {};
  const params: Record<string, string> = {};
  for (const part of url.slice(idx + 1).split("&")) {
    const [key, value] = part.split("=");
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? "");
  }
  return params;
}

function isStale(computedAt: string, thresholdMs: number): boolean {
  return Date.now() - new Date(computedAt).getTime() > thresholdMs;
}

function buildZoneSummary(store: InMemoryStore, zoneId: string): ZoneSummary | null {
  const gvs = store.getGVSResult(zoneId);
  if (!gvs) return null;
  const trend = store.getTrendResult(zoneId);
  return {
    zoneId,
    score: gvs.score,
    flags: trend?.flags ?? [],
    computedAt: gvs.computedAt,
    isStale: isStale(gvs.computedAt, store.getStalenessThresholdMs()),
  };
}

function buildZoneDetail(store: InMemoryStore, zoneId: string): ZoneDetail | null {
  const gvs = store.getGVSResult(zoneId);
  if (!gvs) return null;
  const trend = store.getTrendResult(zoneId);

  // Derive rentalAbsorptionRate from the last market snapshot if available via trend
  // Since we don't store snapshots directly, use 0 as default when no trend data
  const rentalAbsorptionRate = 0;

  return {
    zoneId,
    score: gvs.score,
    flags: trend?.flags ?? [],
    computedAt: gvs.computedAt,
    isStale: isStale(gvs.computedAt, store.getStalenessThresholdMs()),
    signalBreakdown: gvs.signalBreakdown,
    pricingVelocityRTM: trend?.pricingVelocityRTM ?? "Insufficient History",
    pricingVelocityUC: trend?.pricingVelocityUC ?? "Insufficient History",
    rentalAbsorptionRate,
    rentalYieldDelta: trend?.rentalYieldDelta ?? "Insufficient History",
  };
}

function validateWeightSum(config: WeightConfig): boolean {
  const sum = Object.values(config.weights).reduce((acc, w) => acc + w, 0);
  return Math.abs(sum - 1.0) <= WEIGHT_SUM_TOLERANCE;
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  store: InMemoryStore,
  engine?: CorrelationEngine
): Promise<void> {
  const rawUrl = req.url ?? "/";
  const urlWithoutQuery = rawUrl.split("?")[0];
  const method = req.method ?? "GET";
  const query = parseQueryParams(rawUrl);

  // GET /api/zones or GET /api/zones?flags=...
  if (method === "GET" && urlWithoutQuery === "/api/zones") {
    const flagsParam = query["flags"];
    const allResults = store.getAllGVSResults();

    let summaries: ZoneSummary[] = allResults
      .map((r) => buildZoneSummary(store, r.zoneId))
      .filter((s): s is ZoneSummary => s !== null);

    if (flagsParam) {
      const requestedFlags = flagsParam
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f === "Appreciating" || f === "Undervalued") as Array<
        "Appreciating" | "Undervalued"
      >;

      if (requestedFlags.length > 0) {
        summaries = summaries.filter((s) =>
          requestedFlags.some((flag) => s.flags.includes(flag))
        );
      }
    }

    return sendJson(res, 200, summaries);
  }

  // GET /api/zones/:id/trajectory?horizon=N
  const trajectoryMatch = urlWithoutQuery.match(/^\/api\/zones\/([^/]+)\/trajectory$/);
  if (method === "GET" && trajectoryMatch) {
    const zoneId = decodeURIComponent(trajectoryMatch[1]);
    const horizonStr = query["horizon"];

    if (!horizonStr) {
      return sendJson(res, 400, { error: "horizon query parameter is required" });
    }

    const horizon = parseInt(horizonStr, 10);
    if (isNaN(horizon) || horizon < 24 || horizon > 60) {
      return sendJson(res, 400, { error: "horizon must be an integer between 24 and 60" });
    }

    const stored = store.getTrajectory(zoneId);
    if (stored) {
      return sendJson(res, 200, stored);
    }

    // Try to compute on-the-fly if engine is available
    if (engine) {
      const gvs = store.getGVSResult(zoneId);
      if (!gvs || typeof gvs.score !== "number") {
        return sendJson(res, 404, { error: `Zone '${zoneId}' not found or has insufficient data` });
      }
      try {
        const trajectory = engine.projectTrajectory({
          zone: { id: zoneId, name: zoneId },
          currentGVS: gvs.score,
          historicalGVS: [],
          horizon,
          declarations: [],
        });
        return sendJson(res, 200, trajectory);
      } catch (err) {
        return sendJson(res, 500, { error: "Failed to compute trajectory" });
      }
    }

    return sendJson(res, 404, { error: `No trajectory found for zone '${zoneId}'` });
  }

  // GET /api/zones/:id
  const zoneMatch = urlWithoutQuery.match(/^\/api\/zones\/([^/]+)$/);
  if (method === "GET" && zoneMatch) {
    const zoneId = decodeURIComponent(zoneMatch[1]);
    const detail = buildZoneDetail(store, zoneId);
    if (!detail) {
      return sendJson(res, 404, { error: `Zone '${zoneId}' not found` });
    }
    return sendJson(res, 200, detail);
  }

  // GET /api/config/weights
  if (method === "GET" && urlWithoutQuery === "/api/config/weights") {
    return sendJson(res, 200, store.getWeightConfig());
  }

  // PUT /api/config/weights
  if (method === "PUT" && urlWithoutQuery === "/api/config/weights") {
    let body: string;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { error: "Failed to read request body" });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON body" });
    }

    const config = parsed as WeightConfig;
    if (!config || typeof config !== "object" || !config.weights) {
      return sendJson(res, 400, { error: "Invalid WeightConfig: missing weights field" });
    }

    if (!validateWeightSum(config)) {
      return sendJson(res, 400, { error: "Invalid WeightConfig: weights must sum to 1.0" });
    }

    store.setWeightConfig(config);

    // Trigger recomputeAll if engine is available (fire-and-forget)
    if (engine) {
      try {
        engine.recomputeAll(config, []);
      } catch {
        // Silently ignore recompute errors
      }
    }

    return sendJson(res, 200, store.getWeightConfig());
  }

  sendJson(res, 404, { error: "Not found" });
}
