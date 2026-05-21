/* ═══════════════════════════════════════════════════════════
   exportExcel.test.js — Unit tests for exportToExcel
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock file-saver so tests don't trigger actual downloads
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock formatters to avoid dependency issues in unit tests
vi.mock('../utils/formatters', () => ({
  formatRupiah: (v) => String(v),
  formatDate: (v) => String(v),
  formatTime: (v) => String(v),
  toLocalDateString: (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
}));

// Shared state for the mock — accessible across tests
const mockState = {
  rows: [],
  addRowCalls: [],
};

// Mock ExcelJS — provide a default export with a Workbook constructor
// that matches how exportExcel.js uses it: `new ExcelJS.Workbook()`
vi.mock('exceljs', () => {
  const makeCell = () => {
    const cell = { font: null, fill: null, alignment: null, border: null, numFmt: null, value: null };
    return cell;
  };

  class MockWorkbook {
    constructor() {
      this.creator = '';
      this.created = null;
      mockState.rows = [];
      mockState.addRowCalls = [];

      this._sheet = {
        addRow(values) {
          const cells = (Array.isArray(values) ? values : []).map(() => makeCell());
          // Assign values to cells
          (Array.isArray(values) ? values : []).forEach((v, i) => {
            cells[i].value = v;
          });
          const row = {
            values,
            _cells: cells,
            getCell: (n) => cells[n - 1] || makeCell(),
            eachCell: (fn) => cells.forEach((c, i) => fn(c, i + 1)),
          };
          mockState.rows.push(row);
          mockState.addRowCalls.push(values);
          return row;
        },
        columns: [],
      };

      this.xlsx = {
        writeBuffer: vi.fn(async () => new ArrayBuffer(8)),
      };
    }

    addWorksheet(_name, _opts) {
      return this._sheet;
    }
  }

  return {
    default: { Workbook: MockWorkbook },
  };
});

import { exportToExcel } from '../utils/exportExcel';

const sampleTransactions = [
  {
    transactionId: 'TX001',
    tanggal: '2024-01-01',
    createdAt: '2024-01-01T10:00:00Z',
    kasir: 'Budi',
    kategori: 'Makanan',
    namaBarang: 'Nasi Goreng',
    qty: 2,
    hargaSatuan: 15000,
    total: 30000,
    metode: 'Tunai',
    catatan: '',
    status: 'Selesai',
  },
];

describe('exportToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.rows = [];
    mockState.addRowCalls = [];
  });

  it('tokoName non-kosong → workbook mengandung nilai tokoName di baris pertama', async () => {
    const settings = { tokoName: 'Toko Maju Jaya', kasirName: '' };
    await exportToExcel(sampleTransactions, settings);

    expect(mockState.addRowCalls[0][0]).toBe('Toko Maju Jaya');
  });

  it('kasirName non-kosong → workbook mengandung "Kasir: [kasirName]" di baris header', async () => {
    const settings = { tokoName: '', kasirName: 'Siti' };
    await exportToExcel(sampleTransactions, settings);

    // No tokoName, so kasir row is first
    expect(mockState.addRowCalls[0][0]).toBe('Kasir: Siti');
  });

  it('tokoName dan kasirName keduanya ada → keduanya muncul di baris 1 dan 2', async () => {
    const settings = { tokoName: 'Warung Barokah', kasirName: 'Ahmad' };
    await exportToExcel(sampleTransactions, settings);

    expect(mockState.addRowCalls[0][0]).toBe('Warung Barokah');
    expect(mockState.addRowCalls[1][0]).toBe('Kasir: Ahmad');
    // Third addRow should be the column header row
    expect(mockState.addRowCalls[2][0]).toBe('ID Transaksi');
  });

  it('tokoName dan kasirName kosong → tidak ada baris header tambahan', async () => {
    const settings = { tokoName: '', kasirName: '' };
    await exportToExcel(sampleTransactions, settings);

    // First addRow should be the column header row directly
    expect(mockState.addRowCalls[0][0]).toBe('ID Transaksi');
    // Total addRow calls = 1 header + 1 data row = 2
    expect(mockState.addRowCalls.length).toBe(2);
  });

  it('settings tidak diberikan (default {}) → fungsi tidak error', async () => {
    await expect(exportToExcel(sampleTransactions)).resolves.toBeUndefined();
  });

  it('tokoName baris pertama memiliki style bold', async () => {
    const settings = { tokoName: 'Toko Bold', kasirName: '' };
    await exportToExcel(sampleTransactions, settings);

    // First row is the tokoName row; check its first cell font
    const firstRow = mockState.rows[0];
    expect(firstRow).toBeDefined();
    const cell = firstRow.getCell(1);
    expect(cell.font?.bold).toBe(true);
  });
});
