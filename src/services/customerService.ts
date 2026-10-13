/* ═══════════════════════════════════════════════════════════
   customerService.ts — ClearTask W4-02
   Service layer for customer credit management (hutang-piutang).
   Handles customers, credit ledger, and payment operations.
   ═══════════════════════════════════════════════════════════ */

import db from './db';
import { auditService } from './auditService';
import { allocatePaymentFIFO, isLedgerOverdue } from '../utils/creditHelper';
import type { Customer, CreditLedger, CreditPayment } from '../types';

// ── Helpers ────────────────────────────────────────────────

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toLocalDateString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - offset);
  return localDate.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ── Customer CRUD ──────────────────────────────────────────

export async function createCustomer(data: {
  nama: string;
  telepon?: string | undefined;
  alamat?: string | undefined;
  catatan?: string | undefined;
  createdBy?: string | undefined;
}): Promise<Customer> {
  const now = new Date().toISOString();

  const customer: Customer = {
    id: generateUUID(),
    nama: data.nama.trim(),
    telepon: data.telepon?.trim() || undefined,
    alamat: data.alamat?.trim() || undefined,
    catatan: data.catatan?.trim() || undefined,
    totalHutang: 0, // Initialize with zero debt
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'local',
  };

  await db.customers.add(customer);

  await auditService.logCustomerCreated({
    customerId: customer.id,
    nama: customer.nama,
    telepon: customer.telepon,
    kasir: data.createdBy || 'Kasir',
  });

  return customer;
}

export async function updateCustomer(
  customerId: string,
  updates: {
    nama?: string | undefined;
    telepon?: string | undefined;
    alamat?: string | undefined;
    catatan?: string | undefined;
    updatedBy?: string | undefined;
  }
): Promise<void> {
  const now = new Date().toISOString();

  const updateData: Partial<Customer> = {
    updatedAt: now,
  };

  if (updates.nama !== undefined) {
    updateData.nama = updates.nama.trim();
  }
  if (updates.telepon !== undefined) {
    updateData.telepon = updates.telepon.trim() || undefined;
  }
  if (updates.alamat !== undefined) {
    updateData.alamat = updates.alamat.trim() || undefined;
  }
  if (updates.catatan !== undefined) {
    updateData.catatan = updates.catatan.trim() || undefined;
  }

  await db.customers.update(customerId, updateData);

  await auditService.logCustomerUpdated({
    customerId,
    changes: updates,
    kasir: updates.updatedBy || 'Kasir',
  });
}

export async function deleteCustomer(customerId: string, deletedBy?: string): Promise<void> {
  // Soft delete only
  const customer = await db.customers.get(customerId);
  const now = new Date().toISOString();
  await db.customers.update(customerId, {
    deletedAt: now,
    updatedAt: now,
  });

  await auditService.logCustomerDeactivated({
    customerId,
    customerName: customer?.nama || 'Unknown',
    kasir: deletedBy || 'Kasir',
  });
}

export async function getCustomerById(customerId: string): Promise<Customer | undefined> {
  const customer = await db.customers.get(customerId);
  // Filter out soft-deleted
  if (customer && !customer.deletedAt) {
    return customer;
  }
  return undefined;
}

export async function getAllCustomers(): Promise<Customer[]> {
  // Return only non-deleted customers
  return await db.customers.filter((c) => !c.deletedAt).sortBy('nama');
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const normalizedQuery = query.toLowerCase().trim();

  return await db.customers
    .filter((c) => {
      if (c.deletedAt) return false;

      const matchesNama = c.nama.toLowerCase().includes(normalizedQuery);
      const matchesTelepon = c.telepon?.toLowerCase().includes(normalizedQuery);

      return matchesNama || matchesTelepon;
    })
    .sortBy('nama');
}

// ── Credit Ledger Operations ───────────────────────────────

