/* ═══════════════════════════════════════════════════════════
   PaymentModal.tsx — ClearTask W4-02
   Modal for recording customer credit payments.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { formatRupiah } from '../../utils/formatters';
import { parseIDNumber } from '../../utils/parseIDNumber';
import * as customerService from '../../services/customerService';
import type { CreditLedger, CreditPayment } from '../../types';
import Button from '../ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ledger: CreditLedger | null;
  kasirName: string; // Current cashier name
  onSuccess?: (payment: CreditPayment) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  ledger,
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
  const [suggestedAmount, setSuggestedAmount] = useState<number | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && ledger) {
      setFormData({
        jumlahBayar: '',
        metodePembayaran: 'tunai',
        catatan: '',
      });
      setErrors({});
      setSuggestedAmount(ledger.sisaHutang);
    }
  }, [isOpen, ledger]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleUseSuggested = () => {
    if (suggestedAmount !== null) {
      setFormData((prev) => ({
        ...prev,
        jumlahBayar: suggestedAmount.toString(),
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.jumlahBayar.trim()) {
      newErrors.jumlahBayar = 'Jumlah bayar wajib diisi';
      setErrors(newErrors);
      return false;
    }

    const parsedAmount = parseIDNumber(formData.jumlahBayar);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.jumlahBayar = 'Jumlah harus lebih dari 0';
      setErrors(newErrors);
      return false;
    }

    if (ledger && parsedAmount > ledger.sisaHutang) {
      newErrors.jumlahBayar = `Melebihi sisa hutang (${formatRupiah(ledger.sisaHutang)})`;
      setErrors(newErrors);
      return false;
    }

    setErrors(newErrors);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ledger) return;
    if (!validate()) return;

    try {
      setSaving(true);

      const jumlahBayar = parseIDNumber(formData.jumlahBayar);

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

  if (!isOpen || !ledger) return null;

  const parsedAmount = parseIDNumber(formData.jumlahBayar);
  const remainingAfterPayment = isNaN(parsedAmount)
    ? ledger.sisaHutang
    : Math.max(0, ledger.sisaHutang - parsedAmount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold">Catat Pembayaran</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={saving}
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Transaksi: {ledger.transactionId}
          </div>
        </div>

        {/* Debt Info */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Total Hutang</span>
            <span className="font-medium">{formatRupiah(ledger.jumlahKredit)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Sudah Dibayar</span>
            <span className="font-medium">
              {formatRupiah(ledger.jumlahKredit - ledger.sisaHutang)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-red-600 pt-2 border-t">
            <span>Sisa Hutang</span>
            <span>{formatRupiah(ledger.sisaHutang)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Jumlah Bayar */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Jumlah Bayar <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="jumlahBayar"
                value={formData.jumlahBayar}
                onChange={handleChange}
                placeholder="0"
                inputMode="decimal"
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                  errors.jumlahBayar
                    ? 'border-red-300 focus:ring-red-500'
                    : 'focus:ring-blue-500'
                }`}
                disabled={saving}
                autoFocus
              />
              {suggestedAmount && (
                <button
                  type="button"
                  onClick={handleUseSuggested}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                  disabled={saving}
                >
                  Lunas
                </button>
              )}
            </div>
            {errors.jumlahBayar && (
              <div className="mt-1 text-sm text-red-600">{errors.jumlahBayar}</div>
            )}
            <div className="mt-1 text-xs text-gray-500">
              Format: 50000 atau 50.000 atau 50,000
            </div>
          </div>

          {/* Preview Sisa */}
          {!isNaN(parsedAmount) && parsedAmount > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Sisa setelah bayar:</span>
                <span
                  className={`font-bold ${
                    remainingAfterPayment === 0 ? 'text-green-600' : 'text-gray-900'
                  }`}
                >
                  {remainingAfterPayment === 0
                    ? '✓ Lunas'
                    : formatRupiah(remainingAfterPayment)}
                </span>
              </div>
            </div>
          )}

          {/* Metode Pembayaran */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Metode Pembayaran
            </label>
            <select
              name="metodePembayaran"
              value={formData.metodePembayaran}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            >
              <option value="tunai">Tunai</option>
              <option value="transfer">Transfer Bank</option>
              <option value="qris">QRIS</option>
              <option value="debit">Kartu Debit</option>
              <option value="kredit">Kartu Kredit</option>
            </select>
          </div>

          {/* Catatan */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">
              Catatan (opsional)
            </label>
            <textarea
              name="catatan"
              value={formData.catatan}
              onChange={handleChange}
              placeholder="Catatan pembayaran..."
              rows={2}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={saving}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Catat Bayar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
