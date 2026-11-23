import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Account, CategoryId, RecurringRenewal } from '../types/finance';
import { CATEGORIES, EXPENSE_CATEGORY_ORDER } from '../lib/seedData';
import { formatINR } from '../lib/format';
import { CategoryIcon } from './CategoryIcon';

interface BudgetRenewalModalProps {
  isOpen: boolean;
  budgets: Record<string, number>;
  dailySpendLimit: number;
  renewals: RecurringRenewal[];
  accounts: Account[];
  onClose: () => void;
  onSaveBudgets: (nextBudgets: Record<string, number>, nextDailyLimit: number) => void;
  onAddRenewal: (renewal: Omit<RecurringRenewal, 'id'>) => void;
  onDeleteRenewal: (id: string) => void;
  onPayRenewal: (renewal: RecurringRenewal) => void;
}

export const BudgetRenewalModal: React.FC<BudgetRenewalModalProps> = ({
  isOpen,
  budgets,
  dailySpendLimit,
  renewals,
  accounts,
  onClose,
  onSaveBudgets,
  onAddRenewal,
  onDeleteRenewal,
  onPayRenewal,
}) => {
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>(budgets);
  const [localDaily, setLocalDaily] = useState<string>(String(dailySpendLimit));
  const [tab, setTab] = useState<'budgets' | 'renewals'>('budgets');

  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueLabel, setNewDueLabel] = useState('Dec 10');
  const [newCategoryId, setNewCategoryId] = useState<CategoryId>('entertainment');

  React.useEffect(() => {
    if (isOpen) {
      setLocalBudgets(budgets);
      setLocalDaily(String(dailySpendLimit));
    }
  }, [isOpen, budgets, dailySpendLimit]);

  if (!isOpen) return null;

  const handleSaveBudgetLimits = (e: React.FormEvent) => {
    e.preventDefault();
    const daily = Math.max(100, parseFloat(localDaily) || dailySpendLimit);
    onSaveBudgets(localBudgets, daily);
    onClose();
  };

  const handleCreateRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (!newTitle.trim() || !Number.isFinite(amt) || amt <= 0) return;
    onAddRenewal({
      title: newTitle.trim(),
      vendor: newTitle.trim(),
      amount: Math.round(amt * 100) / 100,
      dueDateLabel: newDueLabel.trim() || 'Monthly',
      dueInDays: 5,
      autopay: true,
      categoryId: newCategoryId,
      accountId: accounts[0]?.id ?? '',
    });
    setNewTitle('');
    setNewAmount('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-lg max-h-[90vh] bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[26px] sm:rounded-[26px] shadow-2xl border border-black/[0.08] dark:border-white/[0.12] flex flex-col overflow-hidden">
        <div className="bg-white/90 dark:bg-[#1C1C1E]/95 px-4 h-[54px] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <h3 className="text-[16px] font-bold text-[#1C1C1E] dark:text-white">
            Budgets &amp; Renewals
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.1] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 bg-[#E5E5EA] dark:bg-[#2C2C2E] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('budgets')}
              className={`h-8 rounded-lg text-[13px] font-semibold transition-all ${
                tab === 'budgets'
                  ? 'bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white shadow-xs'
                  : 'text-[#636366] dark:text-[#AEAEB2]'
              }`}
            >
              Monthly Limits
            </button>
            <button
              type="button"
              onClick={() => setTab('renewals')}
              className={`h-8 rounded-lg text-[13px] font-semibold transition-all ${
                tab === 'renewals'
                  ? 'bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white shadow-xs'
                  : 'text-[#636366] dark:text-[#AEAEB2]'
              }`}
            >
              Upcoming Bills ({renewals.length})
            </button>
          </div>

          {tab === 'budgets' ? (
            <form onSubmit={handleSaveBudgetLimits} className="space-y-4">
              <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 border border-black/[0.05] dark:border-white/[0.08]">
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase tracking-[0.04em] mb-1.5">
                  Daily Expenditure Threshold (₹ / day)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={localDaily}
                  onChange={(e) => setLocalDaily(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[15px] font-bold tabular-nums text-[#1C1C1E] dark:text-white focus:outline-2 focus:outline-[#007AFF]"
                />
              </div>

              <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.08]">
                {EXPENSE_CATEGORY_ORDER.map((catId) => {
                  const cfg = CATEGORIES[catId];
                  return (
                    <div
                      key={catId}
                      className="px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CategoryIcon categoryId={catId} size="sm" />
                        <span className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[13px] text-[#8E8E93]">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={localBudgets[catId] ?? cfg.monthlyBudget}
                          onChange={(e) =>
                            setLocalBudgets((prev) => ({
                              ...prev,
                              [catId]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                          className="w-24 h-9 px-2.5 rounded-lg bg-[#F2F2F7] dark:bg-[#1C1C1E] text-right text-[14px] font-bold tabular-nums text-[#1C1C1E] dark:text-white focus:outline-2 focus:outline-[#007AFF]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#007AFF] text-white font-semibold text-[14px] hover:bg-[#0066D6]"
              >
                Save Budget Limits
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.08]">
                {renewals.map((r) => (
                  <div
                    key={r.id}
                    className="px-4 py-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon categoryId={r.categoryId} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                          {r.title}
                        </p>
                        <p className="text-[11px] text-[#8E8E93]">
                          Due {r.dueDateLabel} · {formatINR(r.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onPayRenewal(r)}
                        className="px-2.5 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] text-[12px] font-semibold"
                      >
                        Log Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRenewal(r.id)}
                        aria-label={`Remove ${r.title}`}
                        className="w-8 h-8 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleCreateRenewal}
                className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 border border-black/[0.05] dark:border-white/[0.08] space-y-3"
              >
                <p className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-[0.04em]">
                  Add Recurring Renewal
                </p>
                <input
                  type="text"
                  required
                  placeholder="Bill or subscription (e.g. Airtel Postpaid)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[13px] text-[#1C1C1E] dark:text-white focus:outline-2 focus:outline-[#007AFF]"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="Amount ₹"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[13px] tabular-nums text-[#1C1C1E] dark:text-white focus:outline-2 focus:outline-[#007AFF]"
                  />
                  <input
                    type="text"
                    placeholder="Due date"
                    value={newDueLabel}
                    onChange={(e) => setNewDueLabel(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[13px] text-[#1C1C1E] dark:text-white focus:outline-2 focus:outline-[#007AFF]"
                  />
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value as CategoryId)}
                    className="h-10 px-2 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[12px] text-[#1C1C1E] dark:text-white focus:outline-2 focus:outline-[#007AFF]"
                  >
                    {EXPENSE_CATEGORY_ORDER.map((id) => (
                      <option key={id} value={id}>
                        {CATEGORIES[id].label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full h-10 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Renewal
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
