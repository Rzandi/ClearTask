import { useState, useEffect, useMemo } from 'react';
import { formatRupiah } from '../../utils/formatters';
import { parseIDNumber } from '../../utils/parseIDNumber';
import { allocatePaymentFIFO } from '../../utils/creditHelper';
import * as customerService from '../../services/customerService';
import type { CreditLedger, CreditPayment, Customer } from '../../types';
import Button from '../ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ledger?: CreditLedger | null;
  customer?: Customer | null;
  unpaidLedgers?: CreditLedger[];
  kasirName: string; // Current cashier name
  onSuccess?: (payment?: CreditPayment) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  ledger,
  customer,
  unpaidLedgers = [],
  kasirName,
  onSuccess,
}: Props) {
  const [formData, setFormData] = useState({
    jumlahBayar: '',
    metodePembayaran: 'tunai',
    catatan: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isCustomerFIFOMode = !ledger && !!customer;
  const maxPayable = ledger ? ledger.sisaHutang : customer ? customer.totalHutang : 0;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        jumlahBayar: '',
        metodePembayaran: 'tunai',
        catatan: '',
      });
      setErrors({});
    }
  }, [isOpen, ledger, customer]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleUseMaxAmount = () => {
    if (maxPayable > 0) {
      setFormData((prev) => ({
        ...prev,
        jumlahBayar: maxPayable.toString(),
      }));
    }
  };

  const parsedAmount = parseIDNumber(formData.jumlahBayar);

  // FIFO Allocation preview for customer mode
  const fifoPreview = useMemo(() => {
    if (!isCustomerFIFOMode || isNaN(parsedAmount) || parsedAmount <= 0) {
      return null;
    }
    return allocatePaymentFIFO(unpaidLedgers, parsedAmount);
  }, [isCustomerFIFOMode, unpaidLedgers, parsedAmount]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.jumlahBayar.trim()) {
      newErrors.jumlahBayar = 'Jumlah bayar wajib diisi';
      setErrors(newErrors);
      return false;
    }

    const amount = parseIDNumber(formData.jumlahBayar);
    if (isNaN(amount) || amount <= 0) {
      newErrors.jumlahBayar = 'Jumlah harus lebih dari 0';
      setErrors(newErrors);
      return false;
    }

    if (amount > maxPayable) {
      newErrors.jumlahBayar = `Melebihi sisa hutang (${formatRupiah(maxPayable)})`;
      setErrors(newErrors);
      return false;
    }

    setErrors(newErrors);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setSaving(true);
      const jumlahBayar = parseIDNumber(formData.jumlahBayar);

      if (isCustomerFIFOMode && customer) {
        // Multi-ledger payment using FIFO
        await customerService.payCustomerDebtFIFO({
          customerId: customer.id,
          jumlahBayar,
          metodePembayaran: formData.metodePembayaran,
          catatan: formData.catatan.trim() || undefined,
          createdBy: kasirName,
        });

        if (onSuccess) {
          onSuccess();
        }
      } else if (ledger) {
        // Single ledger payment
        const payment = await customerService.createPayment({
          ledgerId: ledger.id,
          jumlahBayar,
          metodePembayaran: formData.metodePembayaran,
          catatan: formData.catatan.trim() || undefined,
          createdBy: kasirName,
        });

        if (onSuccess) {
          onSuccess(payment);
        }
      }

      onClose();
    } catch (err) {
      console.error('Failed to record payment:', err);
      setErrors({
        submit: err instanceof Error ? err.message : 'Gagal menyimpan pembayaran',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || (!ledger && !customer)) return null;

  const remainingAfterPayment = isNaN(parsedAmount)
    ? maxPayable
    : Math.max(0, maxPayable - parsedAmount);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto text-text-primary">
        {/* Header */}
        <div className="p-4 border-b border-border-default">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-text-primary">
              {isCustomerFIFOMode ? 'Bayar Sekaligus (FIFO)' : 'Catat Pembayaran'}
            </h3>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors text-lg font-bold p-1"
              disabled={saving}
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-text-muted">
            {ledger
              ? `Transaksi: ${ledger.transactionId}`
              : `Pelanggan: ${customer?.nama} (${unpaidLedgers.length} transaksi belum lunas)`}
          </div>
        </div>

        {/* Debt Info */}
        <div className="p-4 bg-bg-elevated/40 border-b border-border-default">
          {ledger ? (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Total Hutang</span>
                <span className="font-medium text-text-primary tabular-nums">
                  {formatRupiah(ledger.jumlahKredit)}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Sudah Dibayar</span>
                <span className="font-medium text-text-primary tabular-nums">
                  {formatRupiah(ledger.jumlahKredit - ledger.sisaHutang)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-red-400 pt-2 border-t border-border-default">
                <span>Sisa Hutang</span>
                <span className="tabular-nums">{formatRupiah(ledger.sisaHutang)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Total Hutang Pelanggan</span>
                <span className="font-bold text-red-400 tabular-nums">
                  {formatRupiah(customer?.totalHutang ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Metode alokasi</span>
                <span>Prioritas transaksi terlama (FIFO)</span>
              </div>
            </>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Jumlah Bayar */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Jumlah Bayar <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="jumlahBayar"
                value={formData.jumlahBayar}
                onChange={handleChange}
                placeholder="0"
                inputMode="decimal"
                className={`w-full px-3 py-2 bg-bg-input border rounded-lg text-text-primary focus:outline-none focus:ring-2 tabular-nums transition-colors ${
                  errors.jumlahBayar
                    ? 'border-red-500 focus:ring-red-500/40'
                    : 'border-border-default focus:border-primary focus:ring-primary/20'
                }`}
                disabled={saving}
                autoFocus
              />
              {maxPayable > 0 && (
                <button
                  type="button"
                  onClick={handleUseMaxAmount}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary-hover bg-primary/15 hover:bg-primary/25 px-2.5 py-1 rounded-md transition-colors"
                  disabled={saving}
                >
                  Lunas Semua
                </button>
              )}
            </div>
            {errors.jumlahBayar && (
              <div className="mt-1 text-sm text-red-400">{errors.jumlahBayar}</div>
            )}
            <div className="mt-1 text-xs text-text-muted">
              Format: 50000 atau 50.000 atau 50,000
            </div>
          </div>

          {/* FIFO Allocation Preview */}
          {fifoPreview && fifoPreview.allocations.length > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-xs">
              <div className="font-semibold text-primary mb-1">
                Alokasi Otomatis ({fifoPreview.allocations.length} transaksi terdampak):
              </div>
              <ul className="space-y-1 text-text-secondary max-h-24 overflow-y-auto pr-1">
                {fifoPreview.allocations.map((alloc) => (
                  <li key={alloc.ledgerId} className="flex justify-between">
                    <span className="font-mono text-[11px]">{alloc.transactionId}</span>
                    <span className="tabular-nums">
                      {formatRupiah(alloc.allocatedAmount)}{' '}
                      <span
                        className={`font-semibold ${
                          alloc.newStatus === 'lunas' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        (
                        {alloc.newStatus === 'lunas'
                          ? 'Lunas'
                          : `Sisa ${formatRupiah(alloc.newSisaHutang)}`}
                        )
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Sisa */}
          {!isNaN(parsedAmount) && parsedAmount > 0 && (
            <div className="p-3 bg-bg-elevated/60 border border-border-default rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Sisa setelah bayar:</span>
                <span
                  className={`font-bold tabular-nums ${
                    remainingAfterPayment === 0 ? 'text-emerald-400' : 'text-text-primary'
                  }`}
                >
                  {remainingAfterPayment === 0 ? '✓ Lunas' : formatRupiah(remainingAfterPayment)}
                </span>
              </div>
            </div>
          )}

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Metode Pembayaran
            </label>
            <select
              name="metodePembayaran"
              value={formData.metodePembayaran}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              disabled={saving}
            >
              <option value="tunai" className="bg-bg-surface text-text-primary">
                Tunai
              </option>
              <option value="transfer" className="bg-bg-surface text-text-primary">
                Transfer Bank
              </option>
              <option value="qris" className="bg-bg-surface text-text-primary">
                QRIS
              </option>
              <option value="debit" className="bg-bg-surface text-text-primary">
                Kartu Debit
              </option>
              <option value="kredit" className="bg-bg-surface text-text-primary">
                Kartu Kredit
              </option>
            </select>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Catatan (opsional)
            </label>
            <textarea
              name="catatan"
              value={formData.catatan}
              onChange={handleChange}
              placeholder="Catatan pembayaran..."
              rows={2}
              className="w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-colors"
              disabled={saving}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Catat Bayar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
