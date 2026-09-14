/* ═══════════════════════════════════════════════════════════
   resiliencyGuards.ts — ClearTask Edge Cases & Resiliency Guards
   Pilar 2: Storage Quota Guard, Incognito Warning, iOS Purge Guard,
   Lazy Chunk Retry & Multi-Tab BroadcastChannel Sync.
   ═══════════════════════════════════════════════════════════ */

import { lazy, type ComponentType } from 'react';

// ── 1. Lazy-Loaded Chunk Retry (Item 23) ──────────────────────
/**
 * Retries dynamic import if ChunkLoadError occurs due to SW update or network lag.
 * Retries up to `retries` times with backoff delay.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 2,
  interval = 1000
): ReturnType<typeof lazy> {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, interval));
        return lazyWithRetry(componentImport, retries - 1, interval * 1.5) as any;
      }
      // If chunk is completely missing after retries (e.g. new SW deployed), force reload page once
      const hasReloaded = sessionStorage.getItem('cleartask_chunk_reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('cleartask_chunk_reloaded', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
}

// ── 2. Storage Quota Guard (Item 27) ──────────────────────────
export interface StorageQuotaStatus {
  supported: boolean;
  quotaBytes: number;
  usageBytes: number;
  percentUsed: number;
  isLowSpace: boolean; // true if remaining < 50MB or > 90% used
  remainingMB: number;
}

export async function checkStorageQuota(): Promise<StorageQuotaStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return {
      supported: false,
      quotaBytes: 0,
      usageBytes: 0,
      percentUsed: 0,
      isLowSpace: false,
      remainingMB: 999,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quotaBytes = estimate.quota || 0;
    const usageBytes = estimate.usage || 0;
    const remainingBytes = quotaBytes - usageBytes;
    const remainingMB = Math.round(remainingBytes / (1024 * 1024));
    const percentUsed = quotaBytes > 0 ? Math.round((usageBytes / quotaBytes) * 100) : 0;
    const isLowSpace = remainingMB < 50 || percentUsed > 90;

    return {
      supported: true,
      quotaBytes,
      usageBytes,
      percentUsed,
      isLowSpace,
      remainingMB,
    };
  } catch {
    return {
      supported: false,
      quotaBytes: 0,
      usageBytes: 0,
      percentUsed: 0,
      isLowSpace: false,
      remainingMB: 999,
    };
  }
}

// ── 3. Incognito Mode Detection (Item 31) ─────────────────────
export async function checkIsIncognito(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota } = await navigator.storage.estimate();
      // Most browsers set quota < 120MB in incognito mode
      if (quota && quota < 120000000) {
        return true;
      }
    }
  } catch {
    // ignore error
  }

  return false;
}

// ── 4. iOS 7-Day Purge Guard & Persistent Storage (Item 32) ───
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      const granted = await navigator.storage.persist();
      return granted;
    }
    return true;
  } catch {
    return false;
  }
}

// ── 5. Multi-Tab Sync BroadcastChannel (Item 24) ─────────────
export type SyncMessageType = 'CART_UPDATED' | 'TRANSACTION_ADDED' | 'SESSION_CHANGED' | 'PING';

export interface SyncMessage {
  type: SyncMessageType;
  payload?: any;
  senderId: string;
}

const TAB_ID = `TAB-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
let syncChannel: BroadcastChannel | null = null;

export function initMultiTabSync(onMessage: (msg: SyncMessage) => void): () => void {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return () => {};
  }

  try {
    syncChannel = new BroadcastChannel('cleartask_tab_sync');
    syncChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data && event.data.senderId !== TAB_ID) {
        onMessage(event.data);
      }
    };

    return () => {
      if (syncChannel) {
        syncChannel.close();
        syncChannel = null;
      }
    };
  } catch {
    return () => {};
  }
}

export function broadcastTabMessage(type: SyncMessageType, payload?: any) {
  if (syncChannel) {
    try {
      syncChannel.postMessage({
        type,
        payload,
        senderId: TAB_ID,
      });
    } catch (err) {
      console.warn('Failed to broadcast tab message:', err);
    }
  }
}
