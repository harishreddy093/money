import React from 'react';
import { BarChart3, BookOpen, Plus, Wallet } from 'lucide-react';
import type { AppTab } from '../types/finance';

interface BottomTabBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenAdd: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAdd,
}) => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-black/[0.08] dark:border-white/[0.1] pb-safe"
    >
      <div className="max-w-lg mx-auto grid grid-cols-4 items-center h-[62px] px-2">
        <button
          type="button"
          onClick={() => onSelectTab('ledger')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activeTab === 'ledger'
              ? 'text-[#007AFF] dark:text-[#0A84FF]'
              : 'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-[21px] h-[21px]" strokeWidth={activeTab === 'ledger' ? 2.2 : 1.8} />
          <span className="text-[10px] font-semibold tracking-tight">Ledger</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('analytics')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activeTab === 'analytics'
              ? 'text-[#007AFF] dark:text-[#0A84FF]'
              : 'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-[21px] h-[21px]" strokeWidth={activeTab === 'analytics' ? 2.2 : 1.8} />
          <span className="text-[10px] font-semibold tracking-tight">Analytics</span>
        </button>

        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={onOpenAdd}
            aria-label="Add new transaction"
            className="w-11 h-11 rounded-full bg-[#007AFF] hover:bg-[#0066D6] active:scale-95 text-white flex items-center justify-center shadow-md shadow-[#007AFF]/35 transition-transform"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <span className="text-[10px] font-semibold tracking-tight text-[#007AFF] dark:text-[#0A84FF] mt-0.5">
            Add
          </span>
        </div>

        <button
          type="button"
          onClick={() => onSelectTab('accounts')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activeTab === 'accounts'
              ? 'text-[#007AFF] dark:text-[#0A84FF]'
              : 'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
          }`}
        >
          <Wallet className="w-[21px] h-[21px]" strokeWidth={activeTab === 'accounts' ? 2.2 : 1.8} />
          <span className="text-[10px] font-semibold tracking-tight">Accounts</span>
        </button>
      </div>
    </nav>
  );
};
