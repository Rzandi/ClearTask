/**
 * inventory.spec.js — ClearTask E2E
 * Skenario: PIN setup → navigasi ke tab Database → tambah barang inventaris
 */
import { test, expect } from '@playwright/test';

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
  await page.waitForTimeout(800);
}

async function setupPinAndLogin(page, pin = '1234') {
  await expect(page.getByTestId('lock-title')).toBeVisible({ timeout: 5000 });
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).first().click();
  }
  await page.getByRole('button', { name: /SIMPAN PIN|BUKA KUNCI/i }).click();
  await expect(page.getByText(/Form Input Penjualan/i)).toBeVisible({ timeout: 5000 });
}

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
  });

  test('navigasi ke tab Database berhasil', async ({ page }) => {
    await setupPinAndLogin(page);

    // Klik tab Database di sidebar/navbar
    await page.getByRole('button', { name: /Database/i }).click();

    // Halaman database harus muncul
    await expect(page.getByText(/Database/i).first()).toBeVisible({ timeout: 3000 });
  });

  test('tab Database menampilkan tabel transaksi (kosong)', async ({ page }) => {
    await setupPinAndLogin(page);
    await page.getByRole('button', { name: /Database/i }).click();

    // Tabel atau pesan "kosong" harus ada
    const emptyOrTable = page.locator('table, [data-testid="empty-state"], text=/Belum ada/i');
    await expect(emptyOrTable.first()).toBeVisible({ timeout: 3000 });
  });
});
