/* ═══════════════════════════════════════════════════════════
   InputKeluaran — ClearTask
   Form and history list for outgoings/expenses (Keluaran)
   ═══════════════════════════════════════════════════════════ */

import React, { useState, useMemo } from 'react';
import { useExpenses, type ExpenseItem } from '../hooks/useExpenses';
import { formatRupiah, getTodayISO } from '../utils/formatters';
import FieldGroup from './ui/FieldGroup';
import Button from './ui/Button';
import Input from './ui/Input';
import EmptyState from './ui/EmptyState';
import ConfirmDialog from './ConfirmDialog';

const KATEGORI_OPTIONS = ['Bahan Baku', 'Operasional', 'Gaji Karyawan', 'Sewa Tempat', 'Lain-lain'];

export default function InputKeluaran() {
  const { expenses, addExpense, deleteExpense } = useExpenses();

  const [form, setForm] = useState({
    tanggal: getTodayISO(),
    kategori: KATEGORI_OPTIONS[0] || 'Bahan Baku',
    namaKeluaran: '',
    jumlah: '',
    catatan: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const jumlahVal = parseInt(form.jumlah, 10) || 0;
  const isValid = form.namaKeluaran.trim().length > 0 && jumlahVal > 0 && form.tanggal.length > 0;

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    let items = [...expenses];
    if (filterCategory !== 'all') {
      items = items.filter((item) => item.kategori === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.namaKeluaran.toLowerCase().includes(q) ||
          item.kategori.toLowerCase().includes(q) ||
          item.catatan?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [expenses, filterCategory, searchQuery]);

  // Expenses Statistics
  const todayStr = getTodayISO();
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  const stats = useMemo(() => {
    const todayTotal = expenses
      .filter((item) => item.tanggal === todayStr)
      .reduce((sum, item) => sum + item.jumlah, 0);

    const monthTotal = expenses
      .filter((item) => item.tanggal.startsWith(currentMonthStr))
      .reduce((sum, item) => sum + item.jumlah, 0);

    return { todayTotal, monthTotal };
  }, [expenses, todayStr, currentMonthStr]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    let err = { ...errors };
    if (e.target.name === 'namaKeluaran' && !e.target.value.trim()) {
      err.namaKeluaran = 'Nama keluaran wajib diisi';
    } else if (e.target.name === 'namaKeluaran') {
      delete err.namaKeluaran;
    }
    if (e.target.name === 'jumlah' && (parseInt(e.target.value, 10) || 0) <= 0) {
      err.jumlah = 'Nominal harus > 0';
    } else if (e.target.name === 'jumlah') {
      delete err.jumlah;
    }
    setErrors(err);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      const expenseData: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
        tanggal: form.tanggal,
        kategori: form.kategori || 'Bahan Baku',
        namaKeluaran: form.namaKeluaran.trim(),
        jumlah: jumlahVal,
      };

      if (form.catatan.trim()) {
        expenseData.catatan = form.catatan.trim();
      }

      await addExpense(expenseData);

      // Reset form but keep date and category
      setForm((prev) => ({
        ...prev,
        namaKeluaran: '',
        jumlah: '',
        catatan: '',
      }));
      setErrors({});
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengeluaran');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      try {
        await deleteExpense(deleteTarget.id);
        setDeleteTarget(null);
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus pengeluaran');
      }
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-1">Input Keluaran (Pengeluaran)</h2>
        <p className="text-sm text-text-muted">Catat pengeluaran operasional toko Anda di sini.</p>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">Total Keluaran Hari Ini</p>
          <p className="text-2xl font-bold text-accent-red">{formatRupiah(stats.todayTotal)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">Total Keluaran Bulan Ini</p>
          <p className="text-2xl font-bold text-text-primary">{formatRupiah(stats.monthTotal)}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* KIRI: Form Input */}
        <div className="w-full lg:w-[380px] shrink-0 glass-card p-5 h-fit">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00ffa3"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Catat Pengeluaran
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup label="Tanggal">
              <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} />
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
                placeholder="Cth: Pembelian Gas Elpiji, Gaji Admin..."
                className={errors.namaKeluaran ? 'border-red-500' : ''}
              />
              {errors.namaKeluaran && (
                <span className="text-xs text-red-400 mt-1 block">{errors.namaKeluaran}</span>
              )}
            </FieldGroup>

            <FieldGroup label="Jumlah Nominal *">
              <Input
                type="number"
                name="jumlah"
                value={form.jumlah}
                onChange={handleChange}
                placeholder="Rp 0"
                className={errors.jumlah ? 'border-red-500' : ''}
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
                <p className="text-xs text-text-muted mb-0.5">Jumlah Tercatat</p>
                <p className="text-base font-bold text-accent-red">{formatRupiah(jumlahVal)}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 shadow-glow"
              disabled={!isValid}
            >
              Simpan Pengeluaran
            </Button>
          </form>
        </div>

        {/* KANAN: Daftar Riwayat Pengeluaran */}
        <div className="flex-1 glass-card p-5 flex flex-col min-h-[400px]">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center justify-between">
            <span>Riwayat Pengeluaran</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-accent-red/10 text-accent-red rounded-lg">
              {filteredExpenses.length} Tercatat
            </span>
          </h3>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Cari pengeluaran..."
                aria-label="Cari pengeluaran"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary transition-all outline-none"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              aria-label="Filter Kategori"
              className="px-3 py-2 text-xs bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary transition-all outline-none cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {KATEGORI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* List/Table */}
          {filteredExpenses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10">
              <EmptyState
                title="Tidak Ada Pengeluaran"
                description={
                  expenses.length === 0
                    ? 'Catat pengeluaran toko Anda menggunakan form di sebelah kiri.'
                    : 'Tidak ada riwayat pengeluaran yang cocok dengan kriteria filter Anda.'
                }
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {/* Desktop Table View */}
              <table className="hidden sm:table w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="py-2.5 px-3 font-semibold text-text-muted uppercase">Tanggal</th>
                    <th className="py-2.5 px-3 font-semibold text-text-muted uppercase">
                      Kategori
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-text-muted uppercase">
                      Deskripsi
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-text-muted uppercase text-right">
                      Nominal
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-text-muted uppercase text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredExpenses.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
                        {item.tanggal}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-red/10 text-accent-red">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-text-primary">{item.namaKeluaran}</p>
                        {item.catatan && (
                          <p className="text-[10px] text-text-muted mt-0.5">{item.catatan}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-accent-red whitespace-nowrap">
                        {formatRupiah(item.jumlah)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="w-7 h-7 flex items-center justify-center mx-auto rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card List View */}
              <div className="sm:hidden space-y-3">
                {filteredExpenses.map((item) => (
                  <div
                    key={item.id}
                    className="bg-bg-input p-3 border border-border-subtle rounded-xl flex flex-col gap-2 relative"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-6">
                        <h4 className="text-xs font-bold text-text-primary truncate">
                          {item.namaKeluaran}
                        </h4>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {item.tanggal} • {item.kategori}
                        </p>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-red cursor-pointer"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                    {item.catatan && (
                      <p className="text-[10px] text-text-secondary bg-bg-surface px-2 py-1 rounded border border-border-subtle">
                        {item.catatan}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-1 border-t border-border-subtle pt-2">
                      <span className="text-[10px] text-text-muted">Nominal</span>
                      <span className="text-xs font-bold text-accent-red">
                        {formatRupiah(item.jumlah)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Catatan Pengeluaran"
        message={`Apakah Anda yakin ingin menghapus catatan "${deleteTarget?.namaKeluaran}" senilai ${formatRupiah(deleteTarget?.jumlah || 0)}?`}
        confirmLabel="Hapus"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
