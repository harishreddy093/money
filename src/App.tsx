/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { WifiOff } from 'lucide-react';
import type {
  Account,
  AppTab,
  LedgerState,
  RecurringRenewal,
  Transaction,
  TransactionType,
  UserPreferences,
} from './types/finance';
import { CATEGORIES } from './lib/seedData';
import {
  exportLedgerJSON,
  exportTransactionsCSV,
  loadLedgerState,
  parseImportedLedgerJSON,
  resetLedgerToDemo,
  saveLedgerState,
} from './lib/db';
import { formatINR } from './lib/format';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { TopHeader } from './components/TopHeader';
import { BottomTabBar } from './components/BottomTabBar';
import { LedgerDashboard } from './components/LedgerDashboard';
import { AnalyticsView } from './components/AnalyticsView';
import { AccountsView } from './components/AccountsView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { BudgetRenewalModal } from './components/BudgetRenewalModal';
import { VaultSettingsModal } from './components/VaultSettingsModal';

function applyTransactionEffect(
  accounts: Account[],
  tx: Pick<Transaction, 'type' | 'amount' | 'accountId' | 'toAccountId'>,
  direction: 1 | -1
): Account[] {
  return accounts.map((acc) => {
    const delta = tx.amount * direction;
    if (tx.type === 'expense' && acc.id === tx.accountId) {
      if (acc.type === 'credit') {
        return { ...acc, balance: Math.max(0, Math.round((acc.balance + delta) * 100) / 100) };
      }
      return { ...acc, balance: Math.round((acc.balance - delta) * 100) / 100 };
    }
    if (tx.type === 'income' && acc.id === tx.accountId) {
      if (acc.type === 'credit') {
        return { ...acc, balance: Math.max(0, Math.round((acc.balance - delta) * 100) / 100) };
      }
      return { ...acc, balance: Math.round((acc.balance + delta) * 100) / 100 };
    }
    if (tx.type === 'transfer') {
      if (acc.id === tx.accountId) {
        if (acc.type === 'credit') {
          return { ...acc, balance: Math.max(0, Math.round((acc.balance + delta) * 100) / 100) };
        }
        return { ...acc, balance: Math.round((acc.balance - delta) * 100) / 100 };
      }
      if (acc.id === tx.toAccountId) {
        if (acc.type === 'credit') {
          return { ...acc, balance: Math.max(0, Math.round((acc.balance - delta) * 100) / 100) };
        }
        return { ...acc, balance: Math.round((acc.balance + delta) * 100) / 100 };
      }
    }
    return acc;
  });
}

