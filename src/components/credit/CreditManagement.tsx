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
import type { Customer, CreditLedger } from '../../types';

interface Props {
  kasirName: string; // From session context
}

type View = 'list' | 'detail';

export default function CreditManagement({ kasirName }: Props) {
  const [view, setView] = useState<View>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Modal states
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLedger, setPaymentLedger] = useState<CreditLedger | null>(null);
  
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
    setShowPaymentModal(true);
  }, []);

  const handlePaymentModalClose = useCallback(() => {
    setShowPaymentModal(false);
    setPaymentLedger(null);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    // Refresh detail view (debt changed)
    triggerRefresh();
  }, [triggerRefresh]);

  return (
    <div className="h-full flex flex-col">
      {/* Main Content */}
      {view === 'list' && (
        <CustomerListPage
          key={refreshKey}
          onSelectCustomer={handleSelectCustomer}
          onCreateCustomer={handleCreateCustomer}
        />
      )}

      {view === 'detail' && selectedCustomer && (
        <CustomerDetailPage
          key={`${selectedCustomer.id}-${refreshKey}`}
          customerId={selectedCustomer.id}
          onBack={handleBackToList}
          onEdit={handleEditCustomer}
          onRecordPayment={handleRecordPayment}
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
        kasirName={kasirName}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
