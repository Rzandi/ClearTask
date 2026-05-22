/**
 * cashier-flow.spec.js — ClearTask E2E
 * Skenario: PIN setup → Buka Sesi → Input Transaksi → Verifikasi
 *
 * Catatan: App menggunakan PIN Lock Screen sebelum masuk dashboard.
 * Fresh IndexedDB = mode "BUAT PIN BARU".
 */
import { test, expect } from '@playwright/test';

// Helper: bersihkan IndexedDB sebelum tiap test
async function clearAppData(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    window.localStorage.clear();
    if (window.indexedDB?.databases) {
      const dbs = await window.indexedDB.databases();
      await Promise.all(dbs.map((db) => window.indexedDB.deleteDatabase(db.name)));
    }
  });
  await page.reload();
  // Tunggu app selesai boot (AppBootstrap + SettingsContext)
  await page.waitForTimeout(800);
}

// Helper: setup PIN dan masuk ke dashboard
async function setupPinAndLogin(page, pin = '1234') {
  // Tunggu PIN screen muncul
  await expect(page.getByTestId('lock-title')).toBeVisible({ timeout: 5000 });

  // Klik digit PIN via numpad
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).first().click();
  }

  // Submit
  await page.getByRole('button', { name: /SIMPAN PIN|BUKA KUNCI/i }).click();

  // Tunggu dashboard muncul (Form Input Penjualan)
  await expect(page.getByText(/Form Input Penjualan/i)).toBeVisible({ timeout: 5000 });
}

test.describe('Cashier Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
  });

  test('setup PIN baru → masuk dashboard', async ({ page }) => {
    // Harus muncul layar "BUAT PIN BARU"
    await expect(page.getByTestId('lock-title')).toHaveText('BUAT PIN BARU');

    // Input PIN 1234
    for (const digit of '1234') {
      await page.getByRole('button', { name: digit, exact: true }).first().click();
    }
    await page.getByRole('button', { name: /SIMPAN PIN/i }).click();

    // Dashboard harus muncul
    await expect(page.getByText(/Form Input Penjualan/i)).toBeVisible({ timeout: 5000 });
  });

  test('input transaksi berhasil disimpan', async ({ page }) => {
    await setupPinAndLogin(page);

    // Isi form transaksi
    await page.locator('#field-namaBarang').fill('Kopi Hitam');
    await page.locator('#field-qty').fill('2');
    await page.locator('#field-hargaSatuan').fill('15000');

    // Submit
    await page.locator('#btn-simpan').click();

    // Toast sukses harus muncul
    await expect(page.getByText(/berhasil/i)).toBeVisible({ timeout: 3000 });
  });

  test('validasi form: tombol simpan disabled jika field kosong', async ({ page }) => {
    await setupPinAndLogin(page);

    // Tombol simpan harus disabled saat form kosong
    const btnSimpan = page.locator('#btn-simpan');
    await expect(btnSimpan).toBeDisabled();

    // Isi nama barang saja — masih disabled karena qty/harga belum diisi
    await page.locator('#field-namaBarang').fill('Test');
    await expect(btnSimpan).toBeDisabled();

    // Isi semua field wajib
    await page.locator('#field-qty').fill('1');
    await page.locator('#field-hargaSatuan').fill('5000');
    await expect(btnSimpan).toBeEnabled();
  });
});
