import type { LedgerState, Transaction } from '../types/finance';
import { createSeedLedgerState } from './seedData';

const DB_NAME = 'folio_ledger_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'vault';
const STATE_KEY = 'ledger_state_v1';
const LS_FALLBACK_KEY = 'folio_ledger_local_v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open error'));
  });
}

export async function loadLedgerState(): Promise<LedgerState> {
  try {
    const db = await openDatabase();
    const result = await new Promise<LedgerState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result as LedgerState | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (result && Array.isArray(result.accounts) && Array.isArray(result.transactions)) {
      return result;
    }
  } catch {
    // Fall back to localStorage below
  }

  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LedgerState;
      if (parsed && Array.isArray(parsed.accounts) && Array.isArray(parsed.transactions)) {
        return parsed;
      }
    }
  } catch {
    // Fall back to initial seed
  }

  const seed = createSeedLedgerState();
  await saveLedgerState(seed);
  return seed;
}

export async function saveLedgerState(state: LedgerState): Promise<void> {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors if large receipt images exceed localStorage; IndexedDB handles larger blobs
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable; localStorage already persisted
  }
}

export async function resetLedgerToDemo(): Promise<LedgerState> {
  const seed = createSeedLedgerState();
  await saveLedgerState(seed);
  return seed;
}

export function exportLedgerJSON(state: LedgerState): void {
  const payload = {
    app: 'Folio Ledger',
    exportedAt: new Date().toISOString(),
    currency: 'INR',
    data: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(
    blob,
    `folio-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`
  );
}

export function exportTransactionsCSV(
  transactions: Transaction[],
  accountMap: Record<string, string>,
  categoryMap: Record<string, string>,
  filenamePrefix = 'folio-ledger'
): void {
  const headers = [
    'Date',
    'Time',
    'Title',
    'Merchant',
    'Type',
    'Category',
    'Account',
    'Amount (INR)',
    'Note',
  ];
  const escapeCsv = (val: string) => {
    if (/[,"\n]/.test(val)) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const rows = transactions.map((tx) => {
    const d = new Date(tx.timestamp);
    return [
      d.toLocaleDateString('en-IN'),
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      tx.title,
      tx.merchant,
      tx.type,
      categoryMap[tx.categoryId] ?? tx.categoryId,
      accountMap[tx.accountId] ?? tx.accountId,
      tx.type === 'expense' ? `-${tx.amount.toFixed(2)}` : tx.amount.toFixed(2),
      tx.note ?? '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(
    blob,
    `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`
  );
}

export function parseImportedLedgerJSON(rawText: string): LedgerState | null {
  try {
    const parsed = JSON.parse(rawText);
    const candidate = parsed?.data ?? parsed;
    if (
      candidate &&
      Array.isArray(candidate.accounts) &&
      Array.isArray(candidate.transactions) &&
      candidate.preferences
    ) {
      return candidate as LedgerState;
    }
    return null;
  } catch {
    return null;
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
