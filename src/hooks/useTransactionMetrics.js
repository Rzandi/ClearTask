/* ═══════════════════════════════════════════════════════════
   useTransactionMetrics Hook — ClearTask
   Derives daily analytics (today's total + trend).
   ═══════════════════════════════════════════════════════════ */

import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import { toLocalDateString } from '../utils/formatters';

export function useTransactionMetrics() {
  const metrics = useLiveQuery(async () => {
    const todayStr = toLocalDateString(new Date());

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateString(yesterday);

    // Get only transactions for today and yesterday
    const relevantTxs = await db.transactions
      .where('tanggal')
      .anyOf(todayStr, yesterdayStr)
      .toArray();

    const todayTotal = relevantTxs
      .filter((tx) => tx.tanggal === todayStr)
      .reduce((sum, tx) => sum + (tx.total || 0), 0);

    const yesterdayTotal = relevantTxs
      .filter((tx) => tx.tanggal === yesterdayStr)
      .reduce((sum, tx) => sum + (tx.total || 0), 0);

    // Check if there's any data before today
    const historicalCount = await db.transactions.where('tanggal').below(todayStr).count();

    const hasHistoricalData = historicalCount > 0;
    const isFirstDay = !hasHistoricalData || todayTotal === 0;

    const trendPercent =
      yesterdayTotal === 0 || todayTotal === 0
        ? 0
        : ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;

    return { todayTotal, trendPercent, isFirstDay };
  }, []);

  return metrics || { todayTotal: 0, trendPercent: 0, isFirstDay: true };
}
