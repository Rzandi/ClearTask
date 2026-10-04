/* ═══════════════════════════════════════════════════════════
   EditExpenseModal.tsx — ClearTask (Roadmap 3.B & 4.A)
   Modal dialog for editing operational expense records
   ═══════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import type { ExpenseItem } from '../hooks/useExpenses';
import { maskRupiah, unmaskRupiah, formatIDR } from '../utils/parseIDNumber';
import FieldGroup from './ui/FieldGroup';
import Button from './ui/Button';
import Input from './ui/Input';
import { useToast } from '../hooks/useToast';

const KATEGORI_OPTIONS = ['Bahan Baku', 'Operasional', 'Gaji Karyawan', 'Sewa Tempat', 'Lain-lain'];

export interface EditExpenseModalProps {
  isOpen: boolean;
  expense: ExpenseItem | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<ExpenseItem>) => Promise<void>;
}

export default function EditExpenseModal({
  isOpen,
  expense,
  onClose,
  onSave,
}: EditExpenseModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    tanggal: '',
    kategori: KATEGORI_OPTIONS[0],
    namaKeluaran: '',
    jumlah: '',
    catatan: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm({
        tanggal: expense.tanggal || '',
        kategori: expense.kategori || KATEGORI_OPTIONS[0],
        namaKeluaran: expense.namaKeluaran || '',
        jumlah: expense.jumlah ? maskRupiah(expense.jumlah) : '',
        catatan: expense.catatan || '',
      });
      setErrors({});
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const jumlahVal = unmaskRupiah(form.jumlah);
  const isValid = form.namaKeluaran.trim().length > 0 && jumlahVal > 0 && form.tanggal.length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    setErrors((prev) => {
      const next = { ...prev };
      if (name === 'namaKeluaran') {
        if (!value.trim()) next.namaKeluaran = 'Nama keluaran wajib diisi';
        else delete next.namaKeluaran;
      }
      return next;
    });
  };

  const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskRupiah(e.target.value);
    setForm((prev) => ({ ...prev, jumlah: masked }));
    const val = unmaskRupiah(masked);
    setErrors((prev) => {
      const next = { ...prev };
      if (val <= 0) next.jumlah = 'Nominal harus > 0';
      else delete next.jumlah;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !expense.id || isSaving) return;

    try {
      setIsSaving(true);
      await onSave(expense.id, {
        tanggal: form.tanggal,
        kategori: form.kategori,
        namaKeluaran: form.namaKeluaran.trim(),
        jumlah: jumlahVal,
        catatan: form.catatan.trim() || undefined,
      });
      onClose();
      showToast('Pengeluaran berhasil diperbarui', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui pengeluaran', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-expense-title"
    >
      <div
        className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default pb-3">
          <h3
            id="edit-expense-title"
            className="text-base font-bold text-text-primary flex items-center gap-2"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00ffa3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Catatan Pengeluaran
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
            aria-label="Tutup modal edit"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup label="Tanggal">
            <Input
              type="date"
              name="tanggal"
              value={form.tanggal}
              onChange={handleChange}
              required
            />
          </FieldGroup>

          <FieldGroup label="Kategori Pengeluaran">
            <select
              name="kategori"
              aria-label="Kategori Pengeluaran"
              value={form.kategori}
              onChange={handleChange}
              className="form-input w-full text-sm"
            >
              {KATEGORI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Nama Keluaran / Item *">
            <Input
              type="text"
              name="namaKeluaran"
              value={form.namaKeluaran}
              onChange={handleChange}
              placeholder="Cth: Pembelian Gas Elpiji"
              className={errors.namaKeluaran ? 'border-red-500' : ''}
              required
            />
            {errors.namaKeluaran && (
              <span className="text-xs text-red-400 mt-1 block">{errors.namaKeluaran}</span>
            )}
          </FieldGroup>

          <FieldGroup label="Jumlah Nominal *">
            <Input
              type="text"
              name="jumlah"
              value={form.jumlah}
              onChange={handleJumlahChange}
              placeholder="Rp 0"
              className={errors.jumlah ? 'border-red-500' : ''}
              required
            />
            {errors.jumlah && (
              <span className="text-xs text-red-400 mt-1 block">{errors.jumlah}</span>
            )}
          </FieldGroup>

          <FieldGroup label="Catatan (Opsional)">
            <Input
              type="text"
              name="catatan"
              value={form.catatan}
              onChange={handleChange}
              placeholder="Detail pengeluaran tambahan..."
            />
          </FieldGroup>

          {jumlahVal > 0 && (
            <div className="bg-bg-elevated rounded-xl p-3 border border-border-subtle">
              <p className="text-xs text-text-muted mb-0.5">Jumlah Nominal</p>
              <p className="text-base font-bold text-accent-red">{formatIDR(jumlahVal)}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 py-2.5"
              onClick={onClose}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 py-2.5 shadow-glow"
              disabled={!isValid || isSaving}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
