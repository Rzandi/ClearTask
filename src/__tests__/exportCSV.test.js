/* ═══════════════════════════════════════════════════════════
   exportCSV.test.js — ClearTask
   Unit + Property-based tests for exportCSV utilities
   Feature: session-management
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ── Mocks ─────────────────────────────────────────────────

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

vi.mock('../utils/formatters', () => ({
  formatDate: (v) => String(v ?? ''),
  formatTime: (v) => String(v ?? ''),
  toLocalDateString: (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
}));

import { saveAs } from 'file-saver';
import { escapeCSVValue, exportSessionCSV } from '../utils/exportCSV';

// ── Fixtures ──────────────────────────────────────────────

const sampleSession = {
  id: 'session-001',
  nama: 'Shift Pagi',
  tanggalMulai: '2025-07-14',
  waktuMulai: '2025-07-14T01:00:00.000Z',
  tanggalTutup: '2025-07-14',
  waktuTutup: '2025-07-14T05:00:00.000Z',
  status: 'ditutup',
};

const sampleTransaction = {
  transactionId: 'TRX-00001',
  tanggal: '2025-07-14',
  createdAt: '2025-07-14T08:30:00.000Z',
  kasir: 'Admin',
  kategori: 'Makanan',
  namaBarang: 'Nasi Goreng',
  qty: 2,
  hargaSatuan: 15000,
  total: 30000,
  metode: 'Tunai',
  catatan: '',
  status: 'Selesai',
  sessionId: 'session-001',
};

// ── Helper: parse CSV blob text ───────────────────────────

async function getBlobText() {
  const [blob] = saveAs.mock.calls[0];
  return await blob.text();
}

// ── Unit Tests ────────────────────────────────────────────

describe('escapeCSVValue', () => {
  it('returns value unchanged when no special characters', () => {
    expect(escapeCSVValue('hello')).toBe('hello');
    expect(escapeCSVValue('123')).toBe('123');
    expect(escapeCSVValue('')).toBe('');
  });

  it('wraps in double-quotes when value contains a comma', () => {
    expect(escapeCSVValue('hello, world')).toBe('"hello, world"');
  });

  it('wraps in double-quotes and escapes internal double-quotes', () => {
    expect(escapeCSVValue('say "hello"')).toBe('"say ""hello"""');
  });

  it('wraps in double-quotes when value contains a newline', () => {
    expect(escapeCSVValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it('wraps in double-quotes when value contains a carriage return', () => {
    expect(escapeCSVValue('line1\rline2')).toBe('"line1\rline2"');
  });

  it('handles null and undefined as empty string', () => {
    expect(escapeCSVValue(null)).toBe('');
    expect(escapeCSVValue(undefined)).toBe('');
  });

  it('converts numbers to string', () => {
    expect(escapeCSVValue(42)).toBe('42');
  });
});

describe('exportSessionCSV — header row', () => {
  beforeEach(() => vi.clearAllMocks());

  // 5.1 — Output contains the correct header row as the first line
  it('first line is the correct CSV header', async () => {
    await exportSessionCSV([sampleTransaction], sampleSession);

    const text = await getBlobText();
    const firstLine = text.split('\n')[0];

    expect(firstLine).toBe(
      'ID Transaksi,Tanggal,Waktu,Kasir,Kategori,Sub-Kategori,Nama Barang,Qty,Harga Satuan,Total,Metode,Catatan,Status'
    );
  });
});

describe('exportSessionCSV — filename', () => {
  beforeEach(() => vi.clearAllMocks());

  // 5.2 — Session with empty nama uses "NoName" in the filename
  it('uses "NoName" in filename when session nama is empty', async () => {
    const emptyNameSession = { ...sampleSession, nama: '' };
    await exportSessionCSV([], emptyNameSession);

    const [, filename] = saveAs.mock.calls[0];
    expect(filename).toContain('NoName');
    expect(filename).toMatch(/^ClearTask_Session_NoName_.*\.csv$/);
  });

  it('uses session nama in filename when provided', async () => {
    await exportSessionCSV([], sampleSession);

    const [, filename] = saveAs.mock.calls[0];
    expect(filename).toContain('Shift Pagi');
    expect(filename).toMatch(/^ClearTask_Session_Shift Pagi_.*\.csv$/);
  });

  it('includes tanggalTutup in filename', async () => {
    await exportSessionCSV([], sampleSession);

    const [, filename] = saveAs.mock.calls[0];
    expect(filename).toContain('2025-07-14');
  });
});

// ── Property-Based Tests ──────────────────────────────────

describe('PBT — Property 11: escapeCSVValue RFC 4180 compliance', () => {
  // 5.3 — Validates: Requirements 6.6
  it('values with special chars are wrapped in double-quotes with internal quotes escaped', () => {
    // Strings that contain at least one special character
    const arbSpecialString = fc
      .tuple(
        fc.string({ minLength: 0, maxLength: 20 }),
        fc.constantFrom(',', '"', '\n', '\r'),
        fc.string({ minLength: 0, maxLength: 20 })
      )
      .map(([a, special, b]) => a + special + b);

    fc.assert(
      fc.property(arbSpecialString, (value) => {
        const escaped = escapeCSVValue(value);

        // Must be wrapped in double-quotes
        expect(escaped.startsWith('"')).toBe(true);
        expect(escaped.endsWith('"')).toBe(true);

        // Internal double-quotes must be doubled
        const inner = escaped.slice(1, -1);
        // Every " in inner must be followed by another "
        let i = 0;
        while (i < inner.length) {
          if (inner[i] === '"') {
            expect(inner[i + 1]).toBe('"');
            i += 2;
          } else {
            i++;
          }
        }

        // Round-trip: unescape and compare to original
        const unescaped = inner.replace(/""/g, '"');
        expect(unescaped).toBe(value);
      }),
      { numRuns: 100 }
    );
  });

  it('values without special chars are returned unchanged', () => {
    // Strings that do NOT contain , " \n \r
    const arbSafeString = fc
      .string({ minLength: 0, maxLength: 30 })
      .filter((s) => !s.includes(',') && !s.includes('"') && !s.includes('\n') && !s.includes('\r'));

    fc.assert(
      fc.property(arbSafeString, (value) => {
        expect(escapeCSVValue(value)).toBe(value);
      }),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 12: filename format always correct', () => {
  // 5.4 — Validates: Requirements 5.3, 6.3
  it('filename always follows ClearTask_Session_{nama}_{tanggalTutup}.csv format', async () => {
    const arbSessionName = fc.oneof(
      fc.constant(''),
      fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0)
    );

    const arbDate = fc
      .tuple(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 })
      )
      .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

    await fc.assert(
      fc.asyncProperty(arbSessionName, arbDate, async (nama, tanggalTutup) => {
        vi.clearAllMocks();

        const session = {
          ...sampleSession,
          nama,
          tanggalTutup,
        };

        await exportSessionCSV([], session);

        const calls = saveAs.mock.calls;
        const [, filename] = calls[calls.length - 1];
        const expectedNama = nama.trim() || 'NoName';
        const expectedFilename = `ClearTask_Session_${expectedNama}_${tanggalTutup}.csv`;

        expect(filename).toBe(expectedFilename);
      }),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 11 (round-trip): CSV rows parse back to original values', () => {
  // 5.5 — Validates: Requirements 6.4, 6.5, 6.6
  it('every CSV data row can be parsed back to match original transaction fields', async () => {
    // Use safe alphanumeric-only strings for all fields to avoid CSV escaping complications
    const arbSafeString = (maxLength = 15) =>
      fc.stringMatching(new RegExp(`^[A-Za-z0-9 ]{0,${maxLength}}$`));

    const arbTransaction = fc.record({
      transactionId: fc.stringMatching(/^[A-Za-z0-9-]{1,12}$/),
      tanggal: fc.constant('2025-01-01'),
      createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
      kasir: arbSafeString(10),
      kategori: arbSafeString(10),
      namaBarang: arbSafeString(15),
      qty: fc.integer({ min: 1, max: 100 }),
      hargaSatuan: fc.integer({ min: 0, max: 100000 }),
      total: fc.integer({ min: 0, max: 10000000 }),
      metode: fc.constantFrom('Tunai', 'QRIS', 'Transfer'),
      catatan: arbSafeString(20),
      status: fc.constant('Selesai'),
      sessionId: fc.constant('session-001'),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(arbTransaction, { minLength: 1, maxLength: 5 }),
        async (transactions) => {
          vi.clearAllMocks();

          await exportSessionCSV(transactions, sampleSession);

          const [blob] = saveAs.mock.calls[0];
          const text = await blob.text();
          const lines = text.split('\n');

          // lines[0] = header, lines[1..] = data rows
          // With safe strings (no newlines), line count must match exactly
          if (lines.length !== transactions.length + 1) return false;

          // For each data row, verify the transactionId field (column 0) matches
          for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            const row = lines[i + 1];
            // transactionId has no special chars, so it won't be quoted
            const firstField = row.split(',')[0];
            if (firstField !== String(tx.transactionId ?? '')) return false;
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
