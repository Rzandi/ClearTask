import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import * as fc from 'fast-check';
import InputPenjualan from '../components/InputPenjualan';

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { kasirName: 'Admin' } }),
}));

vi.mock('../hooks/useInventory', () => ({
  useInventory: () => ({
    inventory: [{ id: 1, namaBarang: 'Kopi', harga: 10000, kategori: 'Minuman', quantity: 10 }],
  }),
}));

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    allCategories: ['Elektronik', 'Makanan', 'Minuman'],
    subCategoriesFor: () => [],
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function fillAndSubmit() {
  fireEvent.click(screen.getByText('Kopi'));
  const input = screen.getByPlaceholderText('0');
  fireEvent.change(input, { target: { value: '20000' } });

  await act(async () => {
    fireEvent.click(screen.getByText('Bayar & Cetak Struk'));
  });
}

const arbSessionId = fc.uuid();
const arbSessionName = fc.string({ minLength: 1, maxLength: 50 });

describe('PBT — Property 7: sessionId always equals active session id', () => {
  it(
    'sessionId in submitted object always equals activeSession prop',
    { timeout: 30000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(arbSessionId, arbSessionName, async (sessionId, _sessionName) => {
          cleanup();
          const onSubmit = vi.fn().mockResolvedValue(true);
          const { unmount } = render(
            <InputPenjualan onSubmit={onSubmit} activeSession={{ id: sessionId }} />
          );

          fillAndSubmit();

          expect(onSubmit).toHaveBeenCalledOnce();
          const submittedData = onSubmit.mock.calls[0][0];
          expect(submittedData.sessionId).toBe(sessionId);

          unmount();
          cleanup();
        }),
        { numRuns: 20 }
      );
    }
  );
});

describe('PBT — Property 8: sessionId is always null when no active session', () => {
  it('sessionId is null when activeSession prop is omitted', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        cleanup();
        const onSubmit = vi.fn().mockResolvedValue(true);
        const { unmount } = render(<InputPenjualan onSubmit={onSubmit} />);

        await fillAndSubmit();

        expect(onSubmit).toHaveBeenCalledOnce();
        const submittedData = onSubmit.mock.calls[0][0];
        expect(submittedData.sessionId).toBeNull();

        unmount();
        cleanup();
      }),
      { numRuns: 20 }
    );
  });
});
