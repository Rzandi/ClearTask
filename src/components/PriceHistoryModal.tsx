/* ═══════════════════════════════════════════════════════════
   PriceHistoryModal — ClearTask W4-03
   Modal untuk menampilkan riwayat perubahan harga per barang
   ═══════════════════════════════════════════════════════════ */

import { memo, useEffect, useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { getPriceHistory, exportPriceHistory } from '../utils/priceHistoryHelper';
import type { PriceHistoryEntry } from '../types/index';

export interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryId: string;
  itemName: string;
}

const PriceHistoryModal = memo(function PriceHistoryModal({
  isOpen,
  onClose,
  inventoryId,
  itemName,
}: PriceHistoryModalProps) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen && inventoryId) {
      setLoading(true);
      getPriceHistory(inventoryId, 50)
        .then(setHistory)
        .catch((err) => {
          console.error('Failed to load price history:', err);
          setHistory([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, inventoryId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPriceHistory(inventoryId);
    } catch (err: any) {
      alert(err.message || 'Gagal export CSV');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`📊 Riwayat Harga: ${itemName}`}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={history.length === 0 || exporting}
          >
            {exporting ? '⏳ Export...' : '📥 Export CSV'}
          </Button>
          <Button size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-text-muted py-8">
            Belum ada perubahan harga untuk barang ini.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-text-muted font-medium">Tanggal</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">Harga Jual</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">Harga Modal</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">Diubah Oleh</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-hover/5">
                  <td className="py-2 px-3 whitespace-nowrap">
                    {new Date(entry.changedAt).toLocaleString('id-ID', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="text-red-400">{formatCurrency(entry.oldHargaJual)}</span>
                    <span className="mx-1 text-text-muted">→</span>
                    <span className="text-green-400">{formatCurrency(entry.newHargaJual)}</span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="text-red-400">{formatCurrency(entry.oldHargaModal)}</span>
                    <span className="mx-1 text-text-muted">→</span>
                    <span className="text-green-400">{formatCurrency(entry.newHargaModal)}</span>
                  </td>
                  <td className="py-2 px-3">{entry.changedBy}</td>
                  <td className="py-2 px-3 text-text-muted">{entry.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
});

export default PriceHistoryModal;
