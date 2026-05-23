/* ═══════════════════════════════════════════════════════════
   StrukModal — ClearTask
   Thermal printer style receipt modal for checkout.
   ═══════════════════════════════════════════════════════════ */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from './ui/Button';

export default function StrukModal({ order, onClose }) {
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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in print:bg-white print:p-0 print:block">
      {/* Kontainer Modal (Hidden saat print) */}
      <div className="bg-bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:h-auto">
        {/* Header Modal */}
        <div className="px-4 py-3 border-b border-border-default flex justify-between items-center print:hidden">
          <h2 className="text-sm font-bold text-text-primary">Struk Pembayaran</h2>
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
            <h1 className="text-lg font-bold mb-1">ClearTask POS</h1>
            <p className="text-[10px]">Jl. Contoh Alamat No. 123</p>
            <p className="text-[10px]">Telp: 0812-3456-7890</p>
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

          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            {order.items.map((item, idx) => (
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
            <p className="text-[10px]">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
          </div>
        </div>

        {/* Footer Modal (Hidden saat print) */}
        <div className="p-4 border-t border-border-default bg-bg-elevated print:hidden flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Tutup
          </Button>
          <Button
            onClick={handlePrint}
            variant="primary"
            className="flex-1 inline-flex items-center justify-center gap-2"
          >
            <svg
              width="16"
              height="16"
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
            Print Struk
          </Button>
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
