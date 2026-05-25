import React, { useState, useEffect } from 'react';
import type { SAWResultItem, ExcludedItem, SAWCriterias } from '../../hooks/useSAWCalculation';
import * as ExcelJS from 'exceljs';
import { triggerDownload } from '../../utils/downloadHelper';

interface RankingTableProps {
  results: SAWResultItem[];
  excluded: ExcludedItem[];
  criterias: SAWCriterias;
  periodLabel: string;
}

export const RankingTable: React.FC<RankingTableProps> = ({ results, excluded, criterias, periodLabel }) => {
  const [activeTab, setActiveTab] = useState<'ranking' | 'matrix' | 'excluded'>('ranking');
  const [isExporting, setIsExporting] = useState(false);

  // ── Pagination ───────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const targetArray = activeTab === 'excluded' ? excluded : results;
  const totalPages = Math.max(1, Math.ceil(targetArray.length / ITEMS_PER_PAGE));
  const safeCurrentPage = totalPages > 0 && currentPage > totalPages ? totalPages : currentPage;
  
  const startIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  
  const visibleResults = results.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  const visibleExcluded = excluded.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  function getVisiblePages(current: number, total: number) {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, 5];
    if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
    return [current - 2, current - 1, current, current + 1, current + 2];
  }

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ClearTask SPK SAW';
      workbook.created = new Date();

      // Sheet 1: Hasil Ranking
      const sheet1 = workbook.addWorksheet('Hasil Ranking');
      sheet1.columns = [
        { header: 'Rank', key: 'rank', width: 10 },
        { header: 'Nama Produk', key: 'name', width: 30 },
        { header: 'Skor SAW', key: 'score', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Stok Saat Ini', key: 'stock', width: 15 },
      ];
      results.forEach(r => {
        sheet1.addRow({
          rank: r.rank,
          name: r.product_name,
          score: r.score.toFixed(4),
          status: r.urgency_level.toUpperCase(),
          stock: r.current_stock
        });
      });

      // Sheet 2: Matriks Normalisasi
      const sheet2 = workbook.addWorksheet('Matriks Normalisasi');
      sheet2.columns = [
        { header: 'Rank', key: 'rank', width: 10 },
        { header: 'Nama Produk', key: 'name', width: 30 },
        { header: 'C1 (Raw)', key: 'c1_raw', width: 15 },
        { header: 'C1 (Norm)', key: 'c1_norm', width: 15 },
        { header: 'C2 (Raw)', key: 'c2_raw', width: 15 },
        { header: 'C2 (Norm)', key: 'c2_norm', width: 15 },
        { header: 'C3 (Raw)', key: 'c3_raw', width: 15 },
        { header: 'C3 (Norm)', key: 'c3_norm', width: 15 },
        { header: 'C4 (Raw)', key: 'c4_raw', width: 15 },
        { header: 'C4 (Norm)', key: 'c4_norm', width: 15 },
        { header: 'Skor Akhir', key: 'score', width: 15 },
      ];
      results.forEach(r => {
        sheet2.addRow({
          rank: r.rank,
          name: r.product_name,
          c1_raw: r.raw_values.c1_volume,
          c1_norm: r.normalized_values.c1.toFixed(4),
          c2_raw: r.raw_values.c2_stock,
          c2_norm: r.normalized_values.c2.toFixed(4),
          c3_raw: r.raw_values.c3_margin_pct.toFixed(2) + '%',
          c3_norm: r.normalized_values.c3.toFixed(4),
          c4_raw: r.raw_values.c4_frequency,
          c4_norm: r.normalized_values.c4.toFixed(4),
          score: r.score.toFixed(4)
        });
      });

      // Sheet 3: Ringkasan
      const sheet3 = workbook.addWorksheet('Ringkasan');
      sheet3.addRow(['Periode', periodLabel]);
      sheet3.addRow(['Tanggal Generate', new Date().toLocaleString('id-ID')]);
      sheet3.addRow(['Bobot C1 (Volume)', (criterias.c1_weight * 100) + '%']);
      sheet3.addRow(['Bobot C2 (Stok)', (criterias.c2_weight * 100) + '%']);
      sheet3.addRow(['Bobot C3 (Margin)', (criterias.c3_weight * 100) + '%']);
      sheet3.addRow(['Bobot C4 (Frekuensi)', (criterias.c4_weight * 100) + '%']);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      triggerDownload(blob, `SPK_Restock_${new Date().getTime()}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('Gagal mengekspor file');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="glass-card mb-6 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 sm:p-6 border-b border-border-default bg-bg-surface/50">
        <div className="flex space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'ranking' ? 'bg-primary text-text-inverse shadow-glow' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Hasil Ranking
          </button>
          <button 
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'matrix' ? 'bg-primary text-text-inverse shadow-glow' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Matriks Normalisasi
          </button>
          <button 
            onClick={() => setActiveTab('excluded')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'excluded' ? 'bg-primary text-text-inverse shadow-glow' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Dikecualikan
          </button>
        </div>
        
        <button 
          onClick={exportToExcel}
          disabled={isExporting || results.length === 0}
          className={`mt-4 md:mt-0 flex items-center px-4 py-2 text-sm font-bold rounded-xl transition-colors border cursor-pointer
            ${isExporting || results.length === 0 ? 'bg-bg-elevated text-text-muted border-border-default cursor-not-allowed' : 'bg-success/10 text-success border-success/20 hover:bg-success/20 shadow-[0_0_10px_rgba(0,255,136,0.2)]'}
          `}
        >
          {isExporting ? 'Generating...' : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Ekspor Excel
            </>
          )}
        </button>
      </div>

      <div className="p-0 overflow-x-auto">
        {activeTab === 'ranking' && (
          <table className="min-w-full divide-y divide-border-default text-sm">
            <thead className="bg-bg-input">
              <tr>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Rank</th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Nama Produk</th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Skor Akhir (Vi)</th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default bg-bg-surface">
              {results.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-muted">Tidak ada data untuk ditampilkan</td></tr>
              ) : (
                visibleResults.map((r, idx) => (
                  <tr key={idx} className={`transition-colors hover:bg-bg-elevated ${r.urgency_level === 'urgent' ? 'bg-error/5' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        r.rank === 1 ? 'bg-warning text-bg-base shadow-[0_0_10px_rgba(240,180,41,0.5)]' : 
                        r.rank === 2 ? 'bg-text-secondary text-bg-base shadow-glow' : 
                        r.rank === 3 ? 'bg-orange-500 text-bg-base shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-bg-input text-text-secondary border border-border-subtle'
                      }`}>
                        {r.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-text-primary">{r.product_name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-primary">{r.score.toFixed(4)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-md border 
                        ${r.urgency_level === 'urgent' ? 'bg-error/10 text-error border-error/20' : 
                          r.urgency_level === 'perhatian' ? 'bg-warning/10 text-warning border-warning/20' : 
                          'bg-success/10 text-success border-success/20'}`}>
                        {r.urgency_level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{r.current_stock} unit</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'matrix' && (
          <div className="p-4">
            <table className="min-w-full divide-y divide-border-default text-sm border border-border-default rounded-xl overflow-hidden">
              <thead className="bg-bg-input">
                <tr>
                  <th scope="col" className="px-4 py-2 border-r border-border-default text-center text-text-secondary font-semibold" rowSpan={2}>Nama Produk</th>
                  <th scope="col" className="px-4 py-2 border-r border-border-default text-center text-text-secondary font-semibold" colSpan={2}>C1 (Benefit)</th>
                  <th scope="col" className="px-4 py-2 border-r border-border-default text-center text-text-secondary font-semibold" colSpan={2}>C2 (Cost)</th>
                  <th scope="col" className="px-4 py-2 border-r border-border-default text-center text-text-secondary font-semibold" colSpan={2}>C3 (Benefit)</th>
                  <th scope="col" className="px-4 py-2 border-r border-border-default text-center text-text-secondary font-semibold" colSpan={2}>C4 (Benefit)</th>
                  <th scope="col" className="px-4 py-2 text-center text-text-secondary font-semibold" rowSpan={2}>Vi (Akhir)</th>
                </tr>
                <tr className="bg-bg-surface">
                  <th scope="col" className="px-2 py-1 border-r border-border-subtle text-center text-[10px] text-text-muted">Raw</th>
                  <th scope="col" className="px-2 py-1 border-r border-border-default text-center text-[10px] text-primary font-bold">Norm</th>
                  <th scope="col" className="px-2 py-1 border-r border-border-subtle text-center text-[10px] text-text-muted">Raw</th>
                  <th scope="col" className="px-2 py-1 border-r border-border-default text-center text-[10px] text-primary font-bold">Norm</th>
                  <th scope="col" className="px-2 py-1 border-r border-border-subtle text-center text-[10px] text-text-muted">Raw</th>
                  <th scope="col" className="px-2 py-1 border-r border-border-default text-center text-[10px] text-primary font-bold">Norm</th>
                  <th scope="col" className="px-2 py-1 border-r border-border-subtle text-center text-[10px] text-text-muted">Raw</th>
                  <th scope="col" className="px-2 py-1 border-r border-border-default text-center text-[10px] text-primary font-bold">Norm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default bg-bg-surface">
                {results.length === 0 ? (
                  <tr><td colSpan={10} className="px-6 py-8 text-center text-text-muted">Tidak ada data</td></tr>
                ) : (
                  visibleResults.map((r, idx) => (
                    <tr key={idx} className="hover:bg-bg-elevated transition-colors">
                      <td className="px-4 py-2 font-medium border-r border-border-default text-text-primary">{r.product_name}</td>
                      <td className="px-4 py-2 text-right border-r border-border-subtle text-text-secondary">{r.raw_values.c1_volume}</td>
                      <td className="px-4 py-2 text-right font-mono border-r border-border-default text-text-primary">{r.normalized_values.c1.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right border-r border-border-subtle text-text-secondary">{r.raw_values.c2_stock}</td>
                      <td className="px-4 py-2 text-right font-mono border-r border-border-default text-text-primary">{r.normalized_values.c2.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right border-r border-border-subtle text-text-secondary">{r.raw_values.c3_margin_pct.toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right font-mono border-r border-border-default text-text-primary">{r.normalized_values.c3.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right border-r border-border-subtle text-text-secondary">{r.raw_values.c4_frequency}</td>
                      <td className="px-4 py-2 text-right font-mono border-r border-border-default text-text-primary">{r.normalized_values.c4.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right font-bold bg-primary/10 text-primary border-l border-primary/20">{r.score.toFixed(4)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm text-text-secondary shadow-inner">
              <p className="font-bold text-primary mb-2 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Rumus Normalisasi SAW
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Benefit (C1, C3, C4):</strong> <code className="bg-bg-input border border-border-subtle px-1.5 py-0.5 rounded text-xs font-mono text-text-primary">r_ij = x_ij / max(x_j)</code></li>
                <li><strong>Cost (C2):</strong> <code className="bg-bg-input border border-border-subtle px-1.5 py-0.5 rounded text-xs font-mono text-text-primary">r_ij = min(x_j) / x_ij</code></li>
                <li><strong>Skor Akhir:</strong> <code className="bg-bg-input border border-border-subtle px-1.5 py-0.5 rounded text-xs font-mono text-text-primary">V_i = Σ (W_k × r_ik)</code></li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'excluded' && (
          <table className="min-w-full divide-y divide-border-default text-sm">
            <thead className="bg-bg-input">
              <tr>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Nama Produk</th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Alasan Dikecualikan</th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-text-secondary uppercase tracking-wider">Frekuensi Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default bg-bg-surface">
              {excluded.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-success font-medium">Semua produk memenuhi syarat kalkulasi ✓</td></tr>
              ) : (
                visibleExcluded.map((e, idx) => (
                  <tr key={idx} className="hover:bg-bg-elevated transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">{e.product_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-bg-input border border-border-subtle text-text-secondary rounded-md text-xs font-medium">
                        {e.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{e.transaction_count} transaksi</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Pagination UI */}
      {targetArray.length > 0 && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-border-default bg-bg-surface/30">
          <p className="text-xs text-text-muted hidden sm:block">
            Menampilkan {Math.min(startIdx + 1, targetArray.length)}-
            {Math.min(startIdx + ITEMS_PER_PAGE, targetArray.length)} dari {targetArray.length} data
          </p>
          <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ‹
            </button>
            {getVisiblePages(safeCurrentPage, totalPages).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  safeCurrentPage === page
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
