import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Capture rows
const capturedRows = [];
const mockGetCell = vi.fn(() => ({ font: {}, fill: {}, alignment: {}, border: {}, numFmt: '' }));
const mockSheet = {
  addRow: vi.fn((data) => {
    capturedRows.push([...data]);
    return { eachCell: vi.fn((cb) => data.forEach((_, i) => cb(mockGetCell(), i + 1))), getCell: mockGetCell };
  }),
  columns: [],
};

// ExcelJS is imported as default and used as `new ExcelJS.Workbook()`
// Workbook must be a regular function (not arrow) to be used as a constructor
vi.mock('exceljs', () => {
  function WorkbookMock() {
    this.addWorksheet = vi.fn(() => mockSheet);
    this.xlsx = { writeBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))) };
    this.creator = '';
    this.created = null;
  }
  return {
    default: { Workbook: WorkbookMock },
  };
});

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { exportToExcel } from '../utils/exportExcel';

function makeTx(overrides = {}) {
  return {
    id: 1, transactionId: 'TRX-00001', tanggal: '2025-01-15',
    kategori: 'Elektronik', subKategori: 'Laptop', namaBarang: 'Laptop',
    qty: 1, hargaSatuan: 5000000, total: 5000000, metode: 'Tunai',
    catatan: '', kasir: 'Admin', createdAt: '2025-01-15T00:00:00.000Z', status: 'Selesai',
    ...overrides,
  };
}

describe('exportExcel — kolom Sub-Kategori', () => {
  beforeEach(() => {
    capturedRows.length = 0;
    mockSheet.addRow.mockClear();
  });

  it('7.1a: header row mengandung "Sub-Kategori" tepat setelah "Kategori"', async () => {
    await exportToExcel([makeTx()], {});
    const headerRow = capturedRows[0];
    const kategoriIdx = headerRow.indexOf('Kategori');
    const subKategoriIdx = headerRow.indexOf('Sub-Kategori');
    expect(subKategoriIdx).toBe(kategoriIdx + 1);
  });

  it('7.1b: transaksi dengan subKategori tidak kosong menghasilkan nilai yang benar', async () => {
    await exportToExcel([makeTx({ subKategori: 'Laptop Gaming' })], {});
    const headerRow = capturedRows[0];
    const subKategoriIdx = headerRow.indexOf('Sub-Kategori');
    const dataRow = capturedRows[1];
    expect(dataRow[subKategoriIdx]).toBe('Laptop Gaming');
  });

  it('7.1c: transaksi tanpa subKategori menghasilkan string kosong', async () => {
    const tx = makeTx();
    delete tx.subKategori;
    await exportToExcel([tx], {});
    const headerRow = capturedRows[0];
    const subKategoriIdx = headerRow.indexOf('Sub-Kategori');
    const dataRow = capturedRows[1];
    expect(dataRow[subKategoriIdx]).toBe('');
  });

  // Feature: dynamic-categories, Property 11: Sub-Kategori column always at correct position in Excel
  it('Property 11: kolom Sub-Kategori selalu di posisi yang benar — Validates: Requirements 8.1, 8.2, 8.3, 8.4', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            subKategori: fc.oneof(fc.string({ minLength: 0, maxLength: 20 }), fc.constant(undefined)),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (txsPartial) => {
          capturedRows.length = 0;
          mockSheet.addRow.mockClear();

          const txs = txsPartial.map((t, i) => ({
            id: i + 1, transactionId: `TRX-${i}`, tanggal: '2025-01-01',
            kategori: 'Elektronik', namaBarang: 'Item', qty: 1,
            hargaSatuan: 1000, total: 1000, metode: 'Tunai',
            catatan: '', kasir: 'Admin', createdAt: new Date().toISOString(),
            status: 'Selesai', ...t,
          }));

          await exportToExcel(txs, {});

          const headerRow = capturedRows[0];
          if (!headerRow) return true;
          const kategoriIdx = headerRow.indexOf('Kategori');
          const subKategoriIdx = headerRow.indexOf('Sub-Kategori');

          if (subKategoriIdx !== kategoriIdx + 1) return false;

          for (let i = 0; i < txs.length; i++) {
            const dataRow = capturedRows[i + 1];
            const expected = txs[i].subKategori || '';
            if (dataRow[subKategoriIdx] !== expected) return false;
          }
          return true;
        }
      )
    );
  });
});
