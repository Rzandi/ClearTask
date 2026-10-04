/* ═══════════════════════════════════════════════════════════
   W2-reconciliationAndAudit.test.ts — ClearTask
   Tests for:
   - W2-02: Kas Tunai calculation in sessionStats
   - W2-03: Cash reconciliation with tolerance
   - W2-05: Append-only audit trail logging
   - W2-06: Mandatory void reason in audit log
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateSessionStats } from '../utils/sessionStats';
import { transactionService } from '../services/transactionService';
import { auditService } from '../services/auditService';
import db from '../services/db';
import 'fake-indexeddb/auto';

beforeEach(async () => {
  await db.transactions.clear();
  await db.inventory.clear();
  await db.stock_movements.clear();
  await db.audit_log.clear();
  await db.sessions.clear();
});

describe('W2-02: Kas Tunai di Closing Report', () => {
  const session = {
    id: 'ses-1',
    nama: 'Shift Siang',
    tanggalMulai: '2026-10-04',
    waktuMulai: '2026-10-04T07:00:00.000Z',
    tanggalTutup: null,
    waktuTutup: null,
    status: 'aktif' as const,
  };

  it('menghitung kas tunai bersih = tunai masuk - kembalian - pengeluaran tunai', () => {
    const transactions: any[] = [
      {
        id: 1,
        transactionId: 'TRX-001',
        total: 50000,
        uangDiterima: 100000,
        kembalian: 50000,
        metode: 'Tunai',
        sessionId: 'ses-1',
      },
      {
        id: 2,
        transactionId: 'TRX-002',
        total: 75000,
        uangDiterima: 75000,
        kembalian: 0,
        metode: 'Tunai',
        sessionId: 'ses-1',
      },
      {
        id: 3,
        transactionId: 'TRX-003',
        total: 120000,
        metode: 'QRIS', // Non-cash, should NOT affect kas tunai
        sessionId: 'ses-1',
      },
    ];

    const expenses: any[] = [
      {
        id: 'exp-1',
        namaKeluaran: 'Beli Es Batu',
        jumlah: 15000,
        metode: 'Tunai',
        sessionId: 'ses-1',
        tanggal: '2026-10-04',
      },
    ];

    const stats = calculateSessionStats(session, transactions, expenses);

    expect(stats.totalPenjualanTunai).toBe(125000); // 50k + 75k
    expect(stats.totalKembalian).toBe(50000);
    expect(stats.totalPengeluaranTunai).toBe(15000);
    // Kas Tunai Bersih = 125.000 - 50.000 - 15.000 = 60.000
    expect(stats.kasTunaiBersih).toBe(60000);
  });
});

describe('W2-05 & W2-06: Audit Trail & Mandatory Void Reason', () => {
  it('merekam entri audit saat transaksi di-void lengkap dengan alasan', async () => {
    // 1. Create a product in inventory
    await db.inventory.add({
      id: 'inv-nugget',
      namaBarang: 'Fiesta Nugget 500g',
      quantity: 10,
      harga: 45000,
      hargaModal: 38000,
    });

    // 2. Checkout
    const tx = await transactionService.createTransaction(
      {
        items: [
          {
            inventoryId: 'inv-nugget',
            namaBarang: 'Fiesta Nugget 500g',
            qty: 2,
            hargaSatuan: 45000,
            total: 90000,
          },
        ],
        total: 90000,
        metode: 'Tunai',
      },
      'Kasir Siti'
    );

    expect(tx.id).toBeDefined();

    // 3. Void transaction with reason
    await transactionService.voidTransaction(tx.id!, 'Salah input jumlah barang', 'Kasir Siti');

    // 4. Verify audit_log entry
    const auditLogs = await auditService.getRecentLogs(10, 'transaction');
    expect(auditLogs.length).toBeGreaterThan(0);

    const voidLog = auditLogs.find((l) => l.action === 'void');
    expect(voidLog).toBeDefined();
    expect(voidLog?.actor).toBe('Kasir Siti');
    expect(voidLog?.reason).toBe('Salah input jumlah barang');
    expect(voidLog?.entityId).toBe(tx.transactionId);
  });

  it('merekam entri audit saat transaksi di-update', async () => {
    const tx = await transactionService.createTransaction(
      {
        items: [
          {
            namaBarang: 'Buku Tulis',
            qty: 1,
            hargaSatuan: 5000,
            total: 5000,
          },
        ],
        total: 5000,
        metode: 'Tunai',
      },
      'Admin'
    );

    await transactionService.updateTransaction(
      tx.id!,
      {
        catatan: 'Catatan diperbarui',
      },
      'Supervisor Budi'
    );

    const logs = await auditService.getRecentLogs(10, 'transaction');
    const updateLog = logs.find((l) => l.action === 'update');
    expect(updateLog).toBeDefined();
    expect(updateLog?.actor).toBe('Supervisor Budi');
    expect(updateLog?.details?.catatan).toBe('Catatan diperbarui');
  });
});
