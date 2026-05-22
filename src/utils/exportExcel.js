/* ═══════════════════════════════════════════════════════════
   Excel Export — ClearTask
   Uses ExcelJS (actively maintained, MIT license)
   ═══════════════════════════════════════════════════════════ */

import { formatDate, formatTime, toLocalDateString } from './formatters';
import { triggerDownload } from './downloadHelper';

/**
 * Helper to sanitize values to prevent Excel Formula Injection (DDE)
 */
function sanitizeExcelValue(value) {
  if (typeof value === 'number') return value;
  const str = value === null || value === undefined ? '' : String(value);
  if (/^[ \t]*[=\-+@]/.test(str)) {
    return "'" + str;
  }
  return value;
}

/**
 * Helper to setup the base worksheet (header, data rows, formatting)
 */
function setupBaseWorksheet(sheet, transactions, settings = {}) {
  // ── Optional Header Rows (Toko & Kasir) ──
  if (settings.tokoName) {
    const tokoRow = sheet.addRow([settings.tokoName]);
    tokoRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF0D1117' } };
    tokoRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00FFA3' },
    };
  }

  if (settings.kasirName) {
    const kasirRow = sheet.addRow([`Kasir: ${settings.kasirName}`]);
    kasirRow.getCell(1).font = { size: 11, color: { argb: 'FF0D1117' } };
    kasirRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4F5E9' },
    };
  }

  // ── Header Row ──
  const headerRow = sheet.addRow([
    'ID Transaksi',
    'Tanggal',
    'Waktu',
    'Kasir',
    'Kategori',
    'Sub-Kategori',
    'Nama Barang',
    'Qty',
    'Harga Satuan',
    'Total',
    'Metode',
    'Catatan',
    'Status',
  ]);

  // Style headers
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF0D1117' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00FFA3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF3D4450' } },
    };
  });

  // ── Data Rows ──
  transactions.forEach((tx) => {
    if (tx.items && Array.isArray(tx.items)) {
      tx.items.forEach((item) => {
        const row = sheet.addRow([
          sanitizeExcelValue(tx.transactionId),
          formatDate(tx.tanggal),
          formatTime(tx.createdAt),
          sanitizeExcelValue(tx.kasir || 'Admin'),
          sanitizeExcelValue(item.kategori),
          sanitizeExcelValue(item.subKategori || ''),
          sanitizeExcelValue(item.namaBarang),
          item.qty,
          item.hargaSatuan,
          item.total,
          sanitizeExcelValue(tx.metode),
          sanitizeExcelValue(tx.catatan || '-'),
          sanitizeExcelValue(tx.status),
        ]);
        styleRow(row);
      });
    } else {
      const row = sheet.addRow([
        sanitizeExcelValue(tx.transactionId),
        formatDate(tx.tanggal),
        formatTime(tx.createdAt),
        sanitizeExcelValue(tx.kasir || 'Admin'),
        sanitizeExcelValue(tx.kategori),
        sanitizeExcelValue(tx.subKategori || ''),
        sanitizeExcelValue(tx.namaBarang),
        tx.qty,
        tx.hargaSatuan,
        tx.total,
        sanitizeExcelValue(tx.metode),
        sanitizeExcelValue(tx.catatan || '-'),
        sanitizeExcelValue(tx.status),
      ]);
      styleRow(row);
    }
  });

  function styleRow(row) {
    row.eachCell((cell, colNumber) => {
      cell.font = { size: 10, color: { argb: 'FFE6EDF3' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF161B22' },
      };
      // Format currency columns
      if (colNumber === 9 || colNumber === 10) {
        cell.numFmt = '#,##0';
      }
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FF30363D' } },
      };
    });
  }

  return sheet;
}

/**
 * Export transactions array to a styled Excel file
 * @param {Array} transactions
 * @param {Object} settings - { tokoName, kasirName, ... }
 * @param {string} filename
 */
export async function exportToExcel(transactions, settings = {}, filename = 'ClearTask_Laporan') {
  const { default: ExcelJS } = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ClearTask';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laporan Penjualan', {
    properties: { defaultColWidth: 18 },
  });

  setupBaseWorksheet(sheet, transactions, settings);

  // Auto-fit columns
  sheet.columns.forEach((col) => {
    col.width = Math.max(col.width || 12, 14);
  });

  // ── Download ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = toLocalDateString(new Date());
  triggerDownload(blob, `${filename}_${dateStr}.xlsx`);
}

/**
 * Export session transactions to a styled Excel file with summary
 * @param {Array} transactions - Array of transactions in the session
 * @param {Object} session - Session object with nama and tanggalTutup fields
 * @param {Object} settings - { tokoName, kasirName, ... }
 */
export async function exportSessionExcel(transactions, session, settings = {}) {
  const { default: ExcelJS } = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ClearTask';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laporan Sesi', {
    properties: { defaultColWidth: 18 },
  });

  setupBaseWorksheet(sheet, transactions, settings);

  // ── Summary Row ──
  const totalPemasukan = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);

  // Add empty row for spacing
  sheet.addRow([]);

  // Add summary row
  const summaryRow = sheet.addRow([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Total Pemasukan',
    totalPemasukan,
    '',
    '',
    '',
  ]);

  summaryRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FF0D1117' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00FFA3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    // Format currency column
    if (colNumber === 10) {
      cell.numFmt = '#,##0';
    }
  });

  // Auto-fit columns
  sheet.columns.forEach((col) => {
    col.width = Math.max(col.width || 12, 14);
  });

  // ── Download ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const sessionName = (session?.nama || 'NoName').replace(/[/\\:*?"<>|]/g, '-');
  // tanggalTutup is already YYYY-MM-DD format (no colons) — use directly as filename part
  const tanggalTutup = session?.tanggalTutup ?? toLocalDateString(new Date());
  triggerDownload(blob, `ClearTask_Session_${sessionName}_${tanggalTutup}.xlsx`);
}
