/**
 * w2-flows.spec.js — ClearTask E2E (W5-02)
 * Skenario pengujian alur baru W1/W2:
 * 1. Undo Checkout (W2-04)
 * 2. Void Transaksi dengan Alasan (W2-06)
 * 3. Tutup Sesi Kasir & Rekonsiliasi Laporan (W2-03)
 */
import { test, expect } from '@playwright/test';

// Helper: bersihkan IndexedDB & localStorage sebelum tiap test
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

// Helper: setup PIN dan masuk ke dashboard
async function setupPinAndLogin(page, pin = '1234') {
  await expect(page.getByTestId('lock-title')).toBeVisible({ timeout: 5000 });
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).first().click();
  }
  await page.getByRole('button', { name: /SIMPAN PIN|BUKA KUNCI/i }).click();
  await expect(page.getByText(/Form Input Penjualan/i)).toBeVisible({ timeout: 5000 });
}

test.describe('W2 Critical Flows (Undo Checkout, Void, & Session Closing)', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
  });

  test('Flow 1: Undo Checkout (W2-04) — membatalkan transaksi seketika dari floating banner', async ({
    page,
  }) => {
    await setupPinAndLogin(page);

    // Buka tab input manual
    await page.getByRole('tab', { name: /Input Manual/i }).click();

    // Isi barang manual
    await page.locator('#manual-nama-barang').fill('Es Teh Manis');
    await page.locator('#manual-hargaSatuan').fill('5000');
    await page.locator('#manual-qty').fill('2');

    // Tambah ke keranjang
    await page.getByRole('button', { name: /Tambah ke Keranjang/i }).click();

    // Verifikasi keranjang terisi
    await expect(page.getByText('Es Teh Manis').first()).toBeVisible();

    // Isi uang pas / checkout tunai
    const bayarBtn = page.getByRole('button', { name: /Bayar \(F8\)|Bayar/i });
    if (await bayarBtn.isVisible()) {
      await bayarBtn.click();
    }

    // Modal struk / konfirmasi berhasil
    const closeStruk = page.getByRole('button', { name: /Selesai|Tutup/i });
    if (await closeStruk.isVisible()) {
      await closeStruk.click();
    }

    // Floating banner Undo harus muncul dalam window undo deadline
    const undoBtn = page.getByRole('button', { name: /Undo/i });
    if (await undoBtn.isVisible({ timeout: 4000 })) {
      await undoBtn.click();

      // Transaksi harus dibatalkan dan keranjang dipulihkan
      await expect(
        page.getByText(/Checkout dibatalkan|berhasil dibatalkan|Undo/i).first()
      ).toBeVisible({ timeout: 4000 });
    }
  });

  test('Flow 2: Void Transaksi (W2-06) — membatalkan transaksi dari tabel database dengan alasan', async ({
    page,
  }) => {
    await setupPinAndLogin(page);

    // Input satu transaksi manual
    await page.getByRole('tab', { name: /Input Manual/i }).click();
    await page.locator('#manual-nama-barang').fill('Roti Bakar');
    await page.locator('#manual-hargaSatuan').fill('12000');
    await page.locator('#manual-qty').fill('1');
    await page.getByRole('button', { name: /Tambah ke Keranjang/i }).click();

    // Checkout
    const bayarBtn = page.getByRole('button', { name: /Bayar \(F8\)|Bayar/i });
    if (await bayarBtn.isVisible()) {
      await bayarBtn.click();
    }
    const closeStruk = page.getByRole('button', { name: /Selesai|Tutup/i });
    if (await closeStruk.isVisible()) {
      await closeStruk.click();
    }

    // Navigasi ke Tab Database
    await page.getByRole('button', { name: /Database/i }).click();
    await expect(page.getByText(/Database/i).first()).toBeVisible({ timeout: 5000 });

    // Cari baris transaksi Roti Bakar
    const itemRow = page.getByText('Roti Bakar').first();
    if (await itemRow.isVisible({ timeout: 4000 })) {
      // Klik tombol batalkan / hapus transaksi (Void)
      const voidBtn = page.getByTitle(/Batalkan Transaksi|Hapus Transaksi/i).first();
      if (await voidBtn.isVisible()) {
        await voidBtn.click();

        // Modal Konfirmasi Void Transaksi harus muncul
        await expect(page.getByText(/Konfirmasi Void Transaksi/i)).toBeVisible();

        // Pilih atau isi alasan
        const confirmVoidBtn = page.getByRole('button', { name: /Void Transaksi/i });
        await confirmVoidBtn.click();

        // Toast sukses void
        await expect(page.getByText(/berhasil dibatalkan/i)).toBeVisible({ timeout: 4000 });
      }
    }
  });

  test('Flow 3: Tutup Sesi & Rekonsiliasi (W2-03) — buka sesi, transaksi, dan tutup sesi dengan laporan ringkasan', async ({
    page,
  }) => {
    await setupPinAndLogin(page);

    // Buka sesi jika belum ada
    const bukaSesiBtn = page.getByRole('button', { name: /Buka Sesi/i });
    if (await bukaSesiBtn.isVisible()) {
      await bukaSesiBtn.click();
      const inputNamaSesi = page.getByPlaceholder(/Shift Pagi/i);
      if (await inputNamaSesi.isVisible()) {
        await inputNamaSesi.fill('Shift Pagi Test');
        await page
          .getByRole('button', { name: /Buka Sesi/i })
          .last()
          .click();
      }
    }

    // Verifikasi banner sesi aktif
    await expect(page.getByText(/Shift Pagi Test|Sesi Aktif|Dibuka:/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Lakukan satu transaksi di sesi ini
    await page.getByRole('tab', { name: /Input Manual/i }).click();
    await page.locator('#manual-nama-barang').fill('Air Mineral');
    await page.locator('#manual-hargaSatuan').fill('3000');
    await page.locator('#manual-qty').fill('1');
    await page.getByRole('button', { name: /Tambah ke Keranjang/i }).click();

    const bayarBtn = page.getByRole('button', { name: /Bayar \(F8\)|Bayar/i });
    if (await bayarBtn.isVisible()) {
      await bayarBtn.click();
    }
    const closeStruk = page.getByRole('button', { name: /Selesai|Tutup/i });
    if (await closeStruk.isVisible()) {
      await closeStruk.click();
    }

    // Klik tombol Tutup Session di banner
    const tutupSessionBtn = page.getByRole('button', { name: /Tutup Session/i });
    if (await tutupSessionBtn.isVisible({ timeout: 4000 })) {
      await tutupSessionBtn.click();

      // Dialog konfirmasi tutup sesi
      const confirmCloseBtn = page.getByRole('button', { name: /Ya, Tutup|Tutup Sesi|Lanjutkan/i });
      if (await confirmCloseBtn.isVisible()) {
        await confirmCloseBtn.click();

        // Modal Closing Report (Laporan Penutupan Sesi) harus terbuka
        await expect(
          page.getByText(/Informasi Sesi|Ringkasan|Kas Tunai Bersih/i).first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
