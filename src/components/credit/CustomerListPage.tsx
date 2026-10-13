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
  const [overdueSummary, setOverdueSummary] = useState<customerService.OverdueSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allCustomers, summary] = await Promise.all([
        searchQuery.trim()
          ? customerService.searchCustomers(searchQuery)
          : customerService.getAllCustomers(),
        customerService.getOverdueSummary(),
      ]);

      setCustomers(allCustomers);
      setOverdueSummary(summary);
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
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">{error}</div>
        <button onClick={loadCustomers} className="mt-3 text-blue-600 hover:text-blue-800 text-sm">
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-border-default">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-text-primary">Data Pelanggan</h2>
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
            className="w-full px-3.5 py-2.5 pr-20 bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Hapus pencarian"
            >
              ✕
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="mt-2 text-xs text-text-muted">Ditemukan {customers.length} pelanggan</div>
        )}

        {overdueSummary && overdueSummary.overdueCount > 0 && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm">
            <div className="font-semibold text-red-400 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>
                {overdueSummary.overdueCount} Tagihan Jatuh Tempo (
                {formatRupiah(overdueSummary.totalOverdueAmount)})
              </span>
            </div>
            <div className="text-xs text-red-400/80 mt-0.5">
              Terdapat {overdueSummary.affectedCustomersCount} pelanggan dengan tagihan melewati
              tanggal jatuh tempo
            </div>
          </div>
        )}
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <div className="text-4xl mb-2 opacity-60">👤</div>
            {searchQuery ? (
              <>
                <div className="font-medium text-text-secondary">Tidak ditemukan</div>
                <div className="text-xs text-text-muted mt-0.5">Coba kata kunci lain</div>
              </>
            ) : (
              <>
                <div className="font-medium text-text-secondary">Belum ada pelanggan</div>
                <div className="text-xs text-text-muted mt-0.5">
                  Klik "+ Tambah Pelanggan" untuk mulai
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {customers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="w-full p-4 text-left hover:bg-bg-elevated/50 focus:bg-bg-elevated/70 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text-primary truncate">{customer.nama}</div>

                    {customer.telepon && (
                      <div className="text-xs text-text-muted mt-0.5">📞 {customer.telepon}</div>
                    )}

                    {customer.alamat && (
                      <div className="text-xs text-text-muted mt-0.5 truncate">
                        📍 {customer.alamat}
                      </div>
                    )}
                  </div>

                  <div className="ml-3 flex-shrink-0 text-right">
                    {customer.totalHutang > 0 ? (
                      <>
                        <div className="text-[10px] text-text-muted mb-0.5 uppercase tracking-wider font-semibold">
                          Hutang
                        </div>
                        <div className="font-bold text-red-400 tabular-nums">
                          {formatRupiah(customer.totalHutang)}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-green-400 font-semibold px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-md">
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
        <div className="border-t border-border-default p-4 bg-bg-surface/80 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Total Pelanggan</span>
            <span className="font-bold text-text-primary tabular-nums">{customers.length}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Yang Punya Hutang</span>
            <span className="font-bold text-red-400 tabular-nums">
              {customers.filter((c) => c.totalHutang > 0).length}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Total Hutang</span>
            <span className="font-bold text-red-400 tabular-nums">
              {formatRupiah(customers.reduce((sum, c) => sum + c.totalHutang, 0))}
            </span>
          </div>
          {overdueSummary && overdueSummary.overdueCount > 0 && (
            <div className="flex justify-between text-xs pt-1.5 border-t border-border-subtle">
              <span className="text-red-400 font-semibold">⚠️ Jatuh Tempo</span>
              <span className="font-bold text-red-400 tabular-nums">
                {formatRupiah(overdueSummary.totalOverdueAmount)} ({overdueSummary.overdueCount})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
