import React, { useRef, useState } from 'react';
import {
  Download,
  EyeOff,
  Moon,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
} from 'lucide-react';
import type { UserPreferences } from '../types/finance';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface VaultSettingsModalProps {
  isOpen: boolean;
  preferences: UserPreferences;
  transactionCount: number;
  accountCount: number;
  onClose: () => void;
  onUpdatePreferences: (next: Partial<UserPreferences>) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (rawText: string) => boolean;
  onResetDemo: () => void;
}

export const VaultSettingsModal: React.FC<VaultSettingsModalProps> = ({
  isOpen,
  preferences,
  transactionCount,
  accountCount,
  onClose,
  onUpdatePreferences,
  onExportJSON,
  onExportCSV,
  onImportJSON,
  onResetDemo,
}) => {
  const [nameInput, setNameInput] = useState(preferences.userName);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  React.useEffect(() => {
    if (isOpen) {
      setNameInput(preferences.userName);
      setConfirmReset(false);
      setStatusMessage('');
    }
  }, [isOpen, preferences.userName]);

  if (!isOpen) return null;

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const ok = onImportJSON(reader.result);
        setStatusMessage(
          ok
            ? 'Backup restored to your local device vault.'
            : 'Invalid backup file. Please select a Folio Ledger JSON file.'
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-md max-h-[90vh] bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[26px] sm:rounded-[26px] shadow-2xl border border-black/[0.08] dark:border-white/[0.12] flex flex-col overflow-hidden">
        <div className="bg-white/90 dark:bg-[#1C1C1E]/95 px-4 h-[54px] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <h3 className="text-[16px] font-bold text-[#1C1C1E] dark:text-white">
            On-Device Vault &amp; Settings
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
          {/* Privacy Assurance Banner */}
          <div className="rounded-2xl bg-[#34C759]/10 dark:bg-[#30D158]/15 border border-[#34C759]/25 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#248A3D] dark:text-[#63E683] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-bold text-[#1C1C1E] dark:text-white">
                100% Local &amp; Offline Storage
              </p>
              <p className="text-[12px] text-[#3A3A3C] dark:text-[#D1D1D6] mt-0.5 leading-relaxed">
                No login required. {transactionCount} entries and {accountCount} accounts are saved exclusively inside this device&apos;s browser storage.
              </p>
            </div>
          </div>

          {/* Display Preferences */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.08]">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <label
                htmlFor="pref-name"
                className="text-[14px] font-medium text-[#1C1C1E] dark:text-white shrink-0"
              >
                Greeting Name
              </label>
              <input
                id="pref-name"
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  onUpdatePreferences({ userName: e.target.value });
                }}
                placeholder="Your name"
                className="w-36 text-right bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-lg px-2.5 py-1.5 text-[14px] font-semibold text-[#1C1C1E] dark:text-white focus:outline-2 focus:outline-[#007AFF]"
              />
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <EyeOff className="w-4 h-4 text-[#8E8E93]" />
                <span className="text-[14px] font-medium text-[#1C1C1E] dark:text-white">
                  Privacy Mask (Hide ₹)
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.privacyMask}
                onClick={() =>
                  onUpdatePreferences({ privacyMask: !preferences.privacyMask })
                }
                className={`w-[50px] h-[30px] rounded-full p-0.5 transition-colors flex items-center ${
                  preferences.privacyMask
                    ? 'bg-[#34C759]'
                    : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]'
                }`}
              >
                <span
                  className={`w-[26px] h-[26px] rounded-full bg-white shadow-sm transition-transform ${
                    preferences.privacyMask ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Moon className="w-4 h-4 text-[#8E8E93]" />
                <span className="text-[14px] font-medium text-[#1C1C1E] dark:text-white">
                  Cupertino Dark Appearance
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.darkMode}
                onClick={() =>
                  onUpdatePreferences({ darkMode: !preferences.darkMode })
                }
                className={`w-[50px] h-[30px] rounded-full p-0.5 transition-colors flex items-center ${
                  preferences.darkMode
                    ? 'bg-[#34C759]'
                    : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]'
                }`}
              >
                <span
                  className={`w-[26px] h-[26px] rounded-full bg-white shadow-sm transition-transform ${
                    preferences.darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Offline Install & Backup Actions */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/[0.05] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.08]">
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-black/[0.02]"
              >
                <span className="flex items-center gap-2.5 text-[14px] font-semibold text-[#007AFF]">
                  <Smartphone className="w-4 h-4" />
                  Install Offline App (PWA)
                </span>
                <span className="text-[12px] text-[#8E8E93]">Ready</span>
              </button>
            )}
            {!isInstalled && !isInstallable && isIOS && (
              <div className="px-4 py-3 text-[12px] text-[#636366] dark:text-[#AEAEB2]">
                On iPhone/iPad Safari: tap <strong>Share → Add to Home Screen</strong> for full offline app mode.
              </div>
            )}

            <button
              type="button"
              onClick={onExportJSON}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-black/[0.02]"
            >
              <span className="flex items-center gap-2.5 text-[14px] font-medium text-[#1C1C1E] dark:text-white">
                <Download className="w-4 h-4 text-[#007AFF]" />
                Export Full Vault Backup (.json)
              </span>
            </button>

            <button
              type="button"
              onClick={onExportCSV}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-black/[0.02]"
            >
              <span className="flex items-center gap-2.5 text-[14px] font-medium text-[#1C1C1E] dark:text-white">
                <Download className="w-4 h-4 text-[#34C759]" />
                Export Transactions Sheet (.csv)
              </span>
            </button>

            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-black/[0.02]"
            >
              <span className="flex items-center gap-2.5 text-[14px] font-medium text-[#1C1C1E] dark:text-white">
                <Upload className="w-4 h-4 text-[#007AFF]" />
                Restore from Backup (.json)
              </span>
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {statusMessage && (
            <p className="text-[13px] font-medium text-center text-[#007AFF]">
              {statusMessage}
            </p>
          )}

          {/* Reset Demo Data */}
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full h-11 rounded-xl bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-[#FF3B30] text-[14px] font-semibold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Sample INR Data
            </button>
          ) : (
            <div className="rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/25 p-3.5 space-y-2.5">
              <p className="text-[12px] font-medium text-[#FF3B30] text-center">
                Replace all current entries and accounts with sample Indian Rupee data?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="h-9 rounded-xl bg-white dark:bg-[#2C2C2E] text-[13px] font-semibold text-[#1C1C1E] dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetDemo();
                    setConfirmReset(false);
                    setStatusMessage('Sample INR ledger restored.');
                  }}
                  className="h-9 rounded-xl bg-[#FF3B30] text-white text-[13px] font-semibold"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
