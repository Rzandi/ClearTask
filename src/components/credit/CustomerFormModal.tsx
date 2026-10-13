/* ═══════════════════════════════════════════════════════════
   CustomerFormModal.tsx — ClearTask W4-02
   Modal form for creating and editing customers.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import * as customerService from '../../services/customerService';
import type { Customer } from '../../types';
import Button from '../ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null; // If provided, edit mode
  onSuccess?: (customer: Customer) => void;
}

export default function CustomerFormModal({ isOpen, onClose, customer, onSuccess }: Props) {
  const isEditMode = !!customer;

  const [formData, setFormData] = useState({
    nama: '',
    telepon: '',
    alamat: '',
    catatan: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (customer) {
      setFormData({
        nama: customer.nama || '',
        telepon: customer.telepon || '',
        alamat: customer.alamat || '',
        catatan: customer.catatan || '',
      });
    } else {
      setFormData({
        nama: '',
        telepon: '',
        alamat: '',
        catatan: '',
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nama.trim()) {
      newErrors.nama = 'Nama wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSaving(true);

      let savedCustomer: Customer;

      if (isEditMode && customer) {
        // Update existing customer
        await customerService.updateCustomer(customer.id, {
          nama: formData.nama.trim(),
          telepon: formData.telepon.trim() || undefined,
          alamat: formData.alamat.trim() || undefined,
          catatan: formData.catatan.trim() || undefined,
        });

        // Fetch updated customer
        const updated = await customerService.getCustomerById(customer.id);
        if (!updated) {
          throw new Error('Failed to fetch updated customer');
        }
        savedCustomer = updated;
      } else {
        // Create new customer
        savedCustomer = await customerService.createCustomer({
          nama: formData.nama.trim(),
          telepon: formData.telepon.trim() || undefined,
          alamat: formData.alamat.trim() || undefined,
          catatan: formData.catatan.trim() || undefined,
        });
      }

      if (onSuccess) {
        onSuccess(savedCustomer);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save customer:', err);
      setErrors({
        submit: err instanceof Error ? err.message : 'Gagal menyimpan data',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-bg-surface border-t sm:border border-border-default rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle Pill */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-border-strong" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-default flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary">
            {isEditMode ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            disabled={saving}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Nama */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Nama Pelanggan <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              placeholder="Contoh: Toko Berkah Jaya"
              className={`w-full px-3.5 py-2.5 bg-bg-input border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors text-sm ${
                errors.nama ? 'border-red-500/60' : 'border-border-default'
              }`}
              disabled={saving}
              autoFocus
            />
            {errors.nama && <div className="mt-1 text-xs text-red-400">{errors.nama}</div>}
          </div>

          {/* Telepon */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Nomor Telepon
            </label>
            <input
              type="text"
              name="telepon"
              value={formData.telepon}
              onChange={handleChange}
              placeholder="Contoh: 081234567890"
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
              disabled={saving}
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Alamat</label>
            <textarea
              name="alamat"
              value={formData.alamat}
              onChange={handleChange}
              placeholder="Contoh: Jl. Merdeka No. 123, Jakarta"
              rows={2}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors text-sm resize-none"
              disabled={saving}
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Catatan</label>
            <textarea
              name="catatan"
              value={formData.catatan}
              onChange={handleChange}
              placeholder="Catatan tambahan (opsional)"
              rows={2}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors text-sm resize-none"
              disabled={saving}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
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
              {saving ? 'Menyimpan...' : isEditMode ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
