import React, { useState } from 'react';
import { formatDate, formatTime } from '../../utils/formatters';

interface HistoryItem {
  id: number;
  period: string;
  createdAt: string;
  weights: any;
  results_snapshot: any[];
  urgent_count: number;
}

interface HistoryTableProps {
  history: HistoryItem[];
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ history }) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<HistoryItem | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="glass-card mt-6 flex flex-col items-center justify-center h-48">
        <p className="text-text-muted font-medium">Belum ada riwayat kalkulasi.</p>
      </div>
    );
  }

  return (
    <div className="glass-card mt-6 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-border-default bg-bg-surface/50">
        <h2 className="text-lg font-semibold text-text-primary">Histori Kalkulasi ({history.length})</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-default text-sm">
          <thead className="bg-bg-input">
            <tr>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">#</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Tanggal & Waktu</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Periode</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Bobot (C1/C2/C3/C4)</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Produk Teratas</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Urgent</th>
              <th scope="col" className="px-6 py-3 text-right font-semibold text-text-secondary uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default bg-bg-surface">
            {history.map((item, idx) => {
              const dateObj = new Date(item.createdAt);
              const topProduct = item.results_snapshot && item.results_snapshot.length > 0 ? item.results_snapshot[0] : null;

              return (
                <tr key={item.id} className="hover:bg-bg-elevated transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-text-secondary">{idx + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-text-primary">
                    <div className="font-medium">{formatDate(dateObj)}</div>
                    <div className="text-xs text-text-muted">{formatTime(dateObj)} WIB</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs font-bold rounded-md border bg-primary/10 text-primary border-primary/20">
                      {item.period.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-text-secondary text-xs font-mono">
                    {Math.round(item.weights?.c1_weight * 100) || 0}/
                    {Math.round(item.weights?.c2_weight * 100) || 0}/
                    {Math.round(item.weights?.c3_weight * 100) || 0}/
                    {Math.round(item.weights?.c4_weight * 100) || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {topProduct ? (
                      <div>
                        <div className="font-medium text-text-primary truncate max-w-[150px]">{topProduct.product_name}</div>
                        <div className="text-xs text-text-muted font-mono mt-1">Skor: {topProduct.score.toFixed(4)}</div>
                      </div>
                    ) : (
                      <span className="text-text-muted italic">Tidak ada hasil</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.urgent_count > 0 ? (
                      <span className="px-2.5 py-1 inline-flex text-xs font-bold rounded-md bg-error/10 text-error border border-error/20">
                        {item.urgent_count}
                      </span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => setSelectedSnapshot(item)}
                      className="text-primary hover:text-primary-hover bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-card max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-border-default">
            <div className="p-6 border-b border-border-default flex justify-between items-center bg-bg-surface/50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-text-primary">Snapshot Kalkulasi</h3>
                <p className="text-sm text-text-muted mt-1">
                  {formatDate(new Date(selectedSnapshot.createdAt))} {formatTime(new Date(selectedSnapshot.createdAt))} | 
                  Periode: {selectedSnapshot.period.replace(/_/g, ' ')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSnapshot(null)}
                className="text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-bg-surface">
              <h4 className="font-semibold text-text-primary mb-4">Top 10 Prioritas Restock pada saat itu:</h4>
              <table className="min-w-full divide-y divide-border-default text-sm border border-border-default rounded-xl overflow-hidden">
                <thead className="bg-bg-input">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">Rank</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">Nama Produk</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">Skor</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">Stok Saat Itu</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default bg-bg-surface">
                  {selectedSnapshot.results_snapshot && selectedSnapshot.results_snapshot.length > 0 ? (
                    selectedSnapshot.results_snapshot.map((r, i) => (
                      <tr key={i} className="hover:bg-bg-elevated transition-colors">
                        <td className="px-4 py-3 font-bold text-text-secondary">{r.rank}</td>
                        <td className="px-4 py-3 font-medium text-text-primary">{r.product_name}</td>
                        <td className="px-4 py-3 font-mono font-bold text-primary">{r.score.toFixed(4)}</td>
                        <td className="px-4 py-3 text-text-secondary">{r.current_stock}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${r.urgency_level === 'urgent' ? 'bg-error/10 text-error border-error/20' : r.urgency_level === 'perhatian' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'}`}>
                            {r.urgency_level.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">Tidak ada data hasil</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-border-default flex justify-end bg-bg-surface/50 rounded-b-xl">
              <button 
                onClick={() => setSelectedSnapshot(null)}
                className="px-6 py-2 bg-bg-input border border-border-default text-text-primary rounded-xl hover:bg-bg-elevated font-medium transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
