/* ═══════════════════════════════════════════════════════════
   shortcuts.ts — ClearTask
   Single source of truth untuk semua global keyboard shortcuts.
   App.tsx dan HotkeyModal.tsx wajib driven dari konstanta ini
   agar dokumentasi tidak bisa out of sync dengan implementasi.
   ═══════════════════════════════════════════════════════════ */

export interface ShortcutDef {
  /** Nilai e.key yang di-check di event listener */
  key: string;
  /** Apakah butuh altKey */
  altKey?: boolean;
  /** Apakah butuh shiftKey */
  shiftKey?: boolean;
  /** Label yang ditampilkan di HotkeyModal (e.g. "F1", "Alt+H") */
  display: string;
  /** Deskripsi singkat untuk HotkeyModal */
  label: string;
}

export const SHORTCUTS = {
  HELP: {
    key: 'F1',
    display: 'F1 / Alt+H',
    label: 'Buka Panduan & Shortcut Cheat-Sheet',
  },
  HELP_ALT: {
    key: 'h',
    altKey: true,
    display: 'Alt+H',
    label: 'Buka Panduan & Shortcut Cheat-Sheet',
  },
  HELP_QUESTION: {
    key: '?',
    display: '? / Shift+/',
    label: 'Tampilkan Overlay Hotkey Ini',
  },
  INPUT_TAB: {
    key: 'F2',
    display: 'F2',
    label: 'Navigasi Langsung ke POS Kasir',
  },
  DATABASE_TAB: {
    key: 'F3',
    display: 'F3',
    label: 'Navigasi Langsung ke Database & Inventaris',
  },
  REPORT_TAB: {
    key: 'F4',
    display: 'F4',
    label: 'Navigasi Langsung ke Riwayat Laporan',
  },
  FULLSCREEN: {
    key: 'F8',
    display: 'F8',
    label: 'Toggle Fullscreen Kiosk Mode',
  },
  OUTDOOR_MODE: {
    key: 'o',
    altKey: true,
    display: 'Alt+O',
    label: 'Toggle Outdoor High-Contrast Mode',
  },
  CHECKOUT: {
    key: 'Enter',
    // ctrlKey handled in InputPenjualan.tsx
    display: 'Ctrl + Enter',
    label: 'Selesaikan Transaksi & Checkout POS',
  },
  COMMAND_PALETTE: {
    key: 'k',
    display: 'Ctrl + K / Cmd + K',
    label: 'Command Palette Universal',
  },
  CLOSE: {
    key: 'Escape',
    display: 'Esc',
    label: 'Tutup Modal / Batal Operasi',
  },
} as const satisfies Record<string, ShortcutDef>;

/**
 * Daftar shortcut yang ditampilkan di HotkeyModal (deduplikasi HELP_ALT + HELP_QUESTION).
 * Urutan = urutan tampil di UI.
 */
export const SHORTCUT_LIST_FOR_UI: ShortcutDef[] = [
  SHORTCUTS.HELP,
  SHORTCUTS.INPUT_TAB,
  SHORTCUTS.DATABASE_TAB,
  SHORTCUTS.REPORT_TAB,
  SHORTCUTS.FULLSCREEN,
  SHORTCUTS.OUTDOOR_MODE,
  SHORTCUTS.CHECKOUT,
  SHORTCUTS.HELP_QUESTION,
  SHORTCUTS.CLOSE,
];
