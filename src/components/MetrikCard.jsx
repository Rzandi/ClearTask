/* ═══════════════════════════════════════════════════════════
   MetrikCard — ClearTask
   Shows "Total Pemasukan Hari Ini" with trend indicator.
   Refactored to use <Card /> and <Typography /> components.
   ═══════════════════════════════════════════════════════════ */

import { memo } from 'react';
import { formatRupiah, formatTrend } from '../utils/formatters';
import Card from './ui/Card';
import Typography from './ui/Typography';

const MetrikCard = memo(function MetrikCard({ todayTotal, trendPercent, isFirstDay }) {
  const trend = formatTrend(isFirstDay ? NaN : trendPercent);

  return (
    <Card className="p-6 animate-slide-up">
      <Typography variant="label" className="mb-3">
        Total Pemasukan Hari Ini
      </Typography>
      <Typography variant="h1" className="text-primary mb-2">
        {formatRupiah(todayTotal)}
      </Typography>
      <Typography variant="caption" className={trend.isPositive ? 'text-primary' : 'text-error'}>
        {trend.text}
      </Typography>
    </Card>
  );
});

export default MetrikCard;
