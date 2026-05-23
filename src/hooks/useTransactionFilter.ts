/* ═══════════════════════════════════════════════════════════
   useTransactionFilter Hook — ClearTask
   Owns UI filter state (search, date, sort).
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';

export interface TransactionFilterState {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  filterDate: string;
  setFilterDate: React.Dispatch<React.SetStateAction<string>>;
  sortOrder: string;
  setSortOrder: React.Dispatch<React.SetStateAction<string>>;
}

export function useTransactionFilter(): TransactionFilterState {
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
