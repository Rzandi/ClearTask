/* ═══════════════════════════════════════════════════════════
   useCommandPalette Hook — Command Palette State & Logic
   Manages command registry, search, keyboard shortcuts
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import type { InventoryItem } from '../types/index';

export interface Command {
  id: string;
  label: string;
  category: 'navigation' | 'action' | 'product';
  keywords?: string[];
  icon?: string;
  shortcut?: string;
  action: () => void;
  data?: InventoryItem; // For product commands
}

interface UseCommandPaletteProps {
  onNavigate: (tab: string) => void;
  onOpenSession?: () => void;
  onCloseSession?: () => void;
  activeSession?: any;
  currentTab?: string;
}

export function useCommandPalette({
  onNavigate,
  onOpenSession,
  onCloseSession,
  activeSession,
  currentTab = 'input',
}: UseCommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch inventory items for product search (table is 'inventory', soft-delete via deletedAt)
  const products = useLiveQuery(
    () => db.inventory.filter((p) => !p.deletedAt).toArray(),
    []
  ) ?? [];

  // Navigation commands
  const navigationCommands: Command[] = useMemo(
    () => [
      {
        id: 'nav-input',
        label: 'POS Kasir',
        category: 'navigation',
        keywords: ['kasir', 'pos', 'input', 'penjualan', 'f2'],
        icon: '🛒',
        shortcut: 'F2',
        action: () => {
          onNavigate('input');
          setIsOpen(false);
        },
      },
      {
        id: 'nav-keluaran',
        label: 'Kelola Pengeluaran',
        category: 'navigation',
        keywords: ['pengeluaran', 'keluaran', 'expense', 'biaya'],
        icon: '💸',
        action: () => {
          onNavigate('keluaran');
          setIsOpen(false);
        },
      },
      {
        id: 'nav-hutang-piutang',
        label: 'Hutang-Piutang',
        category: 'navigation',
        keywords: ['hutang', 'piutang', 'kredit', 'credit', 'customer', 'pelanggan', 'f5'],
        icon: '👥',
        shortcut: 'F5',
        action: () => {
          onNavigate('hutang-piutang');
          setIsOpen(false);
        },
      },
      {
        id: 'nav-database',
        label: 'Database & Inventory',
        category: 'navigation',
        keywords: ['database', 'inventory', 'barang', 'produk', 'f3'],
        icon: '📦',
        shortcut: 'F3',
        action: () => {
          onNavigate('database');
          setIsOpen(false);
        },
      },
      {
        id: 'nav-riwayat',
        label: 'Riwayat Sesi',
        category: 'navigation',
        keywords: ['riwayat', 'sesi', 'history', 'session'],
        icon: '📋',
        action: () => {
          onNavigate('riwayat-sesi');
          setIsOpen(false);
        },
      },
      {
        id: 'nav-trash',
        label: 'Tempat Sampah',
        category: 'navigation',
        keywords: ['sampah', 'trash', 'deleted', 'hapus'],
        icon: '🗑️',
        action: () => {
          onNavigate('trash');
          setIsOpen(false);
        },
      },
      {
        id: 'nav-laporan',
        label: 'Laporan & Export',
        category: 'navigation',
        keywords: ['laporan', 'report', 'export', 'f4'],
        icon: '📊',
        shortcut: 'F4',
        action: () => {
          onNavigate('laporan');
          setIsOpen(false);
        },
      },
    ],
    [onNavigate]
  );

  // Action commands
  const actionCommands: Command[] = useMemo(() => {
    const commands: Command[] = [];

    if (!activeSession && onOpenSession) {
      commands.push({
        id: 'action-open-session',
        label: 'Buka Sesi Kasir',
        category: 'action',
        keywords: ['buka', 'sesi', 'kasir', 'open', 'session'],
        icon: '▶️',
        action: () => {
          onOpenSession();
          setIsOpen(false);
        },
      });
    }

    if (activeSession && onCloseSession) {
      commands.push({
        id: 'action-close-session',
        label: 'Tutup Sesi Kasir',
        category: 'action',
        keywords: ['tutup', 'sesi', 'kasir', 'close', 'session'],
        icon: '⏹️',
        action: () => {
          onCloseSession();
          setIsOpen(false);
        },
      });
    }

    commands.push({
      id: 'action-add-product',
      label: 'Tambah Barang Baru',
      category: 'action',
      keywords: ['tambah', 'barang', 'produk', 'add', 'product', 'new'],
      icon: '➕',
      action: () => {
        onNavigate('database');
        setIsOpen(false);
        // Let Database tab handle the add product flow
      },
    });

    return commands;
  }, [activeSession, onOpenSession, onCloseSession, onNavigate]);

  // Product commands
  const productCommands: Command[] = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase().trim();
    return products
      .filter((p) => {
        const nameMatch = (p.namaBarang || '').toLowerCase().includes(query);
        const barcodeMatch = p.barcode?.toLowerCase().includes(query);
        return nameMatch || barcodeMatch;
      })
      .slice(0, 10) // Limit to 10 results
      .map((product) => ({
        id: `product-${product.id}`,
        label: product.namaBarang,
        category: 'product' as const,
        keywords: [product.namaBarang, product.barcode || ''],
        icon: '🏷️',
        data: product,
        action: () => {
          // Navigate to input tab if not already there
          if (currentTab !== 'input') {
            onNavigate('input');
          }
          setIsOpen(false);
          // Dispatch custom event to add product to cart
          window.dispatchEvent(
            new CustomEvent('commandPalette:addProduct', {
              detail: { product },
            })
          );
        },
      }));
  }, [products, searchQuery, currentTab, onNavigate]);

  // Combine all commands
  const allCommands = useMemo(
    () => [...navigationCommands, ...actionCommands, ...productCommands],
    [navigationCommands, actionCommands, productCommands]
  );

  // Fuzzy search filter
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCommands;
    }

    const query = searchQuery.toLowerCase().trim();
    return allCommands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(query);
      const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(query));
      return labelMatch || keywordMatch;
    });
  }, [allCommands, searchQuery]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      navigation: [],
      action: [],
      product: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    },
    [isOpen, filteredCommands, selectedIndex]
  );

  // Global keyboard shortcut (Cmd/Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setSearchQuery('');
        setSelectedIndex(0);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Keyboard navigation for open palette
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const open = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(0);
  }, []);

  return {
    isOpen,
    open,
    close,
    searchQuery,
    setSearchQuery,
    filteredCommands,
    groupedCommands,
    selectedIndex,
    setSelectedIndex,
  };
}
