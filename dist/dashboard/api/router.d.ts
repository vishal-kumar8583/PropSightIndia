import type { IncomingMessage, ServerResponse } from "node:http";
import type { InMemoryStore } from "./store.js";
import type { CorrelationEngine } from "../../engine/CorrelationEngine.js";
export declare function handleRequest(req: IncomingMessage, res: ServerResponse, store: InMemoryStore, engine?: CorrelationEngine): Promise<void>;
//# sourceMappingURL=router.d.ts.map