/**
 * Tests for sessionId integration in InputPenjualan
 *
 * Property-based tests (fast-check):
 *   14.1 — Property 7: sessionId in submitted object always equals active session's id
 *   14.2 — Property 8: sessionId is always null when no active session
 *
 * Validates: Requirements 8.1–8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import InputPenjualan from '../components/InputPenjualan';

// ── Mock useCategories ────────────────────────────────────

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    allCategories: ['Elektronik', 'Makanan', 'Minuman'],
    subCategoriesFor: () => [],
    addCategory: () => ({ success: true }),
    addSubCategory: () => ({ success: true }),
  }),
}));

// ── Setup / Teardown ──────────────────────────────────────

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

// ── Helpers ───────────────────────────────────────────────

/**
 * Fill the form with valid data and submit it.
 * Returns the submitted data via the onSubmit spy.
 */
function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(/nama barang/i), {
    target: { value: 'Test Barang' },
  });
  fireEvent.change(screen.getByLabelText(/qty/i), {
    target: { value: '2' },
  });
  fireEvent.change(screen.getByLabelText(/harga satuan/i), {
    target: { value: '10000' },
  });
  fireEvent.click(screen.getByRole('button', { name: /simpan/i }));
}

// ── fast-check arbitraries ────────────────────────────────

/** Arbitrary for a valid session id (UUID-like) */
const arbSessionId = fc.uuid();

/** Arbitrary for a valid session name */
const arbSessionName = fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 50 }));

// ── Property-Based Tests ──────────────────────────────────

describe('PBT — Property 7: sessionId always equals active session id', () => {
  /**
   * Validates: Requirements 8.2, 8.4
   *
   * For all active sessions and transaction data, the sessionId in the
   * submitted object always equals the active session's id.
   */
  it('sessionId in submitted object always equals activeSessionId prop', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(arbSessionId, arbSessionName, (sessionId, _sessionName) => {
        const onSubmit = vi.fn();

        const { unmount } = render(
          <InputPenjualan onSubmit={onSubmit} activeSessionId={sessionId} />
        );

        fillAndSubmit();

        expect(onSubmit).toHaveBeenCalledOnce();
        const submittedData = onSubmit.mock.calls[0][0];
        expect(submittedData.sessionId).toBe(sessionId);

        unmount();
      }),
      { numRuns: 20 }
    );
  });
});

describe('PBT — Property 8: sessionId is always null when no active session', () => {
  /**
   * Validates: Requirements 8.3
   *
   * For all transaction data submitted without an active session,
   * the sessionId field is always null.
   */
  it('sessionId is null when activeSessionId is null', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.constant(null), (_noSession) => {
        const onSubmit = vi.fn();

        const { unmount } = render(
          <InputPenjualan onSubmit={onSubmit} activeSessionId={null} />
        );

        fillAndSubmit();

        expect(onSubmit).toHaveBeenCalledOnce();
        const submittedData = onSubmit.mock.calls[0][0];
        expect(submittedData.sessionId).toBeNull();

        unmount();
      }),
      { numRuns: 20 }
    );
  });

  it('sessionId is null when activeSessionId prop is omitted (default)', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.constant(undefined), (_noSession) => {
        const onSubmit = vi.fn();

        const { unmount } = render(<InputPenjualan onSubmit={onSubmit} />);

        fillAndSubmit();

        expect(onSubmit).toHaveBeenCalledOnce();
        const submittedData = onSubmit.mock.calls[0][0];
        expect(submittedData.sessionId).toBeNull();

        unmount();
      }),
      { numRuns: 20 }
    );
  });
});
