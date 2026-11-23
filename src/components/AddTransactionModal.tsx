import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileEdit,
  Image as ImageIcon,
  Landmark,
  Repeat,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import type {
  Account,
  CategoryId,
  Transaction,
  TransactionType,
} from '../types/finance';
import { CATEGORIES, EXPENSE_CATEGORY_ORDER } from '../lib/seedData';
import { formatDateTimeInput, formatINR, formatReadableDateTime } from '../lib/format';
import { CategoryIcon } from './CategoryIcon';

interface AddTransactionModalProps {
  isOpen: boolean;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Record<string, number>;
  presetType?: TransactionType;
  presetFromAccountId?: string;
  presetToAccountId?: string;
  focusReceiptOnOpen?: boolean;
  editingTransaction?: Transaction | null;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'>, existingId?: string) => void;
  onDelete?: (id: string) => void;
}

const INCOME_CATEGORIES: CategoryId[] = ['salary', 'freelance', 'others'];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  accounts,
  transactions,
  budgets,
  presetType = 'expense',
  presetFromAccountId,
  presetToAccountId,
  focusReceiptOnOpen = false,
  editingTransaction = null,
  onClose,
  onSave,
  onDelete,
}) => {
  const [type, setType] = useState<TransactionType>(presetType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [categoryId, setCategoryId] = useState<CategoryId>('dining');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [title, setTitle] = useState<string>('');
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>(undefined);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceCycle, setRecurrenceCycle] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [pickerSection, setPickerSection] = useState<'none' | 'category' | 'account' | 'toAccount'>('none');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setPickerSection('none');

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(String(editingTransaction.amount));
      setCategoryId(editingTransaction.categoryId);
      setAccountId(editingTransaction.accountId);
      setToAccountId(
        editingTransaction.toAccountId ??
          accounts.find((a) => a.id !== editingTransaction.accountId)?.id ??
          accounts[0]?.id ??
          ''
      );
      setTimestamp(editingTransaction.timestamp);
      setTitle(editingTransaction.title);
      setReceiptDataUrl(editingTransaction.receiptDataUrl);
      setIsRecurring(Boolean(editingTransaction.isRecurring));
      setRecurrenceCycle(editingTransaction.recurrenceCycle ?? 'monthly');
    } else {
      setType(presetType);
      setAmountStr('');
      setCategoryId(
        presetType === 'income'
          ? 'salary'
          : presetType === 'transfer'
          ? 'transfer'
          : 'dining'
      );
      const defaultFrom =
        presetFromAccountId ??
        (presetType === 'expense'
          ? accounts.find((a) => a.type === 'credit')?.id ?? accounts[0]?.id
          : accounts[0]?.id) ??
        '';
      const defaultTo =
        presetToAccountId ??
        accounts.find((a) => a.id !== defaultFrom)?.id ??
        defaultFrom;
      setAccountId(defaultFrom);
      setToAccountId(defaultTo);
      setTimestamp(new Date().toISOString());
      setTitle('');
      setReceiptDataUrl(undefined);
      setIsRecurring(false);
      setRecurrenceCycle('monthly');

      if (focusReceiptOnOpen) {
        setTimeout(() => fileInputRef.current?.click(), 180);
      } else {
        setTimeout(() => amountInputRef.current?.focus(), 100);
      }
    }
  }, [
    isOpen,
    editingTransaction,
    presetType,
    presetFromAccountId,
    presetToAccountId,
    focusReceiptOnOpen,
    accounts,
  ]);

  // Switch default category cleanly when switching type tabs
  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    setPickerSection('none');
    if (nextType === 'income' && !INCOME_CATEGORIES.includes(categoryId)) {
      setCategoryId('salary');
    } else if (nextType === 'expense' && !EXPENSE_CATEGORY_ORDER.includes(categoryId)) {
      setCategoryId('dining');
    } else if (nextType === 'transfer') {
      setCategoryId('transfer');
    }
  };

  const parsedAmount = useMemo(() => {
    const clean = parseFloat(amountStr.replace(/,/g, ''));
    return Number.isFinite(clean) && clean > 0 ? clean : 0;
  }, [amountStr]);

  // Live monthly budget calculation for selected category
  const categoryBudgetStatus = useMemo(() => {
    if (type !== 'expense') return null;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const spentSoFar = transactions
      .filter((tx) => {
        if (editingTransaction && tx.id === editingTransaction.id) return false;
        return (
          tx.type === 'expense' &&
          tx.categoryId === categoryId &&
          new Date(tx.timestamp).getTime() >= monthStart
        );
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const budget = budgets[categoryId] ?? CATEGORIES[categoryId]?.monthlyBudget ?? 10000;
    const projectedSpent = spentSoFar + parsedAmount;
    const left = budget - projectedSpent;
    const pct = budget > 0 ? Math.min(100, Math.round((projectedSpent / budget) * 100)) : 0;

    return {
      budget,
      projectedSpent,
      left,
      pct,
      isOver: left < 0,
    };
  }, [type, transactions, editingTransaction, categoryId, budgets, parsedAmount]);

  if (!isOpen) return null;

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const selectedToAccount = accounts.find((a) => a.id === toAccountId) ?? accounts[0];
  const selectedCategory = CATEGORIES[categoryId] ?? CATEGORIES.others;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (parsedAmount <= 0) {
      setErrorMsg('Please enter an amount greater than ₹0.');
      amountInputRef.current?.focus();
      return;
    }
    if (!selectedAccount) {
      setErrorMsg('Please select an account.');
      return;
    }
    if (type === 'transfer' && selectedAccount.id === selectedToAccount?.id) {
      setErrorMsg('Source and destination accounts must be different.');
      return;
    }

    const fallbackTitle =
      type === 'transfer'
        ? `Transfer to ${selectedToAccount?.name ?? 'Account'}`
        : selectedCategory.label;

    const finalTitle = title.trim() || fallbackTitle;

    onSave(
      {
        title: finalTitle,
        merchant: finalTitle,
        amount: Math.round(parsedAmount * 100) / 100,
        type,
        categoryId: type === 'transfer' ? 'transfer' : categoryId,
        accountId: selectedAccount.id,
        toAccountId: type === 'transfer' ? selectedToAccount?.id : undefined,
        timestamp,
        note: title.trim() ? title.trim() : undefined,
        receiptDataUrl,
        isRecurring,
        recurrenceCycle: isRecurring ? recurrenceCycle : undefined,
      },
      editingTransaction?.id
    );
  };

  const renderAccountBadge = (acc?: Account) => {
    if (!acc) return null;
    if (acc.type === 'credit') return <CreditCard className="w-4 h-4 text-[#007AFF]" />;
    if (acc.type === 'cash') return <Wallet className="w-4 h-4 text-[#34C759]" />;
    return <Landmark className="w-4 h-4 text-[#007AFF]" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-modal-title"
    >
      <div className="w-full sm:max-w-[460px] max-h-[94vh] bg-[#F2F2F7] dark:bg-[#000000] rounded-t-[26px] sm:rounded-[26px] shadow-2xl border border-black/[0.08] dark:border-white/[0.12] flex flex-col overflow-hidden">
        {/* Top Sheet Bar */}
        <div className="bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-md px-4 h-[54px] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] font-medium text-[#007AFF] min-h-[44px] px-1"
          >
            Cancel
          </button>
          <h2
            id="entry-modal-title"
            className="text-[16px] font-bold text-[#1C1C1E] dark:text-white"
          >
            {editingTransaction ? 'Edit Entry' : 'New Entry'}
          </h2>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="text-[15px] font-bold text-[#007AFF] min-h-[44px] px-1"
          >
            Done
          </button>
        </div>

        {/* Scrollable Sheet Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4">
          {/* Segmented Control: Expense | Income | Transfer */}
          <div className="grid grid-cols-3 bg-[#E5E5EA] dark:bg-[#1C1C1E] p-1 rounded-xl">
            {(
              [
                { id: 'expense', label: 'Expense' },
                { id: 'income', label: 'Income' },
                { id: 'transfer', label: 'Transfer' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTypeChange(tab.id)}
                className={`h-8 rounded-[9px] text-[13px] font-semibold transition-all ${
                  type === tab.id
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-xs'
                    : 'text-[#636366] dark:text-[#AEAEB2]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Hero Amount Input */}
          <div className="py-3 text-center">
            <p className="text-[12px] font-medium text-[#8E8E93]">
              Indian Rupee (₹) · INR
            </p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <span className="text-[28px] font-semibold text-[#8E8E93]">₹</span>
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setErrorMsg('');
                }}
                aria-label="Amount in Indian Rupees"
                className="w-48 text-center bg-transparent text-[42px] font-bold tracking-tight tabular-nums text-[#1C1C1E] dark:text-white placeholder:text-[#C7C7CC] dark:placeholder:text-[#48484A] focus:outline-none caret-[#007AFF]"
              />
            </div>
            <p
              className={`mt-1 text-[12px] font-semibold ${
                type === 'income'
                  ? 'text-[#248A3D] dark:text-[#30D158]'
                  : type === 'transfer'
                  ? 'text-[#007AFF] dark:text-[#64D2FF]'
                  : 'text-[#FF3B30] dark:text-[#FF453A]'
              }`}
            >
              {type === 'income'
                ? '+ Credit Transaction'
                : type === 'transfer'
                ? '⇄ Internal Account Transfer'
                : '- Debit Transaction'}
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/25 px-3.5 py-2.5 text-[13px] font-medium text-[#FF3B30] text-center">
              {errorMsg}
            </div>
          )}

          {/* DETAILS SECTION */}
          <div>
            <p className="px-1 mb-1.5 text-[11px] font-bold tracking-[0.06em] text-[#8E8E93] uppercase">
              Details
            </p>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.08] overflow-hidden">
              {/* Category Selector (Expense/Income) */}
              {type !== 'transfer' && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setPickerSection(
                        pickerSection === 'category' ? 'none' : 'category'
                      )
                    }
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] min-h-[54px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon categoryId={categoryId} size="sm" />
                      <div className="text-left min-w-0">
                        <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                          {selectedCategory.label}
                        </p>
                        <p className="text-[11px] text-[#8E8E93] truncate">
                          {selectedCategory.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[12px] font-medium text-[#8E8E93]">
                        {selectedCategory.isEssential ? 'Essential' : 'Lifestyle'}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-[#C7C7CC] transition-transform ${
                          pickerSection === 'category' ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {pickerSection === 'category' && (
                    <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-1.5 bg-[#F9F9FB] dark:bg-[#2C2C2E]/60 border-t border-black/[0.04]">
                      {(type === 'income'
                        ? INCOME_CATEGORIES
                        : EXPENSE_CATEGORY_ORDER
                      ).map((catId) => {
                        const cfg = CATEGORIES[catId];
                        const active = categoryId === catId;
                        return (
                          <button
                            key={catId}
                            type="button"
                            onClick={() => {
                              setCategoryId(catId);
                              setPickerSection('none');
                            }}
                            className={`px-2.5 py-2 rounded-xl flex items-center gap-2 text-left transition-all border ${
                              active
                                ? 'bg-[#007AFF]/10 border-[#007AFF]/40 text-[#007AFF] dark:text-[#64D2FF]'
                                : 'bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.08] text-[#1C1C1E] dark:text-white'
                            }`}
                          >
                            <CategoryIcon categoryId={catId} size="sm" />
                            <span className="text-[12px] font-semibold truncate">
                              {cfg.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Primary / Source Account */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setPickerSection(
                      pickerSection === 'account' ? 'none' : 'account'
                    )
                  }
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] min-h-[54px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                      {renderAccountBadge(selectedAccount)}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                        {type === 'transfer' ? 'From: ' : ''}
                        {selectedAccount?.name ?? 'Select Account'}
                      </p>
                      <p className="text-[11px] text-[#8E8E93] truncate">
                        {selectedAccount?.institution} ·{' '}
                        {selectedAccount?.last4 === 'CASH'
                          ? 'Cash Wallet'
                          : `•••• ${selectedAccount?.last4}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold uppercase text-[#007AFF]">
                      {selectedAccount?.type}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-[#C7C7CC] transition-transform ${
                        pickerSection === 'account' ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </button>

                {pickerSection === 'account' && (
                  <div className="px-3 pb-3 pt-1 space-y-1 bg-[#F9F9FB] dark:bg-[#2C2C2E]/60 border-t border-black/[0.04]">
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setAccountId(acc.id);
                          setPickerSection('none');
                        }}
                        className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left border ${
                          acc.id === accountId
                            ? 'bg-[#007AFF]/10 border-[#007AFF]/40'
                            : 'bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {renderAccountBadge(acc)}
                          <span className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                            {acc.name}
                          </span>
                        </div>
                        <span className="text-[12px] font-medium tabular-nums text-[#8E8E93]">
                          {formatINR(acc.balance, { decimals: 0 })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination Account (Transfer Only) */}
              {type === 'transfer' && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setPickerSection(
                        pickerSection === 'toAccount' ? 'none' : 'toAccount'
                      )
                    }
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] min-h-[54px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#34C759]/12 flex items-center justify-center shrink-0">
                        <ArrowLeftRight className="w-4 h-4 text-[#248A3D]" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                          To: {selectedToAccount?.name ?? 'Select Account'}
                        </p>
                        <p className="text-[11px] text-[#8E8E93] truncate">
                          Destination ·{' '}
                          {selectedToAccount?.type === 'credit'
                            ? 'Credit Card Payment'
                            : selectedToAccount?.institution}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-[#C7C7CC] transition-transform ${
                        pickerSection === 'toAccount' ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {pickerSection === 'toAccount' && (
                    <div className="px-3 pb-3 pt-1 space-y-1 bg-[#F9F9FB] dark:bg-[#2C2C2E]/60 border-t border-black/[0.04]">
                      {accounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setToAccountId(acc.id);
                            setPickerSection('none');
                          }}
                          className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left border ${
                            acc.id === toAccountId
                              ? 'bg-[#007AFF]/10 border-[#007AFF]/40'
                              : 'bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {renderAccountBadge(acc)}
                            <span className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                              {acc.name}
                            </span>
                          </div>
                          <span className="text-[12px] font-medium tabular-nums text-[#8E8E93]">
                            {formatINR(acc.balance, { decimals: 0 })}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Date & Time Row */}
              <div className="px-4 py-3 flex items-center justify-between gap-3 min-h-[54px]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#8E8E93]/12 flex items-center justify-center text-[#636366] dark:text-[#AEAEB2]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white">
                      Date &amp; Time
                    </p>
                    <p className="text-[11px] text-[#8E8E93]">
                      {formatReadableDateTime(timestamp)}
                    </p>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={formatDateTimeInput(timestamp)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setTimestamp(new Date(e.target.value).toISOString());
                    }
                  }}
                  aria-label="Transaction date and time"
                  className="text-[12px] font-medium text-[#007AFF] bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-lg px-2.5 py-1.5 focus:outline-2 focus:outline-[#007AFF]"
                />
              </div>
            </div>
          </div>

          {/* METADATA & PROOF SECTION */}
          <div>
            <p className="px-1 mb-1.5 text-[11px] font-bold tracking-[0.06em] text-[#8E8E93] uppercase">
              Metadata &amp; Proof
            </p>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.08] overflow-hidden">
              {/* Merchant / Note Input */}
              <div className="px-4 py-3 flex items-center gap-3 min-h-[52px]">
                <div className="w-8 h-8 rounded-lg bg-[#8E8E93]/12 flex items-center justify-center text-[#636366] dark:text-[#AEAEB2] shrink-0">
                  <FileEdit className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    type === 'income'
                      ? 'Source or client (e.g. Monthly Salary)'
                      : type === 'transfer'
                      ? 'Transfer memo (e.g. Credit Card Bill)'
                      : 'Merchant or note (e.g. Lunch at Third Wave)'
                  }
                  className="w-full bg-transparent text-[14px] font-medium text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
                />
              </div>

              {/* Add Receipt Photo */}
              <div className="px-4 py-3 min-h-[56px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#8E8E93]/12 flex items-center justify-center text-[#636366] dark:text-[#AEAEB2] shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white">
                        {receiptDataUrl ? 'Receipt Attached' : 'Add Receipt Photo'}
                      </p>
                      <p className="text-[11px] text-[#8E8E93] truncate">
                        Stored locally on-device · JPG or PNG
                      </p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {receiptDataUrl ? (
                    <button
                      type="button"
                      onClick={() => setReceiptDataUrl(undefined)}
                      className="text-[12px] font-semibold text-[#FF3B30] hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Upload receipt photo"
                      className="w-9 h-9 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center hover:bg-[#007AFF]/15 shrink-0"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {receiptDataUrl && (
                  <div className="mt-2.5 rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.1] max-h-36">
                    <img
                      src={receiptDataUrl}
                      alt="Attached transaction receipt"
                      className="w-full h-36 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* Recurring Toggle */}
              <div className="px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#8E8E93]/12 flex items-center justify-center text-[#636366] dark:text-[#AEAEB2]">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white">
                      Recurring Entry
                    </p>
                    <p className="text-[11px] text-[#8E8E93]">
                      {isRecurring ? `Repeats ${recurrenceCycle}` : 'Repeat automatically'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isRecurring}
                  aria-label="Toggle recurring entry"
                  onClick={() => setIsRecurring((v) => !v)}
                  className={`w-[50px] h-[30px] rounded-full p-0.5 transition-colors flex items-center ${
                    isRecurring
                      ? 'bg-[#34C759]'
                      : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]'
                  }`}
                >
                  <span
                    className={`w-[26px] h-[26px] rounded-full bg-white shadow-sm transition-transform ${
                      isRecurring ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Live Category Budget Row */}
              {categoryBudgetStatus && (
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BarChart2 className="w-4 h-4 text-[#007AFF] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                          Monthly {selectedCategory.label} Budget
                        </p>
                        <p
                          className={`text-[11px] tabular-nums font-medium ${
                            categoryBudgetStatus.isOver
                              ? 'text-[#FF3B30]'
                              : 'text-[#8E8E93]'
                          }`}
                        >
                          {categoryBudgetStatus.isOver
                            ? `${formatINR(Math.abs(categoryBudgetStatus.left), {
                                decimals: 0,
                              })} over budget`
                            : `${formatINR(categoryBudgetStatus.left, {
                                decimals: 0,
                              })} left of ${formatINR(categoryBudgetStatus.budget, {
                                decimals: 0,
                              })}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-hidden">
                    <div
                      style={{
                        width: `${categoryBudgetStatus.pct}%`,
                        backgroundColor: categoryBudgetStatus.isOver
                          ? '#FF3B30'
                          : '#007AFF',
                      }}
                      className="h-full rounded-full transition-all duration-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Primary Submit CTA */}
          <div className="pt-1 space-y-2.5">
            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] active:scale-[0.99] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-md shadow-[#007AFF]/25 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {editingTransaction ? 'Save Changes' : `Record ${type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : 'Expense'}`}{' '}
                ({formatINR(parsedAmount)})
              </span>
            </button>

            {editingTransaction && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(editingTransaction.id)}
                className="w-full h-11 rounded-2xl bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 text-[#FF3B30] font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Entry
              </button>
            )}

            <p className="text-center text-[11px] text-[#8E8E93] pb-1">
              Saved directly to on-device IndexedDB · Available offline
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
