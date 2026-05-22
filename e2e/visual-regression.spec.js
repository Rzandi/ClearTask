/**
 * visual-regression.spec.js — ClearTask E2E
 * Visual snapshot testing untuk halaman utama.
 * Run pertama: membuat baseline. Run berikutnya: membandingkan.
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

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
  });

  test('PIN Lock Screen matches visual baseline', async ({ page }) => {
    // Layar PIN harus muncul sebelum login
    await expect(page.getByTestId('lock-title')).toBeVisible({ timeout: 5000 });

    // Tunggu animasi selesai
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('pin-lock-screen.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Dashboard (Input Penjualan) matches visual baseline', async ({ page }) => {
    await setupPinAndLogin(page);

    // Tunggu animasi slide-up selesai
    await page.waitForTimeout(600);

    await expect(page).toHaveScreenshot('dashboard-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
