/* ═══════════════════════════════════════════════════════════
   useTransactionFilter Hook — ClearTask
   Owns UI filter state (search, date, sort).
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';

export function useTransactionFilter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  return {
    searchQuery,
    setSearchQuery,
    filterDate,
    setFilterDate,
    sortOrder,
    setSortOrder,
  };
}
