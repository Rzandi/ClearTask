/* ═══════════════════════════════════════════════════════════
   LocalStorage Helpers — ClearTask
   MVP: All data persisted in localStorage
   ═══════════════════════════════════════════════════════════ */

import { STORAGE_KEYS } from '../constants/storageKeys';
import * as storageService from '../services/storageService';

const SEQ_KEY = 'cleartask_seq';

/**
 * Get all transactions from localStorage
 * @returns {Array}
 */
export function getTransactions() {
  const data = storageService.getItem(STORAGE_KEYS.TRANSACTIONS);
  return Array.isArray(data) ? data : [];
}

/**
 * Save transactions array to localStorage
 * @param {Array} transactions
 */
export function saveTransactions(transactions) {
  storageService.setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
}

/**
 * Add a new transaction
 * @param {Object} transaction
 * @returns {Object} the saved transaction with generated ID
 *
 * Note: The spread `...transaction` ensures all fields from the input object
 * are passed through, including `sessionId` (string | null). No explicit
 * handling of `sessionId` is needed here — it is preserved automatically.
 */
export function addTransaction(transaction) {
  if (!transaction || typeof transaction !== 'object') {
    throw new Error('Data transaksi tidak valid');
  }
  if (!transaction.namaBarang || typeof transaction.namaBarang !== 'string') {
    throw new Error('Nama barang harus diisi');
  }
  if (typeof transaction.qty !== 'number' || transaction.qty <= 0) {
    throw new Error('Kuantitas harus berupa angka lebih dari 0');
  }
  if (typeof transaction.hargaSatuan !== 'number' || transaction.hargaSatuan <= 0) {
    throw new Error('Harga satuan harus berupa angka lebih dari 0');
  }

  const transactions = getTransactions();
  const seq = getNextSeq();
  const newTx = {
    ...transaction, // includes sessionId: string | null if present
    id: seq,
    transactionId: `TRX-${String(seq).padStart(5, '0')}`,
    createdAt: new Date().toISOString(),
    status: 'Selesai',
  };
  transactions.unshift(newTx);
  saveTransactions(transactions);
  return newTx;
}

/**
 * Get and increment the transaction sequence counter
 * @returns {number}
 */
function getNextSeq() {
  try {
    const current = parseInt(localStorage.getItem(SEQ_KEY) || '0', 10);
    const next = current + 1;
    localStorage.setItem(SEQ_KEY, String(next));
    return next;
  } catch {
    return Date.now();
  }
}

/**
 * Update a transaction by id.
 * Immutable fields (id, transactionId, createdAt, status) are preserved.
 * @param {number} id
 * @param {Object} data - fields to update
 * @returns {Object|null} updated transaction, or null if not found
 */
export function updateTransaction(id, data) {
  const transactions = getTransactions();
  const idx = transactions.findIndex((tx) => tx.id === id);
  if (idx === -1) return null;

  const original = transactions[idx];
  transactions[idx] = {
    ...original,
    ...data,
    // Preserve immutable fields
    id: original.id,
    transactionId: original.transactionId,
    createdAt: original.createdAt,
    status: original.status,
  };

  saveTransactions(transactions);
  return transactions[idx];
}

/**
 * Delete a transaction by id.
 * No-op if id is not found.
 * @param {number} id
 */
export function deleteTransaction(id) {
  const transactions = getTransactions();
  const filtered = transactions.filter((tx) => tx.id !== id);
  saveTransactions(filtered);
}

/**
 * Clear all transactions (dev utility)
 */
export function clearAllTransactions(confirmedByUser = false) {
  if (!confirmedByUser) return;
  storageService.removeItem(STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem(SEQ_KEY);
}
