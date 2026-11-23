import React from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Download,
  Lock,
  Plus,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';
import type { AppTab, RecurringRenewal } from '../types/finance';
import { formatINR } from '../lib/format';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface TopHeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenAdd: () => void;
  onOpenVault: () => void;
  userName: string;
  renewals: RecurringRenewal[];
  privacyMask: boolean;
  onExportBackup: () => void;
  onPayRenewal: (renewal: RecurringRenewal) => void;
}

const TAB_TITLES: Record<AppTab, string> = {
  ledger: 'Ledger',
  analytics: 'Analytics',
  accounts: 'Accounts',
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenAdd,
  onOpenVault,
  userName,
  renewals,
  privacyMask,
  onExportBackup,
  onPayRenewal,
}) => {
  const [alertsOpen, setAlertsOpen] = React.useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);
  const isOnline = useOnlineStatus();
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
    };
    if (alertsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [alertsOpen]);

  const urgentRenewals = renewals.filter((r) => r.dueInDays <= 7);

  return (
    <>
      {/* Mobile / Tablet Compact Top Bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#F2F2F7]/85 dark:bg-[#000000]/85 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] px-4 h-[54px] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-[#0A84FF] to-[#0055D4] flex items-center justify-center text-white shadow-sm shrink-0">
            <BookOpen className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.06em] text-[#8E8E93] uppercase">
              Folio Ledger
            </p>
            <h1 className="text-[16px] font-bold tracking-tight text-[#1C1C1E] dark:text-white truncate">
              {TAB_TITLES[activeTab]}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setAlertsOpen((v) => !v)}
            aria-label="Upcoming bill reminders"
            className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#1C1C1E] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors focus-visible:outline-2 focus-visible:outline-[#007AFF]"
          >
            <Bell className="w-[19px] h-[19px]" strokeWidth={1.9} />
            {urgentRenewals.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#FF3B30] ring-2 ring-[#F2F2F7] dark:ring-black" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenVault}
            aria-label="Local vault and preferences"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[#007AFF]"
          >
            <div className="w-8 h-8 rounded-full bg-[#1C1C1E] dark:bg-[#2C2C2E] text-white text-[13px] font-semibold flex items-center justify-center shadow-sm ring-1 ring-black/10 dark:ring-white/15">
              {userName ? userName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
          </button>

          {alertsOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl border border-black/[0.08] dark:border-white/[0.1] p-4 z-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white">
                  Reminders & Vault Status
                </span>
                <span className="text-[11px] font-medium text-[#34C759]">
                  {isOnline ? 'Local Storage' : 'Offline Mode'}
                </span>
              </div>
              {renewals.length === 0 ? (
                <p className="text-[13px] text-[#8E8E93] py-2">
                  No upcoming bill renewals scheduled.
                </p>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  {renewals.slice(0, 3).map((r) => (
                    <div key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1C1C1E] dark:text-white truncate">
                          {r.title}
                        </p>
                        <p className="text-[11px] text-[#8E8E93]">
                          Due {r.dueDateLabel} · {r.autopay ? 'Autopay' : 'Manual'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[13px] font-semibold tabular-nums text-[#1C1C1E] dark:text-white">
                          {formatINR(r.amount, { decimals: 0, masked: privacyMask })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onPayRenewal(r);
                            setAlertsOpen(false);
                          }}
                          className="text-[11px] font-semibold text-[#007AFF] hover:underline whitespace-nowrap"
                        >
                          Log
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-[#8E8E93]">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#34C759]" />
                  On-device only · No login
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAlertsOpen(false);
                    onOpenVault();
                  }}
                  className="font-semibold text-[#007AFF]"
                >
                  Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[256px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white/80 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-r border-black/[0.06] dark:border-white/[0.08] p-5 justify-between">
        <div>
          <div className="flex items-center gap-3 px-2 mb-7">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A84FF] to-[#0055D4] flex items-center justify-center text-white shadow-sm shrink-0">
              <BookOpen className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.06em] text-[#8E8E93] uppercase">
                Folio Ledger
              </p>
              <p className="text-[16px] font-bold tracking-tight text-[#1C1C1E] dark:text-white truncate">
                Personal Wealth
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAdd}
            className="w-full h-11 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] active:scale-[0.98] text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm shadow-[#007AFF]/25 transition-all mb-6 whitespace-nowrap"
          >
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
            Record Entry
          </button>

          <nav className="space-y-1" aria-label="Primary navigation">
            {(
              [
                { id: 'ledger', label: 'Ledger', icon: BookOpen },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'accounts', label: 'Accounts', icon: Wallet },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectTab(id)}
                  className={`w-full h-11 px-3.5 rounded-xl flex items-center gap-3 text-[14px] font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#64D2FF] font-semibold'
                      : 'text-[#636366] dark:text-[#AEAEB2] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {renewals.length > 0 && (
            <div className="mt-7 pt-5 border-t border-black/[0.06] dark:border-white/[0.08]">
              <p className="px-2 text-[11px] font-semibold tracking-[0.04em] text-[#8E8E93] uppercase mb-2.5">
                Upcoming Bills
              </p>
              <div className="space-y-2 px-2">
                {renewals.slice(0, 2).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-[12px] py-1"
                  >
                    <span className="text-[#3A3A3C] dark:text-[#D1D1D6] truncate pr-2">
                      {r.title}
                    </span>
                    <span className="font-semibold tabular-nums text-[#1C1C1E] dark:text-white shrink-0">
                      {formatINR(r.amount, { decimals: 0, masked: privacyMask })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="w-full h-10 px-3 rounded-xl border border-[#007AFF]/25 bg-[#007AFF]/5 text-[#007AFF] dark:text-[#64D2FF] text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#007AFF]/10 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Install Offline App
            </button>
          )}
          {!isInstalled && !isInstallable && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="w-full h-10 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.12] text-[#1C1C1E] dark:text-white text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-black/[0.03] transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Add to Home Screen
            </button>
          )}

          <div className="rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]/70 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#34C759] shrink-0" />
              <span className="text-[12px] font-semibold text-[#1C1C1E] dark:text-white">
                {isOnline ? 'On-Device Vault' : 'Offline Mode Active'}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#636366] dark:text-[#AEAEB2]">
              Stored locally in your browser. Zero cloud sync, zero login.
            </p>
            <div className="mt-2.5 flex items-center gap-3 text-[12px] font-semibold">
              <button
                type="button"
                onClick={onExportBackup}
                className="text-[#007AFF] hover:underline"
              >
                Backup JSON
              </button>
              <span className="text-[#C7C7CC]">·</span>
              <button
                type="button"
                onClick={onOpenVault}
                className="text-[#1C1C1E] dark:text-white hover:underline"
              >
                Preferences
              </button>
            </div>
          </div>
        </div>
      </aside>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1C1C1E] p-6 shadow-xl border border-black/[0.08] dark:border-white/[0.1]">
            <h3 className="text-[17px] font-bold text-[#1C1C1E] dark:text-white">
              Install Folio Ledger on iOS
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#636366] dark:text-[#AEAEB2]">
              1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
              <br />
              2. Scroll down and choose <strong>Add to Home Screen</strong> for offline access.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full h-11 rounded-xl bg-[#007AFF] text-white text-[14px] font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
