/* ═══════════════════════════════════════════════════════════
   creditHelper.ts — ClearTask W4-02 Phase 4
   Utilities for credit calculations, overdue tracking, and FIFO allocation.
   ═══════════════════════════════════════════════════════════ */

import type { CreditLedger, Customer } from '../types';

export type CreditStatus = 'safe' | 'warning' | 'exceeded';

/**
 * Check if a credit ledger entry is overdue.
 */
export function isLedgerOverdue(ledger: CreditLedger, referenceDate?: string): boolean {
  if (ledger.status !== 'belum_lunas' || !ledger.tanggalJatuhTempo || ledger.sisaHutang <= 0) {
    return false;
  }
  const today = referenceDate || new Date().toISOString().slice(0, 10);
  return ledger.tanggalJatuhTempo < today;
}

/**
 * Calculate how many days a ledger is overdue. Returns 0 if not overdue.
 */
export function getDaysOverdue(ledger: CreditLedger, referenceDate?: string): number {
  if (!isLedgerOverdue(ledger, referenceDate) || !ledger.tanggalJatuhTempo) {
    return 0;
  }
  const todayStr = referenceDate || new Date().toISOString().slice(0, 10);
  const due = new Date(ledger.tanggalJatuhTempo).getTime();
  const today = new Date(todayStr).getTime();
  const diffTime = today - due;
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate credit usage status based on debt and optional limit.
 */
export function getCreditStatus(totalHutang: number, creditLimit: number = 0): CreditStatus {
  if (creditLimit <= 0) {
    return totalHutang > 0 ? 'warning' : 'safe';
  }
  if (totalHutang > creditLimit) {
    return 'exceeded';
  }
  if (totalHutang >= creditLimit * 0.8) {
    return 'warning';
  }
  return 'safe';
}

/**
 * Visual badge config for credit status.
 */
export function getCreditStatusBadge(status: CreditStatus): {
  icon: string;
  text: string;
  badgeClass: string;
} {
  switch (status) {
    case 'exceeded':
      return {
        icon: '🔴',
        text: 'Limit Terlampaui',
        badgeClass: 'bg-red-100 text-red-700 border-red-200',
      };
    case 'warning':
      return {
        icon: '⚠️',
        text: 'Kredit Menipis',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    case 'safe':
    default:
      return {
        icon: '✅',
        text: 'Aman',
        badgeClass: 'bg-green-100 text-green-700 border-green-200',
      };
  }
}

/**
 * Build WhatsApp reminder link for a customer with overdue or unpaid debt.
 */
export function generateWhatsAppReminderUrl(
  customer: Customer,
  ledgers: CreditLedger[],
  storeName: string = 'Toko'
): string | null {
  if (!customer.telepon) return null;
  // Clean phone number (replace leading 08 with 628, remove non-digits)
  let cleanPhone = customer.telepon.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('62')) {
    cleanPhone = '62' + cleanPhone;
  }

  const unpaid = ledgers.filter((l) => l.status === 'belum_lunas' && l.sisaHutang > 0);
  const overdueCount = unpaid.filter((l) => isLedgerOverdue(l)).length;

  const total = customer.totalHutang;
  const formattedTotal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(total);

  let message = `Halo Kak ${customer.nama}, kami dari ${storeName}.\n\nKami menginformasikan bahwa saat ini terdapat catatan piutang belanja sebesar ${formattedTotal}.`;

  if (overdueCount > 0) {
    message += `\n⚠️ Terdapat ${overdueCount} transaksi yang telah jatuh tempo.`;
  }

  message += `\n\nMohon bantuannya untuk melakukan konfirmasi atau pelunasan. Terima kasih banyak atas kerjasamanya! 🙏`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Allocation item for multi-ledger payment.
 */
export interface PaymentAllocation {
  ledgerId: string;
  transactionId: string;
  allocatedAmount: number;
  previousSisaHutang: number;
  newSisaHutang: number;
  newStatus: 'belum_lunas' | 'lunas';
}

/**
 * Allocate a payment amount across multiple unpaid ledgers using FIFO (oldest first).
 */
export function allocatePaymentFIFO(
  unpaidLedgers: CreditLedger[],
  totalPayment: number
): {
  allocations: PaymentAllocation[];
  remainingPayment: number;
  totalAllocated: number;
} {
  if (totalPayment <= 0 || unpaidLedgers.length === 0) {
    return { allocations: [], remainingPayment: totalPayment, totalAllocated: 0 };
  }

  // Sort ledgers oldest first (by tanggalTransaksi ASC, then createdAt ASC)
  const sorted = [...unpaidLedgers].sort((a, b) => {
    const dateComp = a.tanggalTransaksi.localeCompare(b.tanggalTransaksi);
    if (dateComp !== 0) return dateComp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const allocations: PaymentAllocation[] = [];
  let remaining = totalPayment;
  let totalAllocated = 0;

  for (const ledger of sorted) {
    if (remaining <= 0) break;
    if (ledger.sisaHutang <= 0) continue;

    const payForLedger = Math.min(remaining, ledger.sisaHutang);
    const newSisa = ledger.sisaHutang - payForLedger;
    const newStatus: 'belum_lunas' | 'lunas' = newSisa === 0 ? 'lunas' : 'belum_lunas';

    allocations.push({
      ledgerId: ledger.id,
      transactionId: ledger.transactionId,
      allocatedAmount: payForLedger,
      previousSisaHutang: ledger.sisaHutang,
      newSisaHutang: newSisa,
      newStatus,
    });

    remaining -= payForLedger;
    totalAllocated += payForLedger;
  }

  return {
    allocations,
    remainingPayment: remaining,
    totalAllocated,
  };
}
