/* ═══════════════════════════════════════════════════════════
   useTransactionFilter Hook — ClearTask
   Owns UI filter state (search, date, sort).
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';

// Bug #7: filterDate dapat berupa string kosong, string YYYY-MM-DD, atau
// object date range { start, end, label } dari W3-06 custom date range picker.
export type FilterDateValue = string | { start: string; end: string; label?: string };

export interface TransactionFilterState {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  filterDate: FilterDateValue;
  setFilterDate: React.Dispatch<React.SetStateAction<FilterDateValue>>;
  sortOrder: string;
  setSortOrder: React.Dispatch<React.SetStateAction<string>>;
}

export function useTransactionFilter(): TransactionFilterState {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<FilterDateValue>('');
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
