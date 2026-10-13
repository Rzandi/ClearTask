/* ═══════════════════════════════════════════════════════════
   CreditAgingReport.tsx — ClearTask W4-02 Phase 5
   Visual credit aging report, top debtors, and CSV exports.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '../../utils/formatters';
import {
  calculateAgingBuckets,
  getTopDebtors,
  exportCustomerCreditReportCSV,
  exportAgingReportCSV,
  type CreditAgingReportData,
} from '../../utils/creditReportHelper';
import type { Customer } from '../../types';
import Button from '../ui/Button';

interface Props {
  onSelectCustomer?: (customer: Customer) => void;
}

export default function CreditAgingReport({ onSelectCustomer }: Props) {
  const [data, setData] = useState<CreditAgingReportData | null>(null);
  const [topDebtors, setTopDebtors] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [agingResult, debtors] = await Promise.all([calculateAgingBuckets(), getTopDebtors(5)]);
      setData(agingResult);
      setTopDebtors(debtors);
    } catch (err) {
      console.error('Failed to load aging report data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCustomers = async () => {
    try {
      setExporting(true);
      await exportCustomerCreditReportCSV();
    } catch (err) {
      console.error('Export customer report failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportAging = async () => {
    try {
      setExporting(true);
      await exportAgingReportCSV();
    } catch (err) {
      console.error('Export aging report failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 text-sm">Menghitung analisis umur piutang...</div>
      </div>
    );
  }

  const riskRatio =
    data.totalAmount > 0 ? ((data.overdueAmount / data.totalAmount) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Analisis & Laporan Piutang</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Monitoring resiko piutang berdasarkan tanggal jatuh tempo transaksi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={loadData} variant="outline" size="sm" title="Muat ulang data">
            🔄 Refresh
          </Button>
          <Button onClick={handleExportAging} variant="outline" size="sm" disabled={exporting}>
            📊 Export Aging (CSV)
          </Button>
          <Button onClick={handleExportCustomers} variant="primary" size="sm" disabled={exporting}>
            📥 Export Pelanggan (CSV)
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-bg-surface rounded-xl border border-border-default shadow-sm">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Total Piutang Aktif
          </div>
          <div className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
            {formatRupiah(data.totalAmount)}
          </div>
          <div className="text-xs text-text-muted mt-1 tabular-nums">
            {data.totalUnpaidCount} transaksi belum lunas
          </div>
        </div>

        <div className="p-4 bg-bg-surface rounded-xl border border-border-default shadow-sm">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Piutang Jatuh Tempo (Overdue)
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1 tabular-nums">
            {formatRupiah(data.overdueAmount)}
          </div>
          <div className="text-xs text-red-400/90 mt-1 tabular-nums">
            {data.overdueCount} tagihan terlambat bayar
          </div>
        </div>

        <div className="p-4 bg-bg-surface rounded-xl border border-border-default shadow-sm">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Rasio Resiko Piutang
          </div>
          <div
            className={`text-2xl font-bold mt-1 tabular-nums ${
              Number(riskRatio) > 40
                ? 'text-red-400'
                : Number(riskRatio) > 20
                  ? 'text-amber-400'
                  : 'text-green-400'
            }`}
          >
            {riskRatio}%
          </div>
          <div className="text-xs text-text-muted mt-1">
            Persentase piutang jatuh tempo terhadap total piutang
          </div>
        </div>
      </div>

      {/* Aging Buckets Breakdown */}
      <div className="bg-bg-surface rounded-xl border border-border-default p-4 shadow-sm">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
          📊 Distribusi Umur Piutang (Credit Aging)
        </h3>

        <div className="space-y-4">
          {data.bucketList.map((bucket) => (
            <div key={bucket.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-secondary flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${bucket.color}`} />
                  <span>{bucket.label}</span>
                </span>
                <span className="font-bold text-text-primary tabular-nums">
                  {formatRupiah(bucket.amount)}{' '}
                  <span className="text-xs font-normal text-text-muted tabular-nums">
                    ({bucket.count} tagihan • {bucket.percentage}%)
                  </span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-bg-input border border-border-subtle rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${bucket.color}`}
                  style={{ width: `${Math.min(100, bucket.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Debtors Table */}
      <div className="bg-bg-surface rounded-xl border border-border-default p-4 shadow-sm">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">
          🏆 Top 5 Debitur Terbesar
        </h3>

        {topDebtors.length === 0 ? (
          <div className="text-center py-6 text-text-muted text-sm">
            Tidak ada pelanggan dengan tagihan piutang aktif
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {topDebtors.map((customer, index) => (
              <div
                key={customer.id}
                className="py-3 flex items-center justify-between hover:bg-bg-elevated/50 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-text-primary text-sm truncate">
                      {customer.nama}
                    </div>
                    {customer.telepon && (
                      <div className="text-xs text-text-muted">📞 {customer.telepon}</div>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center gap-3 flex-shrink-0">
                  <div>
                    <div className="text-xs text-text-muted">Total Hutang</div>
                    <div className="font-bold text-red-400 text-sm tabular-nums">
                      {formatRupiah(customer.totalHutang)}
                    </div>
                  </div>

                  {onSelectCustomer && (
                    <Button onClick={() => onSelectCustomer(customer)} variant="outline" size="sm">
                      Detail →
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
