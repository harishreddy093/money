import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  Landmark,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import type { Account, AccountType } from '../types/finance';
import { formatINR } from '../lib/format';

interface AccountsViewProps {
  accounts: Account[];
  privacyMask: boolean;
  onAddAccount: (account: Omit<Account, 'id'>) => void;
  onUpdateAccountBalance: (accountId: string, newBalance: number) => void;
  onDeleteAccount: (accountId: string) => void;
  onPayCreditCard: (creditAccountId: string) => void;
  onExportBackup: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  privacyMask,
  onAddAccount,
  onUpdateAccountBalance,
  onDeleteAccount,
  onPayCreditCard,
  onExportBackup,
}) => {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editBalanceInput, setEditBalanceInput] = useState('');

  // New Account Form State
  const [newName, setNewName] = useState('');
  const [newInstitution, setNewInstitution] = useState('');
  const [newLast4, setNewLast4] = useState('');
  const [newType, setNewType] = useState<AccountType>('checking');
  const [newBalance, setNewBalance] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'checking' || a.type === 'savings'),
    [accounts]
  );
  const creditAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'credit'),
    [accounts]
  );
  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'cash'),
    [accounts]
  );

  const summary = useMemo(() => {
    const liquidTotal = accounts
      .filter((a) => a.type !== 'credit')
      .reduce((sum, a) => sum + a.balance, 0);
    const totalDebt = creditAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalLimit = creditAccounts.reduce(
      (sum, a) => sum + (a.creditLimit ?? 0),
      0
    );
    const availableCredit = Math.max(0, totalLimit - totalDebt);
    const limitFreePct =
      totalLimit > 0 ? Math.round((availableCredit / totalLimit) * 100) : 100;

    return {
      liquidTotal,
      totalDebt,
      availableCredit,
      limitFreePct,
      netWorth: liquidTotal - totalDebt,
    };
  }, [accounts, creditAccounts]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const bal = parseFloat(newBalance) || 0;
    const lim = parseFloat(newLimit) || 100000;

    onAddAccount({
      name: newName.trim(),
      institution:
        newInstitution.trim() ||
        (newType === 'cash' ? 'Wallet' : 'Local Institution'),
      last4:
        newLast4.trim().slice(0, 4) ||
        (newType === 'cash'
          ? 'CASH'
          : String(Math.floor(1000 + Math.random() * 9000))),
      type: newType,
      balance: Math.max(0, bal),
      creditLimit: newType === 'credit' ? Math.max(lim, bal) : undefined,
      subLabel:
        newType === 'credit'
          ? 'Manual Card'
          : newType === 'cash'
          ? 'Local Pocket Wallet'
          : 'Local Account',
      dueLabel: newType === 'credit' ? 'Manual Due' : undefined,
      accentColor:
        newType === 'savings'
          ? '#34C759'
          : newType === 'credit'
          ? '#1C1C1E'
          : '#007AFF',
    });

    setNewName('');
    setNewInstitution('');
    setNewLast4('');
    setNewBalance('');
    setNewLimit('');
    setShowAddAccount(false);
  };

  const openAdjustModal = (acc: Account) => {
    setEditingAccount(acc);
    setEditBalanceInput(String(acc.balance));
  };

  const handleSaveAdjustedBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const val = parseFloat(editBalanceInput);
    if (Number.isFinite(val) && val >= 0) {
      onUpdateAccountBalance(editingAccount.id, Math.round(val * 100) / 100);
    }
    setEditingAccount(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] lg:text-[30px] font-bold tracking-tight text-[#1C1C1E] dark:text-white leading-tight">
            Accounts
          </h2>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">
            On-device institutions, cards &amp; cash ledgers
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewType('checking');
            setShowAddAccount(true);
          }}
          aria-label="Add local account"
          className="w-11 h-11 rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#64D2FF] flex items-center justify-center hover:bg-[#007AFF]/15 transition-colors"
        >
          <Plus className="w-5 h-5" strokeWidth={2.4} />
        </button>
      </div>

      {/* Top Row Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Total Liquid Net Worth Card */}
        <section className="lg:col-span-7 bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.06em] text-[#8E8E93] uppercase">
                Total Liquid Capital
              </p>
              <p className="mt-1.5 text-[32px] font-bold tracking-tight tabular-nums text-[#1C1C1E] dark:text-white">
                {formatINR(summary.liquidTotal, { masked: privacyMask })}
              </p>
              <p className="text-[12px] text-[#8E8E93] mt-0.5">
                Net worth after card dues:{' '}
                <span className="font-semibold text-[#1C1C1E] dark:text-white tabular-nums">
                  {formatINR(summary.netWorth, { masked: privacyMask })}
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#64D2FF] flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] p-3.5">
              <p className="text-[11px] font-medium text-[#8E8E93]">
                Available Credit
              </p>
              <p className="mt-1 text-[16px] font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                {formatINR(summary.availableCredit, { masked: privacyMask })}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#248A3D] dark:text-[#30D158] tabular-nums">
                {summary.limitFreePct}% limit free
              </p>
            </div>

            <div className="rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] p-3.5">
              <p className="text-[11px] font-medium text-[#8E8E93]">
                Total Card Dues
              </p>
              <p className="mt-1 text-[16px] font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                {formatINR(summary.totalDebt, { masked: privacyMask })}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#FF3B30] tabular-nums">
                Across {creditAccounts.length} {creditAccounts.length === 1 ? 'card' : 'cards'}
              </p>
            </div>
          </div>
        </section>

        {/* On-Device Vault Card (Truthful Local Privacy Replacement for Plaid) */}
        <section className="lg:col-span-5 bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#34C759]/12 text-[#248A3D] dark:bg-[#30D158]/20 dark:text-[#63E683] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#1C1C1E] dark:text-white">
                    On-Device Vault Active
                  </h3>
                  <p className="text-[12px] text-[#8E8E93]">
                    Offline IndexedDB · {accounts.length} local ledgers
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3.5 text-[13px] leading-relaxed text-[#636366] dark:text-[#AEAEB2]">
              Your Indian bank balances, credit card statements, and cash wallets never leave this browser. Export a snapshot anytime.
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#248A3D] dark:text-[#63E683]">
              <ShieldCheck className="w-4 h-4" />
              Zero cloud sync
            </span>
            <button
              type="button"
              onClick={onExportBackup}
              className="px-3.5 h-9 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/15 text-[#007AFF] dark:text-[#64D2FF] text-[13px] font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Backup
            </button>
          </div>
        </section>
      </div>

      {/* Bank Accounts & Credit Cards 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Bank Accounts */}
        <section className="lg:col-span-6 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold tracking-[0.06em] text-[#8E8E93] uppercase">
              Bank Accounts
            </h3>
            <span className="text-[12px] text-[#8E8E93] tabular-nums">
              {bankAccounts.length} linked
            </span>
          </div>

          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] shadow-xs divide-y divide-black/[0.05] dark:divide-white/[0.08] overflow-hidden">
            {bankAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => openAdjustModal(acc)}
                className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      acc.type === 'savings'
                        ? 'bg-[#34C759]/12 text-[#248A3D] dark:bg-[#30D158]/20 dark:text-[#63E683]'
                        : 'bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#64D2FF]'
                    }`}
                  >
                    <Landmark className="w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                      {acc.name}
                    </p>
                    <p className="text-[12px] text-[#8E8E93] truncate mt-0.5">
                      {acc.institution} · •••• {acc.last4} ·{' '}
                      <span className="text-[#248A3D] dark:text-[#63E683] font-medium">
                        {acc.apyLabel ?? 'Active'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[15px] font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                    {formatINR(acc.balance, { masked: privacyMask })}
                  </p>
                  <p className="text-[11px] font-medium text-[#248A3D] dark:text-[#63E683] mt-0.5">
                    {acc.subLabel}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Credit Cards & Lines */}
        <section className="lg:col-span-6 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold tracking-[0.06em] text-[#8E8E93] uppercase">
              Credit Cards &amp; Lines
            </h3>
            <span className="text-[12px] text-[#8E8E93] tabular-nums">
              {creditAccounts.length} cards
            </span>
          </div>

          <div className="space-y-3">
            {creditAccounts.map((card) => {
              const limit = card.creditLimit ?? 100000;
              const avail = Math.max(0, limit - card.balance);
              return (
                <div
                  key={card.id}
                  className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 border border-black/[0.05] dark:border-white/[0.08] shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openAdjustModal(card)}
                      className="flex items-center gap-3 text-left min-w-0"
                    >
                      <div
                        style={{ backgroundColor: card.accentColor }}
                        className="w-11 h-8 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0"
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-[#1C1C1E] dark:text-white truncate">
                          {card.name}
                        </p>
                        <p className="text-[12px] text-[#8E8E93] truncate">
                          {card.institution} · •••• {card.last4}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[12px] font-semibold ${
                          card.rewardsLabel
                            ? 'text-[#248A3D] dark:text-[#63E683]'
                            : 'text-[#FF3B30]'
                        }`}
                      >
                        {card.dueLabel ?? card.rewardsLabel ?? 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.08] flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.05em] text-[#8E8E93] uppercase">
                        Current Balance
                      </p>
                      <p className="text-[19px] font-bold tabular-nums text-[#1C1C1E] dark:text-white mt-0.5">
                        {formatINR(card.balance, { masked: privacyMask })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] text-[#8E8E93]">
                          {card.autoPay ? 'Payment Status' : 'Available Credit'}
                        </p>
                        <p
                          className={`text-[13px] font-bold tabular-nums mt-0.5 ${
                            card.autoPay
                              ? 'text-[#248A3D] dark:text-[#30D158]'
                              : 'text-[#1C1C1E] dark:text-white'
                          }`}
                        >
                          {card.autoPay
                            ? 'Auto-pay On'
                            : formatINR(avail, { masked: privacyMask })}
                        </p>
                      </div>
                      {card.balance > 0 && (
                        <button
                          type="button"
                          onClick={() => onPayCreditCard(card.id)}
                          className="px-3 h-8 rounded-lg bg-[#007AFF]/10 hover:bg-[#007AFF]/15 text-[#007AFF] dark:text-[#64D2FF] text-[12px] font-semibold whitespace-nowrap"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Cash & Manual Wallets */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-bold tracking-[0.06em] text-[#8E8E93] uppercase">
            Cash &amp; Manual Wallets
          </h3>
          <button
            type="button"
            onClick={() => {
              setNewType('cash');
              setShowAddAccount(true);
            }}
            className="text-[12px] font-semibold text-[#007AFF] hover:underline"
          >
            + Add Cash / Wallet
          </button>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] shadow-xs divide-y divide-black/[0.05] dark:divide-white/[0.08] overflow-hidden">
          {cashAccounts.map((wallet) => (
            <button
              key={wallet.id}
              type="button"
              onClick={() => openAdjustModal(wallet)}
              className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#8E8E93]/12 text-[#636366] dark:text-[#AEAEB2] flex items-center justify-center shrink-0">
                  <Wallet className="w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                    {wallet.name}
                  </p>
                  <p className="text-[12px] text-[#8E8E93] truncate">
                    {wallet.subLabel}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[15px] font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                  {formatINR(wallet.balance, { masked: privacyMask })}
                </p>
                <p className="text-[11px] text-[#007AFF] font-medium mt-0.5">
                  Tap to adjust
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Add Account Modal */}
      {showAddAccount && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-md bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[26px] sm:rounded-[26px] p-5 shadow-2xl border border-black/[0.08] dark:border-white/[0.12]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold text-[#1C1C1E] dark:text-white">
                Add Local Account
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAccount(false)}
                className="w-9 h-9 rounded-full bg-black/[0.06] dark:bg-white/[0.1] flex items-center justify-center text-[#1C1C1E] dark:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div className="grid grid-cols-4 gap-1 bg-[#E5E5EA] dark:bg-[#2C2C2E] p-1 rounded-xl">
                {(
                  [
                    { id: 'checking', label: 'Bank' },
                    { id: 'savings', label: 'Savings' },
                    { id: 'credit', label: 'Card' },
                    { id: 'cash', label: 'Cash' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewType(t.id)}
                    className={`h-8 rounded-lg text-[12px] font-semibold transition-all ${
                      newType === t.id
                        ? 'bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white shadow-xs'
                        : 'text-[#636366] dark:text-[#AEAEB2]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                required
                placeholder="Account name (e.g. ICICI Coral, SBI Savings)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#2C2C2E] text-[14px] text-[#1C1C1E] dark:text-white border border-black/[0.06] dark:border-white/[0.08] focus:outline-2 focus:outline-[#007AFF]"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Institution (e.g. ICICI)"
                  value={newInstitution}
                  onChange={(e) => setNewInstitution(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#2C2C2E] text-[14px] text-[#1C1C1E] dark:text-white border border-black/[0.06] dark:border-white/[0.08] focus:outline-2 focus:outline-[#007AFF]"
                />
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Last 4 digits"
                  value={newLast4}
                  onChange={(e) => setNewLast4(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#2C2C2E] text-[14px] text-[#1C1C1E] dark:text-white border border-black/[0.06] dark:border-white/[0.08] focus:outline-2 focus:outline-[#007AFF]"
                />
              </div>

              <input
                type="number"
                step="0.01"
                required
                placeholder={
                  newType === 'credit'
                    ? 'Current owed balance (₹)'
                    : 'Current balance (₹)'
                }
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#2C2C2E] text-[14px] text-[#1C1C1E] dark:text-white border border-black/[0.06] dark:border-white/[0.08] focus:outline-2 focus:outline-[#007AFF]"
              />

              {newType === 'credit' && (
                <input
                  type="number"
                  step="100"
                  placeholder="Total credit limit (₹)"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#2C2C2E] text-[14px] text-[#1C1C1E] dark:text-white border border-black/[0.06] dark:border-white/[0.08] focus:outline-2 focus:outline-[#007AFF]"
                />
              )}

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#007AFF] text-white font-semibold text-[14px] hover:bg-[#0066D6] transition-colors"
              >
                Save Local Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Account Balance Modal */}
      {editingAccount && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-sm bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[26px] sm:rounded-[26px] p-5 shadow-2xl border border-black/[0.08] dark:border-white/[0.12]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[17px] font-bold text-[#1C1C1E] dark:text-white truncate pr-2">
                {editingAccount.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.1] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[12px] text-[#8E8E93] mb-3">
              {editingAccount.type === 'credit'
                ? 'Update current card statement balance (₹):'
                : 'Reconcile current balance on this device (₹):'}
            </p>
            <form onSubmit={handleSaveAdjustedBalance} className="space-y-3">
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={editBalanceInput}
                onChange={(e) => setEditBalanceInput(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-white dark:bg-[#2C2C2E] text-[18px] font-bold tabular-nums text-[#1C1C1E] dark:text-white border border-black/[0.06] dark:border-white/[0.08] focus:outline-2 focus:outline-[#007AFF]"
              />
              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-[#007AFF] text-white font-semibold text-[14px]"
                >
                  Update Balance
                </button>
                {accounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteAccount(editingAccount.id);
                      setEditingAccount(null);
                    }}
                    aria-label="Delete account"
                    className="w-11 h-11 rounded-xl bg-[#FF3B30]/12 text-[#FF3B30] flex items-center justify-center hover:bg-[#FF3B30]/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
