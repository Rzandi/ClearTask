/* ═══════════════════════════════════════════════════════════
   MetrikCard — ClearTask
   Shows "Total Pemasukan Hari Ini" with trend indicator
   ═══════════════════════════════════════════════════════════ */

import { formatRupiah, formatTrend } from '../utils/formatters';

export default function MetrikCard({ todayTotal, trendPercent, isFirstDay }) {
  const trend = formatTrend(isFirstDay ? NaN : trendPercent);

  return (
    <div className="glass-card p-6 animate-slide-up">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        Total Pemasukan Hari Ini
      </p>
      <p className="text-3xl lg:text-4xl font-extrabold text-primary tracking-tight mb-2">
        {formatRupiah(todayTotal)}
      </p>
      <p className={`text-sm font-medium ${trend.isPositive ? 'text-primary' : 'text-error'}`}>
        {trend.text}
      </p>
    </div>
  );
}
