/* ═══════════════════════════════════════════════════════════
   CustomerDetailPage.tsx — ClearTask W4-02
   View customer details, debt history, and payment records.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '../../utils/formatters';
import * as customerService from '../../services/customerService';
import type { Customer, CreditLedger, CreditPayment } from '../../types';
import Button from '../ui/Button';

interface Props {
  customerId: string;
  onBack?: () => void;
  onEdit?: (customer: Customer) => void;
  onRecordPayment?: (ledger: CreditLedger) => void;
}

export default function CustomerDetailPage({
  customerId,
  onBack,
  onEdit,
  onRecordPayment,
}: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledgers, setLedgers] = useState<CreditLedger[]>([]);
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hutang' | 'pembayaran'>('hutang');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [customerData, ledgerData, paymentData] = await Promise.all([
        customerService.getCustomerById(customerId),
        customerService.getCustomerCreditLedgers(customerId),
        customerService.getCustomerPayments(customerId),
      ]);

      if (!customerData) {
        throw new Error('Pelanggan tidak ditemukan');
      }

      setCustomer(customerData);
      setLedgers(ledgerData);
      setPayments(paymentData);
    } catch (err) {
      console.error('Failed to load customer detail:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (customer && onEdit) {
      onEdit(customer);
    }
  };

  const handlePayment = (ledger: CreditLedger) => {
    if (onRecordPayment) {
      onRecordPayment(ledger);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Memuat data pelanggan...</div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
          {error || 'Pelanggan tidak ditemukan'}
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Kembali
          </button>
        )}
      </div>
    );
  }

  const unpaidLedgers = ledgers.filter((l) => l.status === 'belum_lunas');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
              title="Kembali"
            >
              ←
            </button>
          )}
          <h2 className="text-lg font-bold flex-1">Detail Pelanggan</h2>
          <Button onClick={handleEdit} variant="secondary" size="sm">
            Edit
          </Button>
        </div>

        {/* Customer Info Card */}
        <div className="bg-white rounded-lg border p-4">
          <div className="font-bold text-lg mb-2">{customer.nama}</div>
          
          {customer.telepon && (
            <div className="text-sm text-gray-600 mb-1">
              📞 {customer.telepon}
            </div>
          )}
          
          {customer.alamat && (
            <div className="text-sm text-gray-600 mb-1">
              📍 {customer.alamat}
            </div>
          )}
          
          {customer.catatan && (
            <div className="text-sm text-gray-500 mt-2 pt-2 border-t">
              💬 {customer.catatan}
            </div>
          )}

          <div className="mt-3 pt-3 border-t flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Hutang</span>
            <span
              className={`font-bold text-lg ${
                customer.totalHutang > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {customer.totalHutang > 0
                ? formatRupiah(customer.totalHutang)
                : 'Lunas'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('hutang')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'hutang'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Daftar Hutang ({ledgers.length})
        </button>
        <button
          onClick={() => setActiveTab('pembayaran')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'pembayaran'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Riwayat Bayar ({payments.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'hutang' && (
          <div className="divide-y">
            {ledgers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <div className="font-medium">Belum ada hutang</div>
                <div className="text-sm">Pelanggan ini belum pernah kredit</div>
              </div>
            ) : (
              ledgers.map((ledger) => (
                <div key={ledger.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-gray-500">
                          {ledger.transactionId}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            ledger.status === 'lunas'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {ledger.status === 'lunas' ? '✓ Lunas' : 'Belum Lunas'}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600">
                        📅 {ledger.tanggalTransaksi}
                      </div>

                      {ledger.tanggalJatuhTempo && (
                        <div className="text-sm text-gray-600">
                          ⏰ Jatuh tempo: {ledger.tanggalJatuhTempo}
                        </div>
                      )}

                      {ledger.catatan && (
                        <div className="text-sm text-gray-500 mt-1">
                          💬 {ledger.catatan}
                        </div>
                      )}
                    </div>

                    <div className="ml-3 text-right">
                      <div className="text-xs text-gray-500 mb-1">Total</div>
                      <div className="font-bold">
                        {formatRupiah(ledger.jumlahKredit)}
                      </div>
                      
                      {ledger.sisaHutang > 0 && (
                        <>
                          <div className="text-xs text-gray-500 mt-2 mb-1">
                            Sisa
                          </div>
                          <div className="font-bold text-red-600">
                            {formatRupiah(ledger.sisaHutang)}
                          </div>
                          
                          <Button
                            onClick={() => handlePayment(ledger)}
                            variant="primary"
                            size="sm"
                            className="mt-2"
                          >
                            Bayar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'pembayaran' && (
          <div className="divide-y">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-4xl mb-2">💰</div>
                <div className="font-medium">Belum ada pembayaran</div>
                <div className="text-sm">Riwayat pembayaran kosong</div>
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">
                        📅 {payment.tanggalBayar}
                      </div>

                      <div className="text-sm text-gray-600">
                        💳 {payment.metodePembayaran}
                      </div>

                      <div className="text-sm text-gray-500 mt-1">
                        Oleh: {payment.createdBy}
                      </div>

                      {payment.catatan && (
                        <div className="text-sm text-gray-500 mt-1">
                          💬 {payment.catatan}
                        </div>
                      )}
                    </div>

                    <div className="ml-3 text-right">
                      <div className="font-bold text-green-600">
                        {formatRupiah(payment.jumlahBayar)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Summary */}
      {unpaidLedgers.length > 0 && (
        <div className="border-t p-4 bg-yellow-50">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-medium text-gray-700">
                Hutang Belum Lunas
              </div>
              <div className="text-xs text-gray-600">
                {unpaidLedgers.length} transaksi
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-red-600">
                {formatRupiah(customer.totalHutang)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
