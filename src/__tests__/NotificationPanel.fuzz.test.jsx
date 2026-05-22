import { describe, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import NotificationPanel from '../components/NotificationPanel';

const arbTransaction = fc.record({
  transactionId: fc.string(),
  namaBarang: fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
  createdAt: fc
    .integer({ min: 946684800000, max: 4102444800000 })
    .map((t) => new Date(t).toISOString()),
  total: fc.oneof(fc.integer({ min: -1000000, max: 100000000 }), fc.constant(0)),
});

describe('NotificationPanel — Fuzz Testing', () => {
  it('does not crash when rendering extreme notifications', () => {
    fc.assert(
      fc.property(fc.array(arbTransaction, { maxLength: 100 }), (transactions) => {
        const { unmount } = render(
          <NotificationPanel isOpen={true} onClose={vi.fn()} transactions={transactions} />
        );
        // Component should render without crashing
        unmount();
      }),
      { numRuns: 50 }
    );
  });
});
