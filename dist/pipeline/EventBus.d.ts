import type { MunicipalDeclaration, MarketSnapshot, GVSResult, Alert } from "../types/index.js";
export type EventMap = {
    "declaration:ingested": MunicipalDeclaration;
    "snapshot:ingested": MarketSnapshot;
    "gvs:computed": {
        prev: GVSResult | null;
        next: GVSResult;
    };
    "alert:generated": Alert;
};
type Handler<T> = (data: T) => void;
export declare class EventBus {
    private readonly listeners;
    on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void;
    off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void;
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
}
export {};
//# sourceMappingURL=EventBus.d.ts.map