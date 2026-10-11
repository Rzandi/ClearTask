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

export default function CustomerFormModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: Props) {
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {isEditMode ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Nama */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Nama Pelanggan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              placeholder="Contoh: Toko Berkah Jaya"
              className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                errors.nama
                  ? 'border-red-300 focus:ring-red-500'
                  : 'focus:ring-blue-500'
              }`}
              disabled={saving}
              autoFocus
            />
            {errors.nama && (
              <div className="mt-1 text-sm text-red-600">{errors.nama}</div>
            )}
          </div>

          {/* Telepon */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Nomor Telepon
            </label>
            <input
              type="text"
              name="telepon"
              value={formData.telepon}
              onChange={handleChange}
              placeholder="Contoh: 081234567890"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>

          {/* Alamat */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Alamat</label>
            <textarea
              name="alamat"
              value={formData.alamat}
              onChange={handleChange}
              placeholder="Contoh: Jl. Merdeka No. 123, Jakarta"
              rows={2}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={saving}
            />
          </div>

          {/* Catatan */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Catatan</label>
            <textarea
              name="catatan"
              value={formData.catatan}
              onChange={handleChange}
              placeholder="Catatan tambahan (opsional)"
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
              {saving ? 'Menyimpan...' : isEditMode ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
