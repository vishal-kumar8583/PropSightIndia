import type { MunicipalDeclaration, MarketSnapshot, GVSResult, Alert } from "../types/index.js";

export type EventMap = {
  "declaration:ingested": MunicipalDeclaration;
  "snapshot:ingested": MarketSnapshot;
  "gvs:computed": { prev: GVSResult | null; next: GVSResult };
  "alert:generated": Alert;
};

type Handler<T> = (data: T) => void;

export class EventBus {
  private readonly listeners: {
    [K in keyof EventMap]?: Set<Handler<EventMap[K]>>;
  } = {};

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    if (!this.listeners[event]) {
      (this.listeners as Record<string, Set<Handler<unknown>>>)[event] = new Set();
    }
    (this.listeners[event] as Set<Handler<EventMap[K]>>).add(handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    (this.listeners[event] as Set<Handler<EventMap[K]>> | undefined)?.delete(handler);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners[event] as Set<Handler<EventMap[K]>> | undefined;
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }
}
