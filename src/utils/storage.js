/* ═══════════════════════════════════════════════════════════
   LocalStorage Helpers — ClearTask
   MVP: All data persisted in localStorage
   ═══════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'cleartask_transactions';
const SEQ_KEY = 'cleartask_seq';

/**
 * Get all transactions from localStorage
 * @returns {Array}
 */
export function getTransactions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('[Storage] Failed to parse transactions');
    return [];
  }
}

/**
 * Save transactions array to localStorage
 * @param {Array} transactions
 */
export function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('[Storage] Failed to save:', err);
  }
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
export function clearAllTransactions() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SEQ_KEY);
}
