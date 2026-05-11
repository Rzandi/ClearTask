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
 */
export function addTransaction(transaction) {
  const transactions = getTransactions();
  const seq = getNextSeq();
  const newTx = {
    ...transaction,
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
 * Clear all transactions (dev utility)
 */
export function clearAllTransactions() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SEQ_KEY);
}
