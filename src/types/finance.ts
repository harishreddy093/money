export type TransactionType = 'expense' | 'income' | 'transfer';

export type CategoryId =
  | 'housing'
  | 'dining'
  | 'shopping'
  | 'transport'
  | 'entertainment'
  | 'others'
  | 'salary'
  | 'freelance'
  | 'transfer';

export interface CategoryConfig {
  id: CategoryId;
  label: string;
  subtitle: string;
  color: string;
  bgTint: string;
  darkBgTint: string;
  monthlyBudget: number;
  isEssential: boolean;
  isExpenseCategory: boolean;
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash';

export interface Account {
  id: string;
  name: string;
  institution: string;
  last4: string;
  type: AccountType;
  /** For checking/savings/cash: available balance. For credit: current amount owed. */
  balance: number;
  creditLimit?: number;
  dueLabel?: string;
  apyLabel?: string;
  subLabel: string;
  rewardsLabel?: string;
  autoPay?: boolean;
  accentColor: string;
}

export interface Transaction {
  id: string;
  title: string;
  merchant: string;
  amount: number;
  type: TransactionType;
  categoryId: CategoryId;
  accountId: string;
  toAccountId?: string;
  timestamp: string; // ISO string
  note?: string;
  receiptDataUrl?: string;
  isRecurring?: boolean;
  recurrenceCycle?: 'monthly' | 'weekly' | 'yearly';
}

export interface RecurringRenewal {
  id: string;
  title: string;
  vendor: string;
  amount: number;
  dueDateLabel: string;
  dueInDays: number;
  autopay: boolean;
  categoryId: CategoryId;
  accountId: string;
}

export interface UserPreferences {
  userName: string;
  dailySpendLimit: number;
  privacyMask: boolean;
  darkMode: boolean;
  lastBackupAt?: string;
}

export interface LedgerState {
  accounts: Account[];
  transactions: Transaction[];
  renewals: RecurringRenewal[];
  budgets: Record<string, number>;
  preferences: UserPreferences;
}

export type AppTab = 'ledger' | 'analytics' | 'accounts';
export type TimeframeOption = 'week' | 'month' | 'quarter' | 'year';
