/* ═══════════════════════════════════════════════════════════
   backNavigation.ts — ClearTask Mobile Back Navigation Manager
   Manages back button action stack (LIFO) for modals & overlays
   ═══════════════════════════════════════════════════════════ */

export type BackHandler = () => boolean | void;

export interface HandlerEntry {
  id: string;
  handler: BackHandler;
  priority: number;
}

class BackNavigationManager {
  private handlers: HandlerEntry[] = [];
  private counter = 0;

  /**
   * Register a back action handler (e.g. for closing an active modal or overlay).
   * Handlers with higher priority execute first. For equal priority, later registered execute first (LIFO).
   * @param handler Function to run on back press. If it returns false, event propagation continues.
   * @param priority Higher priority executes first (default: 0).
   * @returns Unregister callback.
   */
  register(handler: BackHandler, priority = 0): () => void {
    this.counter += 1;
    const id = `bh_${Date.now()}_${this.counter}`;
    const entry: HandlerEntry = { id, handler, priority };

    this.handlers.push(entry);

    return () => {
      this.unregister(id);
    };
  }

  unregister(id: string): void {
    this.handlers = this.handlers.filter((h) => h.id !== id);
  }

  /**
   * Triggers the top-most handler.
   * Returns true if a handler was executed and consumed the event.
   */
  trigger(): boolean {
    if (this.handlers.length === 0) return false;

    // Sort: highest priority first. If equal priority, latest registered (LIFO) first.
    const sorted = [...this.handlers].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return this.handlers.indexOf(b) - this.handlers.indexOf(a);
    });

    for (const entry of sorted) {
      try {
        const result = entry.handler();
        // If handler does not explicitly return false, we consider it consumed
        if (result !== false) {
          return true;
        }
      } catch (err) {
        console.error('[BackNavigation] Error executing back handler:', err);
      }
    }

    return false;
  }

  hasActiveHandlers(): boolean {
    return this.handlers.length > 0;
  }

  getHandlerCount(): number {
    return this.handlers.length;
  }

  clear(): void {
    this.handlers = [];
  }
}

export const backNavigation = new BackNavigationManager();
