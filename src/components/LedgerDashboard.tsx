import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  ScanLine,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {
  Account,
  CategoryId,
  Transaction,
  TransactionType,
} from '../types/finance';
import { CATEGORIES, EXPENSE_CATEGORY_ORDER } from '../lib/seedData';
import {
  formatDayGroupLabel,
  formatINR,
  formatTimeShort,
  formatTopDate,
  getTimeGreeting,
  splitINRParts,
} from '../lib/format';
import { CategoryIcon } from './CategoryIcon';

interface LedgerDashboardProps {
  userName: string;
  accounts: Account[];
  transactions: Transaction[];
  privacyMask: boolean;
  onTogglePrivacyMask: () => void;
  onOpenAdd: (presetType?: TransactionType, focusReceipt?: boolean) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const LedgerDashboard: React.FC<LedgerDashboardProps> = ({
  userName,
  accounts,
  transactions,
  privacyMask,
  onTogglePrivacyMask,
  onOpenAdd,
  onSelectTransaction,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CategoryId>('all');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6);

  const now = useMemo(() => new Date(), []);

  // Total liquid balance (checking + savings + cash)
  const totalLiquidBalance = useMemo(() => {
    return accounts
      .filter((a) => a.type !== 'credit')
      .reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  const balanceParts = splitINRParts(totalLiquidBalance, privacyMask);

  // Today's inflow & outflow
  const { todayInflow, todayOutflow } = useMemo(() => {
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    let inflow = 0;
    let outflow = 0;
    for (const tx of transactions) {
      const t = new Date(tx.timestamp).getTime();
      if (t >= startOfToday) {
        if (tx.type === 'income') inflow += tx.amount;
        if (tx.type === 'expense') outflow += tx.amount;
      }
    }
    return { todayInflow: inflow, todayOutflow: outflow };
  }, [transactions, now]);

  // Weekly flow (last 7 days ending today)
  const weeklyData = useMemo(() => {
    const days: {
      date: Date;
      label: string;
      shortDate: string;
      credit: number;
      debit: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      let credit = 0;
      let debit = 0;

      for (const tx of transactions) {
        const ts = new Date(tx.timestamp).getTime();
        if (ts >= dayStart && ts < dayEnd) {
          if (tx.type === 'income') credit += tx.amount;
          if (tx.type === 'expense') debit += tx.amount;
        }
      }

      days.push({
        date: d,
        label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }),
        shortDate: d.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
        }),
        credit,
        debit,
      });
    }

    const maxVal = Math.max(
      1000,
      ...days.flatMap((d) => [d.credit, d.debit])
    );

    return {
      days,
      maxVal,
      rangeLabel: `${days[0].shortDate} – ${days[6].shortDate}`,
    };
  }, [transactions, now]);

  // Filtered and grouped transactions
  const groupedTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = transactions
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter)
          return false;
        if (q) {
          const catLabel = CATEGORIES[tx.categoryId]?.label.toLowerCase() ?? '';
          const match =
            tx.title.toLowerCase().includes(q) ||
            tx.merchant.toLowerCase().includes(q) ||
            catLabel.includes(q) ||
            (tx.note?.toLowerCase().includes(q) ?? false);
          if (!match) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    const groups: {
      label: string;
      net: number;
      items: Transaction[];
    }[] = [];

    for (const tx of filtered) {
      const label = formatDayGroupLabel(tx.timestamp, now);
      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, net: 0, items: [] };
        groups.push(group);
      }
      group.items.push(tx);
      if (tx.type === 'income') group.net += tx.amount;
      if (tx.type === 'expense') group.net -= tx.amount;
    }

    return groups;
  }, [transactions, searchQuery, typeFilter, categoryFilter, now]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all';

  const selectedDay = weeklyData.days[selectedDayIndex] ?? weeklyData.days[6];

  return (
    <div className="space-y-5">
      {/* Greeting & Search Row */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.06em] text-[#8E8E93] uppercase">
            {formatTopDate(now)}
          </p>
          <h2 className="text-[26px] lg:text-[30px] font-bold tracking-tight text-[#1C1C1E] dark:text-white leading-tight mt-0.5">
            {getTimeGreeting(now)}, {userName || 'Aarav'}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label={searchOpen ? 'Close search' : 'Search transactions'}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors border ${
            searchOpen
              ? 'bg-[#007AFF] text-white border-[#007AFF]'
              : 'bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white border-black/[0.06] dark:border-white/[0.1] shadow-xs hover:bg-black/[0.02]'
          }`}
        >
          {searchOpen ? (
            <X className="w-[18px] h-[18px]" />
          ) : (
            <Search className="w-[18px] h-[18px]" />
          )}
        </button>
      </div>

      {/* Expandable Search & Filter Panel */}
      {(searchOpen || filterOpen) && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-3.5 space-y-3 shadow-xs">
          {searchOpen && (
            <div className="relative">
              <Search className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merchant, category, or note..."
                autoFocus
                className="w-full h-10 pl-10 pr-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[14px] text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] focus:outline-2 focus:outline-[#007AFF]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#1C1C1E] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {filterOpen && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] p-1 rounded-xl">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'expense', label: 'Expenses' },
                    { id: 'income', label: 'Income' },
                    { id: 'transfer', label: 'Transfers' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTypeFilter(item.id)}
                    className={`flex-1 min-w-[70px] h-8 px-3 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap ${
                      typeFilter === item.id
                        ? 'bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white shadow-xs'
                        : 'text-[#636366] dark:text-[#AEAEB2] hover:text-[#1C1C1E]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 h-8 rounded-lg text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                    categoryFilter === 'all'
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2]'
                  }`}
                >
                  All Categories
                </button>
                {EXPENSE_CATEGORY_ORDER.map((catId) => (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => setCategoryFilter(catId)}
                    className={`px-3 h-8 rounded-lg text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                      categoryFilter === catId
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2]'
                    }`}
                  >
                    {CATEGORIES[catId].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Responsive 2-Column Bento Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Balance Card + Quick Actions + Weekly Flow */}
        <div className="lg:col-span-5 space-y-4">
          {/* Hero Apple Blue Total Balance Card */}
          <section
            aria-label="Total Balance Summary"
            className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0A84FF] via-[#007AFF] to-[#0055D4] p-5 text-white shadow-lg shadow-[#007AFF]/20"
          >
            {/* Subtle Cupertino ambient light reflection */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute right-8 bottom-10 w-24 h-24 rounded-full bg-[#64D2FF]/15 blur-xl"
              aria-hidden="true"
            />

            <div className="relative flex items-center justify-between">
              <button
                type="button"
                onClick={onTogglePrivacyMask}
                className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-white/85 hover:text-white transition-colors min-h-[28px]"
                aria-label={privacyMask ? 'Show balances' : 'Hide balances'}
              >
                <span>Total Balance</span>
                {privacyMask ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="text-[11px] font-semibold text-white/90 bg-white/15 px-2.5 py-1 rounded-md whitespace-nowrap">
                Primary Folio
              </span>
            </div>

            <div className="relative mt-2.5 mb-5 flex items-baseline tracking-tight tabular-nums">
              <span className="text-[36px] sm:text-[40px] font-bold leading-none">
                {balanceParts.whole}
              </span>
              <span className="text-[22px] sm:text-[24px] font-semibold text-white/80 ml-0.5">
                {balanceParts.fraction}
              </span>
            </div>

            <div className="relative grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white/15 backdrop-blur-md px-3.5 py-2.5 flex items-center gap-2.5 border border-white/15">
                <div className="w-7 h-7 rounded-full bg-[#34C759]/25 text-[#98F5AE] flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-white/80 leading-tight">
                    Today Inflow
                  </p>
                  <p className="text-[13px] font-bold tabular-nums truncate mt-0.5">
                    {privacyMask
                      ? '₹••••'
                      : `+${formatINR(todayInflow, { decimals: 2 })}`}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/15 backdrop-blur-md px-3.5 py-2.5 flex items-center gap-2.5 border border-white/15">
                <div className="w-7 h-7 rounded-full bg-[#FF3B30]/30 text-[#FFD0CD] flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-white/80 leading-tight">
                    Today Outflow
                  </p>
                  <p className="text-[13px] font-bold tabular-nums truncate mt-0.5">
                    {privacyMask
                      ? '₹••••'
                      : `-${formatINR(todayOutflow, { decimals: 2 })}`}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4 Quick Action Buttons */}
          <section aria-label="Quick actions" className="grid grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenAdd('expense', false)}
              className="bg-white dark:bg-[#1C1C1E] rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-2 border border-black/[0.05] dark:border-white/[0.08] shadow-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.04] active:scale-[0.97] transition-all min-h-[78px]"
            >
              <div className="w-9 h-9 rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#64D2FF] flex items-center justify-center">
                <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </div>
              <span className="text-[11px] font-semibold text-[#1C1C1E] dark:text-white whitespace-nowrap">
                Add Entry
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAdd('expense', true)}
              className="bg-white dark:bg-[#1C1C1E] rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-2 border border-black/[0.05] dark:border-white/[0.08] shadow-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.04] active:scale-[0.97] transition-all min-h-[78px]"
            >
              <div className="w-9 h-9 rounded-full bg-[#5856D6]/10 text-[#5856D6] dark:bg-[#5E5CE6]/20 dark:text-[#9E9CFF] flex items-center justify-center">
                <ScanLine className="w-[18px] h-[18px]" strokeWidth={2.1} />
              </div>
              <span className="text-[11px] font-semibold text-[#1C1C1E] dark:text-white whitespace-nowrap">
                Scan
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAdd('transfer', false)}
              className="bg-white dark:bg-[#1C1C1E] rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-2 border border-black/[0.05] dark:border-white/[0.08] shadow-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.04] active:scale-[0.97] transition-all min-h-[78px]"
            >
              <div className="w-9 h-9 rounded-full bg-[#34C759]/12 text-[#248A3D] dark:bg-[#30D158]/20 dark:text-[#63E683] flex items-center justify-center">
                <ArrowLeftRight className="w-[18px] h-[18px]" strokeWidth={2.1} />
              </div>
              <span className="text-[11px] font-semibold text-[#1C1C1E] dark:text-white whitespace-nowrap">
                Transfer
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-2 border shadow-xs active:scale-[0.97] transition-all min-h-[78px] ${
                filterOpen || hasActiveFilters
                  ? 'bg-[#007AFF]/8 dark:bg-[#0A84FF]/15 border-[#007AFF]/30'
                  : 'bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.08] hover:bg-black/[0.02]'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-[#FF9500]/12 text-[#C93400] dark:bg-[#FF9F0A]/20 dark:text-[#FFB340] flex items-center justify-center">
                <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2.1} />
              </div>
              <span className="text-[11px] font-semibold text-[#1C1C1E] dark:text-white whitespace-nowrap">
                Filter
              </span>
            </button>
          </section>

          {/* Weekly Flow Chart Card */}
          <section
            aria-label="Weekly Cash Flow"
            className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 border border-black/[0.05] dark:border-white/[0.08] shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-baseline gap-2 min-w-0">
                <h3 className="text-[15px] font-bold text-[#1C1C1E] dark:text-white whitespace-nowrap">
                  Weekly Flow
                </h3>
                <span className="text-[12px] font-medium text-[#8E8E93] truncate">
                  {weeklyData.rangeLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium text-[#636366] dark:text-[#AEAEB2] shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#34C759]" aria-hidden="true" />
                  Credit
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF3B30]" aria-hidden="true" />
                  Debit
                </span>
              </div>
            </div>

            {/* Selected day quick breakdown */}
            <div className="flex items-center justify-between text-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl px-3 py-1.5 mb-3">
              <span className="font-semibold text-[#1C1C1E] dark:text-white">
                {selectedDay.shortDate}
              </span>
              <div className="flex items-center gap-3 tabular-nums font-medium">
                <span className="text-[#248A3D] dark:text-[#63E683]">
                  +{formatINR(selectedDay.credit, { decimals: 0, masked: privacyMask })}
                </span>
                <span className="text-[#FF3B30] dark:text-[#FF6961]">
                  -{formatINR(selectedDay.debit, { decimals: 0, masked: privacyMask })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-[112px] pt-2">
              {weeklyData.days.map((day, idx) => {
                const creditH =
                  day.credit > 0
                    ? Math.max(10, Math.round((day.credit / weeklyData.maxVal) * 76))
                    : 6;
                const debitH =
                  day.debit > 0
                    ? Math.max(10, Math.round((day.debit / weeklyData.maxVal) * 76))
                    : 6;
                const isSelected = idx === selectedDayIndex;

                return (
                  <button
                    key={day.shortDate}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className="flex flex-col items-center justify-end h-full group focus-visible:outline-2 focus-visible:outline-[#007AFF] rounded-lg"
                    aria-label={`${day.shortDate}: Credit ${formatINR(day.credit)}, Debit ${formatINR(day.debit)}`}
                  >
                    <div className="flex items-end gap-1 h-[80px]">
                      <div
                        style={{ height: `${creditH}px` }}
                        className={`w-[7px] rounded-full transition-all duration-200 ${
                          day.credit > 0
                            ? 'bg-[#34C759]'
                            : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]'
                        } ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}
                      />
                      <div
                        style={{ height: `${debitH}px` }}
                        className={`w-[7px] rounded-full transition-all duration-200 ${
                          day.debit > 0
                            ? 'bg-[#FF3B30]'
                            : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]'
                        } ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}
                      />
                    </div>
                    <span
                      className={`mt-2 w-6 h-5 rounded-md text-[11px] font-semibold flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#007AFF]/12 text-[#007AFF] dark:bg-[#0A84FF]/25 dark:text-[#64D2FF]'
                          : 'text-[#8E8E93]'
                      }`}
                    >
                      {day.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Grouped Transaction Feed */}
        <div className="lg:col-span-7 space-y-5">
          {groupedTransactions.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 text-center border border-black/[0.05] dark:border-white/[0.08]">
              <p className="text-[16px] font-semibold text-[#1C1C1E] dark:text-white">
                No matching transactions
              </p>
              <p className="text-[13px] text-[#8E8E93] mt-1">
                {hasActiveFilters
                  ? 'Try clearing your search or category filter.'
                  : 'Record your first expense or income entry offline.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                      setCategoryFilter('all');
                    }}
                    className="px-4 h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] font-semibold text-[#1C1C1E] dark:text-white"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenAdd('expense')}
                    className="px-4 h-10 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold"
                  >
                    Record First Entry
                  </button>
                )}
              </div>
            </div>
          ) : (
            groupedTransactions.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <div className="flex items-center justify-between px-1 mb-2">
                  <h3 className="text-[11px] font-bold tracking-[0.06em] text-[#8E8E93] uppercase">
                    {group.label}
                  </h3>
                  <span className="text-[12px] font-medium tabular-nums text-[#8E8E93]">
                    Net{' '}
                    {privacyMask
                      ? '₹••••'
                      : formatINR(group.net, { showSign: true, decimals: 2 })}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] shadow-xs divide-y divide-black/[0.05] dark:divide-white/[0.08] overflow-hidden">
                  {group.items.map((tx) => {
                    const cat = CATEGORIES[tx.categoryId] ?? CATEGORIES.others;
                    const amountText = privacyMask
                      ? '₹••••'
                      : tx.type === 'income'
                      ? `+${formatINR(tx.amount)}`
                      : tx.type === 'expense'
                      ? `-${formatINR(tx.amount)}`
                      : formatINR(tx.amount);

                    const amountColor =
                      tx.type === 'income'
                        ? 'text-[#248A3D] dark:text-[#30D158]'
                        : tx.type === 'transfer'
                        ? 'text-[#007AFF] dark:text-[#64D2FF]'
                        : 'text-[#FF3B30] dark:text-[#FF453A]';

                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => onSelectTransaction(tx)}
                        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] active:bg-black/[0.04] transition-colors min-h-[64px]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon
                            categoryId={tx.categoryId}
                            merchantHint={tx.title}
                          />
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                              {tx.title}
                            </p>
                            <p className="text-[12px] text-[#8E8E93] truncate mt-0.5">
                              {cat.label} · {formatTimeShort(tx.timestamp)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[14px] font-bold tabular-nums ${amountColor}`}
                          >
                            {amountText}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#C7C7CC] dark:text-[#636366]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
