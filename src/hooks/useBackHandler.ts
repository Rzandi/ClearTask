/* ═══════════════════════════════════════════════════════════
   useBackHandler.ts — React hook for mobile back button navigation
   Automatically registers and unregisters back handlers for modals
   ═══════════════════════════════════════════════════════════ */

import { useEffect } from 'react';
import { backNavigation, type BackHandler } from '../services/backNavigation';

/**
 * Registers a back button action handler while `active` is true.
 * Automatically cleans up upon component unmount or when `active` changes to false.
 *
 * @param active Whether the modal/overlay is currently active/open
 * @param handler Function to call when back button is pressed
 * @param priority Optional priority (higher numbers execute first, default: 0)
 */
export function useBackHandler(active: boolean, handler: BackHandler, priority = 0): void {
  useEffect(() => {
    if (!active) return;

    const unregister = backNavigation.register(handler, priority);
    return unregister;
  }, [active, handler, priority]);
}

export default useBackHandler;