export default function App() {
  const [ledger, setLedger] = useState<LedgerState | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('ledger');
  const [toast, setToast] = useState<string>('');

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addPresetType, setAddPresetType] = useState<TransactionType>('expense');
  const [addPresetFromId, setAddPresetFromId] = useState<string | undefined>(undefined);
  const [addPresetToId, setAddPresetToId] = useState<string | undefined>(undefined);
  const [addFocusReceipt, setAddFocusReceipt] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);

  const isOnline = useOnlineStatus();

  useEffect(() => {
    let mounted = true;
    loadLedgerState().then((loaded) => {
      if (mounted) {
        setLedger(loaded);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ledger) return;
    document.documentElement.classList.toggle('dark', ledger.preferences.darkMode);
    saveLedgerState(ledger);
  }, [ledger]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? '' : curr));
    }, 2600);
  }, []);

  const accountNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const acc of ledger?.accounts ?? []) {
      map[acc.id] = acc.name;
    }
    return map;
  }, [ledger?.accounts]);

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [key, cfg] of Object.entries(CATEGORIES)) {
      map[key] = cfg.label;
    }
    return map;
  }, []);

  const handleOpenAdd = (
    presetType: TransactionType = 'expense',
    focusReceipt = false,
    fromId?: string,
    toId?: string
  ) => {
    setEditingTx(null);
    setAddPresetType(presetType);
    setAddFocusReceipt(focusReceipt);
    setAddPresetFromId(fromId);
    setAddPresetToId(toId);
    setAddModalOpen(true);
  };

  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id'>,
    existingId?: string
  ) => {
    setLedger((prev) => {
      if (!prev) return prev;
      let nextAccounts = prev.accounts;
      let nextTransactions = prev.transactions;

      if (existingId) {
        const oldTx = prev.transactions.find((t) => t.id === existingId);
        if (oldTx) {
          nextAccounts = applyTransactionEffect(nextAccounts, oldTx, -1);
        }
        const updatedTx: Transaction = { ...txData, id: existingId };
        nextAccounts = applyTransactionEffect(nextAccounts, updatedTx, 1);
        nextTransactions = prev.transactions.map((t) =>
          t.id === existingId ? updatedTx : t
        );
      } else {
        const createdTx: Transaction = {
          ...txData,
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        };
        nextAccounts = applyTransactionEffect(nextAccounts, createdTx, 1);
        nextTransactions = [createdTx, ...prev.transactions];
      }

      return {
        ...prev,
        accounts: nextAccounts,
        transactions: nextTransactions,
      };
    });

    setAddModalOpen(false);
    setEditingTx(null);
    showToast(
      existingId
        ? 'Entry updated on device'
        : `Recorded ${formatINR(txData.amount)}`
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setLedger((prev) => {
      if (!prev) return prev;
      const target = prev.transactions.find((t) => t.id === id);
      if (!target) return prev;
      const nextAccounts = applyTransactionEffect(prev.accounts, target, -1);
      return {
        ...prev,
        accounts: nextAccounts,
        transactions: prev.transactions.filter((t) => t.id !== id),
      };
    });
    setDetailTx(null);
    setAddModalOpen(false);
    setEditingTx(null);
    showToast('Entry removed from local vault');
  };

  const handleAddAccount = (accountData: Omit<Account, 'id'>) => {
    setLedger((prev) => {
      if (!prev) return prev;
      const newAccount: Account = {
        ...accountData,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      };
      return {
        ...prev,
        accounts: [...prev.accounts, newAccount],
      };
    });
    showToast(`Added ${accountData.name}`);
  };

  const handleUpdateAccountBalance = (accountId: string, newBalance: number) => {
    setLedger((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === accountId ? { ...a, balance: newBalance } : a
        ),
      };
    });
    showToast('Account balance updated');
  };

  const handleDeleteAccount = (accountId: string) => {
    setLedger((prev) => {
      if (!prev || prev.accounts.length <= 1) return prev;
      return {
        ...prev,
        accounts: prev.accounts.filter((a) => a.id !== accountId),
      };
    });
    showToast('Account removed');
  };

  const handlePayCreditCard = (creditAccountId: string) => {
    const bank =
      ledger?.accounts.find((a) => a.type === 'checking') ??
      ledger?.accounts.find((a) => a.type !== 'credit');
    handleOpenAdd('transfer', false, bank?.id, creditAccountId);
  };

  const handleSaveBudgets = (
    nextBudgets: Record<string, number>,
    nextDailyLimit: number
  ) => {
    setLedger((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        budgets: nextBudgets,
        preferences: {
          ...prev.preferences,
          dailySpendLimit: nextDailyLimit,
        },
      };
    });
    showToast('Budgets & daily threshold saved');
  };

  const handleAddRenewal = (renData: Omit<RecurringRenewal, 'id'>) => {
    setLedger((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        renewals: [
          ...prev.renewals,
          { ...renData, id: `ren-${Date.now()}` },
        ],
      };
    });
    showToast(`Added renewal: ${renData.title}`);
  };

  const handleDeleteRenewal = (id: string) => {
    setLedger((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        renewals: prev.renewals.filter((r) => r.id !== id),
      };
    });
  };

  const handlePayRenewal = (ren: RecurringRenewal) => {
    handleSaveTransaction({
      title: ren.title,
      merchant: ren.vendor,
      amount: ren.amount,
      type: 'expense',
      categoryId: ren.categoryId,
      accountId: ren.accountId || ledger?.accounts[0]?.id || '',
      timestamp: new Date().toISOString(),
      isRecurring: true,
      recurrenceCycle: 'monthly',
      note: 'Logged from Upcoming Renewals',
    });
  };

  const handleUpdatePreferences = (next: Partial<UserPreferences>) => {
    setLedger((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        preferences: { ...prev.preferences, ...next },
      };
    });
  };

  const handleExportJSON = () => {
    if (!ledger) return;
    exportLedgerJSON(ledger);
    showToast('Vault JSON backup downloaded');
  };

  const handleExportCSV = (
    txList: Transaction[] = ledger?.transactions ?? [],
    label = 'folio-ledger'
  ) => {
    exportTransactionsCSV(
      txList,
      accountNameMap,
      categoryNameMap,
      label.toLowerCase().replace(/\s+/g, '-')
    );
    showToast('CSV ledger exported');
  };

  const handleImportJSON = (rawText: string) => {
    const parsed = parseImportedLedgerJSON(rawText);
    if (!parsed) return false;
    setLedger(parsed);
    showToast('Vault backup restored');
    return true;
  };

  const handleResetDemo = async () => {
    const fresh = await resetLedgerToDemo();
    setLedger(fresh);
    showToast('Sample INR data restored');
  };

  if (!ledger) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 animate-pulse">
          <div className="h-10 w-48 rounded-xl bg-black/[0.06] dark:bg-white/[0.08]" />
          <div className="h-44 rounded-[22px] bg-black/[0.08] dark:bg-white/[0.1]" />
          <div className="h-24 rounded-2xl bg-black/[0.05] dark:bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] text-[#1C1C1E] dark:text-white flex flex-col lg:flex-row">
      <TopHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAdd={() => handleOpenAdd('expense', false)}
        onOpenVault={() => setVaultModalOpen(true)}
        userName={ledger.preferences.userName}
        renewals={ledger.renewals}
        privacyMask={ledger.preferences.privacyMask}
        onExportBackup={handleExportJSON}
        onPayRenewal={handlePayRenewal}
      />

      <main className="flex-1 min-w-0 pb-24 lg:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-7">
          {activeTab === 'ledger' && (
            <LedgerDashboard
              userName={ledger.preferences.userName}
              accounts={ledger.accounts}
              transactions={ledger.transactions}
              privacyMask={ledger.preferences.privacyMask}
              onTogglePrivacyMask={() =>
                handleUpdatePreferences({
                  privacyMask: !ledger.preferences.privacyMask,
                })
              }
              onOpenAdd={(presetType, focusReceipt) =>
                handleOpenAdd(presetType, focusReceipt)
              }
              onSelectTransaction={(tx) => setDetailTx(tx)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              transactions={ledger.transactions}
              renewals={ledger.renewals}
              budgets={ledger.budgets}
              dailySpendLimit={ledger.preferences.dailySpendLimit}
              privacyMask={ledger.preferences.privacyMask}
              onManageBudgets={() => setBudgetModalOpen(true)}
              onExportCSV={(filtered, label) => handleExportCSV(filtered, label)}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              accounts={ledger.accounts}
              privacyMask={ledger.preferences.privacyMask}
              onAddAccount={handleAddAccount}
              onUpdateAccountBalance={handleUpdateAccountBalance}
              onDeleteAccount={handleDeleteAccount}
              onPayCreditCard={handlePayCreditCard}
              onExportBackup={handleExportJSON}
            />
          )}
        </div>
      </main>

      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAdd={() => handleOpenAdd('expense', false)}
      />

      {/* Offline Status Pill (shown only when actually offline) */}
      {!isOnline && (
        <div className="fixed bottom-20 lg:bottom-5 left-4 z-40 flex items-center gap-2 rounded-xl bg-[#1C1C1E] dark:bg-[#2C2C2E] text-white px-3 py-2 text-[12px] font-medium shadow-lg border border-white/10">
          <WifiOff className="w-3.5 h-3.5 text-[#FF9500]" />
          <span>Offline Mode · Saved locally</span>
        </div>
      )}

      {/* Subtle Action Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-4 z-50 rounded-xl bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] px-4 py-2.5 text-[13px] font-semibold shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* Modals & Sheets */}
      <AddTransactionModal
        isOpen={addModalOpen}
        accounts={ledger.accounts}
        transactions={ledger.transactions}
        budgets={ledger.budgets}
        presetType={addPresetType}
        presetFromAccountId={addPresetFromId}
        presetToAccountId={addPresetToId}
        focusReceiptOnOpen={addFocusReceipt}
        editingTransaction={editingTx}
        onClose={() => {
          setAddModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
      />

      <TransactionDetailModal
        transaction={detailTx}
        accounts={ledger.accounts}
        privacyMask={ledger.preferences.privacyMask}
        onClose={() => setDetailTx(null)}
        onEdit={(tx) => {
          setDetailTx(null);
          setEditingTx(tx);
          setAddModalOpen(true);
        }}
        onDelete={handleDeleteTransaction}
      />

      <BudgetRenewalModal
        isOpen={budgetModalOpen}
        budgets={ledger.budgets}
        dailySpendLimit={ledger.preferences.dailySpendLimit}
        renewals={ledger.renewals}
        accounts={ledger.accounts}
        onClose={() => setBudgetModalOpen(false)}
        onSaveBudgets={handleSaveBudgets}
        onAddRenewal={handleAddRenewal}
        onDeleteRenewal={handleDeleteRenewal}
        onPayRenewal={handlePayRenewal}
      />

      <VaultSettingsModal
        isOpen={vaultModalOpen}
        preferences={ledger.preferences}
        transactionCount={ledger.transactions.length}
        accountCount={ledger.accounts.length}
        onClose={() => setVaultModalOpen(false)}
        onUpdatePreferences={handleUpdatePreferences}
        onExportJSON={handleExportJSON}
        onExportCSV={() => handleExportCSV()}
        onImportJSON={handleImportJSON}
        onResetDemo={handleResetDemo}
      />
    </div>
  );
}
