export class EventBus {
    listeners = {};
    on(event, handler) {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }
        this.listeners[event].add(handler);
    }
    off(event, handler) {
        this.listeners[event]?.delete(handler);
    }
    emit(event, data) {
        const handlers = this.listeners[event];
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        }
    }
}
//# sourceMappingURL=EventBus.js.map