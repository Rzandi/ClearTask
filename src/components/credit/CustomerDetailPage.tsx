/* ═══════════════════════════════════════════════════════════
   CustomerDetailPage.tsx — ClearTask W4-02
   View customer details, debt history, and payment records.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '../../utils/formatters';
import * as customerService from '../../services/customerService';
import { auditService } from '../../services/auditService';
import {
  isLedgerOverdue,
  getDaysOverdue,
  generateWhatsAppReminderUrl,
  getCreditStatus,
  getCreditStatusBadge,
} from '../../utils/creditHelper';
import type { Customer, CreditLedger, CreditPayment, AuditLogEntry } from '../../types';
import Button from '../ui/Button';

interface Props {
  customerId: string;
  onBack?: () => void;
  onEdit?: (customer: Customer) => void;
  onRecordPayment?: (ledger: CreditLedger) => void;
  onRecordCustomerPayment?: (customer: Customer, unpaidLedgers: CreditLedger[]) => void;
}

export default function CustomerDetailPage({
  customerId,
  onBack,
  onEdit,
  onRecordPayment,
  onRecordCustomerPayment,
}: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledgers, setLedgers] = useState<CreditLedger[]>([]);
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hutang' | 'pembayaran' | 'aktivitas'>('hutang');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [customerData, ledgerData, paymentData, auditData] = await Promise.all([
        customerService.getCustomerById(customerId),
        customerService.getCustomerCreditLedgers(customerId),
        customerService.getCustomerPayments(customerId),
        auditService.getLogsForCustomer(customerId),
      ]);

      if (!customerData) {
        throw new Error('Pelanggan tidak ditemukan');
      }

      setCustomer(customerData);
      setLedgers(ledgerData);
      setPayments(paymentData);
      setAuditLogs(auditData);
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
          <button onClick={onBack} className="mt-3 text-blue-600 hover:text-blue-800 text-sm">
            ← Kembali
          </button>
        )}
      </div>
    );
  }

  const unpaidLedgers = ledgers.filter((l) => l.status === 'belum_lunas' && l.sisaHutang > 0);
  const overdueLedgers = unpaidLedgers.filter((l) => isLedgerOverdue(l));
  const creditStatus = getCreditStatus(customer.totalHutang, 0);
  const creditBadge = getCreditStatusBadge(creditStatus);
  const waUrl = generateWhatsAppReminderUrl(customer, unpaidLedgers);

  const handlePayAllFIFO = () => {
    if (onRecordCustomerPayment && customer) {
      onRecordCustomerPayment(customer, unpaidLedgers);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-border-default bg-bg-surface/60">
        <div className="flex items-center gap-2 mb-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
              title="Kembali"
            >
              ←
            </button>
          )}
          <h2 className="text-lg font-bold text-text-primary flex-1">Detail Pelanggan</h2>
          <Button onClick={handleEdit} variant="outline" size="sm">
            Edit
          </Button>
        </div>

        {/* Customer Info Card */}
        <div className="bg-bg-card rounded-xl border border-border-default p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="font-bold text-lg text-text-primary">{customer.nama}</div>
            <span
              className={`text-xs px-2 py-0.5 rounded-md border font-medium ${creditBadge.badgeClass}`}
            >
              {creditBadge.icon} {creditBadge.text}
            </span>
          </div>

          {customer.telepon && (
            <div className="text-sm text-text-secondary mb-1">📞 {customer.telepon}</div>
          )}

          {customer.alamat && (
            <div className="text-sm text-text-muted mb-1">📍 {customer.alamat}</div>
          )}

          {customer.catatan && (
            <div className="text-xs text-text-muted mt-2 pt-2 border-t border-border-subtle">
              💬 {customer.catatan}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-border-subtle flex justify-between items-center">
            <div>
              <span className="text-xs text-text-muted block">Total Hutang</span>
              {overdueLedgers.length > 0 && (
                <span className="text-xs text-red-400 font-semibold">
                  ⚠️ {overdueLedgers.length} transaksi jatuh tempo
                </span>
              )}
            </div>
            <span
              className={`font-bold text-lg tabular-nums ${
                customer.totalHutang > 0 ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {customer.totalHutang > 0 ? formatRupiah(customer.totalHutang) : 'Lunas'}
            </span>
          </div>

          {/* Quick Actions for Debt */}
          {customer.totalHutang > 0 && (
            <div className="mt-3 pt-3 border-t border-border-subtle flex gap-2">
              <Button onClick={handlePayAllFIFO} variant="primary" size="sm" className="flex-1">
                💳 Bayar Sekaligus (FIFO)
              </Button>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-1.5 border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl text-xs font-semibold transition-colors"
                  title="Kirim pengingat via WhatsApp"
                >
                  💬 Tagih WA
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-default bg-bg-surface/50">
        <button
          onClick={() => setActiveTab('hutang')}
          className={`flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'hutang'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span>Daftar Hutang ({ledgers.length})</span>
          {overdueLedgers.length > 0 && (
            <span className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {overdueLedgers.length} Overdue
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('pembayaran')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'pembayaran'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Riwayat Bayar ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('aktivitas')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'aktivitas'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Aktivitas ({auditLogs.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'hutang' && (
          <div className="divide-y divide-border-subtle">
            {ledgers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <div className="text-4xl mb-2 opacity-60">📋</div>
                <div className="font-medium text-text-secondary">Belum ada hutang</div>
                <div className="text-xs text-text-muted mt-0.5">
                  Pelanggan ini belum pernah kredit
                </div>
              </div>
            ) : (
              ledgers.map((ledger) => {
                const overdue = isLedgerOverdue(ledger);
                const daysLate = getDaysOverdue(ledger);

                return (
                  <div key={ledger.id} className="p-4 hover:bg-bg-elevated/40 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-text-muted">
                            {ledger.transactionId}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              ledger.status === 'lunas'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                          >
                            {ledger.status === 'lunas' ? '✓ Lunas' : 'Belum Lunas'}
                          </span>
                          {overdue && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 font-bold">
                              ⚠️ Lewat {daysLate} hari
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-text-secondary">
                          📅 {ledger.tanggalTransaksi}
                        </div>

                        {ledger.tanggalJatuhTempo && (
                          <div
                            className={`text-xs mt-0.5 ${
                              overdue ? 'text-red-400 font-semibold' : 'text-text-muted'
                            }`}
                          >
                            {overdue ? '🚨' : '⏰'} Jatuh tempo: {ledger.tanggalJatuhTempo}
                          </div>
                        )}

                        {ledger.catatan && (
                          <div className="text-xs text-text-muted mt-1">💬 {ledger.catatan}</div>
                        )}
                      </div>

                      <div className="ml-3 text-right shrink-0">
                        <div className="text-[10px] text-text-muted mb-0.5 uppercase tracking-wider font-semibold">
                          Total
                        </div>
                        <div className="font-bold text-text-primary text-sm tabular-nums">
                          {formatRupiah(ledger.jumlahKredit)}
                        </div>

                        {ledger.sisaHutang > 0 && (
                          <>
                            <div className="text-[10px] text-text-muted mt-1.5 mb-0.5 uppercase tracking-wider font-semibold">
                              Sisa
                            </div>
                            <div className="font-bold text-red-400 text-sm tabular-nums">
                              {formatRupiah(ledger.sisaHutang)}
                            </div>

                            <Button
                              onClick={() => handlePayment(ledger)}
                              variant="primary"
                              size="sm"
                              className="mt-2 text-xs py-1 px-3"
                            >
                              Bayar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'pembayaran' && (
          <div className="divide-y divide-border-subtle">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <div className="text-4xl mb-2 opacity-60">💰</div>
                <div className="font-medium text-text-secondary">Belum ada pembayaran</div>
                <div className="text-xs text-text-muted mt-0.5">Riwayat pembayaran kosong</div>
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="p-4 hover:bg-bg-elevated/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-text-primary font-medium mb-0.5">
                        📅 {payment.tanggalBayar}
                      </div>

                      <div className="text-xs text-text-secondary">
                        💳 {payment.metodePembayaran}
                      </div>

                      <div className="text-[11px] text-text-muted mt-0.5">
                        Oleh: {payment.createdBy}
                      </div>

                      {payment.catatan && (
                        <div className="text-xs text-text-muted mt-1">💬 {payment.catatan}</div>
                      )}
                    </div>

                    <div className="ml-3 text-right shrink-0">
                      <div className="font-bold text-green-400 text-sm tabular-nums">
                        {formatRupiah(payment.jumlahBayar)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'aktivitas' && (
          <div className="divide-y divide-border-subtle">
            {auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <div className="text-4xl mb-2 opacity-60">📜</div>
                <div className="font-medium text-text-secondary">Belum ada riwayat aktivitas</div>
                <div className="text-xs text-text-muted mt-0.5">
                  Semua catatan mutasi dan perubahan tersimpan otomatis
                </div>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-bg-elevated/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-xs text-text-primary">
                          {log.action === 'customer_created' && '👤 Pelanggan Dibuat'}
                          {log.action === 'customer_updated' && '✏️ Data Pelanggan Diperbarui'}
                          {log.action === 'customer_deactivated' && '🗑️ Pelanggan Dihapus'}
                          {log.action === 'credit_transaction_created' &&
                            '🛍️ Transaksi Kredit Baru'}
                          {log.action === 'credit_ledger_created' && '📖 Mutasi Hutang Dicatat'}
                          {log.action === 'credit_payment_recorded' && '💵 Pembayaran Diterima'}
                          {![
                            'customer_created',
                            'customer_updated',
                            'customer_deactivated',
                            'credit_transaction_created',
                            'credit_ledger_created',
                            'credit_payment_recorded',
                          ].includes(log.action) && log.action}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {new Date(log.timestamp).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted">
                        Oleh: <span className="font-medium text-text-secondary">{log.actor}</span>
                      </div>
                      {log.details && (
                        <div className="text-xs text-text-muted mt-2 bg-bg-input rounded-xl p-2.5 border border-border-subtle space-y-0.5">
                          {log.details.amount !== undefined && (
                            <div>
                              Nominal Transaksi:{' '}
                              <span className="font-semibold text-red-400 tabular-nums">
                                {formatRupiah(Number(log.details.amount))}
                              </span>
                            </div>
                          )}
                          {log.details.jumlahBayar !== undefined && (
                            <div>
                              Nominal Bayar:{' '}
                              <span className="font-semibold text-green-400 tabular-nums">
                                {formatRupiah(Number(log.details.jumlahBayar))}
                              </span>{' '}
                              ({log.details.metodePembayaran})
                            </div>
                          )}
                          {log.details.transactionId && (
                            <div className="font-mono text-text-muted">
                              Ref: {log.details.transactionId}
                            </div>
                          )}
                          {log.details.telepon && <div>No. Telepon: {log.details.telepon}</div>}
                        </div>
                      )}
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
        <div className="border-t border-amber-500/20 p-4 bg-amber-500/10">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-semibold text-amber-400">Hutang Belum Lunas</div>
              <div className="text-xs text-text-muted">{unpaidLedgers.length} transaksi</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-red-400 tabular-nums">
                {formatRupiah(customer.totalHutang)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
