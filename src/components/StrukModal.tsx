/* ═══════════════════════════════════════════════════════════
   StrukModal — ClearTask
   Thermal printer style receipt modal for checkout.
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Button from './ui/Button';
import { printBluetoothReceipt, getLastConnectedPrinter } from '../utils/bluetoothPrinterHelper';
import { useSettings } from '../contexts/SettingsContext';
import { useBackHandler } from '../hooks/useBackHandler';

export interface StrukModalProps {
  order: any;
  onClose: () => void;
  onUndo?: () => void;
}

export default function StrukModal({ order, onClose, onUndo }: StrukModalProps) {
  const { settings, updateSettings } = useSettings();
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(
    settings?.receiptPaperSize === '80mm' ? '80mm' : '58mm'
  );
  const [btStatus, setBtStatus] = useState<string>('');
  const [isBtPrinting, setIsBtPrinting] = useState<boolean>(false);

  const handleBack = useCallback(() => {
    onClose();
  }, [onClose]);

  useBackHandler(Boolean(order), handleBack);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleBluetoothPrint = async () => {
    setIsBtPrinting(true);
    await printBluetoothReceipt(order, settings, (status) => {
      setBtStatus(status);
    });
    setIsBtPrinting(false);
  };

  const handleWhatsAppShare = () => {
    const toko = settings.tokoName || 'ClearTask POS';
    const timeStr = (order.createdAt ? new Date(order.createdAt) : new Date()).toLocaleString(
      'id-ID',
      {
        dateStyle: 'short',
        timeStyle: 'short',
      }
    );
    let text = `*STRUK PEMBAYARAN ${toko.toUpperCase()}*\n`;
    text += `No. TRX: ${order.transactionId}\n`;
    text += `Waktu: ${timeStr}\n`;
    text += `Kasir: ${order.kasir}\n`;
    text += `--------------------------------\n`;
    order.items?.forEach((i: any) => {
      text += `• ${i.namaBarang} x${i.qty} = Rp ${i.total.toLocaleString('id-ID')}\n`;
    });
    text += `--------------------------------\n`;
    text += `*TOTAL: Rp ${order.total.toLocaleString('id-ID')}*\n`;
    text += `Metode: ${order.metode}\n`;
    if (order.metode === 'Tunai') {
      text += `Bayar: Rp ${order.uangDiterima.toLocaleString('id-ID')}\n`;
      text += `Kembali: Rp ${order.kembalian.toLocaleString('id-ID')}\n`;
    }
    text += `\nTerima kasih telah berbelanja!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleDownloadReceiptText = () => {
    const toko = settings.tokoName || 'ClearTask POS';
    const timeStr = (order.createdAt ? new Date(order.createdAt) : new Date()).toLocaleString(
      'id-ID',
      {
        dateStyle: 'short',
        timeStyle: 'short',
      }
    );
    const div = paperSize === '80mm' ? '='.repeat(44) : '================================';
    const subDiv = paperSize === '80mm' ? '-'.repeat(44) : '--------------------------------';
    let text = `${toko.toUpperCase()}\n`;
    if (settings.tokoAlamat?.trim()) {
      text += `${settings.tokoAlamat.trim()}\n`;
    }
    if (settings.tokoTelepon?.trim()) {
      text += `Telp: ${settings.tokoTelepon.trim()}\n`;
    }
    text += `${div}\n`;
    text += `No TRX : ${order.transactionId}\n`;
    text += `Waktu  : ${timeStr}\n`;
    text += `Kasir  : ${order.kasir}\n`;
    text += `${subDiv}\n`;
    order.items?.forEach((i: any) => {
      text += `${i.namaBarang}\n  ${i.qty} x ${i.hargaSatuan.toLocaleString('id-ID')} = ${i.total.toLocaleString('id-ID')}\n`;
    });
    text += `${subDiv}\n`;
    text += `TOTAL   : Rp ${order.total.toLocaleString('id-ID')}\n`;
    text += `METODE  : ${order.metode}\n`;
    if (order.metode === 'Tunai') {
      text += `BAYAR   : Rp ${order.uangDiterima.toLocaleString('id-ID')}\n`;
      text += `KEMBALI : Rp ${order.kembalian.toLocaleString('id-ID')}\n`;
    }
    text += `${div}\n`;
    text += `Terima Kasih Atas Kunjungan Anda\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Struk_${order.transactionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in print:bg-white print:p-0 print:block">
      {/* Kontainer Modal (Hidden saat print) */}
      <div
        className={`bg-bg-surface w-full ${
          paperSize === '80mm' ? 'max-w-md' : 'max-w-sm'
        } rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:h-auto transition-all`}
      >
        {/* Header Modal */}
        <div className="px-4 py-3 border-b border-border-default flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text-primary">Struk Pembayaran</h2>
            {/* Paper Size Selector (W3-08) */}
            <div className="flex items-center bg-bg-input p-0.5 rounded-lg border border-border-default text-[11px] ml-2">
              <button
                type="button"
                onClick={() => {
                  setPaperSize('58mm');
                  updateSettings({ receiptPaperSize: '58mm' });
                }}
                className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  paperSize === '58mm'
                    ? 'bg-primary text-black shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Format standar 58mm"
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaperSize('80mm');
                  updateSettings({ receiptPaperSize: '80mm' });
                }}
                className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  paperSize === '80mm'
                    ? 'bg-primary text-black shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Format lebar 80mm"
              >
                80mm
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Konten Struk (Muncul saat print) */}
        <div
          className="p-6 overflow-y-auto print:p-2 bg-white text-black font-mono text-xs"
          id="printable-struk"
        >
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold mb-1">{settings.tokoName || 'ClearTask POS'}</h1>
            {settings.tokoAlamat?.trim() ? (
              <p className="text-[10px]">{settings.tokoAlamat.trim()}</p>
            ) : (
              <p className="text-[10px] text-gray-400 italic print:hidden">
                (Alamat belum diatur - isi di Pengaturan)
              </p>
            )}
            {settings.tokoTelepon?.trim() ? (
              <p className="text-[10px]">Telp: {settings.tokoTelepon.trim()}</p>
            ) : (
              <p className="text-[10px] text-gray-400 italic print:hidden">
                (No. Telepon belum diatur - isi di Pengaturan)
              </p>
            )}
          </div>

          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            <div className="flex justify-between">
              <span>Waktu</span>
              <span>
                {(order.createdAt ? new Date(order.createdAt) : new Date()).toLocaleString(
                  'id-ID',
                  {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Kasir</span>
              <span>{order.kasir}</span>
            </div>
            <div className="flex justify-between">
              <span>No. TRX</span>
              <span>{order.transactionId}</span>
            </div>
          </div>

          {paperSize === '80mm' ? (
            <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dashed border-gray-400 text-left text-[11px]">
                    <th className="py-1">Barang</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Harga</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-gray-200">
                  {order.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-1 font-semibold">{item.namaBarang}</td>
                      <td className="py-1 text-center">{item.qty}</td>
                      <td className="py-1 text-right">
                        {item.hargaSatuan.toLocaleString('id-ID')}
                      </td>
                      <td className="py-1 text-right font-medium">
                        {item.total.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="mb-2">
                  <div className="font-semibold">{item.namaBarang}</div>
                  <div className="flex justify-between pl-2">
                    <span>
                      {item.qty} x {item.hargaSatuan.toLocaleString('id-ID')}
                    </span>
                    <span>{item.total.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>{order.total.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Metode</span>
              <span>{order.metode}</span>
            </div>
            {order.metode === 'Tunai' && (
              <>
                <div className="flex justify-between">
                  <span>Tunai</span>
                  <span>{order.uangDiterima.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kembali</span>
                  <span>{order.kembalian.toLocaleString('id-ID')}</span>
                </div>
              </>
            )}
          </div>

          <div className="text-center mt-4 pt-2">
            <p className="text-[10px]">Terima Kasih Atas Kunjungan Anda</p>
            <p className="text-[10px]">
              {settings.strukFooter || 'Barang yang sudah dibeli tidak dapat ditukar/dikembalikan'}
            </p>
          </div>
        </div>

        {/* Footer Modal (Hidden saat print) */}
        <div className="p-4 border-t border-border-default bg-bg-elevated print:hidden flex flex-col gap-3">
          {btStatus && (
            <div
              className={`text-[11px] font-semibold text-center py-2 px-3 rounded-lg border ${
                btStatus.includes('sukses')
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : btStatus.includes('Gagal') ||
                      btStatus.includes('tidak didukung') ||
                      btStatus.includes('dibatalkan')
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-primary/10 border-primary/20 text-primary animate-pulse'
              }`}
            >
              {btStatus}
            </div>
          )}
          {/* Action Row 1: WA & Download */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors"
            >
              💬 Kirim WA
            </button>
            <button
              onClick={handleDownloadReceiptText}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
            >
              📄 Simpan Struk
            </button>
          </div>
          {/* Undo Action (W2-04) */}
          {onUndo && (
            <Button
              onClick={onUndo}
              variant="outline"
              className="w-full text-accent-red border-accent-red/30 hover:bg-accent-red/10 text-xs py-2 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7v6h6"></path>
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
              </svg>
              Batalkan & Kembalikan ke Keranjang (Undo)
            </Button>
          )}
          {/* Action Row 2: Standard & BT */}
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1 text-xs py-2.5 px-2">
              Tutup
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 inline-flex items-center justify-center gap-1 text-xs py-2.5 px-2 text-primary border-primary/30 hover:bg-primary/10"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Standard
            </Button>
            <Button
              onClick={handleBluetoothPrint}
              variant="primary"
              className="flex-1 inline-flex items-center justify-center gap-1 text-xs py-2.5 px-2 shadow-glow"
              disabled={isBtPrinting}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11" />
              </svg>
              <span className="truncate max-w-[110px]">
                {isBtPrinting
                  ? 'Mencetak...'
                  : getLastConnectedPrinter().name
                    ? `BT: ${getLastConnectedPrinter().name}`
                    : 'Bluetooth'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Global CSS for Printing */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-struk, #printable-struk * {
            visibility: visible;
          }
          #printable-struk {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm; /* Ukuran thermal standar */
            padding: 0;
            margin: 0;
          }
        }
      `,
        }}
      />
    </div>,
    document.body
  );
}
