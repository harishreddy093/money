import React from 'react';
import { Calendar, Edit3, Landmark, Repeat, Trash2, X } from 'lucide-react';
import type { Account, Transaction } from '../types/finance';
import { CATEGORIES } from '../lib/seedData';
import { formatINR, formatReadableDateTime } from '../lib/format';
import { CategoryIcon } from './CategoryIcon';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  accounts: Account[];
  privacyMask: boolean;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  accounts,
  privacyMask,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!transaction) return null;

  const cat = CATEGORIES[transaction.categoryId] ?? CATEGORIES.others;
  const account = accounts.find((a) => a.id === transaction.accountId);
  const toAccount = transaction.toAccountId
    ? accounts.find((a) => a.id === transaction.toAccountId)
    : undefined;

  const amountColor =
    transaction.type === 'income'
      ? 'text-[#248A3D] dark:text-[#30D158]'
      : transaction.type === 'transfer'
      ? 'text-[#007AFF] dark:text-[#64D2FF]'
      : 'text-[#FF3B30] dark:text-[#FF453A]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-md bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[26px] sm:rounded-[26px] shadow-2xl border border-black/[0.08] dark:border-white/[0.12] overflow-hidden">
        <div className="bg-white/90 dark:bg-[#1C1C1E]/95 px-4 h-[52px] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <span className="text-[15px] font-bold text-[#1C1C1E] dark:text-white">
            Transaction Details
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction details"
            className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.1] flex items-center justify-center text-[#1C1C1E] dark:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col items-center text-center py-2">
            <CategoryIcon
              categoryId={transaction.categoryId}
              merchantHint={transaction.title}
              size="lg"
            />
            <h3 className="mt-3 text-[19px] font-bold text-[#1C1C1E] dark:text-white">
              {transaction.title}
            </h3>
            <p className={`mt-1 text-[30px] font-bold tabular-nums ${amountColor}`}>
              {privacyMask
                ? '₹••••••'
                : transaction.type === 'income'
                ? `+${formatINR(transaction.amount)}`
                : transaction.type === 'expense'
                ? `-${formatINR(transaction.amount)}`
                : formatINR(transaction.amount)}
            </p>
            <p className="text-[12px] text-[#8E8E93] mt-0.5">{cat.label}</p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.08] text-[13px]">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[#8E8E93]">
                <Landmark className="w-4 h-4" />
                {transaction.type === 'transfer' ? 'Accounts' : 'Account'}
              </span>
              <span className="font-semibold text-[#1C1C1E] dark:text-white text-right">
                {account?.name ?? 'Unknown'}
                {toAccount ? ` → ${toAccount.name}` : ''}
              </span>
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[#8E8E93]">
                <Calendar className="w-4 h-4" />
                Recorded
              </span>
              <span className="font-semibold text-[#1C1C1E] dark:text-white">
                {formatReadableDateTime(transaction.timestamp)}
              </span>
            </div>

            {transaction.isRecurring && (
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[#8E8E93]">
                  <Repeat className="w-4 h-4" />
                  Recurrence
                </span>
                <span className="font-semibold text-[#34C759] capitalize">
                  {transaction.recurrenceCycle ?? 'Monthly'}
                </span>
              </div>
            )}

            {transaction.note && (
              <div className="px-4 py-3">
                <p className="text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">
                  Note
                </p>
                <p className="text-[#1C1C1E] dark:text-white">{transaction.note}</p>
              </div>
            )}
          </div>

          {transaction.receiptDataUrl && (
            <div className="rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.1]">
              <img
                src={transaction.receiptDataUrl}
                alt="Saved transaction receipt"
                className="w-full max-h-48 object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => onEdit(transaction)}
              className="h-11 rounded-xl bg-[#007AFF] text-white font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#0066D6]"
            >
              <Edit3 className="w-4 h-4" />
              Edit Entry
            </button>
            <button
              type="button"
              onClick={() => onDelete(transaction.id)}
              className="h-11 rounded-xl bg-[#FF3B30]/12 text-[#FF3B30] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#FF3B30]/18"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
