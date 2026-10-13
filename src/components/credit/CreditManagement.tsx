/* ═══════════════════════════════════════════════════════════
   CreditManagement.tsx — ClearTask W4-02
   Main container for customer credit management (hutang-piutang).
   Orchestrates CustomerList, CustomerDetail, Forms, and Payments.
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback } from 'react';
import CustomerListPage from './CustomerListPage';
import CustomerDetailPage from './CustomerDetailPage';
import CustomerFormModal from './CustomerFormModal';
import PaymentModal from './PaymentModal';
import CreditAgingReport from './CreditAgingReport';
import type { Customer, CreditLedger } from '../../types';

interface Props {
  kasirName: string; // From session context
}

type View = 'list' | 'detail' | 'report';

export default function CreditManagement({ kasirName }: Props) {
  const [view, setView] = useState<View>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal states
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLedger, setPaymentLedger] = useState<CreditLedger | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [unpaidLedgersForPayment, setUnpaidLedgersForPayment] = useState<CreditLedger[]>([]);

  // Refresh triggers
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // ── Customer Selection ──────────────────────────────────────

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setView('detail');
  }, []);

  const handleBackToList = useCallback(() => {
    setView('list');
    setSelectedCustomer(null);
    triggerRefresh(); // Refresh list when returning (in case debt changed)
  }, [triggerRefresh]);

  // ── Customer Form ──────────────────────────────────────────

  const handleCreateCustomer = useCallback(() => {
    setEditingCustomer(null);
    setShowCustomerForm(true);
  }, []);

  const handleEditCustomer = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  }, []);

  const handleCustomerFormClose = useCallback(() => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
  }, []);

  const handleCustomerFormSuccess = useCallback(
    (customer: Customer) => {
      // Refresh current view
      if (view === 'detail' && selectedCustomer?.id === customer.id) {
        // If we're viewing the edited customer, update it
        setSelectedCustomer(customer);
      }
      triggerRefresh();
    },
    [view, selectedCustomer, triggerRefresh]
  );

  // ── Payment Recording ──────────────────────────────────────

  const handleRecordPayment = useCallback((ledger: CreditLedger) => {
    setPaymentLedger(ledger);
    setPaymentCustomer(null);
    setUnpaidLedgersForPayment([]);
    setShowPaymentModal(true);
  }, []);

  const handleRecordCustomerPayment = useCallback(
    (customer: Customer, unpaidLedgers: CreditLedger[]) => {
      setPaymentCustomer(customer);
      setUnpaidLedgersForPayment(unpaidLedgers);
      setPaymentLedger(null);
      setShowPaymentModal(true);
    },
    []
  );

  const handlePaymentModalClose = useCallback(() => {
    setShowPaymentModal(false);
    setPaymentLedger(null);
    setPaymentCustomer(null);
    setUnpaidLedgersForPayment([]);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    // Refresh detail view (debt changed)
    triggerRefresh();
  }, [triggerRefresh]);

  return (
    <div className="h-full flex flex-col">
      {/* Top View Selector (Hidden when in Detail View) */}
      {view !== 'detail' && (
        <div className="flex border-b border-border-default bg-bg-surface/50 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-t border-l border-r cursor-pointer ${
              view === 'list'
                ? 'bg-bg-surface border-border-default text-primary shadow-sm -mb-[1px]'
                : 'border-transparent text-text-muted hover:text-text-primary bg-transparent'
            }`}
          >
            👥 Data Pelanggan
          </button>
          <button
            type="button"
            onClick={() => setView('report')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-t border-l border-r cursor-pointer ${
              view === 'report'
                ? 'bg-bg-surface border-border-default text-primary shadow-sm -mb-[1px]'
                : 'border-transparent text-text-muted hover:text-text-primary bg-transparent'
            }`}
          >
            📊 Laporan & Aging Piutang
          </button>
        </div>
      )}

      {/* Main Content */}
      {view === 'list' && (
        <CustomerListPage
          key={refreshKey}
          onSelectCustomer={handleSelectCustomer}
          onCreateCustomer={handleCreateCustomer}
        />
      )}

      {view === 'report' && (
        <CreditAgingReport key={refreshKey} onSelectCustomer={handleSelectCustomer} />
      )}

      {view === 'detail' && selectedCustomer && (
        <CustomerDetailPage
          key={`${selectedCustomer.id}-${refreshKey}`}
          customerId={selectedCustomer.id}
          onBack={handleBackToList}
          onEdit={handleEditCustomer}
          onRecordPayment={handleRecordPayment}
          onRecordCustomerPayment={handleRecordCustomerPayment}
        />
      )}

      {/* Modals */}
      <CustomerFormModal
        isOpen={showCustomerForm}
        onClose={handleCustomerFormClose}
        customer={editingCustomer}
        onSuccess={handleCustomerFormSuccess}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handlePaymentModalClose}
        ledger={paymentLedger}
        customer={paymentCustomer}
        unpaidLedgers={unpaidLedgersForPayment}
        kasirName={kasirName}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
