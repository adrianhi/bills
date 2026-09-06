import React, { useState } from 'react';
import type { ProductGuideState } from '@bills/contracts';
import type { Transaction } from '@/entities/transaction';
import type { PeriodSelection } from '@/entities/period';
import type { AppSection } from '@/widgets/bottom-nav';
import { QuickAddTransactionModal } from '@/features/quick-add';
import { DeleteTransactionModal, EditTransactionModal } from '@/features/edit-transaction';
import { RulesManagerModal, type RuleSuggestion } from '@/features/manage-rules';
import { AccountSettingsModal } from '@/features/account-settings';
import { ProductTour, ProductTourInvite } from '@/features/product-guide';
import { ExportModal } from '@/features/export-center';

interface DashboardModalsProps {
  authToken: string;
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  // Quick Add
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  onRefresh: () => void;
  // Edit & Delete Transaction
  editingTransaction: Transaction | null;
  setEditingTransaction: (transaction: Transaction | null) => void;
  deletingTransaction?: Transaction | null;
  setDeletingTransaction?: (transaction: Transaction | null) => void;
  onSaveTransaction: (id: string, merchant: string, category: string, notes: string) => Promise<void>;
  onDeleteTransaction?: (id: string) => Promise<void>;
  // Rules Manager
  isRulesModalOpen: boolean;
  setIsRulesModalOpen: (open: boolean) => void;
  // Account Settings
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  requiresBankSelection: boolean;
  onAccountDeleted: () => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  onLock: () => void;
  // Product Guide / Tour
  isTourInviteOpen: boolean;
  setIsTourInviteOpen: (open: boolean) => void;
  isTourOpen: boolean;
  setIsTourOpen: (open: boolean) => void;
  onProductGuideChange: (state: ProductGuideState) => void;
  // Export Modal
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  currentPeriod: PeriodSelection;
  currency: string;
  filters: {
    category?: string;
    status?: string;
    organization?: string;
    transactionType?: string;
    search?: string;
  };
}

export const DashboardModals: React.FC<DashboardModalsProps> = ({
  authToken,
  activeSection,
  onNavigate,
  isQuickAddOpen,
  setIsQuickAddOpen,
  onRefresh,
  editingTransaction,
  setEditingTransaction,
  deletingTransaction,
  setDeletingTransaction,
  onSaveTransaction,
  onDeleteTransaction,
  isRulesModalOpen,
  setIsRulesModalOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  requiresBankSelection,
  onAccountDeleted,
  darkMode,
  setDarkMode,
  onLock,
  isTourInviteOpen,
  setIsTourInviteOpen,
  isTourOpen,
  setIsTourOpen,
  onProductGuideChange,
  isExportModalOpen,
  setIsExportModalOpen,
  currentPeriod,
  currency,
  filters,
}) => {
  const [ruleSuggestion, setRuleSuggestion] = useState<RuleSuggestion>();
  return (
    <>
      <QuickAddTransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={onRefresh}
        authToken={authToken}
      />
      <EditTransactionModal
        key={editingTransaction?.id ?? 'no-transaction'}
        transaction={editingTransaction}
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        onSave={onSaveTransaction}
        onDelete={onDeleteTransaction}
        onSuggestRule={(transactionId, category) => { setRuleSuggestion({ transactionId, category }); setIsRulesModalOpen(true); }}
      />
      <DeleteTransactionModal
        key={deletingTransaction?.id ?? 'no-delete-transaction'}
        transaction={deletingTransaction ?? null}
        isOpen={Boolean(deletingTransaction)}
        onClose={() => setDeletingTransaction?.(null)}
        onConfirm={async (id) => {
          if (onDeleteTransaction) {
            await onDeleteTransaction(id);
          }
          setDeletingTransaction?.(null);
        }}
      />
      <RulesManagerModal
        key={`${isRulesModalOpen}:${ruleSuggestion?.transactionId || ''}`}
        suggestion={ruleSuggestion}
        isOpen={isRulesModalOpen}
        onClose={() => { setIsRulesModalOpen(false); setRuleSuggestion(undefined); }}
        authToken={authToken}
      />
      <AccountSettingsModal
        authToken={authToken}
        isOpen={isSettingsOpen || requiresBankSelection}
        onClose={() => setIsSettingsOpen(false)}
        onAccountDeleted={onAccountDeleted}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onRepeatTour={() => { setIsSettingsOpen(false); setIsTourInviteOpen(false); setIsTourOpen(true); }}
        onOpenRules={() => { setIsSettingsOpen(false); setIsRulesModalOpen(true); }}
        onOpenExport={() => { setIsSettingsOpen(false); setIsExportModalOpen(true); }}
        onLock={onLock}
      />
      <ProductTourInvite
        open={
          isTourInviteOpen &&
          !isTourOpen &&
          !requiresBankSelection &&
          !isSettingsOpen
        }
        onStart={() => setIsTourOpen(true)}
        onDismiss={() => setIsTourInviteOpen(false)}
        onStateChange={onProductGuideChange}
      />
      <ProductTour
        open={isTourOpen && !requiresBankSelection && !isSettingsOpen}
        activeSection={activeSection}
        onOpenChange={setIsTourOpen}
        onNavigate={onNavigate}
        onStateChange={onProductGuideChange}
      />
      <ExportModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        initialPeriod={currentPeriod}
        initialCurrency={currency}
        initialFilters={filters}
      />
    </>
  );
};
