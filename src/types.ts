export type TransactionType = 'expense' | 'income' | 'transfer';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';

export type CategoryKind = 'expense' | 'income';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currency: string; // 'EUR'
  color: string;
  icon: string;
  institution?: string;
  isArchived?: boolean;
}

export interface Person {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
}

export interface Subcategory {
  id: string;
  name: string;
  icon?: string;
}

export interface CategoryItem {
  id: string;
  groupId: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind; // 'expense' or 'income'
  isDefaultSortLater?: boolean;
  subcategories?: Subcategory[];
}

export interface CategoryGroup {
  id: string;
  name: string;
  targetAllocationPercent: number; // e.g. 45 for 45%
  kind?: CategoryKind;
  description?: string;
  categories: CategoryItem[];
}

export interface GroupOccasion {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  budget?: number;
  isPinnedAlwaysActive?: boolean; // Pinned as always active across sessions (e.g. 6 months abroad)
  isArchived?: boolean;
  order: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  accountId: string;
  toAccountId?: string; // used when type === 'transfer'
  categoryId?: string;
  subcategoryId?: string; // Optional sub-category ID
  groupId?: string;
  occasionGroupId?: string; // ID of the Group / Occasion (e.g. Semester abroad, Rome trip, Party)
  note: string;
  tags?: string[];
  createdAt: string; // ISO
  // People & Debt recovery ("Someone owes me")
  owedByPersonId?: string;
  owedAmount?: number;
  isSettled?: boolean;
  settledAt?: string;
  settledRepaymentId?: string;
  varianceTag?: 'unrecovered_discount' | 'repayment_extra';
}

export interface RepaymentPayload {
  personId: string;
  selectedTransactionIds: string[];
  expectedTotal: number;
  actualAmountReceived: number;
  toAccountId: string;
  date: string;
  note?: string;
}

export interface ParsedInput {
  amount?: number;
  type: TransactionType;
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  groupId?: string;
  note?: string;
  confidence: number;
}
