/* ═══════════════════════════════════════════════════════════
   HotkeyModal — ClearTask
   Contextual Hotkey Sheet Overlay for power users (Trigger: ? or F1)
   ═══════════════════════════════════════════════════════════ */

export interface HotkeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_LIST = [
  { key: 'F1 / Alt+H', label: 'Buka Panduan & Shortcut Cheat-Sheet' },
  { key: 'F2', label: 'Navigasi Langsung ke POS Kasir' },
  { key: 'F3', label: 'Navigasi Langsung ke Master Barang (Inventaris)' },
  { key: 'F4', label: 'Navigasi Langsung ke Riwayat Laporan' },
  { key: 'F8', label: 'Toggle Fullscreen Kiosk Mode' },
  { key: 'Alt+O', label: 'Toggle Outdoor High-Contrast Mode' },
  { key: 'Ctrl + Enter', label: 'Selesaikan Transaksi & Checkout POS' },
  { key: 'Ctrl + K / Cmd + K', label: 'Command Palette Universal' },
  { key: '? / Shift + /', label: 'Tampilkan Overlay Hotkey Ini' },
  { key: 'Esc', label: 'Tutup Modal / Batal Operasi' },
];

export default function HotkeyModal({ isOpen, onClose }: HotkeyModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-lg p-6 space-y-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              ⌨️
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Global Keyboard Shortcuts</h2>
              <p className="text-xs text-text-muted">Panduan tombol pintas untuk memproses transaksi 3x lebih cepat.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_LIST.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-border-subtle hover:border-border-default transition-all"
            >
              <span className="text-xs text-text-secondary font-medium">{sc.label}</span>
              <kbd className="px-2.5 py-1 text-[11px] font-mono font-bold text-primary bg-bg-elevated border border-border-default rounded-lg shadow-inner shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center border-t border-border-default">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors"
          >
            Saya Mengerti (Tutup)
          </button>
        </div>
      </div>
    </div>
  );
}
