/* ═══════════════════════════════════════════════════════════
   ReportingChart — ClearTask
   A responsive, lightweight, pure SVG multi-series area chart.
   Zero external charting dependencies. Beautiful glassmorphic gradients.
   ═══════════════════════════════════════════════════════════ */

import { useMemo } from 'react';
import { formatRupiah } from '../utils/formatters';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';

export interface ReportingChartProps {
  transactions: any[];
  expenses: any[];
}

export default function ReportingChart({ transactions, expenses }: ReportingChartProps) {
  // Group Pemasukan, Keluaran & Profit by Date
  const chartData = useMemo(() => {
    const dataMap: Record<string, { tanggal: string; pemasukan: number; modal: number; keluaran: number }> = {};

    // Group Transactions
    transactions.forEach((tx) => {
      const date = tx.tanggal;
      if (!dataMap[date]) {
        dataMap[date] = { tanggal: date, pemasukan: 0, modal: 0, keluaran: 0 };
      }
      dataMap[date].pemasukan += tx.total || 0;

      // Group historical cost price of items sold
      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach((item: any) => {
          dataMap[date].modal += (item.hargaModal || 0) * (item.qty || 1);
        });
      }
    });

    // Group Expenses
    expenses.forEach((ex) => {
      const date = ex.tanggal;
      if (!dataMap[date]) {
        dataMap[date] = { tanggal: date, pemasukan: 0, modal: 0, keluaran: 0 };
      }
      dataMap[date].keluaran += ex.jumlah || 0;
    });

    // Sort chronologically
    const sorted = Object.values(dataMap).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    // Limit to latest 10 days for optimal spacing on mobile/desktop
    return sorted.slice(-10);
  }, [transactions, expenses]);

  // Dimension settings
  const width = 600;
  const height = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate scales
  const maxVal = useMemo(() => {
    let max = 100000; // default minimum Y height
    chartData.forEach((d) => {
      const profit = d.pemasukan - d.modal - d.keluaran;
      max = Math.max(max, d.pemasukan, d.keluaran, profit);
    });
    return max * 1.15; // 15% buffer on top
  }, [chartData]);

  const points = useMemo(() => {
    if (chartData.length === 0) return { pemasukan: '', keluaran: '', profit: '', areaPemasukan: '', areaKeluaran: '', areaProfit: '', list: [] };

    const list: any[] = [];
    const stepX = chartData.length > 1 ? chartWidth / (chartData.length - 1) : chartWidth;

    const minYBound = paddingTop;
    const maxYBound = paddingTop + chartHeight;

    chartData.forEach((d, idx) => {
      const x = paddingLeft + idx * stepX;
      
      const profit = d.pemasukan - d.modal - d.keluaran;

      // Y Scale (inverted for SVG coordinates: 0 is top, height is bottom)
      const rawYPemasukan = paddingTop + chartHeight - (d.pemasukan / maxVal) * chartHeight;
      const rawYKeluaran = paddingTop + chartHeight - (d.keluaran / maxVal) * chartHeight;
      const rawYProfit = paddingTop + chartHeight - (profit / maxVal) * chartHeight;

      // Defensive clamping to prevent coordinate overflow
      const yPemasukan = Math.min(maxYBound, Math.max(minYBound, rawYPemasukan));
      const yKeluaran = Math.min(maxYBound, Math.max(minYBound, rawYKeluaran));
      const yProfit = Math.min(maxYBound, Math.max(minYBound, rawYProfit));

      list.push({
        tanggal: d.tanggal,
        pemasukan: d.pemasukan,
        keluaran: d.keluaran,
        profit,
        x,
        yPemasukan,
        yKeluaran,
        yProfit,
      });
    });

    // Generate path lines
    const linePemasukan = list.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yPemasukan}`).join(' ');
    const lineKeluaran = list.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yKeluaran}`).join(' ');
    const lineProfit = list.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yProfit}`).join(' ');

    // Generate area fills
    const firstX = list[0]?.x || paddingLeft;
    const lastX = list[list.length - 1]?.x || width - paddingRight;
    const baseY = paddingTop + chartHeight;

    const areaPemasukan = list.length > 0 
      ? `${linePemasukan} L ${lastX} ${baseY} L ${firstX} ${baseY} Z` 
      : '';
    const areaKeluaran = list.length > 0 
      ? `${lineKeluaran} L ${lastX} ${baseY} L ${firstX} ${baseY} Z` 
      : '';
    const areaProfit = list.length > 0 
      ? `${lineProfit} L ${lastX} ${baseY} L ${firstX} ${baseY} Z` 
      : '';

    return { pemasukan: linePemasukan, keluaran: lineKeluaran, profit: lineProfit, areaPemasukan, areaKeluaran, areaProfit, list };
  }, [chartData, chartWidth, chartHeight, maxVal, paddingTop, paddingLeft, paddingRight, width]);

  // Format date shorthand (MM-DD)
  const formatShorthand = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parts[1]}/${parts[2]}`; // MM/DD
  };

  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Grafik Ikhtisar Performa Bisnis</h3>
          <p className="text-xs text-text-muted">Tren performa harian hingga 10 hari terakhir.</p>
        </div>
        {/* Legends */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
            <span className="text-text-secondary">Pemasukan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-red inline-block" />
            <span className="text-text-secondary">Keluaran</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
            <span className="text-text-secondary">Net Profit</span>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center border border-dashed border-border-default rounded-xl">
          <EmptyState
            title="Tidak ada data grafik"
            description="Lakukan penjualan atau catat pengeluaran terlebih dahulu."
          />
        </div>
      ) : (
        <div className="w-full overflow-x-auto select-none">
          <div className="min-w-[600px] w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
              <defs>
                {/* Gradients */}
                <linearGradient id="grad-pemasukan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ffa3" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00ffa3" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="grad-keluaran" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4a4a" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ff4a4a" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y Axes Ticks */}
              {yTicks.map((tick, i) => {
                const y = paddingTop + chartHeight - (tick / maxVal) * chartHeight;
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={width - paddingRight}
                      y2={y}
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      fill="var(--text-muted, #8b949e)"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {tick === 0 ? 'Rp 0' : formatRupiah(tick).replace('Rp', 'Rp ')}
                    </text>
                  </g>
                );
              })}

              {/* Area Paths (Behind lines) */}
              <path d={points.areaPemasukan} fill="url(#grad-pemasukan)" />
              <path d={points.areaKeluaran} fill="url(#grad-keluaran)" />
              <path d={points.areaProfit} fill="url(#grad-profit)" />

              {/* Line Paths */}
              <path
                d={points.pemasukan}
                fill="none"
                stroke="#00ffa3"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={points.keluaran}
                fill="none"
                stroke="#ff4a4a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={points.profit}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Scatter Points (Hoverable-like visual markers) */}
              {points.list.map((p, i) => (
                <g key={i} className="cursor-pointer group">
                  {/* Hover visual vertical guide line */}
                  <line
                    x1={p.x}
                    y1={paddingTop}
                    x2={p.x}
                    y2={paddingTop + chartHeight}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  {/* Pemasukan Dot */}
                  <circle cx={p.x} cy={p.yPemasukan} r="4" fill="#00ffa3" stroke="var(--bg-card)" strokeWidth="1.5" />
                  {/* Keluaran Dot */}
                  <circle cx={p.x} cy={p.yKeluaran} r="4" fill="#ff4a4a" stroke="var(--bg-card)" strokeWidth="1.5" />
                  {/* Profit Dot */}
                  <circle cx={p.x} cy={p.yProfit} r="4" fill="#60a5fa" stroke="var(--bg-card)" strokeWidth="1.5" />
                  
                  {/* Axis Label X */}
                  <text
                    x={p.x}
                    y={paddingTop + chartHeight + 18}
                    fill="var(--text-muted, #8b949e)"
                    fontSize="9.5"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {formatShorthand(p.tanggal)}
                  </text>
                </g>
              ))}

              {/* Left X Axis baseline */}
              <line
                x1={paddingLeft}
                y1={paddingTop + chartHeight}
                x2={width - paddingRight}
                y2={paddingTop + chartHeight}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>
      )}
    </Card>
  );
}
