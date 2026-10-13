import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateErrorCode,
  captureException,
  getErrorLogs,
  clearErrorLogs,
  setRemoteEndpoint,
  getRemoteEndpoint,
  initErrorTracker,
} from '../services/errorTracker';

describe('W5-03: Production Observability & ErrorTracker', () => {
  beforeEach(() => {
    clearErrorLogs();
    setRemoteEndpoint(null);
    vi.restoreAllMocks();
  });

  it('generates consistent predefined error codes for known critical errors', () => {
    const quotaErr = new Error('QuotaExceededError: Storage quota reached');
    quotaErr.name = 'QuotaExceededError';
    expect(generateErrorCode(quotaErr)).toBe('E-QUOTA');

    const constraintErr = new Error('ConstraintError: Unique violation');
    constraintErr.name = 'ConstraintError';
    expect(generateErrorCode(constraintErr)).toBe('E-DUPLICATE');

    const abortErr = new Error('AbortError');
    abortErr.name = 'AbortError';
    expect(generateErrorCode(abortErr)).toBe('E-ABORT');
  });

  it('generates deterministic hashed code for custom errors', () => {
    const err1 = new Error('Something failed in checkout');
    const err2 = new Error('Something failed in checkout');
    expect(generateErrorCode(err1)).toMatch(/^E\d{3}$/);
    expect(generateErrorCode(err1)).toBe(generateErrorCode(err2));
  });

  it('captures exception and stores in local ring buffer with diagnostic info', () => {
    const testErr = new Error('Payment processing network glitch');
    const entry = captureException(testErr, {
      screen: 'POS',
      cartItemsCount: 3,
    });

    expect(entry.id).toBeDefined();
    expect(entry.code).toMatch(/^E\d{3}$/);
    expect(entry.message).toBe('Payment processing network glitch');
    expect(entry.context?.screen).toBe('POS');
    expect(entry.context?.cartItemsCount).toBe(3);

    const logs = getErrorLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.id).toBe(entry.id);
  });

  it('translates storage quota error to Indonesian user-friendly message', () => {
    const quotaErr = new Error('Quota exceeded on device');
    quotaErr.name = 'QuotaExceededError';

    const entry = captureException(quotaErr);
    expect(entry.code).toBe('E-QUOTA');
    expect(entry.userMessage).toContain('Penyimpanan Penuh');
  });

  it('clears error logs when clearErrorLogs is invoked', () => {
    captureException(new Error('Temporary error 1'));
    captureException(new Error('Temporary error 2'));
    expect(getErrorLogs()).toHaveLength(2);

    clearErrorLogs();
    expect(getErrorLogs()).toHaveLength(0);
  });

  it('dispatches to remote endpoint when configured', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('OK', { status: 200 }));
    setRemoteEndpoint('https://telemetry.example.com/api/errors');
    expect(getRemoteEndpoint()).toBe('https://telemetry.example.com/api/errors');

    captureException(new Error('Remote tracked error'));

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://telemetry.example.com/api/errors',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('initializes global error tracker without throwing', () => {
    expect(() => initErrorTracker()).not.toThrow();
  });
});
