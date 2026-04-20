import type { Server } from "node:http";
import type { InMemoryStore } from "./store.js";
import type { CorrelationEngine } from "../../engine/CorrelationEngine.js";
export interface ServerOptions {
    port?: number;
    host?: string;
}
export declare function createServer(store: InMemoryStore, engine?: CorrelationEngine, options?: ServerOptions): Server;
export declare function startServer(store: InMemoryStore, engine?: CorrelationEngine, options?: ServerOptions): Promise<Server>;
//# sourceMappingURL=server.d.ts.map