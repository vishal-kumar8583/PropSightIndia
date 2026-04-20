import { createServer as createHttpServer } from "node:http";
import type { Server } from "node:http";
import type { InMemoryStore } from "./store.js";
import type { CorrelationEngine } from "../../engine/CorrelationEngine.js";
import { handleRequest } from "./router.js";

export interface ServerOptions {
  port?: number;
  host?: string;
}

export function createServer(
  store: InMemoryStore,
  engine?: CorrelationEngine,
  options: ServerOptions = {}
): Server {
  const server = createHttpServer((req, res) => {
    handleRequest(req, res, store, engine).catch((err) => {
      console.error("Unhandled error in request handler:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
  });

  return server;
}

export function startServer(
  store: InMemoryStore,
  engine?: CorrelationEngine,
  options: ServerOptions = {}
): Promise<Server> {
  const { port = 3000, host = "127.0.0.1" } = options;
  const server = createServer(store, engine, options);

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => {
      resolve(server);
    });
  });
}