export async function createCreditLedger(data: {
  customerId: string;
  transactionId: string;
  jumlahKredit: number;
  tanggalTransaksi?: string;
  tanggalJatuhTempo?: string;
  catatan?: string;
}): Promise<CreditLedger> {
  const now = new Date().toISOString();
  const today = toLocalDateString();

  const ledger: CreditLedger = {
    id: generateUUID(),
    customerId: data.customerId,
    transactionId: data.transactionId,
    jumlahKredit: data.jumlahKredit,
    sisaHutang: data.jumlahKredit, // Initially unpaid
    tanggalTransaksi: data.tanggalTransaksi || today,
    tanggalJatuhTempo: data.tanggalJatuhTempo,
    status: 'belum_lunas',
    catatan: data.catatan?.trim(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'local',
  };

  await db.transaction('rw', [db.credit_ledger, db.customers], async () => {
    await db.credit_ledger.add(ledger);
    const ledgers = await db.credit_ledger
      .where('customerId')
      .equals(data.customerId)
      .filter((l: CreditLedger) => !l.deletedAt && l.id !== ledger.id)
      .toArray();
    const otherDebt = ledgers.reduce((sum: number, l: CreditLedger) => sum + l.sisaHutang, 0);
    await db.customers.update(data.customerId, {
      totalHutang: otherDebt + ledger.sisaHutang,
      updatedAt: now,
    });
  });

  return ledger;
}

export async function getCreditLedgerById(ledgerId: string): Promise<CreditLedger | undefined> {
  const ledger = await db.credit_ledger.get(ledgerId);
  if (ledger && !ledger.deletedAt) {
    return ledger;
  }
  return undefined;
}

export async function getCustomerCreditLedgers(customerId: string): Promise<CreditLedger[]> {
  return await db.credit_ledger
    .where('customerId')
    .equals(customerId)
    .filter((ledger) => !ledger.deletedAt)
    .sortBy('tanggalTransaksi');
}

export async function getAllUnpaidLedgers(): Promise<CreditLedger[]> {
  return await db.credit_ledger
    .filter((ledger) => !ledger.deletedAt && ledger.status === 'belum_lunas')
    .sortBy('tanggalTransaksi');
}

// ── Payment Operations ─────────────────────────────────────

export async function createPayment(data: {
  ledgerId: string;
  jumlahBayar: number;
  metodePembayaran: string;
  catatan?: string | undefined;
  createdBy: string;
}): Promise<CreditPayment> {
  const now = new Date().toISOString();
  const today = toLocalDateString();

  // Validate payment amount
  if (data.jumlahBayar <= 0) {
    throw new Error('Jumlah bayar harus > 0');
  }

  let paymentResult: CreditPayment;
  let customerName = 'Unknown';
  let ledgerCustomerId = '';

  await db.transaction('rw', [db.credit_payments, db.credit_ledger, db.customers], async () => {
    // Get ledger
    const ledger = await db.credit_ledger.get(data.ledgerId);
    if (!ledger || ledger.deletedAt) {
      throw new Error(`Ledger not found: ${data.ledgerId}`);
    }

    if (data.jumlahBayar > ledger.sisaHutang) {
      throw new Error(
        `Jumlah bayar (${data.jumlahBayar}) melebihi sisa hutang (${ledger.sisaHutang})`
      );
    }

    ledgerCustomerId = ledger.customerId;
    const customer = await db.customers.get(ledger.customerId);
    if (customer) {
      customerName = customer.nama;
    }

    // Create payment record
    const payment: CreditPayment = {
      id: generateUUID(),
      ledgerId: data.ledgerId,
      customerId: ledger.customerId,
      jumlahBayar: data.jumlahBayar,
      tanggalBayar: today,
      metodePembayaran: data.metodePembayaran,
      catatan: data.catatan?.trim(),
      createdAt: now,
      createdBy: data.createdBy,
      syncStatus: 'local',
    };

    await db.credit_payments.add(payment);

    // Update ledger sisaHutang
    const newSisaHutang = ledger.sisaHutang - data.jumlahBayar;
    const newStatus = newSisaHutang === 0 ? 'lunas' : 'belum_lunas';

    await db.credit_ledger.update(data.ledgerId, {
      sisaHutang: newSisaHutang,
      status: newStatus,
      updatedAt: now,
    });

    // Update customer totalHutang
    const ledgers = await db.credit_ledger
      .where('customerId')
      .equals(ledger.customerId)
      .filter((l: CreditLedger) => !l.deletedAt && l.id !== data.ledgerId)
      .toArray();

    const otherDebt = ledgers.reduce((sum: number, l: CreditLedger) => sum + l.sisaHutang, 0);
    await db.customers.update(ledger.customerId, {
      totalHutang: otherDebt + newSisaHutang,
      updatedAt: now,
    });

    paymentResult = payment;
  });

  // Log audit outside transaction
  await auditService.logCreditPaymentRecorded({
    paymentId: paymentResult!.id,
    ledgerId: data.ledgerId,
    customerId: ledgerCustomerId,
    customerName,
    jumlahBayar: data.jumlahBayar,
    metodePembayaran: data.metodePembayaran,
    kasir: data.createdBy,
  });

  return paymentResult!;
}

export async function getLedgerPayments(ledgerId: string): Promise<CreditPayment[]> {
  return await db.credit_payments.where('ledgerId').equals(ledgerId).sortBy('tanggalBayar');
}

export async function getCustomerPayments(customerId: string): Promise<CreditPayment[]> {
  return await db.credit_payments.where('customerId').equals(customerId).sortBy('tanggalBayar');
}

// ── Aggregations & Reports ─────────────────────────────────

export async function recalculateCustomerDebt(customerId: string): Promise<void> {
  // Sum all unpaid ledgers for this customer
  const ledgers = await db.credit_ledger
    .where('customerId')
    .equals(customerId)
    .filter((ledger) => !ledger.deletedAt)
    .toArray();

  const totalHutang = ledgers.reduce((sum, ledger) => sum + ledger.sisaHutang, 0);

  await db.customers.update(customerId, {
    totalHutang,
    updatedAt: new Date().toISOString(),
  });
}

export interface CustomerWithDebt extends Customer {
  unpaidCount: number; // Number of unpaid ledgers
  oldestDebtDate?: string; // Oldest unpaid transaction date
}

export async function getCustomersWithDebt(): Promise<CustomerWithDebt[]> {
  const customers = await getAllCustomers();

  const customersWithDebt: CustomerWithDebt[] = [];

  for (const customer of customers) {
    if (customer.totalHutang > 0) {
      const unpaidLedgers = await db.credit_ledger
        .where('customerId')
        .equals(customer.id)
        .filter((ledger) => !ledger.deletedAt && ledger.status === 'belum_lunas')
        .sortBy('tanggalTransaksi');

      customersWithDebt.push({
        ...customer,
        unpaidCount: unpaidLedgers.length,
        oldestDebtDate: unpaidLedgers[0]?.tanggalTransaksi,
      });
    }
  }

  // Sort by totalHutang descending
  return customersWithDebt.sort((a, b) => b.totalHutang - a.totalHutang);
}

export interface DebtSummary {
  totalCustomers: number;
  customersWithDebt: number;
  totalOutstanding: number; // Total sisa hutang across all customers
  totalLedgers: number;
  unpaidLedgers: number;
}

export async function getDebtSummary(): Promise<DebtSummary> {
  const allCustomers = await getAllCustomers();
  const customersWithDebt = allCustomers.filter((c) => c.totalHutang > 0);

  const allLedgers = await db.credit_ledger.filter((ledger) => !ledger.deletedAt).toArray();

  const unpaidLedgers = allLedgers.filter((ledger) => ledger.status === 'belum_lunas');

  const totalOutstanding = unpaidLedgers.reduce((sum, ledger) => sum + ledger.sisaHutang, 0);

  return {
    totalCustomers: allCustomers.length,
    customersWithDebt: customersWithDebt.length,
    totalOutstanding,
    totalLedgers: allLedgers.length,
    unpaidLedgers: unpaidLedgers.length,
  };
}

// ── Multi-Transaction / FIFO Payment (Phase 4) ────────────

export async function payCustomerDebtFIFO(data: {
  customerId: string;
  jumlahBayar: number;
  metodePembayaran: string;
  catatan?: string | undefined;
  createdBy: string;
}): Promise<{
  payments: CreditPayment[];
  totalAllocated: number;
  remainingPayment: number;
}> {
  if (data.jumlahBayar <= 0) {
    throw new Error('Jumlah bayar harus > 0');
  }

  const today = toLocalDateString();
  const now = new Date().toISOString();

  const createdPayments: CreditPayment[] = [];
  let customerName = 'Unknown';
  let totalAllocated = 0;
  let remainingPayment = 0;

  await db.transaction('rw', [db.credit_payments, db.credit_ledger, db.customers], async () => {
    const customer = await db.customers.get(data.customerId);
    if (!customer || customer.deletedAt) {
      throw new Error(`Pelanggan tidak ditemukan: ${data.customerId}`);
    }
    customerName = customer.nama;

    const unpaidLedgers = await db.credit_ledger
      .where('customerId')
      .equals(data.customerId)
      .filter((l: CreditLedger) => !l.deletedAt && l.status === 'belum_lunas' && l.sisaHutang > 0)
      .toArray();

    if (unpaidLedgers.length === 0) {
      throw new Error('Pelanggan tidak memiliki hutang yang belum lunas');
    }

    const result = allocatePaymentFIFO(unpaidLedgers, data.jumlahBayar);
    totalAllocated = result.totalAllocated;
    remainingPayment = result.remainingPayment;

    for (const alloc of result.allocations) {
      const payment: CreditPayment = {
        id: generateUUID(),
        ledgerId: alloc.ledgerId,
        customerId: data.customerId,
        jumlahBayar: alloc.allocatedAmount,
        tanggalBayar: today,
        metodePembayaran: data.metodePembayaran,
        catatan: data.catatan?.trim() || undefined,
        createdAt: now,
        createdBy: data.createdBy,
        syncStatus: 'local',
      };

      await db.credit_payments.add(payment);

      await db.credit_ledger.update(alloc.ledgerId, {
        sisaHutang: alloc.newSisaHutang,
        status: alloc.newStatus,
        updatedAt: now,
      });

      createdPayments.push(payment);
    }

    // Update customer totalHutang
    const allRemainingLedgers = await db.credit_ledger
      .where('customerId')
      .equals(data.customerId)
      .filter((l: CreditLedger) => !l.deletedAt)
      .toArray();

    const newTotalDebt = allRemainingLedgers.reduce(
      (sum: number, l: CreditLedger) => sum + l.sisaHutang,
      0
    );

    await db.customers.update(data.customerId, {
      totalHutang: newTotalDebt,
      updatedAt: now,
    });
  });

  // Log audit outside transaction
  for (const p of createdPayments) {
    await auditService.logCreditPaymentRecorded({
      paymentId: p.id,
      ledgerId: p.ledgerId,
      customerId: data.customerId,
      customerName,
      jumlahBayar: p.jumlahBayar,
      metodePembayaran: p.metodePembayaran,
      kasir: data.createdBy,
    });
  }

  return {
    payments: createdPayments,
    totalAllocated,
    remainingPayment,
  };
}

export async function getOverdueLedgers(
  customerId?: string,
  referenceDate?: string
): Promise<CreditLedger[]> {
  const query = customerId
    ? db.credit_ledger.where('customerId').equals(customerId)
    : db.credit_ledger.toCollection();

  const ledgers = await query
    .filter((l: CreditLedger) => !l.deletedAt && isLedgerOverdue(l, referenceDate))
    .sortBy('tanggalJatuhTempo');

  return ledgers;
}

export interface OverdueSummary {
  overdueCount: number;
  totalOverdueAmount: number;
  affectedCustomersCount: number;
}

export async function getOverdueSummary(referenceDate?: string): Promise<OverdueSummary> {
  const overdueLedgers = await getOverdueLedgers(undefined, referenceDate);
  const customerIds = new Set(overdueLedgers.map((l) => l.customerId));
  const totalOverdueAmount = overdueLedgers.reduce((sum, l) => sum + l.sisaHutang, 0);

  return {
    overdueCount: overdueLedgers.length,
    totalOverdueAmount,
    affectedCustomersCount: customerIds.size,
  };
}
