/* ═══════════════════════════════════════════════════════════
   CommandPalette Component — Cmd/Ctrl+K Command Palette
   Quick navigation, actions, and product search
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Command } from '../hooks/useCommandPalette';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  groupedCommands: Record<string, Command[]>;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  filteredCommands: Command[];
}

const CATEGORY_LABELS: Record<string, string> = {
  navigation: '🧭 Navigasi',
  action: '⚡ Aksi',
  product: '🏷️ Produk',
};

export default function CommandPalette({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  groupedCommands,
  selectedIndex,
  onSelectIndex,
  filteredCommands,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;

    const selectedElement = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement;

    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Command Palette Modal */}
      <div
        className="relative w-full max-w-2xl bg-bg-elevated rounded-2xl shadow-neumorphic-elevated overflow-hidden"
        style={{
          boxShadow:
            '0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(6, 182, 212, 0.1)',
        }}
      >
        {/* Search Input */}
        <div className="relative border-b border-border-subtle">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-xl">
            🔍
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Ketik perintah atau cari produk..."
            className="w-full pl-12 pr-24 py-4 bg-transparent text-text-primary placeholder-text-muted text-base focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <kbd className="px-2 py-1 text-xs font-mono bg-bg-surface text-text-muted rounded border border-border-default">
              ESC
            </kbd>
            <span className="text-xs text-text-muted">untuk tutup</span>
          </div>
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto overscroll-contain"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(6, 182, 212, 0.3) transparent',
          }}
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-sm">
                {searchQuery.trim()
                  ? 'Tidak ada hasil yang cocok'
                  : 'Mulai ketik untuk mencari...'}
              </div>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, commands]) => {
              if (commands.length === 0) return null;

              return (
                <div key={category} className="py-2">
                  {/* Category Header */}
                  <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {CATEGORY_LABELS[category] || category}
                  </div>

                  {/* Commands in Category */}
                  {commands.map((command) => {
                    const globalIndex = filteredCommands.indexOf(command);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={command.id}
                        data-index={globalIndex}
                        onClick={() => {
                          command.action();
                        }}
                        onMouseEnter={() => onSelectIndex(globalIndex)}
                        className={`
                          w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                          ${
                            isSelected
                              ? 'bg-primary/10 text-primary border-l-2 border-primary'
                              : 'text-text-primary hover:bg-bg-surface border-l-2 border-transparent'
                          }
                        `}
                      >
                        {/* Icon */}
                        <span className="text-xl flex-shrink-0">
                          {command.icon || '•'}
                        </span>

                        {/* Label & Details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {command.label}
                          </div>
                          {command.data && (
                            <div className="text-xs text-text-muted truncate mt-0.5">
                              {command.data.barcode && `${command.data.barcode} • `}
                              Rp {command.data.hargaJual.toLocaleString('id-ID')}
                              {command.data.stok !== undefined &&
                                ` • Stok: ${command.data.stok}`}
                            </div>
                          )}
                        </div>

                        {/* Shortcut */}
                        {command.shortcut && (
                          <kbd className="px-2 py-1 text-xs font-mono bg-bg-surface text-text-muted rounded border border-border-default flex-shrink-0">
                            {command.shortcut}
                          </kbd>
                        )}

                        {/* Enter indicator for selected */}
                        {isSelected && (
                          <kbd className="px-2 py-1 text-xs font-mono bg-primary/20 text-primary rounded border border-primary/30 flex-shrink-0">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Tips */}
        <div className="border-t border-border-subtle px-4 py-2 flex items-center justify-between text-xs text-text-muted bg-bg-surface/50">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-bg-elevated rounded border border-border-default">
                ↑↓
              </kbd>
              navigasi
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-bg-elevated rounded border border-border-default">
                ↵
              </kbd>
              pilih
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>Tekan</span>
            <kbd className="px-1.5 py-0.5 font-mono bg-bg-elevated rounded border border-border-default">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K
            </kbd>
            <span>untuk toggle</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
