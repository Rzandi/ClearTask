/* ═══════════════════════════════════════════════════════════
   CustomerListPage.tsx — ClearTask W4-02
   Browse and search customer list with debt summary.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '../../utils/formatters';
import * as customerService from '../../services/customerService';
import type { Customer } from '../../types';
import Button from '../ui/Button';

interface Props {
  onSelectCustomer?: (customer: Customer) => void;
  onCreateCustomer?: () => void;
}

export default function CustomerListPage({ onSelectCustomer, onCreateCustomer }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allCustomers = searchQuery.trim()
        ? await customerService.searchCustomers(searchQuery)
        : await customerService.getAllCustomers();
      
      setCustomers(allCustomers);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleSelectCustomer = (customer: Customer) => {
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
  };

  const handleCreateNew = () => {
    if (onCreateCustomer) {
      onCreateCustomer();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Memuat data pelanggan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
          {error}
        </div>
        <button
          onClick={loadCustomers}
          className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Data Pelanggan</h2>
          <Button onClick={handleCreateNew} variant="primary" size="sm">
            + Tambah Pelanggan
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Cari nama atau telepon..."
            className="w-full px-3 py-2 pr-20 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Hapus pencarian"
            >
              ✕
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="mt-2 text-sm text-gray-600">
            Ditemukan {customers.length} pelanggan
          </div>
        )}
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <div className="text-4xl mb-2">👤</div>
            {searchQuery ? (
              <>
                <div className="font-medium">Tidak ditemukan</div>
                <div className="text-sm">Coba kata kunci lain</div>
              </>
            ) : (
              <>
                <div className="font-medium">Belum ada pelanggan</div>
                <div className="text-sm">Klik "Tambah Pelanggan" untuk mulai</div>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {customers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:bg-blue-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {customer.nama}
                    </div>
                    
                    {customer.telepon && (
                      <div className="text-sm text-gray-600 mt-0.5">
                        📞 {customer.telepon}
                      </div>
                    )}
                    
                    {customer.alamat && (
                      <div className="text-sm text-gray-500 mt-0.5 truncate">
                        📍 {customer.alamat}
                      </div>
                    )}
                  </div>

                  <div className="ml-3 flex-shrink-0 text-right">
                    {customer.totalHutang > 0 ? (
                      <>
                        <div className="text-xs text-gray-500 mb-1">Hutang</div>
                        <div className="font-bold text-red-600">
                          {formatRupiah(customer.totalHutang)}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-green-600 font-medium">
                        ✓ Lunas
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {customers.length > 0 && (
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Pelanggan</span>
            <span className="font-bold">{customers.length}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Yang Punya Hutang</span>
            <span className="font-bold text-red-600">
              {customers.filter((c) => c.totalHutang > 0).length}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Total Hutang</span>
            <span className="font-bold text-red-600">
              {formatRupiah(
                customers.reduce((sum, c) => sum + c.totalHutang, 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
