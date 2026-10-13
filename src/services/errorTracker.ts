/* ═══════════════════════════════════════════════════════════
   errorTracker.ts — ClearTask
   Production Observability & Error Tracking (W5-03)
   Captures uncaught errors, stores diagnostic ring buffer locally,
   and optionally sends to configured telemetry endpoint.
   ═══════════════════════════════════════════════════════════ */

import { getDexieErrorMessage } from '../utils/errorMessages';

export interface ErrorLogEntry {
  id: string;
  code: string;
  name: string;
  message: string;
  userMessage: string;
  stack?: string | undefined;
  componentStack?: string | undefined;
  timestamp: string;
  url: string;
  userAgent: string;
  context?: Record<string, any> | undefined;
}

const STORAGE_KEY = 'cleartask_error_logs_v1';
const MAX_LOGS = 50; // Ring buffer of 50 most recent errors

let isInitialized = false;
let remoteEndpoint: string | null =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ERROR_TRACKING_URL) || null;

/**
 * Generate standard hash error code (E100 - E999) consistent with ErrorBoundary
 */
export function generateErrorCode(error: unknown): string {
  if (!error) return 'E000';
  const err = error as any;
  const name = String(err?.name || '');
  const msg = String(err?.message || '');

  // Predefined codes for known critical conditions
  if (name === 'QuotaExceededError' || msg.includes('QuotaExceeded')) return 'E-QUOTA';
  if (name === 'ConstraintError') return 'E-DUPLICATE';
  if (name === 'AbortError') return 'E-ABORT';
  if (name === 'VersionError') return 'E-VERSION';

  const str = `${name}:${msg}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const code = Math.abs(hash % 900) + 100;
  return `E${code}`;
}

/**
 * Read error logs from localStorage ring buffer
 */
export function getErrorLogs(): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save error log entry to ring buffer
 */
function saveLog(entry: ErrorLogEntry): void {
  try {
    const existing = getErrorLogs();
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Non-fatal if localStorage is full or disabled
  }
}

/**
 * Clear all captured error logs
 */
export function clearErrorLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal
  }
}

/**
 * Dispatch error entry to remote telemetry endpoint if configured
 */
async function dispatchRemote(entry: ErrorLogEntry): Promise<void> {
  if (!remoteEndpoint) return;
  try {
    await fetch(remoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    });
  } catch {
    // Fail silently in telemetry dispatch
  }
}

/**
 * Capture an exception, format with diagnostic metadata, record locally and report
 */
export function captureException(error: unknown, context?: Record<string, any>): ErrorLogEntry {
  const err = error instanceof Error ? error : new Error(String(error || 'Unknown Error'));
  const code = generateErrorCode(err);
  const userMessage = getDexieErrorMessage(err);

  const entry: ErrorLogEntry = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    code,
    name: err.name || 'Error',
    message: err.message || String(error),
    userMessage,
    stack: err.stack,
    componentStack: context?.componentStack,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    context,
  };

  saveLog(entry);
  void dispatchRemote(entry);

  return entry;
}

/**
 * Set or update remote telemetry endpoint at runtime (e.g. from Settings)
 */
export function setRemoteEndpoint(endpoint: string | null): void {
  remoteEndpoint = endpoint;
}

/**
 * Get current configured remote endpoint
 */
export function getRemoteEndpoint(): string | null {
  return remoteEndpoint;
}

/**
 * Initialize global error tracking listeners
 */
export function initErrorTracker(endpoint?: string): void {
  if (isInitialized) return;
  if (endpoint) remoteEndpoint = endpoint;

  if (typeof window !== 'undefined') {
    // Global uncaught JS errors
    window.addEventListener('error', (event: ErrorEvent) => {
      captureException(event.error || event.message, {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Unhandled promise rejections (async Dexie write fails, network drops)
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      captureException(event.reason, {
        source: 'window.onunhandledrejection',
      });
    });
  }

  isInitialized = true;
}
