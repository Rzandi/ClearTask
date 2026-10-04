/* ═══════════════════════════════════════════════════════════
   W0-trashPurge.test.jsx — ClearTask
   Tests for W0-04 (Trash purge safety & confirmation) and
   W0-14 (Query using deletedAt index).
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TrashManager from '../components/TrashManager';
import db from '../services/db';
import 'fake-indexeddb/auto';

describe('W0-04: TrashManager purge safety', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.inventory.clear();
  });

  it('1. Does NOT auto-purge expired items on mount without confirmation', async () => {
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    const oldDateISO = fortyDaysAgo.toISOString();

    // Insert an item soft-deleted 40 days ago
    await db.inventory.add({
      id: 'inv-old-1',
      namaBarang: 'Kopi Susu Lama',
      kategori: 'Minuman',
      harga: 10000,
      quantity: 5,
      deletedAt: oldDateISO,
    });

    render(<TrashManager />);

    // Item must still exist in DB after mount (not purged silently!)
    const itemInDb = await db.inventory.get('inv-old-1');
    expect(itemInDb).toBeDefined();
    expect(itemInDb.deletedAt).toBe(oldDateISO);

    // Banner must appear notifying the user
    await waitFor(() => {
      expect(screen.getByTestId('trash-expired-banner')).toBeInTheDocument();
      expect(screen.getByText(/lebih dari 30 hari/i)).toBeInTheDocument();
    });
  });

  it('2. Shows ConfirmDialog when clicking "Bersihkan Sekarang" on expired banner', async () => {
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    await db.transactions.add({
      id: 99,
      transactionId: 'TRX-OLD-99',
      total: 25000,
      metode: 'Tunai',
      deletedAt: fortyDaysAgo.toISOString(),
    });

    render(<TrashManager />);

    await waitFor(() => {
      expect(screen.getByText('Bersihkan Sekarang')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bersihkan Sekarang'));

    // Confirm dialog should open
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      expect(screen.getByText(/Bersihkan Item Lama/i)).toBeInTheDocument();
    });
  });

  it('3. Protects inventory items referenced in transactions from permanent purge', async () => {
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    // Soft-deleted product
    await db.inventory.add({
      id: 'prod-referenced',
      namaBarang: 'Roti Gandum',
      kategori: 'Makanan',
      harga: 15000,
      quantity: 0,
      deletedAt: fortyDaysAgo.toISOString(),
    });

    // Active transaction that references "Roti Gandum"
    await db.transactions.add({
      id: 101,
      transactionId: 'TRX-101',
      total: 15000,
      metode: 'Tunai',
      items: [
        {
          namaBarang: 'Roti Gandum',
          qty: 1,
          hargaSatuan: 15000,
          total: 15000,
        },
      ],
    });

    render(<TrashManager />);

    await waitFor(() => {
      expect(screen.getByText('Bersihkan Sekarang')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bersihkan Sekarang'));

    // Confirm the purge
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Bersihkan Sekarang' })).toHaveLength(2);
    });
    const confirmButtons = screen.getAllByRole('button', { name: 'Bersihkan Sekarang' });
    // Click the confirm button in the dialog (last one)
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    // Check DB: the referenced item should NOT be deleted!
    await waitFor(async () => {
      const item = await db.inventory.get('prod-referenced');
      expect(item).toBeDefined(); // Kept safe!
    });
  });
});
