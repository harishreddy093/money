import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import type {
  CategoryId,
  RecurringRenewal,
  TimeframeOption,
  Transaction,
} from '../types/finance';
import { CATEGORIES, EXPENSE_CATEGORY_ORDER } from '../lib/seedData';
import { formatINR } from '../lib/format';
import { CategoryIcon } from './CategoryIcon';

interface AnalyticsViewProps {
  transactions: Transaction[];
  renewals: RecurringRenewal[];
  budgets: Record<string, number>;
  dailySpendLimit: number;
  privacyMask: boolean;
  onManageBudgets: () => void;
  onExportCSV: (filtered: Transaction[], label: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  renewals,
  budgets,
  dailySpendLimit,
  privacyMask,
  onManageBudgets,
  onExportCSV,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('month');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedPaceDay, setSelectedPaceDay] = useState<number | null>(null);

  const now = useMemo(() => new Date(), []);

  const periodRange = useMemo(() => {
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    if (timeframe === 'week') {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        start,
        end,
        daysInPeriod: 7,
        label: 'Last 7 Days',
      };
    }
    if (timeframe === 'quarter') {
      const qStartMonth = Math.floor(base.getMonth() / 3) * 3;
      const start = new Date(base.getFullYear(), qStartMonth, 1);
      const end = new Date(base.getFullYear(), qStartMonth + 3, 1);
      const daysInPeriod = Math.round(
        (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
      );
      const qNum = Math.floor(qStartMonth / 3) + 1;
      return {
        start,
        end,
        daysInPeriod,
        label: `Q${qNum} ${base.getFullYear()}`,
      };
    }
    if (timeframe === 'year') {
      const start = new Date(base.getFullYear(), 0, 1);
      const end = new Date(base.getFullYear() + 1, 0, 1);
      const daysInPeriod = Math.round(
        (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
      );
      return {
        start,
        end,
        daysInPeriod,
        label: `${base.getFullYear()} Annual`,
      };
    }

    // Default: month
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    const daysInPeriod = new Date(
      base.getFullYear(),
      base.getMonth() + 1,
      0
    ).getDate();
    return {
      start,
      end,
      daysInPeriod,
      label: base.toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      }),
    };
  }, [now, monthOffset, timeframe]);

  const periodTransactions = useMemo(() => {
    const startMs = periodRange.start.getTime();
    const endMs = periodRange.end.getTime();
    return transactions.filter((tx) => {
      const t = new Date(tx.timestamp).getTime();
      return t >= startMs && t < endMs;
    });
  }, [transactions, periodRange]);

  const { totalIncome, totalOutflow, netSavings, savingsRate } = useMemo(() => {
    let income = 0;
    let outflow = 0;
    for (const tx of periodTransactions) {
      if (tx.type === 'income') income += tx.amount;
      if (tx.type === 'expense') outflow += tx.amount;
    }
    const net = income - outflow;
    const rate = income > 0 ? Math.max(0, Math.min(100, (net / income) * 100)) : 0;
    return {
      totalIncome: income,
      totalOutflow: outflow,
      netSavings: net,
      savingsRate: rate,
    };
  }, [periodTransactions]);

  // Category breakdown across the 6 expense categories
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const id of EXPENSE_CATEGORY_ORDER) totals[id] = 0;

    for (const tx of periodTransactions) {
      if (tx.type === 'expense') {
        const key = EXPENSE_CATEGORY_ORDER.includes(tx.categoryId)
          ? tx.categoryId
          : 'others';
        totals[key] = (totals[key] ?? 0) + tx.amount;
      }
    }

    const totalExp = Object.values(totals).reduce((a, b) => a + b, 0);
    const mult =
      timeframe === 'week'
        ? 0.25
        : timeframe === 'quarter'
        ? 3
        : timeframe === 'year'
        ? 12
        : 1;

    return EXPENSE_CATEGORY_ORDER.map((id) => {
      const spent = totals[id] ?? 0;
      const cfg = CATEGORIES[id];
      const budget = Math.round((budgets[id] ?? cfg.monthlyBudget) * mult);
      const sharePct = totalExp > 0 ? Math.round((spent / totalExp) * 100) : 0;
      const budgetPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
      return {
        id,
        cfg,
        spent,
        budget,
        sharePct,
        budgetPct,
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [periodTransactions, budgets, timeframe]);

  // Dynamic Category Spotlight insight
  const spotlight = useMemo(() => {
    const withBudget = categoryBreakdown.filter((c) => c.budget > 0);
    const bestUnder =
      withBudget.find((c) => c.spent > 0 && c.spent <= c.budget) ??
      withBudget[0];
    if (!bestUnder) {
      return {
        status: 'On Track',
        headline: 'All spending categories are within monthly limits',
        detail: 'Add budgets or log expenses to unlock personalized pacing insights.',
      };
    }
    const diff = bestUnder.budget - bestUnder.spent;
    const pct = Math.round((Math.abs(diff) / bestUnder.budget) * 100);
    if (diff >= 0) {
      return {
        status: 'On Track',
        headline: `${bestUnder.cfg.label} is ${pct}% under ${timeframe} limit`,
        detail: `You have ${formatINR(diff, {
          decimals: 0,
          masked: privacyMask,
        })} remaining in your ${bestUnder.cfg.label.toLowerCase()} allocation.`,
      };
    }
    return {
      status: 'Over Pace',
      headline: `${bestUnder.cfg.label} is ${pct}% above ${timeframe} limit`,
      detail: `Exceeded target by ${formatINR(Math.abs(diff), {
        decimals: 0,
        masked: privacyMask,
      })}. Adjust category budget or slow discretionary spend.`,
    };
  }, [categoryBreakdown, timeframe, privacyMask]);

  // Daily Expenditure Pace (up to 14–24 recent days in period for crisp legibility)
  const paceData = useMemo(() => {
    const count = Math.min(16, periodRange.daysInPeriod);
    const isCurrentMonth = monthOffset === 0 && timeframe === 'month';
    const endDay = isCurrentMonth
      ? now.getDate()
      : periodRange.daysInPeriod;
    const startDay = Math.max(1, endDay - count + 1);

    const days: { dayNum: number; label: string; spend: number }[] = [];
    for (let dayNum = startDay; dayNum <= endDay; dayNum++) {
      const dStart = new Date(
        periodRange.start.getFullYear(),
        periodRange.start.getMonth(),
        dayNum
      ).getTime();
      const dEnd = dStart + 24 * 60 * 60 * 1000;
      let spend = 0;
      for (const tx of periodTransactions) {
        if (tx.type === 'expense') {
          const ts = new Date(tx.timestamp).getTime();
          if (ts >= dStart && ts < dEnd) spend += tx.amount;
        }
      }
      days.push({ dayNum, label: String(dayNum), spend });
    }

    const activeDaysCount = Math.max(1, endDay);
    const avgDaily = totalOutflow / activeDaysCount;
    const maxSpend = Math.max(
      dailySpendLimit * 1.35,
      ...days.map((d) => d.spend)
    );
    const daysAbove = days.filter((d) => d.spend > dailySpendLimit).length;
    const pctAbove =
      days.length > 0 ? ((daysAbove / days.length) * 100).toFixed(1) : '0.0';

    return {
      days,
      avgDaily,
      maxSpend,
      daysAbove,
      totalDays: days.length,
      pctAbove,
      activeDaysCount,
    };
  }, [periodRange, periodTransactions, monthOffset, timeframe, now, totalOutflow, dailySpendLimit]);

  const ringRadius = 22;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (savingsRate / 100) * ringCircumference;

  const activePaceItem =
    selectedPaceDay !== null
      ? paceData.days.find((d) => d.dayNum === selectedPaceDay)
      : null;

  return (
    <div className="space-y-5">
      {/* Segmented Timeframe + Period Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div
          role="tablist"
          aria-label="Analytics timeframe"
          className="grid grid-cols-4 bg-[#E5E5EA]/70 dark:bg-[#1C1C1E] p-1 rounded-xl border border-black/[0.04] dark:border-white/[0.08] sm:w-[340px]"
        >
          {(
            [
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'quarter', label: 'Quarter' },
              { id: 'year', label: 'Year' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={timeframe === item.id}
              type="button"
              onClick={() => {
                setTimeframe(item.id);
                setMonthOffset(0);
              }}
              className={`h-8 rounded-[9px] text-[13px] font-semibold transition-all whitespace-nowrap ${
                timeframe === item.id
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-xs'
                  : 'text-[#636366] dark:text-[#AEAEB2] hover:text-[#1C1C1E]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-1">
            {timeframe !== 'week' && (
              <button
                type="button"
                onClick={() => setMonthOffset((v) => v - 1)}
                aria-label="Previous period"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-[19px] font-bold tracking-tight text-[#1C1C1E] dark:text-white">
              {periodRange.label}
            </span>
            {timeframe !== 'week' && (
              <button
                type="button"
                onClick={() => setMonthOffset((v) => Math.min(0, v + 1))}
                disabled={monthOffset >= 0}
                aria-label="Next period"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#007AFF] hover:bg-[#007AFF]/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-[12px] font-medium text-[#8E8E93] tabular-nums">
            {paceData.activeDaysCount} Days Active
          </span>
        </div>
      </div>

      {/* Top 2-Column Row: Net Savings Rate & Category Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Net Savings Rate */}
        <section className="lg:col-span-7 bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.06em] text-[#8E8E93] uppercase">
                Net Savings Rate
              </p>
              <div className="mt-1.5 flex items-baseline gap-2.5 flex-wrap">
                <span className="text-[30px] sm:text-[32px] font-bold tracking-tight tabular-nums text-[#1C1C1E] dark:text-white">
                  {privacyMask
                    ? '₹••••••'
                    : formatINR(netSavings, { showSign: true, decimals: 2 })}
                </span>
                <span
                  className={`text-[13px] font-bold tabular-nums ${
                    netSavings >= 0 ? 'text-[#248A3D] dark:text-[#30D158]' : 'text-[#FF3B30]'
                  }`}
                >
                  {savingsRate.toFixed(1)}% saved
                </span>
              </div>
            </div>

            {/* Circular Progress Ring */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
                <circle
                  cx="28"
                  cy="28"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-[#E5E5EA] dark:text-[#2C2C2E]"
                />
                <circle
                  cx="28"
                  cy="28"
                  r={ringRadius}
                  fill="none"
                  stroke="#34C759"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <span className="absolute text-[11px] font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                {Math.round(savingsRate)}%
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-black/[0.05] dark:border-white/[0.08] grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.04em] text-[#8E8E93] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#34C759]" aria-hidden="true" />
                Total Income
              </div>
              <p className="mt-1 text-[17px] font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                {formatINR(totalIncome, { masked: privacyMask })}
              </p>
              <p className="text-[11px] font-medium text-[#248A3D] dark:text-[#63E683] mt-0.5">
                ↑ Recorded inflows
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.04em] text-[#8E8E93] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#FF3B30]" aria-hidden="true" />
                Total Outflow
              </div>
              <p className="mt-1 text-[17px] font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                {formatINR(totalOutflow, { masked: privacyMask })}
              </p>
              <p className="text-[11px] font-medium text-[#8E8E93] mt-0.5">
                Across {EXPENSE_CATEGORY_ORDER.length} categories
              </p>
            </div>
          </div>
        </section>

        {/* Category Spotlight Card */}
        <section className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#0A84FF] to-[#0055D4] p-5 text-white shadow-md shadow-[#007AFF]/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white text-[#007AFF] flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4" strokeWidth={2.3} />
                </div>
                <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-white/85">
                  Category Spotlight
                </span>
              </div>
              <span className="text-[12px] font-semibold text-white/90">
                {spotlight.status}
              </span>
            </div>

            <h3 className="text-[18px] font-bold leading-snug text-balance">
              {spotlight.headline}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/85">
              {spotlight.detail}
            </p>
          </div>

          <button
            type="button"
            onClick={onManageBudgets}
            className="mt-4 self-start text-[12px] font-semibold text-white/95 hover:text-white underline underline-offset-4"
          >
            Adjust category budgets →
          </button>
        </section>
      </div>

      {/* Middle 2-Column Row: Category Distribution & Daily Expenditure Pace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Category Distribution */}
        <section className="lg:col-span-7 bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.05] dark:border-white/[0.08] shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-[#1C1C1E] dark:text-white">
                Category Distribution
              </h3>
            </div>
            <button
              type="button"
              onClick={onManageBudgets}
              className="text-[12px] font-semibold text-[#007AFF] hover:underline"
            >
              {categoryBreakdown.length} Categories · Edit Limits
            </button>
          </div>

          {/* Multi-Segment Horizontal Bar */}
          <div className="h-3 w-full rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-hidden flex gap-0.5 mb-5">
            {totalOutflow === 0 ? (
              <div className="w-full h-full bg-[#E5E5EA] dark:bg-[#3A3A3C]" />
            ) : (
              categoryBreakdown.map((item) => {
                if (item.spent <= 0) return null;
                return (
                  <div
                    key={item.id}
                    style={{
                      width: `${Math.max(3, item.sharePct)}%`,
                      backgroundColor: item.cfg.color,
                    }}
                    title={`${item.cfg.label}: ${item.sharePct}%`}
                    className="h-full transition-all duration-300"
                  />
                );
              })
            )}
          </div>

          {/* Category Rows */}
          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.08]">
            {categoryBreakdown.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon categoryId={item.id as CategoryId} size="md" />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                        {item.cfg.label}
                      </p>
                      <p className="text-[12px] text-[#8E8E93] tabular-nums">
                        {item.sharePct}% of total expenses · {item.cfg.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                      {formatINR(item.spent, { decimals: 0, masked: privacyMask })}
                    </p>
                    <p className="text-[11px] text-[#8E8E93] tabular-nums">
                      of {formatINR(item.budget, { decimals: 0, masked: privacyMask })}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-hidden">
                  <div
                    style={{
                      width: `${item.budgetPct}%`,
                      backgroundColor:
                        item.spent > item.budget ? '#FF3B30' : item.cfg.color,
                    }}
                    className="h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Daily Expenditure Pace + Upcoming Renewals */}
        <div className="lg:col-span-5 space-y-5">
          {/* Daily Expenditure Pace */}
          <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.05] dark:border-white/[0.08] shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[0.06em] text-[#8E8E93] uppercase">
                  Daily Expenditure Pace
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[24px] font-bold tracking-tight tabular-nums text-[#1C1C1E] dark:text-white">
                    {formatINR(paceData.avgDaily, {
                      decimals: 0,
                      masked: privacyMask,
                    })}
                  </span>
                  <span className="text-[13px] font-medium text-[#8E8E93]">
                    / day avg
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onManageBudgets}
                className="text-[12px] font-semibold text-[#FF3B30] hover:underline whitespace-nowrap shrink-0"
              >
                — Limit: {formatINR(dailySpendLimit, { decimals: 0, masked: privacyMask })}/d
              </button>
            </div>

            {activePaceItem && (
              <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between text-[12px]">
                <span className="font-semibold text-[#1C1C1E] dark:text-white">
                  Day {activePaceItem.dayNum}
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    activePaceItem.spend > dailySpendLimit
                      ? 'text-[#FF3B30]'
                      : 'text-[#007AFF]'
                  }`}
                >
                  {formatINR(activePaceItem.spend, {
                    decimals: 0,
                    masked: privacyMask,
                  })}
                </span>
              </div>
            )}

            {/* Bar Chart with Dashed Threshold Line */}
            <div className="relative mt-5 h-[132px] flex items-end gap-1.5 pt-4">
              {/* Dashed Limit Line */}
              <div
                style={{
                  bottom: `${Math.min(
                    92,
                    Math.max(
                      18,
                      Math.round((dailySpendLimit / paceData.maxSpend) * 100)
                    )
                  )}%`,
                }}
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-[#FF3B30]/60 z-10"
              />

              {paceData.days.map((d) => {
                const barHeightPct =
                  d.spend > 0
                    ? Math.max(8, Math.round((d.spend / paceData.maxSpend) * 100))
                    : 4;
                const isOver = d.spend > dailySpendLimit;
                const isSelected = selectedPaceDay === d.dayNum;

                return (
                  <button
                    key={d.dayNum}
                    type="button"
                    onClick={() =>
                      setSelectedPaceDay(isSelected ? null : d.dayNum)
                    }
                    className="flex-1 h-full flex flex-col items-center justify-end group"
                    aria-label={`Day ${d.dayNum}: ${formatINR(d.spend)}`}
                  >
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full max-w-[14px] rounded-t-md transition-all ${
                          d.spend === 0
                            ? 'bg-[#E5E5EA] dark:bg-[#2C2C2E]'
                            : isOver
                            ? 'bg-[#FF3B30]'
                            : 'bg-[#007AFF]/75 group-hover:bg-[#007AFF]'
                        } ${isSelected ? 'ring-2 ring-offset-1 ring-[#1C1C1E] dark:ring-white' : ''}`}
                      />
                    </div>
                    <span className="mt-1.5 text-[10px] font-medium tabular-nums text-[#8E8E93]">
                      {d.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between text-[12px]">
              <span className="text-[#8E8E93]">Days above daily threshold</span>
              <span className="font-bold tabular-nums text-[#FF3B30]">
                {paceData.daysAbove} of {paceData.totalDays} days ({paceData.pctAbove}%)
              </span>
            </div>
          </section>

          {/* Upcoming Renewals */}
          <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.05] dark:border-white/[0.08] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#8E8E93]" />
                <h3 className="text-[15px] font-bold text-[#1C1C1E] dark:text-white">
                  Upcoming Renewals
                </h3>
              </div>
              <button
                type="button"
                onClick={onManageBudgets}
                className="text-[13px] font-semibold text-[#007AFF] hover:underline"
              >
                Manage
              </button>
            </div>

            {renewals.length === 0 ? (
              <p className="text-[13px] text-[#8E8E93] py-2">
                No upcoming renewals configured.
              </p>
            ) : (
              <div className="divide-y divide-black/[0.05] dark:divide-white/[0.08]">
                {renewals.map((ren) => (
                  <div
                    key={ren.id}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        categoryId={ren.categoryId}
                        merchantHint={ren.title}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white truncate">
                          {ren.title}
                        </p>
                        <p className="text-[11px] text-[#8E8E93] truncate">
                          {ren.autopay ? 'Autopay' : 'Manual'} · {ren.dueDateLabel}
                        </p>
                      </div>
                    </div>
                    <span className="text-[14px] font-bold tabular-nums text-[#1C1C1E] dark:text-white shrink-0">
                      {formatINR(ren.amount, { masked: privacyMask })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Export Period Ledger Button */}
          <button
            type="button"
            onClick={() => onExportCSV(periodTransactions, periodRange.label)}
            className="w-full h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] text-[#007AFF] dark:text-[#64D2FF] font-semibold text-[14px] flex items-center justify-center gap-2 shadow-xs hover:bg-[#007AFF]/5 active:scale-[0.99] transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export {periodRange.label} Ledger (CSV)</span>
          </button>
        </div>
      </div>

      {/* Subtle footer note */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-[#8E8E93] pt-1">
        <Calendar className="w-3.5 h-3.5" />
        <span>All analytics are computed locally on your device from offline entries.</span>
      </div>
    </div>
  );
};
