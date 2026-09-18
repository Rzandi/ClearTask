/* ═══════════════════════════════════════════════════════════
   errorMessages.ts — ClearTask
   Centralized Dexie/IndexedDB error message utility.
   Converts raw error objects to user-friendly Indonesian strings.
   ═══════════════════════════════════════════════════════════ */

/**
 * Converts a Dexie/IndexedDB error into a user-friendly Bahasa Indonesia message.
 * Falls back to err.message if no known error type is matched.
 */
export function getDexieErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Terjadi kesalahan tidak dikenal. Silakan coba lagi.';
  }

  const name = err.name;
  const msg = err.message || '';

  // Storage quota exceeded — most critical POS error
  if (
    name === 'QuotaExceededError' ||
    msg.includes('QuotaExceededError') ||
    (err as any).inner?.name === 'QuotaExceededError'
  ) {
    return '💾 Penyimpanan Penuh! Data gagal disimpan ke IndexedDB. Silakan hapus data lama atau lakukan ekspor backup terlebih dahulu.';
  }

  // Duplicate key / unique constraint
  if (name === 'ConstraintError') {
    return '⚠️ Data duplikat terdeteksi. Operasi dibatalkan untuk mencegah konflik data.';
  }

  // Transaction aborted (e.g. tab closing mid-write, or explicit abort)
  if (name === 'AbortError') {
    return '⚠️ Operasi dibatalkan. Silakan coba lagi.';
  }

  // Database blocked by another tab during version upgrade
  if (name === 'InvalidStateError') {
    return '⚠️ Database sedang dalam proses upgrade. Harap tutup tab ClearTask lainnya, lalu muat ulang halaman.';
  }

  // Version mismatch (downgrade attempt or corrupt state)
  if (name === 'VersionError') {
    return '⚠️ Versi database tidak kompatibel. Harap muat ulang halaman untuk memperbarui.';
  }

  // Generic IndexedDB not available
  if (name === 'NotSupportedError' || name === 'UnknownError') {
    return '⚠️ Browser tidak mendukung penyimpanan lokal atau terjadi kesalahan internal. Coba gunakan browser yang lebih baru.';
  }

  // Fallback to raw message
  return msg || 'Gagal menyimpan data. Silakan coba lagi.';
}
