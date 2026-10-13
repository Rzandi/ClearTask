/* ═══════════════════════════════════════════════════════════
   useDailyOverdueCheck.ts — ClearTask W4-02 Phase 4
   Daily automatic overdue check and alert notifications.
   ═══════════════════════════════════════════════════════════ */

import { useEffect } from 'react';
import { useToast } from './useToast';
import { getOverdueSummary } from '../services/customerService';
import { formatRupiah } from '../utils/formatters';

const STORAGE_KEY = 'cleartask_last_overdue_check';

/**
 * Runs a daily check for overdue credit ledgers once per day.
 * Displays a toast notification if there are overdue receivables.
 */
export function useDailyOverdueCheck() {
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function checkOverdue() {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const lastCheck = localStorage.getItem(STORAGE_KEY);

        if (lastCheck === todayStr) {
          return; // Already checked today
        }

        const summary = await getOverdueSummary(todayStr);

        if (!isMounted) return;

        if (summary.overdueCount > 0) {
          showToast(
            `🔔 Ada ${summary.overdueCount} tagihan jatuh tempo (Total: ${formatRupiah(
              summary.totalOverdueAmount
            )}) dari ${summary.affectedCustomersCount} pelanggan`,
            'warning',
            8000
          );
        }

        localStorage.setItem(STORAGE_KEY, todayStr);
      } catch (err) {
        console.error('Failed to run daily overdue check:', err);
      }
    }

    checkOverdue();

    return () => {
      isMounted = false;
    };
  }, [showToast]);
}
