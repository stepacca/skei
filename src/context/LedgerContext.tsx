import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Account, CategoryGroup, CategoryItem, Subcategory, Transaction, TransactionType, Person, RepaymentPayload, GroupOccasion } from '../types';
import { INITIAL_ACCOUNTS, INITIAL_CATEGORY_GROUPS, INITIAL_TRANSACTIONS, INITIAL_PEOPLE, INITIAL_GROUPS } from '../data/initialData';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  waitForPendingWrites,
  onIdTokenChanged,
  refreshAuthToken,
  User,
} from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';

interface TransferPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note?: string;
  date: string;
}

export interface PersonDebtSummary {
  person: Person;
  totalOwed: number;
  totalSettled: number;
  openCount: number;
  openTransactions: Transaction[];
  settledTransactions: Transaction[];
}

export interface GroupOccasionSummary {
  group: GroupOccasion;
  totalSpent: number;
  transactionCount: number;
  budgetPercent?: number;
  remainingBudget?: number;
}

interface CategoryGroupStat {
  group: CategoryGroup;
  actualAmount: number;
  actualPercent: number;
  targetPercent: number;
  variancePercent: number;
  dailyVelocity: number;
  projectedMonthEnd: number;
  categoryBreakdown: {
    category: CategoryItem;
    amount: number;
    percentOfGroup: number;
  }[];
}

export type CloudSyncStatus = 'synced' | 'syncing' | 'offline' | 'guest';

interface LedgerContextType {
  accounts: Account[];
  categoryGroups: CategoryGroup[];
  transactions: Transaction[];
  people: Person[];
  groups: GroupOccasion[];
  activeGroupId: string | null;
  sessionGroupId: string | null;
  groupSummaries: GroupOccasionSummary[];
  personDebtSummaries: PersonDebtSummary[];
  totalPendingOwed: number;
  calculatedBalances: Record<string, number>;
  totalNetWorth: number;
  formatEUR: (amount: number) => string;
  monthStats: {
    totalExpenses: number;
    totalIncome: number;
    totalTransfers: number;
    netSavings: number;
    dailyVelocity: number;
    projectedMonthEndExpense: number;
    daysInMonth: number;
    currentDayOfMonth: number;
  };
  categoryGroupStats: CategoryGroupStat[];
  // Cloud & Auth State
  currentUser: User | null;
  isAuthReady: boolean;
  cloudSyncStatus: CloudSyncStatus;
  syncProgress: number;
  syncStage: string;
  lastSyncedAt: Date | null;
  syncError: string | null;
  dismissSyncError: () => void;
  isSessionExpired: boolean;
  reauthenticate: () => Promise<void>;
  pendingConflict: { cloudCount: number; localCount: number } | null;
  resolveConflict: (resolution: 'merge' | 'cloud' | 'local') => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  syncNow: () => Promise<void>;
  clearDeviceCacheAndSignOut: () => Promise<void>;
  resetCloudDatabase: () => Promise<void>;
  resetToInitial: () => Promise<void>;
  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  transferFunds: (payload: TransferPayload) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addPerson: (person: Omit<Person, 'id' | 'createdAt'>) => void;
  updatePerson: (id: string, partial: Partial<Person>) => void;
  deletePerson: (id: string) => { success: boolean; error?: string };
  settleRepayment: (payload: RepaymentPayload) => void;
  // Groups / Occasions
  setSessionGroupId: (id: string | null) => void;
  clearSessionGroup: () => void;
  addGroup: (group: Omit<GroupOccasion, 'id' | 'order' | 'createdAt'>) => void;
  updateGroup: (id: string, partial: Partial<GroupOccasion>) => void;
  deleteGroup: (id: string) => void;
  reorderGroups: (orderedIds: string[]) => void;
  togglePinGroup: (id: string) => void;
  // Categories
  updateCategoryGroupTarget: (groupId: string, targetPercent: number) => void;
  addCategoryItem: (groupId: string, item: Omit<CategoryItem, 'id' | 'groupId'>) => void;
  updateCategoryItem: (categoryId: string, partial: Partial<CategoryItem>) => void;
  deleteCategoryItem: (categoryId: string) => void;
  addSubcategory: (categoryId: string, name: string, icon?: string) => void;
  updateSubcategory: (categoryId: string, subcategoryId: string, name: string, icon?: string) => void;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => void;
  exportJSON: () => void;
  exportCSV: () => void;
  importJSON: (jsonString: string) => Promise<boolean>;
}

const LedgerContext = createContext<LedgerContextType | null>(null);

const STORAGE_KEYS = {
  ACCOUNTS: 'skei_accounts_v2',
  GROUPS: 'skei_groups_v2',
  TRANSACTIONS: 'skei_transactions_v2',
  PEOPLE: 'skei_people_v2',
  OCCASIONS: 'skei_occasions_v2',
};

const SEED_VERSION_KEY = 'skei_seed_v2_applied';
try {
  if (typeof window !== 'undefined' && localStorage.getItem(SEED_VERSION_KEY) !== 'true') {
    localStorage.removeItem('skei_accounts_v1');
    localStorage.removeItem('skei_groups_v1');
    localStorage.removeItem('skei_transactions_v1');
    localStorage.removeItem('skei_accounts_v1_guest');
    localStorage.removeItem('skei_groups_v1_guest');
    localStorage.removeItem('skei_transactions_v1_guest');
    localStorage.setItem(SEED_VERSION_KEY, 'true');
  }
} catch (e) {
  console.warn('Local seed migration error:', e);
}

// Data sanitizers to strictly enforce Firestore security rules and eliminate undefined fields
function sanitizeTx(tx: Transaction): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount) || 0,
    accountId: tx.accountId,
    date: tx.date,
  };
  if (tx.createdAt) clean.createdAt = tx.createdAt;
  if (tx.updatedAt) clean.updatedAt = tx.updatedAt;
  if (tx.toAccountId && tx.toAccountId.trim()) clean.toAccountId = tx.toAccountId.trim();
  if (tx.categoryId && tx.categoryId.trim()) clean.categoryId = tx.categoryId.trim();
  if (tx.subcategoryId && tx.subcategoryId.trim()) clean.subcategoryId = tx.subcategoryId.trim();
  if (tx.groupId && tx.groupId.trim()) clean.groupId = tx.groupId.trim();
  if (tx.occasionGroupId && tx.occasionGroupId.trim()) clean.occasionGroupId = tx.occasionGroupId.trim();
  if (tx.owedByPersonId && tx.owedByPersonId.trim()) clean.owedByPersonId = tx.owedByPersonId.trim();
  if (typeof tx.owedAmount === 'number') clean.owedAmount = tx.owedAmount;
  if (typeof tx.isSettled === 'boolean') clean.isSettled = tx.isSettled;
  if (tx.note && tx.note.trim()) clean.note = tx.note.trim().slice(0, 255);
  if (tx.settledAt) clean.settledAt = tx.settledAt;
  if (tx.settledRepaymentId) clean.settledRepaymentId = tx.settledRepaymentId;
  if (tx.varianceTag) clean.varianceTag = tx.varianceTag;
  if (Array.isArray(tx.tags) && tx.tags.length > 0) clean.tags = tx.tags;
  return clean;
}

function sanitizeAccount(acc: Account): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: acc.id,
    name: acc.name.slice(0, 100),
    type: acc.type,
    initialBalance: Number(acc.initialBalance) || 0,
  };
  if (acc.currency) clean.currency = acc.currency;
  if (acc.color) clean.color = acc.color;
  if (acc.icon) clean.icon = acc.icon;
  if (acc.institution) clean.institution = acc.institution.slice(0, 100);
  if (typeof acc.isArchived === 'boolean') clean.isArchived = acc.isArchived;
  if (acc.updatedAt) clean.updatedAt = acc.updatedAt;
  return clean;
}

function sanitizeCategoryGroup(grp: CategoryGroup): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: grp.id,
    name: grp.name.slice(0, 100),
  };
  if (typeof grp.targetAllocationPercent === 'number') {
    clean.targetAllocationPercent = grp.targetAllocationPercent;
  }
  if (grp.kind) clean.kind = grp.kind;
  if (grp.description) clean.description = grp.description.slice(0, 255);
  if (grp.updatedAt) clean.updatedAt = grp.updatedAt;
  if (Array.isArray(grp.categories)) {
    clean.categories = grp.categories.map(c => {
      const catObj: Record<string, unknown> = {
        id: c.id,
        groupId: c.groupId,
        name: c.name.slice(0, 100),
        icon: c.icon,
        color: c.color,
        kind: c.kind,
      };
      if (c.isDefaultSortLater) catObj.isDefaultSortLater = true;
      if (c.updatedAt) catObj.updatedAt = c.updatedAt;
      if (Array.isArray(c.subcategories)) {
        catObj.subcategories = c.subcategories.map(s => {
          const subObj: Record<string, unknown> = {
            id: s.id,
            name: s.name.slice(0, 100),
          };
          if (s.icon) subObj.icon = s.icon.slice(0, 50);
          return subObj;
        });
      }
      return catObj;
    });
  }
  return clean;
}

function sanitizeGroup(grp: GroupOccasion): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: grp.id,
    name: grp.name.slice(0, 100),
    emoji: (grp.emoji || '📁').slice(0, 10),
  };
  if (grp.description) clean.description = grp.description.slice(0, 255);
  if (typeof grp.budget === 'number') clean.budget = grp.budget;
  if (typeof grp.isPinnedAlwaysActive === 'boolean') clean.isPinnedAlwaysActive = grp.isPinnedAlwaysActive;
  if (typeof grp.isArchived === 'boolean') clean.isArchived = grp.isArchived;
  if (typeof grp.order === 'number') clean.order = grp.order;
  if (grp.createdAt) clean.createdAt = grp.createdAt;
  if (grp.updatedAt) clean.updatedAt = grp.updatedAt;
  return clean;
}

function sanitizePerson(person: Person): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: person.id,
    name: person.name.slice(0, 100),
    emoji: (person.emoji || '👤').slice(0, 10),
  };
  if (person.createdAt) clean.createdAt = person.createdAt;
  if (person.updatedAt) clean.updatedAt = person.updatedAt;
  return clean;
}

const loadScopedData = <T,>(key: string, uid: string | null, fallback: T): T => {
  try {
    const storageKey = uid ? `${key}_${uid}` : `${key}_guest`;
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    const legacy = localStorage.getItem(key);
    if (legacy) return JSON.parse(legacy);
  } catch {}
  return fallback;
};

const saveScopedData = (key: string, uid: string | null, data: unknown) => {
  try {
    const storageKey = uid ? `${key}_${uid}` : `${key}_guest`;
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

// Helper to commit batches in chunks of 400 or fewer to strictly respect Firestore's 500-op limit
async function commitBatchesInChunks(
  operations: Array<(batch: ReturnType<typeof writeBatch>) => void>,
  chunkSize = 400
) {
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const op of chunk) {
      op(batch);
    }
    await batch.commit();
  }
}

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('guest');

  // Real-time Sync Hub telemetry
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStage, setSyncStage] = useState<string>('Connecting...');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);

  const dismissSyncError = () => setSyncError(null);

  // Conflict resolution state (kept for interface compatibility)
  const [pendingConflict, setPendingConflict] = useState<{
    cloudCount: number;
    localCount: number;
  } | null>(null);

  // Ledger Collections state
  const [accounts, setAccounts] = useState<Account[]>(() => {
    return loadScopedData(STORAGE_KEYS.ACCOUNTS, null, INITIAL_ACCOUNTS);
  });

  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>(() => {
    const raw = loadScopedData(STORAGE_KEYS.GROUPS, null, INITIAL_CATEGORY_GROUPS);
    const parsed = raw.map((g: CategoryGroup) => ({
      ...g,
      categories: g.categories.map((c: CategoryItem) => {
        if (!Array.isArray(c.subcategories)) {
          const initMatch = INITIAL_CATEGORY_GROUPS.flatMap(ig => ig.categories).find(ic => ic.id === c.id);
          return {
            ...c,
            subcategories: initMatch?.subcategories || [],
          };
        }
        return c;
      }),
    }));

    const hasSortLater = parsed.some((g: CategoryGroup) =>
      g.categories.some((c: CategoryItem) => c.isDefaultSortLater || c.id === 'cat-sort-later')
    );
    if (!hasSortLater && parsed.length > 0) {
      const sortLaterItem: CategoryItem = {
        id: 'cat-sort-later',
        groupId: parsed[0].id,
        name: 'Sort Later',
        icon: 'Clock',
        color: '#f59e0b',
        kind: 'expense',
        isDefaultSortLater: true,
        subcategories: [
          { id: 'sub-uncat', name: 'Uncategorized / quick capture', icon: 'Clock' },
        ],
      };
      parsed[0].categories = [sortLaterItem, ...parsed[0].categories];
    }
    return parsed;
  });

  const [people, setPeople] = useState<Person[]>(() => {
    return loadScopedData(STORAGE_KEYS.PEOPLE, null, INITIAL_PEOPLE);
  });

  const [groups, setGroups] = useState<GroupOccasion[]>(() => {
    return loadScopedData(STORAGE_KEYS.OCCASIONS, null, INITIAL_GROUPS);
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return loadScopedData(STORAGE_KEYS.TRANSACTIONS, null, INITIAL_TRANSACTIONS);
  });

  // Active group selection
  const [sessionGroupId, setSessionGroupIdState] = useState<string | null>(null);

  const activeGroupId = useMemo<string | null>(() => {
    if (sessionGroupId === 'none') return null;
    if (sessionGroupId !== null) return sessionGroupId;
    const pinned = groups.find(g => g.isPinnedAlwaysActive && !g.isArchived);
    return pinned ? pinned.id : null;
  }, [sessionGroupId, groups]);

  // Synchronize local storage across state changes
  useEffect(() => {
    saveScopedData(STORAGE_KEYS.ACCOUNTS, currentUser ? currentUser.uid : null, accounts);
  }, [accounts, currentUser]);

  useEffect(() => {
    saveScopedData(STORAGE_KEYS.GROUPS, currentUser ? currentUser.uid : null, categoryGroups);
  }, [categoryGroups, currentUser]);

  useEffect(() => {
    saveScopedData(STORAGE_KEYS.PEOPLE, currentUser ? currentUser.uid : null, people);
  }, [people, currentUser]);

  useEffect(() => {
    saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser ? currentUser.uid : null, groups);
  }, [groups, currentUser]);

  useEffect(() => {
    saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser ? currentUser.uid : null, transactions);
  }, [transactions, currentUser]);

  // Proactive token refresh helper
  const handleTokenRefresh = async (force = false): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      const token = await refreshAuthToken(force);
      if (token) {
        setIsSessionExpired(false);
        return true;
      }
    } catch (err) {
      console.warn('Token refresh error:', err);
    }
    return false;
  };

  // Re-authenticate when token expires or session needs interactive renewal
  const reauthenticate = async () => {
    try {
      setCloudSyncStatus('syncing');
      setSyncStage('Re-authenticating...');
      await signInWithPopup(auth, googleProvider);
      setIsSessionExpired(false);
      setSyncError(null);
      await syncNow();
    } catch (err) {
      console.error('Re-authentication failed:', err);
      setSyncError('Re-authentication failed or was cancelled.');
    }
  };

  // Listen to Auth State via onIdTokenChanged to catch background refreshes & token events
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async user => {
      setCurrentUser(user);
      setIsAuthReady(true);
      if (user) {
        setIsSessionExpired(false);
        setCloudSyncStatus('syncing');
        setSyncStage('Connecting...');
      } else {
        setIsSessionExpired(false);
        setCloudSyncStatus('guest');
        setSyncProgress(100);
        setSyncStage('Guest Mode');
      }
    });
    return () => unsubscribe();
  }, []);

  // Proactive token refresh: every 30 minutes, on window focus, and on network reconnection
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      const ok = await handleTokenRefresh(true);
      if (!ok && currentUser) {
        console.warn('Silent token renewal returned null. Prompting re-auth if needed.');
      }
    }, 30 * 60 * 1000);

    const handleWake = async () => {
      try {
        await handleTokenRefresh(true);
      } catch (err) {
        console.warn('Token refresh on window focus / online failed:', err);
      }
    };
    window.addEventListener('focus', handleWake);
    window.addEventListener('online', handleWake);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('online', handleWake);
    };
  }, [currentUser]);

  // Real-time Firestore Subscriptions & Multi-Device Sync Engine
  useEffect(() => {
    if (!currentUser) return;

    let isCancelled = false;
    const uid = currentUser.uid;
    setCloudSyncStatus('syncing');
    setSyncProgress(25);
    setSyncStage('Connecting...');

    // Multi-collection status tracking so progress is granular and never gets stuck
    const collectionStatus: Record<
      'accounts' | 'categories' | 'groups' | 'people' | 'transactions',
      { fromServer: boolean; hasPendingWrites: boolean; isError: boolean }
    > = {
      accounts: { fromServer: false, hasPendingWrites: false, isError: false },
      categories: { fromServer: false, hasPendingWrites: false, isError: false },
      groups: { fromServer: false, hasPendingWrites: false, isError: false },
      people: { fromServer: false, hasPendingWrites: false, isError: false },
      transactions: { fromServer: false, hasPendingWrites: false, isError: false },
    };

    const evaluateSyncProgress = () => {
      if (isCancelled) return;

      const entries = Object.values(collectionStatus);
      const serverCount = entries.filter(e => e.fromServer).length;
      const anyPendingWrites = entries.some(e => e.hasPendingWrites);
      const anyErrors = entries.some(e => e.isError);

      if (anyErrors && serverCount === 0) {
        setCloudSyncStatus('offline');
        setSyncStage('Offline (Changes Queued)');
        setSyncProgress(100);
        return;
      }

      if (anyPendingWrites) {
        setCloudSyncStatus('syncing');
        setSyncStage('Unsynced changes');
        setSyncProgress(Math.max(80, 25 + serverCount * 15));
        return;
      }

      if (serverCount === 5) {
        setCloudSyncStatus('synced');
        setSyncProgress(100);
        setSyncStage('100% In Sync');
        setLastSyncedAt(new Date());
      } else {
        setCloudSyncStatus('syncing');
        const progress = Math.min(95, 25 + serverCount * 15);
        setSyncProgress(progress);
        setSyncStage(`Synchronizing (${serverCount}/5)...`);
      }
    };

    const initCloudAccount = async () => {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        const isSeedV2Applied = userData?.seedV2Applied === true;

        if (!userSnap.exists()) {
          // First time this Google Account has ever logged into Skei
          await setDoc(userRef, {
            uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || '',
            currency: 'EUR',
            seedV2Applied: true,
            createdAt: new Date().toISOString(),
            lastSyncedAt: new Date().toISOString(),
          });

          const [accSnap, txSnap] = await Promise.all([
            getDocs(collection(db, 'users', uid, 'accounts')),
            getDocs(collection(db, 'users', uid, 'transactions')),
          ]);

          if (accSnap.empty && txSnap.empty) {
            const batch = writeBatch(db);
            for (const acc of INITIAL_ACCOUNTS) {
              batch.set(doc(db, 'users', uid, 'accounts', acc.id), sanitizeAccount(acc));
            }
            for (const catGrp of INITIAL_CATEGORY_GROUPS) {
              batch.set(doc(db, 'users', uid, 'categoryGroups', catGrp.id), sanitizeCategoryGroup(catGrp));
            }
            await batch.commit();
          }
        } else {
          // Check if remote account has old template accounts and should be safely upgraded
          if (!isSeedV2Applied) {
            try {
              const [accSnap, remoteTxSnap] = await Promise.all([
                getDocs(collection(db, 'users', uid, 'accounts')),
                getDocs(collection(db, 'users', uid, 'transactions')),
              ]);

              const hasOldTemplateAccounts = accSnap.docs.some(
                d => d.id === 'acc-checking' || d.id === 'acc-savings' || d.id === 'acc-credit'
              );

              // CRITICAL: NEVER delete user's accounts or categories if they have ANY transactions!
              if (remoteTxSnap.empty && hasOldTemplateAccounts) {
                const batch = writeBatch(db);
                accSnap.docs.forEach(d => {
                  if (d.id !== 'acc-bank' && d.id !== 'acc-cash') {
                    batch.delete(d.ref);
                  }
                });
                const oldCatSnap = await getDocs(collection(db, 'users', uid, 'categoryGroups'));
                oldCatSnap.docs.forEach(d => batch.delete(d.ref));

                for (const acc of INITIAL_ACCOUNTS) {
                  batch.set(doc(db, 'users', uid, 'accounts', acc.id), sanitizeAccount(acc));
                }
                for (const catGrp of INITIAL_CATEGORY_GROUPS) {
                  batch.set(doc(db, 'users', uid, 'categoryGroups', catGrp.id), sanitizeCategoryGroup(catGrp));
                }
                await batch.commit();
              }

              // Store seedV2Applied on the users/<uid> document so it never re-runs
              await setDoc(userRef, { uid, seedV2Applied: true }, { merge: true });
            } catch (migErr) {
              console.warn('Migration check non-fatal error:', migErr);
            }
          }

          setDoc(userRef, { uid, lastSyncedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.warn('User doc initialization error:', err);
      }
    };

    initCloudAccount();

    const handleSnapshotError = async (err: unknown, colName: string) => {
      console.warn(`${colName} snapshot error:`, err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes('permission') ||
        errMsg.includes('token') ||
        errMsg.includes('auth') ||
        errMsg.includes('unauthenticated') ||
        (err as { code?: string })?.code === 'permission-denied'
      ) {
        const refreshed = await handleTokenRefresh(true);
        if (!refreshed) {
          setIsSessionExpired(true);
          setSyncError('Google session expired. Tap Re-authenticate to resume cloud sync.');
          setCloudSyncStatus('offline');
          setSyncStage('Auth Expired');
        }
      }
    };

    // Accounts subscription with metadata tracking & empty cache guard
    const unsubAccounts = onSnapshot(
      collection(db, 'users', uid, 'accounts'),
      { includeMetadataChanges: true },
      snapshot => {
        if (isCancelled) return;
        // EMPTY CACHE GUARD: Do not overwrite state with an empty snapshot coming from cache
        if (snapshot.empty && snapshot.metadata.fromCache) return;

        const list: Account[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as Account));
        setAccounts(list);
        saveScopedData(STORAGE_KEYS.ACCOUNTS, uid, list);

        collectionStatus.accounts.fromServer = !snapshot.metadata.fromCache;
        collectionStatus.accounts.hasPendingWrites = snapshot.metadata.hasPendingWrites;
        collectionStatus.accounts.isError = false;
        evaluateSyncProgress();
      },
      error => {
        handleSnapshotError(error, 'accounts');
        collectionStatus.accounts.isError = true;
        evaluateSyncProgress();
      }
    );

    // Category groups subscription with metadata tracking & empty cache guard
    const unsubCategories = onSnapshot(
      collection(db, 'users', uid, 'categoryGroups'),
      { includeMetadataChanges: true },
      snapshot => {
        if (isCancelled) return;
        // EMPTY CACHE GUARD
        if (snapshot.empty && snapshot.metadata.fromCache) return;

        if (!snapshot.empty) {
          const list: CategoryGroup[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as CategoryGroup));
          setCategoryGroups(list);
          saveScopedData(STORAGE_KEYS.GROUPS, uid, list);
        }

        collectionStatus.categories.fromServer = !snapshot.metadata.fromCache;
        collectionStatus.categories.hasPendingWrites = snapshot.metadata.hasPendingWrites;
        collectionStatus.categories.isError = false;
        evaluateSyncProgress();
      },
      error => {
        handleSnapshotError(error, 'categories');
        collectionStatus.categories.isError = true;
        evaluateSyncProgress();
      }
    );

    // Groups & Occasions subscription with metadata tracking & empty cache guard
    const unsubGroups = onSnapshot(
      collection(db, 'users', uid, 'groups'),
      { includeMetadataChanges: true },
      snapshot => {
        if (isCancelled) return;
        // EMPTY CACHE GUARD
        if (snapshot.empty && snapshot.metadata.fromCache) return;

        const list: GroupOccasion[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as GroupOccasion));
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setGroups(list);
        saveScopedData(STORAGE_KEYS.OCCASIONS, uid, list);

        collectionStatus.groups.fromServer = !snapshot.metadata.fromCache;
        collectionStatus.groups.hasPendingWrites = snapshot.metadata.hasPendingWrites;
        collectionStatus.groups.isError = false;
        evaluateSyncProgress();
      },
      error => {
        handleSnapshotError(error, 'groups');
        collectionStatus.groups.isError = true;
        evaluateSyncProgress();
      }
    );

    // People & Debts subscription with metadata tracking & empty cache guard
    const unsubPeople = onSnapshot(
      collection(db, 'users', uid, 'people'),
      { includeMetadataChanges: true },
      snapshot => {
        if (isCancelled) return;
        // EMPTY CACHE GUARD
        if (snapshot.empty && snapshot.metadata.fromCache) return;

        const list: Person[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as Person));
        setPeople(list);
        saveScopedData(STORAGE_KEYS.PEOPLE, uid, list);

        collectionStatus.people.fromServer = !snapshot.metadata.fromCache;
        collectionStatus.people.hasPendingWrites = snapshot.metadata.hasPendingWrites;
        collectionStatus.people.isError = false;
        evaluateSyncProgress();
      },
      error => {
        handleSnapshotError(error, 'people');
        collectionStatus.people.isError = true;
        evaluateSyncProgress();
      }
    );

    // Transactions subscription with metadata tracking & empty cache guard
    const unsubTransactions = onSnapshot(
      collection(db, 'users', uid, 'transactions'),
      { includeMetadataChanges: true },
      snapshot => {
        if (isCancelled) return;
        // EMPTY CACHE GUARD
        if (snapshot.empty && snapshot.metadata.fromCache) return;

        const list: Transaction[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as Transaction));
        list.sort((a, b) => {
          if (b.date !== a.date) return b.date.localeCompare(a.date);
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        setTransactions(list);
        saveScopedData(STORAGE_KEYS.TRANSACTIONS, uid, list);

        collectionStatus.transactions.fromServer = !snapshot.metadata.fromCache;
        collectionStatus.transactions.hasPendingWrites = snapshot.metadata.hasPendingWrites;
        collectionStatus.transactions.isError = false;
        evaluateSyncProgress();
      },
      error => {
        handleSnapshotError(error, 'transactions');
        collectionStatus.transactions.isError = true;
        evaluateSyncProgress();
      }
    );

    return () => {
      isCancelled = true;
      unsubAccounts();
      unsubCategories();
      unsubGroups();
      unsubPeople();
      unsubTransactions();
    };
  }, [currentUser]);

  // Google Sign-In Flow
  const signInWithGoogle = async () => {
    try {
      setCloudSyncStatus('syncing');
      setSyncProgress(25);
      setSyncStage('Signing in with Google...');
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign-in failed:', error);
      setCloudSyncStatus('guest');
      setSyncProgress(100);
      setSyncStage('Sign-in cancelled');
      throw error;
    }
  };

  // Sign-Out Flow: Clean reset back to guest state
  const signOutUser = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setAccounts(INITIAL_ACCOUNTS);
      setCategoryGroups(INITIAL_CATEGORY_GROUPS);
      setTransactions(INITIAL_TRANSACTIONS);
      setPeople(INITIAL_PEOPLE);
      setGroups(INITIAL_GROUPS);
      setSessionGroupIdState(null);
      setPendingConflict(null);
      setCloudSyncStatus('guest');
      setSyncProgress(100);
      setSyncStage('Signed Out');
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  };

  // Multi-Device Conflict Resolution with granular document-level merging
  const resolveConflict = async (resolution: 'merge' | 'cloud' | 'local') => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    setPendingConflict(null);

    if (resolution === 'cloud') {
      // Pull fresh from cloud
      await syncNow();
      return;
    }

    if (resolution === 'local') {
      // Overwrite cloud with local
      setCloudSyncStatus('syncing');
      setSyncStage('Overwriting cloud with local data...');
      setSyncProgress(50);

      const remoteTxSnap = await getDocs(collection(db, 'users', uid, 'transactions'));
      const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
      remoteTxSnap.forEach(d => operations.push(b => b.delete(d.ref)));

      for (const tx of transactions) {
        operations.push(b => b.set(doc(db, 'users', uid, 'transactions', tx.id), sanitizeTx(tx)));
      }
      for (const acc of accounts) {
        operations.push(b => b.set(doc(db, 'users', uid, 'accounts', acc.id), sanitizeAccount(acc)));
      }
      for (const grp of categoryGroups) {
        operations.push(b => b.set(doc(db, 'users', uid, 'categoryGroups', grp.id), sanitizeCategoryGroup(grp)));
      }
      for (const occasion of groups) {
        operations.push(b => b.set(doc(db, 'users', uid, 'groups', occasion.id), sanitizeGroup(occasion)));
      }
      for (const person of people) {
        operations.push(b => b.set(doc(db, 'users', uid, 'people', person.id), sanitizePerson(person)));
      }
      await commitBatchesInChunks(operations, 400);

      setCloudSyncStatus('synced');
      setSyncProgress(100);
      setSyncStage('100% In Sync');
      setLastSyncedAt(new Date());
      return;
    }

    // Granular Smart Merge ('merge') - combines items from both devices by ID
    setCloudSyncStatus('syncing');
    setSyncStage('Performing granular multi-device merge...');
    setSyncProgress(30);

    try {
      const [remoteTxSnap, remoteAccSnap, remoteCatSnap, remoteGrpSnap, remotePplSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'transactions')),
        getDocs(collection(db, 'users', uid, 'accounts')),
        getDocs(collection(db, 'users', uid, 'categoryGroups')),
        getDocs(collection(db, 'users', uid, 'groups')),
        getDocs(collection(db, 'users', uid, 'people')),
      ]);

      const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

      // 1. Transactions merge
      const remoteTxMap = new Map<string, Transaction>();
      remoteTxSnap.forEach(d => remoteTxMap.set(d.id, d.data() as Transaction));

      const mergedTxMap = new Map<string, Transaction>(remoteTxMap);
      for (const localTx of transactions) {
        const remote = remoteTxMap.get(localTx.id);
        if (!remote) {
          // Unique to local: add to cloud and merged map
          mergedTxMap.set(localTx.id, localTx);
          operations.push(b => b.set(doc(db, 'users', uid, 'transactions', localTx.id), sanitizeTx(localTx)));
        } else {
          // Compare updatedAt timestamps
          const localTs = localTx.updatedAt || localTx.createdAt || '';
          const remoteTs = remote.updatedAt || remote.createdAt || '';
          if (localTs > remoteTs) {
            mergedTxMap.set(localTx.id, localTx);
            operations.push(b => b.set(doc(db, 'users', uid, 'transactions', localTx.id), sanitizeTx(localTx)));
          }
        }
      }
      const finalTxList = Array.from(mergedTxMap.values()).sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      // 2. Accounts merge
      const remoteAccMap = new Map<string, Account>();
      remoteAccSnap.forEach(d => remoteAccMap.set(d.id, d.data() as Account));

      const mergedAccMap = new Map<string, Account>(remoteAccMap);
      for (const localAcc of accounts) {
        const remote = remoteAccMap.get(localAcc.id);
        if (!remote) {
          mergedAccMap.set(localAcc.id, localAcc);
          operations.push(b => b.set(doc(db, 'users', uid, 'accounts', localAcc.id), sanitizeAccount(localAcc)));
        } else {
          const localTs = localAcc.updatedAt || '';
          const remoteTs = remote.updatedAt || '';
          if (localTs > remoteTs) {
            mergedAccMap.set(localAcc.id, localAcc);
            operations.push(b => b.set(doc(db, 'users', uid, 'accounts', localAcc.id), sanitizeAccount(localAcc)));
          }
        }
      }
      const finalAccList = Array.from(mergedAccMap.values());

      // 3. Category Groups merge
      const remoteCatMap = new Map<string, CategoryGroup>();
      remoteCatSnap.forEach(d => remoteCatMap.set(d.id, d.data() as CategoryGroup));

      const mergedCatMap = new Map<string, CategoryGroup>(remoteCatMap);
      for (const localCat of categoryGroups) {
        const remote = remoteCatMap.get(localCat.id);
        if (!remote) {
          mergedCatMap.set(localCat.id, localCat);
          operations.push(b => b.set(doc(db, 'users', uid, 'categoryGroups', localCat.id), sanitizeCategoryGroup(localCat)));
        } else {
          const localTs = localCat.updatedAt || '';
          const remoteTs = remote.updatedAt || '';
          if (localTs > remoteTs) {
            mergedCatMap.set(localCat.id, localCat);
            operations.push(b => b.set(doc(db, 'users', uid, 'categoryGroups', localCat.id), sanitizeCategoryGroup(localCat)));
          }
        }
      }
      const finalCatList = Array.from(mergedCatMap.values());

      // 4. Groups & Occasions merge
      const remoteGrpMap = new Map<string, GroupOccasion>();
      remoteGrpSnap.forEach(d => remoteGrpMap.set(d.id, d.data() as GroupOccasion));

      const mergedGrpMap = new Map<string, GroupOccasion>(remoteGrpMap);
      for (const localGrp of groups) {
        const remote = remoteGrpMap.get(localGrp.id);
        if (!remote) {
          mergedGrpMap.set(localGrp.id, localGrp);
          operations.push(b => b.set(doc(db, 'users', uid, 'groups', localGrp.id), sanitizeGroup(localGrp)));
        } else {
          const localTs = localGrp.updatedAt || localGrp.createdAt || '';
          const remoteTs = remote.updatedAt || remote.createdAt || '';
          if (localTs > remoteTs) {
            mergedGrpMap.set(localGrp.id, localGrp);
            operations.push(b => b.set(doc(db, 'users', uid, 'groups', localGrp.id), sanitizeGroup(localGrp)));
          }
        }
      }
      const finalGrpList = Array.from(mergedGrpMap.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // 5. People merge
      const remotePplMap = new Map<string, Person>();
      remotePplSnap.forEach(d => remotePplMap.set(d.id, d.data() as Person));

      const mergedPplMap = new Map<string, Person>(remotePplMap);
      for (const localPerson of people) {
        const remote = remotePplMap.get(localPerson.id);
        if (!remote) {
          mergedPplMap.set(localPerson.id, localPerson);
          operations.push(b => b.set(doc(db, 'users', uid, 'people', localPerson.id), sanitizePerson(localPerson)));
        } else {
          const localTs = localPerson.updatedAt || localPerson.createdAt || '';
          const remoteTs = remote.updatedAt || remote.createdAt || '';
          if (localTs > remoteTs) {
            mergedPplMap.set(localPerson.id, localPerson);
            operations.push(b => b.set(doc(db, 'users', uid, 'people', localPerson.id), sanitizePerson(localPerson)));
          }
        }
      }
      const finalPplList = Array.from(mergedPplMap.values());

      setSyncProgress(70);
      setSyncStage('Writing merged records to cloud...');
      if (operations.length > 0) {
        await commitBatchesInChunks(operations, 400);
      }

      // Update local state with the merged union
      setTransactions(finalTxList);
      saveScopedData(STORAGE_KEYS.TRANSACTIONS, uid, finalTxList);

      setAccounts(finalAccList);
      saveScopedData(STORAGE_KEYS.ACCOUNTS, uid, finalAccList);

      setCategoryGroups(finalCatList);
      saveScopedData(STORAGE_KEYS.GROUPS, uid, finalCatList);

      setGroups(finalGrpList);
      saveScopedData(STORAGE_KEYS.OCCASIONS, uid, finalGrpList);

      setPeople(finalPplList);
      saveScopedData(STORAGE_KEYS.PEOPLE, uid, finalPplList);

      setCloudSyncStatus('synced');
      setSyncProgress(100);
      setSyncStage('100% In Sync');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Granular merge conflict resolution failed:', err);
      const errInfo = handleFirestoreError(err, OperationType.WRITE, 'resolveConflict.merge');
      setSyncError(`Merge failed: ${errInfo.error}`);
      setCloudSyncStatus('offline');
    }
  };

  // Authoritative manual trigger to re-sync directly from Firestore with pending write waiting
  const syncNow = async () => {
    if (!currentUser) return;
    setCloudSyncStatus('syncing');
    setSyncProgress(15);
    setSyncStage('Flushing pending writes...');
    const uid = currentUser.uid;

    try {
      // Wait for pending writes with timeout safeguard so it never hangs indefinitely
      await Promise.race([
        waitForPendingWrites(db),
        new Promise(resolve => setTimeout(resolve, 3500)),
      ]);

      setSyncProgress(35);
      setSyncStage('Fetching accounts...');
      const accSnap = await getDocs(collection(db, 'users', uid, 'accounts'));
      const accList: Account[] = [];
      accSnap.forEach(d => accList.push(d.data() as Account));
      setAccounts(accList);
      saveScopedData(STORAGE_KEYS.ACCOUNTS, uid, accList);

      setSyncProgress(55);
      setSyncStage('Fetching categories & groups...');
      const [catSnap, grpSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'categoryGroups')),
        getDocs(collection(db, 'users', uid, 'groups')),
      ]);

      if (!catSnap.empty) {
        const catList: CategoryGroup[] = [];
        catSnap.forEach(d => catList.push(d.data() as CategoryGroup));
        setCategoryGroups(catList);
        saveScopedData(STORAGE_KEYS.GROUPS, uid, catList);
      }

      const grpList: GroupOccasion[] = [];
      grpSnap.forEach(d => grpList.push(d.data() as GroupOccasion));
      grpList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setGroups(grpList);
      saveScopedData(STORAGE_KEYS.OCCASIONS, uid, grpList);

      setSyncProgress(75);
      setSyncStage('Fetching people & movements...');
      const [pplSnap, txSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'people')),
        getDocs(collection(db, 'users', uid, 'transactions')),
      ]);

      const pplList: Person[] = [];
      pplSnap.forEach(d => pplList.push(d.data() as Person));
      setPeople(pplList);
      saveScopedData(STORAGE_KEYS.PEOPLE, uid, pplList);

      const txList: Transaction[] = [];
      txSnap.forEach(d => txList.push(d.data() as Transaction));
      txList.sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      setTransactions(txList);
      saveScopedData(STORAGE_KEYS.TRANSACTIONS, uid, txList);

      setSyncProgress(100);
      setSyncStage('100% In Sync');
      setLastSyncedAt(new Date());
      setCloudSyncStatus('synced');
    } catch (e) {
      console.error('Direct sync failed:', e);
      const errInfo = handleFirestoreError(e, OperationType.GET, 'syncNow');
      setSyncError(`Sync failed: ${errInfo.error}`);
      setCloudSyncStatus('offline');
      setSyncStage('Sync Failed (Offline)');
    }
  };

  // ACTION 1: Clear Local Device Cache & Log Out (Does not touch Cloud database!)
  const clearDeviceCacheAndSignOut = async () => {
    try {
      // Purge all localStorage entries
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Error clearing browser storage:', e);
      }

      // Sign out from Firebase Auth
      await signOut(auth);

      // Reset in-memory state
      setCurrentUser(null);
      setAccounts(INITIAL_ACCOUNTS);
      setCategoryGroups(INITIAL_CATEGORY_GROUPS);
      setTransactions(INITIAL_TRANSACTIONS);
      setPeople(INITIAL_PEOPLE);
      setGroups(INITIAL_GROUPS);
      setSessionGroupIdState(null);
      setPendingConflict(null);
      setCloudSyncStatus('guest');
      setSyncProgress(100);
      setSyncStage('Cache Cleared');
    } catch (err) {
      console.error('Failed to clear device cache:', err);
    }
  };

  // ACTION 2: Wipe Cloud Database & Start Fresh (Deletes all documents in Firestore under users/{uid})
  const resetCloudDatabase = async () => {
    if (!currentUser) return;
    setCloudSyncStatus('syncing');
    setSyncProgress(20);
    setSyncStage('Purging cloud records in Firestore...');
    const uid = currentUser.uid;

    try {
      const [txSnap, grpSnap, pplSnap, accSnap, catSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'transactions')),
        getDocs(collection(db, 'users', uid, 'groups')),
        getDocs(collection(db, 'users', uid, 'people')),
        getDocs(collection(db, 'users', uid, 'accounts')),
        getDocs(collection(db, 'users', uid, 'categoryGroups')),
      ]);

      setSyncProgress(60);
      setSyncStage('Writing clean templates...');
      const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

      txSnap.forEach(d => operations.push(b => b.delete(d.ref)));
      grpSnap.forEach(d => operations.push(b => b.delete(d.ref)));
      pplSnap.forEach(d => operations.push(b => b.delete(d.ref)));
      accSnap.forEach(d => operations.push(b => b.delete(d.ref)));
      catSnap.forEach(d => operations.push(b => b.delete(d.ref)));

      for (const acc of INITIAL_ACCOUNTS) {
        operations.push(b => b.set(doc(db, 'users', uid, 'accounts', acc.id), sanitizeAccount(acc)));
      }
      for (const catGrp of INITIAL_CATEGORY_GROUPS) {
        operations.push(b => b.set(doc(db, 'users', uid, 'categoryGroups', catGrp.id), sanitizeCategoryGroup(catGrp)));
      }
      // Guarantee seedV2Applied is retained on user doc
      operations.push(b => b.set(doc(db, 'users', uid), { seedV2Applied: true }, { merge: true }));

      await commitBatchesInChunks(operations, 400);

      // Reset local state
      setAccounts(INITIAL_ACCOUNTS);
      setCategoryGroups(INITIAL_CATEGORY_GROUPS);
      setTransactions(INITIAL_TRANSACTIONS);
      setPeople(INITIAL_PEOPLE);
      setGroups(INITIAL_GROUPS);
      setSessionGroupIdState(null);
      setPendingConflict(null);

      // Save reset state to scoped storage
      saveScopedData(STORAGE_KEYS.ACCOUNTS, uid, INITIAL_ACCOUNTS);
      saveScopedData(STORAGE_KEYS.GROUPS, uid, INITIAL_CATEGORY_GROUPS);
      saveScopedData(STORAGE_KEYS.TRANSACTIONS, uid, INITIAL_TRANSACTIONS);
      saveScopedData(STORAGE_KEYS.PEOPLE, uid, INITIAL_PEOPLE);
      saveScopedData(STORAGE_KEYS.OCCASIONS, uid, INITIAL_GROUPS);

      setSyncProgress(100);
      setSyncStage('100% In Sync (Reset Complete)');
      setLastSyncedAt(new Date());
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Failed to wipe cloud database:', err);
      const errInfo = handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
      setSyncError(`Cloud reset failed: ${errInfo.error}`);
      setCloudSyncStatus('offline');
      setSyncStage('Cloud wipe failed');
    }
  };

  const resetToInitial = async () => {
    await resetCloudDatabase();
  };

  // Group Occasion Summaries
  const groupSummaries = useMemo<GroupOccasionSummary[]>(() => {
    const sorted = [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return sorted.map(group => {
      const groupTxs = transactions.filter(t => t.occasionGroupId === group.id);
      const totalSpent = groupTxs.reduce((sum, t) => {
        if (t.type === 'expense') {
          const amt = Number(t.amount) || 0;
          return sum + (t.owedAmount ? Math.max(0, amt - t.owedAmount) : amt);
        }
        return sum;
      }, 0);
      const budgetPercent = group.budget && group.budget > 0 ? (totalSpent / group.budget) * 100 : undefined;
      const remainingBudget = group.budget ? Math.max(0, group.budget - totalSpent) : undefined;
      return {
        group,
        totalSpent,
        transactionCount: groupTxs.length,
        budgetPercent,
        remainingBudget,
      };
    });
  }, [groups, transactions]);

  // People Debt Summaries
  const personDebtSummaries = useMemo<PersonDebtSummary[]>(() => {
    return people.map(p => {
      const personTxs = transactions.filter(t => t.owedByPersonId === p.id);
      const openTransactions = personTxs.filter(t => !t.isSettled);
      const settledTransactions = personTxs.filter(t => !!t.isSettled);
      const totalOwed = openTransactions.reduce(
        (sum, t) => sum + (Number(t.owedAmount !== undefined ? t.owedAmount : t.amount) || 0),
        0
      );
      const totalSettled = settledTransactions.reduce(
        (sum, t) => sum + (Number(t.owedAmount !== undefined ? t.owedAmount : t.amount) || 0),
        0
      );
      return {
        person: p,
        totalOwed,
        totalSettled,
        openCount: openTransactions.length,
        openTransactions,
        settledTransactions,
      };
    });
  }, [people, transactions]);

  const totalPendingOwed = useMemo(() => {
    return personDebtSummaries.reduce((sum, p) => sum + p.totalOwed, 0);
  }, [personDebtSummaries]);

  // Dynamic balance calculations
  const calculatedBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    for (const acc of accounts) {
      balances[acc.id] = Number(acc.initialBalance) || 0;
    }

    for (const tx of transactions) {
      if (tx.varianceTag === 'unrecovered_discount') {
        continue;
      }

      const amt = Number(tx.amount) || 0;
      if (tx.type === 'expense') {
        if (balances[tx.accountId] !== undefined) {
          balances[tx.accountId] -= amt;
        }
      } else if (tx.type === 'income') {
        if (balances[tx.accountId] !== undefined) {
          balances[tx.accountId] += amt;
        }
      } else if (tx.type === 'transfer') {
        if (balances[tx.accountId] !== undefined) {
          balances[tx.accountId] -= amt;
        }
        if (tx.toAccountId && balances[tx.toAccountId] !== undefined) {
          balances[tx.toAccountId] += amt;
        }
      }
    }

    return balances;
  }, [accounts, transactions]);

  // Total Net Worth across active accounts
  const totalNetWorth = useMemo(() => {
    return accounts
      .filter(a => !a.isArchived)
      .reduce((sum, a) => sum + (calculatedBalances[a.id] || 0), 0);
  }, [accounts, calculatedBalances]);

  // Format Euro currency consistently
  const formatEUR = (amount: number): string => {
    const val = Number(amount) || 0;
    return `€${val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Current Month statistics
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDayOfMonth = Math.max(1, now.getDate());

  const monthStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthTx = transactions.filter(t => t.date.startsWith(monthPrefix));

    let totalExpenses = 0;
    let totalIncome = 0;
    let totalTransfers = 0;

    for (const tx of monthTx) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'expense') {
        if (tx.varianceTag === 'unrecovered_discount') {
          totalExpenses += amt;
        } else if (tx.owedAmount && tx.owedAmount > 0) {
          const personalShare = Math.max(0, amt - tx.owedAmount);
          totalExpenses += personalShare;
        } else {
          totalExpenses += amt;
        }
      } else if (tx.type === 'income') {
        if (tx.tags?.includes('debt_repayment') && tx.varianceTag !== 'repayment_extra') {
          // Principal debt repayment
        } else {
          totalIncome += amt;
        }
      } else if (tx.type === 'transfer') {
        totalTransfers += amt;
      }
    }

    const netSavings = totalIncome - totalExpenses;
    const dailyVelocity = currentDayOfMonth > 0 ? totalExpenses / currentDayOfMonth : 0;
    const projectedMonthEndExpense = dailyVelocity * daysInMonth;

    return {
      totalExpenses,
      totalIncome,
      totalTransfers,
      netSavings,
      dailyVelocity,
      projectedMonthEndExpense,
      daysInMonth,
      currentDayOfMonth,
    };
  }, [transactions, currentYear, currentMonth, currentDayOfMonth, daysInMonth]);

  // Category group stats
  const categoryGroupStats = useMemo<CategoryGroupStat[]>(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthTx = transactions.filter(t => t.date.startsWith(monthPrefix) && t.type === 'expense');
    const totalExpense = monthStats.totalExpenses;

    return categoryGroups.map(group => {
      const groupTx = monthTx.filter(t => t.groupId === group.id);
      const actualAmount = groupTx.reduce((sum, t) => {
        const amt = Number(t.amount) || 0;
        if (t.owedAmount && t.owedAmount > 0) {
          return sum + Math.max(0, amt - t.owedAmount);
        }
        return sum + amt;
      }, 0);

      const actualPercent = totalExpense > 0 ? (actualAmount / totalExpense) * 100 : 0;
      const targetPercent = group.targetAllocationPercent || 0;
      const variancePercent = actualPercent - targetPercent;
      const dailyVelocity = currentDayOfMonth > 0 ? actualAmount / currentDayOfMonth : 0;
      const projectedMonthEnd = dailyVelocity * daysInMonth;

      const categoryBreakdown = group.categories.map(cat => {
        const catTx = groupTx.filter(t => t.categoryId === cat.id);
        const catAmount = catTx.reduce((sum, t) => {
          const amt = Number(t.amount) || 0;
          if (t.owedAmount && t.owedAmount > 0) {
            return sum + Math.max(0, amt - t.owedAmount);
          }
          return sum + amt;
        }, 0);
        const percentOfGroup = actualAmount > 0 ? (catAmount / actualAmount) * 100 : 0;
        return {
          category: cat,
          amount: catAmount,
          percentOfGroup,
        };
      });

      return {
        group,
        actualAmount,
        actualPercent,
        targetPercent,
        variancePercent,
        dailyVelocity,
        projectedMonthEnd,
        categoryBreakdown,
      };
    });
  }, [categoryGroups, transactions, monthStats.totalExpenses, currentYear, currentMonth, currentDayOfMonth, daysInMonth]);

  // Actions with immediate state update, local cache persistence, and asynchronous background Firestore sync
  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
    const newTx: Transaction = {
      ...txData,
      id: txData.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: txData.createdAt || new Date().toISOString(),
    };
    const prev = transactions;
    const next = [newTx, ...transactions];
    setTransactions(next);
    saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeTx(newTx);
      setDoc(doc(db, 'users', currentUser.uid, 'transactions', newTx.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/transactions/${newTx.id}`);
        setSyncError(`Failed to save transaction: ${errInfo.error}`);
        setTransactions(prev);
        saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser.uid, prev);
      });
    }
  };

  const updateTransaction = (id: string, partial: Partial<Transaction>) => {
    const prev = transactions;
    const existing = transactions.find(t => t.id === id);
    if (!existing) return;
    const updatedTx: Transaction = { ...existing, ...partial };
    const next = transactions.map(t => (t.id === id ? updatedTx : t));
    setTransactions(next);
    saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeTx(updatedTx);
      setDoc(doc(db, 'users', currentUser.uid, 'transactions', id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/transactions/${id}`);
        setSyncError(`Failed to update transaction: ${errInfo.error}`);
        setTransactions(prev);
        saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser.uid, prev);
      });
    }
  };

  const deleteTransaction = (id: string) => {
    const prev = transactions;
    const next = transactions.filter(t => t.id !== id);
    setTransactions(next);
    saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', id)).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/transactions/${id}`);
        setSyncError(`Failed to delete transaction: ${errInfo.error}`);
        setTransactions(prev);
        saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser.uid, prev);
      });
    }
  };

  const transferFunds = ({ fromAccountId, toAccountId, amount, note, date }: TransferPayload) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'transfer',
      amount,
      accountId: fromAccountId,
      toAccountId,
      date,
      note: note || 'Account transfer',
      createdAt: new Date().toISOString(),
    };
    const prev = transactions;
    const next = [newTx, ...transactions];
    setTransactions(next);
    saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeTx(newTx);
      setDoc(doc(db, 'users', currentUser.uid, 'transactions', newTx.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/transactions/${newTx.id}`);
        setSyncError(`Failed to save transfer: ${errInfo.error}`);
        setTransactions(prev);
        saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser.uid, prev);
      });
    }
  };

  const addAccount = (accountData: Omit<Account, 'id'>) => {
    const newAcc: Account = {
      ...accountData,
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const prev = accounts;
    const next = [...accounts, newAcc];
    setAccounts(next);
    saveScopedData(STORAGE_KEYS.ACCOUNTS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeAccount(newAcc);
      setDoc(doc(db, 'users', currentUser.uid, 'accounts', newAcc.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/accounts/${newAcc.id}`);
        setSyncError(`Failed to add account: ${errInfo.error}`);
        setAccounts(prev);
        saveScopedData(STORAGE_KEYS.ACCOUNTS, currentUser.uid, prev);
      });
    }
  };

  const updateAccount = (id: string, partial: Partial<Account>) => {
    const prev = accounts;
    const existing = accounts.find(a => a.id === id);
    if (!existing) return;
    const updatedAcc: Account = { ...existing, ...partial };
    const next = accounts.map(a => (a.id === id ? updatedAcc : a));
    setAccounts(next);
    saveScopedData(STORAGE_KEYS.ACCOUNTS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeAccount(updatedAcc);
      setDoc(doc(db, 'users', currentUser.uid, 'accounts', id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/accounts/${id}`);
        setSyncError(`Failed to update account: ${errInfo.error}`);
        setAccounts(prev);
        saveScopedData(STORAGE_KEYS.ACCOUNTS, currentUser.uid, prev);
      });
    }
  };

  const deleteAccount = (id: string) => {
    const prev = accounts;
    const next = accounts.filter(a => a.id !== id);
    setAccounts(next);
    saveScopedData(STORAGE_KEYS.ACCOUNTS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      deleteDoc(doc(db, 'users', currentUser.uid, 'accounts', id)).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/accounts/${id}`);
        setSyncError(`Failed to delete account: ${errInfo.error}`);
        setAccounts(prev);
        saveScopedData(STORAGE_KEYS.ACCOUNTS, currentUser.uid, prev);
      });
    }
  };

  const updateCategoryGroupTarget = (groupId: string, targetPercent: number) => {
    const prev = categoryGroups;
    const existing = categoryGroups.find(g => g.id === groupId);
    if (!existing) return;
    const updatedGrp: CategoryGroup = { ...existing, targetAllocationPercent: targetPercent };
    const next = categoryGroups.map(g => (g.id === groupId ? updatedGrp : g));
    setCategoryGroups(next);
    saveScopedData(STORAGE_KEYS.GROUPS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeCategoryGroup(updatedGrp);
      setDoc(doc(db, 'users', currentUser.uid, 'categoryGroups', groupId), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/categoryGroups/${groupId}`);
        setSyncError(`Failed to update category target: ${errInfo.error}`);
        setCategoryGroups(prev);
        saveScopedData(STORAGE_KEYS.GROUPS, currentUser.uid, prev);
      });
    }
  };

  const addCategoryItem = (groupId: string, itemData: Omit<CategoryItem, 'id' | 'groupId'>) => {
    const newCat: CategoryItem = {
      ...itemData,
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      groupId,
    };
    const prev = categoryGroups;
    const existing = categoryGroups.find(g => g.id === groupId);
    if (!existing) return;
    const updatedGrp: CategoryGroup = { ...existing, categories: [...existing.categories, newCat] };
    const next = categoryGroups.map(g => (g.id === groupId ? updatedGrp : g));
    setCategoryGroups(next);
    saveScopedData(STORAGE_KEYS.GROUPS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeCategoryGroup(updatedGrp);
      setDoc(doc(db, 'users', currentUser.uid, 'categoryGroups', groupId), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/categoryGroups/${groupId}`);
        setSyncError(`Failed to add category item: ${errInfo.error}`);
        setCategoryGroups(prev);
        saveScopedData(STORAGE_KEYS.GROUPS, currentUser.uid, prev);
      });
    }
  };

  const updateCategoryItem = (categoryId: string, partial: Partial<CategoryItem>) => {
    const prev = categoryGroups;
    const existingGrp = categoryGroups.find(g => g.categories.some(c => c.id === categoryId));
    if (!existingGrp) return;
    const updatedGrp: CategoryGroup = {
      ...existingGrp,
      categories: existingGrp.categories.map(c => (c.id === categoryId ? { ...c, ...partial } : c)),
    };
    const next = categoryGroups.map(g => (g.id === existingGrp.id ? updatedGrp : g));
    setCategoryGroups(next);
    saveScopedData(STORAGE_KEYS.GROUPS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeCategoryGroup(updatedGrp);
      setDoc(doc(db, 'users', currentUser.uid, 'categoryGroups', updatedGrp.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/categoryGroups/${updatedGrp.id}`);
        setSyncError(`Failed to update category: ${errInfo.error}`);
        setCategoryGroups(prev);
        saveScopedData(STORAGE_KEYS.GROUPS, currentUser.uid, prev);
      });
    }
  };

  const deleteCategoryItem = (categoryId: string) => {
    const prev = categoryGroups;
    const existingGrp = categoryGroups.find(g => g.categories.some(c => c.id === categoryId));
    if (!existingGrp) return;
    const updatedGrp: CategoryGroup = {
      ...existingGrp,
      categories: existingGrp.categories.filter(c => c.id !== categoryId || c.isDefaultSortLater),
    };
    const next = categoryGroups.map(g => (g.id === existingGrp.id ? updatedGrp : g));
    setCategoryGroups(next);
    saveScopedData(STORAGE_KEYS.GROUPS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeCategoryGroup(updatedGrp);
      setDoc(doc(db, 'users', currentUser.uid, 'categoryGroups', updatedGrp.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/categoryGroups/${updatedGrp.id}`);
        setSyncError(`Failed to delete category: ${errInfo.error}`);
        setCategoryGroups(prev);
        saveScopedData(STORAGE_KEYS.GROUPS, currentUser.uid, prev);
      });
    }
  };

  const addSubcategory = (categoryId: string, name: string, icon?: string) => {
    const prev = categoryGroups;
    const existingGrp = categoryGroups.find(g => g.categories.some(c => c.id === categoryId));
    if (!existingGrp) return;
    const newSub: Subcategory = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      icon: icon || 'Tag',
    };
    const updatedGrp: CategoryGroup = {
      ...existingGrp,
      categories: existingGrp.categories.map(c =>
        c.id === categoryId
          ? { ...c, subcategories: [...(c.subcategories || []), newSub] }
          : c
      ),
    };
    const next = categoryGroups.map(g => (g.id === existingGrp.id ? updatedGrp : g));
    setCategoryGroups(next);
    saveScopedData(STORAGE_KEYS.GROUPS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeCategoryGroup(updatedGrp);
      setDoc(doc(db, 'users', currentUser.uid, 'categoryGroups', updatedGrp.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/categoryGroups/${updatedGrp.id}`);
        setSyncError(`Failed to add subcategory: ${errInfo.error}`);
        setCategoryGroups(prev);
        saveScopedData(STORAGE_KEYS.GROUPS, currentUser.uid, prev);
      });
    }
  };

  const updateSubcategory = (categoryId: string, subcategoryId: string, name: string, icon?: string) => {
    const prev = categoryGroups;
    const existingGrp = categoryGroups.find(g => g.categories.some(c => c.id === categoryId));
    if (!existingGrp) return;
    const updatedGrp: CategoryGroup = {
      ...existingGrp,
      categories: existingGrp.categories.map(c => {
        if (c.id === categoryId) {
          return {
            ...c,
            subcategories: (c.subcategories || []).map(s =>
              s.id === subcategoryId
                ? { ...s, name: name.trim(), icon: icon !== undefined ? icon : s.icon }
                : s
            ),
          };
        }
        return c;
      }),
    };
    const next = categoryGroups.map(g => (g.id === existingGrp.id ? updatedGrp : g));
    setCategoryGroups(next);
    saveScopedData(STORAGE_KEYS.GROUPS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeCategoryGroup(updatedGrp);
      setDoc(doc(db, 'users', currentUser.uid, 'categoryGroups', updatedGrp.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/categoryGroups/${updatedGrp.id}`);
        setSyncError(`Failed to update subcategory: ${errInfo.error}`);
        setCategoryGroups(prev);
        saveScopedData(STORAGE_KEYS.GROUPS, currentUser.uid, prev);
      });
    }
  };

  const deleteSubcategory = (categoryId: string, subcategoryId: string) => {
    const prev = categoryGroups;
    const existingGrp = categoryGroups.find(g => g.categories.some(c => c.id === categoryId));
    if (!existingGrp) return;
    const updatedGrp: CategoryGroup = {
      ...existingGrp,
      categories: existingGrp.categories.map(c => {
        if (c.id === categoryId) {
          return {
            ...c,
            subcategories: (c.subcategories || []).filter(s => s.id !== subcategoryId),
          };
        }
        return c;
      }),
    };
    const next = categoryGroups.map(g => (g.id === existingGrp.id ? updatedGrp : g));
    setCategoryGroups(next);
    saveScopedData(STORAGE_KEYS.GROUPS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeCategoryGroup(updatedGrp);
      setDoc(doc(db, 'users', currentUser.uid, 'categoryGroups', updatedGrp.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/categoryGroups/${updatedGrp.id}`);
        setSyncError(`Failed to delete subcategory: ${errInfo.error}`);
        setCategoryGroups(prev);
        saveScopedData(STORAGE_KEYS.GROUPS, currentUser.uid, prev);
      });
    }
  };

  const addPerson = (data: Omit<Person, 'id' | 'createdAt'>) => {
    const newPerson: Person = {
      ...data,
      id: `person-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const prev = people;
    const next = [...people, newPerson];
    setPeople(next);
    saveScopedData(STORAGE_KEYS.PEOPLE, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizePerson(newPerson);
      setDoc(doc(db, 'users', currentUser.uid, 'people', newPerson.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/people/${newPerson.id}`);
        setSyncError(`Failed to add person: ${errInfo.error}`);
        setPeople(prev);
        saveScopedData(STORAGE_KEYS.PEOPLE, currentUser.uid, prev);
      });
    }
  };

  const updatePerson = (id: string, partial: Partial<Person>) => {
    const prev = people;
    const existing = people.find(p => p.id === id);
    if (!existing) return;
    const updatedPerson: Person = { ...existing, ...partial };
    const next = people.map(p => (p.id === id ? updatedPerson : p));
    setPeople(next);
    saveScopedData(STORAGE_KEYS.PEOPLE, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizePerson(updatedPerson);
      setDoc(doc(db, 'users', currentUser.uid, 'people', id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/people/${id}`);
        setSyncError(`Failed to update person: ${errInfo.error}`);
        setPeople(prev);
        saveScopedData(STORAGE_KEYS.PEOPLE, currentUser.uid, prev);
      });
    }
  };

  const deletePerson = (id: string): { success: boolean; error?: string } => {
    const hasTransactions = transactions.some(t => t.owedByPersonId === id);
    if (hasTransactions) {
      return {
        success: false,
        error: 'Cannot delete a person who has movements or open debts associated.',
      };
    }
    const prev = people;
    const next = people.filter(p => p.id !== id);
    setPeople(next);
    saveScopedData(STORAGE_KEYS.PEOPLE, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      deleteDoc(doc(db, 'users', currentUser.uid, 'people', id)).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/people/${id}`);
        setSyncError(`Failed to delete person: ${errInfo.error}`);
        setPeople(prev);
        saveScopedData(STORAGE_KEYS.PEOPLE, currentUser.uid, prev);
      });
    }
    return { success: true };
  };

  const settleRepayment = (payload: RepaymentPayload) => {
    const {
      personId,
      selectedTransactionIds,
      actualAmountReceived,
      toAccountId,
      date,
      note,
    } = payload;

    const person = people.find(p => p.id === personId);
    const personName = person ? person.name : 'Person';

    const selectedTxs = transactions.filter(t => selectedTransactionIds.includes(t.id));
    const expectedTotal = selectedTxs.reduce(
      (sum, t) => sum + (Number(t.owedAmount !== undefined ? t.owedAmount : t.amount) || 0),
      0
    );

    const repaymentId = `repay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const diff = Number((actualAmountReceived - expectedTotal).toFixed(2));

    const updatedTxs: Transaction[] = [];
    const newTxs: Transaction[] = [];

    const updated = transactions.map(t => {
      if (selectedTransactionIds.includes(t.id)) {
        const u = {
          ...t,
          isSettled: true,
          settledAt: date,
          settledRepaymentId: repaymentId,
        };
        updatedTxs.push(u);
        return u;
      }
      return t;
    });

    if (diff > 0) {
      newTxs.push({
        id: `tx-${Date.now()}-princ-${Math.random().toString(36).substring(2, 5)}`,
        type: 'income',
        amount: expectedTotal,
        accountId: toAccountId,
        date,
        note: note || `Repayment received from ${personName}`,
        tags: ['debt_repayment'],
        createdAt: new Date().toISOString(),
      });

      newTxs.push({
        id: `tx-${Date.now()}-extra-${Math.random().toString(36).substring(2, 5)}`,
        type: 'income',
        amount: diff,
        accountId: toAccountId,
        categoryId: 'cat-refunds',
        groupId: 'grp-income',
        varianceTag: 'repayment_extra',
        tags: ['repayment_extra'],
        note: `[Repayment Extra] Round-up extra from ${personName}`,
        date,
        createdAt: new Date().toISOString(),
      });
    } else if (diff < 0) {
      newTxs.push({
        id: `tx-${Date.now()}-princ-${Math.random().toString(36).substring(2, 5)}`,
        type: 'income',
        amount: actualAmountReceived,
        accountId: toAccountId,
        date,
        note: note || `Repayment received from ${personName}`,
        tags: ['debt_repayment'],
        createdAt: new Date().toISOString(),
      });

      const firstTx = selectedTxs[0];
      const shortfall = Math.abs(diff);
      newTxs.push({
        id: `tx-${Date.now()}-shortfall-${Math.random().toString(36).substring(2, 5)}`,
        type: 'expense',
        amount: shortfall,
        accountId: toAccountId,
        categoryId: firstTx?.categoryId || 'cat-sort-later',
        groupId: firstTx?.groupId || 'grp-essentials',
        varianceTag: 'unrecovered_discount',
        tags: ['unrecovered_discount'],
        note: `[Unrecovered Discount] Shortfall absorbed for ${personName}`,
        date,
        createdAt: new Date().toISOString(),
      });
    } else {
      newTxs.push({
        id: `tx-${Date.now()}-princ-${Math.random().toString(36).substring(2, 5)}`,
        type: 'income',
        amount: actualAmountReceived,
        accountId: toAccountId,
        date,
        note: note || `Repayment received from ${personName}`,
        tags: ['debt_repayment'],
        createdAt: new Date().toISOString(),
      });
    }

    const prev = transactions;
    const next = [...newTxs, ...updated];
    setTransactions(next);
    saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const batch = writeBatch(db);
      for (const u of updatedTxs) {
        const ref = doc(db, 'users', currentUser.uid, 'transactions', u.id);
        batch.set(ref, sanitizeTx(u));
      }
      for (const n of newTxs) {
        const ref = doc(db, 'users', currentUser.uid, 'transactions', n.id);
        batch.set(ref, sanitizeTx(n));
      }
      batch.commit().catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/transactions`);
        setSyncError(`Failed to settle repayment: ${errInfo.error}`);
        setTransactions(prev);
        saveScopedData(STORAGE_KEYS.TRANSACTIONS, currentUser.uid, prev);
      });
    }
  };

  const setSessionGroupId = (id: string | null) => {
    setSessionGroupIdState(id);
  };

  const clearSessionGroup = () => {
    setSessionGroupIdState(null);
  };

  const addGroup = (groupData: Omit<GroupOccasion, 'id' | 'order' | 'createdAt'>) => {
    const newGroup: GroupOccasion = {
      ...groupData,
      id: `grp-occ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: groups.length,
      createdAt: new Date().toISOString(),
    };
    const prev = groups;
    const next = [...groups, newGroup];
    setGroups(next);
    saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeGroup(newGroup);
      setDoc(doc(db, 'users', currentUser.uid, 'groups', newGroup.id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/groups/${newGroup.id}`);
        setSyncError(`Failed to add group: ${errInfo.error}`);
        setGroups(prev);
        saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser.uid, prev);
      });
    }
  };

  const updateGroup = (id: string, partial: Partial<GroupOccasion>) => {
    const prev = groups;
    const existing = groups.find(g => g.id === id);
    if (!existing) return;
    const updatedGroup: GroupOccasion = { ...existing, ...partial };
    const next = groups.map(g => (g.id === id ? updatedGroup : g));
    setGroups(next);
    saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      const clean = sanitizeGroup(updatedGroup);
      setDoc(doc(db, 'users', currentUser.uid, 'groups', id), clean).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/groups/${id}`);
        setSyncError(`Failed to update group: ${errInfo.error}`);
        setGroups(prev);
        saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser.uid, prev);
      });
    }
  };

  const deleteGroup = (id: string) => {
    const prev = groups;
    const next = groups.filter(g => g.id !== id);
    setGroups(next);
    if (sessionGroupId === id) setSessionGroupIdState(null);
    saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser ? currentUser.uid : null, next);

    if (currentUser) {
      deleteDoc(doc(db, 'users', currentUser.uid, 'groups', id)).catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/groups/${id}`);
        setSyncError(`Failed to delete group: ${errInfo.error}`);
        setGroups(prev);
        saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser.uid, prev);
      });
    }
  };

  const reorderGroups = (orderedIds: string[]) => {
    const prev = groups;
    const map = new Map(groups.map(g => [g.id, g]));
    const reordered: GroupOccasion[] = [];
    orderedIds.forEach((id, index) => {
      const item = map.get(id);
      if (item) {
        reordered.push({ ...item, order: index });
        map.delete(id);
      }
    });
    Array.from(map.values()).forEach((item, index) => {
      reordered.push({ ...item, order: reordered.length + index });
    });
    setGroups(reordered);
    saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser ? currentUser.uid : null, reordered);

    if (currentUser && reordered.length > 0) {
      const batch = writeBatch(db);
      for (const g of reordered) {
        const ref = doc(db, 'users', currentUser.uid, 'groups', g.id);
        batch.set(ref, sanitizeGroup(g));
      }
      batch.commit().catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/groups`);
        setSyncError(`Failed to save group order: ${errInfo.error}`);
        setGroups(prev);
        saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser.uid, prev);
      });
    }
  };

  const togglePinGroup = (id: string) => {
    const prev = groups;
    const next = groups.map(g => {
      if (g.id === id) {
        const nextState = !g.isPinnedAlwaysActive;
        return { ...g, isPinnedAlwaysActive: nextState };
      }
      return { ...g, isPinnedAlwaysActive: false };
    });
    setGroups(next);
    saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser ? currentUser.uid : null, next);

    if (currentUser && next.length > 0) {
      const batch = writeBatch(db);
      for (const g of next) {
        const ref = doc(db, 'users', currentUser.uid, 'groups', g.id);
        batch.set(ref, sanitizeGroup(g));
      }
      batch.commit().catch(err => {
        const errInfo = handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/groups`);
        setSyncError(`Failed to toggle pin group: ${errInfo.error}`);
        setGroups(prev);
        saveScopedData(STORAGE_KEYS.OCCASIONS, currentUser.uid, prev);
      });
    }
  };

  const exportJSON = () => {
    const payload = {
      version: 1,
      appName: 'Skei',
      exportedAt: new Date().toISOString(),
      accounts,
      categoryGroups,
      transactions,
      people,
      groups,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skei-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Amount', 'Account', 'To Account', 'Category', 'Group', 'Occasion Group', 'Note', 'Owed By', 'Owed Amount', 'Settled'];
    const rows = transactions.map(t => {
      const acc = accounts.find(a => a.id === t.accountId)?.name || t.accountId;
      const toAcc = t.toAccountId ? accounts.find(a => a.id === t.toAccountId)?.name || t.toAccountId : '';
      const owedPerson = t.owedByPersonId ? people.find(p => p.id === t.owedByPersonId)?.name || '' : '';
      const occGroup = t.occasionGroupId ? groups.find(g => g.id === t.occasionGroupId)?.name || '' : '';
      let catName = '';
      let grpName = '';
      for (const g of categoryGroups) {
        if (g.id === t.groupId) grpName = g.name;
        const c = g.categories.find(c => c.id === t.categoryId);
        if (c) {
          catName = c.name;
          if (!grpName) grpName = g.name;
        }
      }
      return [
        `"${t.id}"`,
        `"${t.date}"`,
        `"${t.type}"`,
        `"${t.amount.toFixed(2)}"`,
        `"${acc.replace(/"/g, '""')}"`,
        `"${toAcc.replace(/"/g, '""')}"`,
        `"${catName.replace(/"/g, '""')}"`,
        `"${grpName.replace(/"/g, '""')}"`,
        `"${occGroup.replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
        `"${owedPerson.replace(/"/g, '""')}"`,
        `"${t.owedAmount ? t.owedAmount.toFixed(2) : ''}"`,
        `"${t.isSettled ? 'Yes' : 'No'}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skei-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = async (jsonString: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.accounts) && Array.isArray(data.transactions) && Array.isArray(data.categoryGroups)) {
        const uid = currentUser?.uid;
        if (uid) {
          setCloudSyncStatus('syncing');
          setSyncProgress(30);
          setSyncStage('Importing backup to Google Cloud...');
          const [oldTx, oldAcc, oldGrp, oldPpl, oldCat] = await Promise.all([
            getDocs(collection(db, 'users', uid, 'transactions')),
            getDocs(collection(db, 'users', uid, 'accounts')),
            getDocs(collection(db, 'users', uid, 'groups')),
            getDocs(collection(db, 'users', uid, 'people')),
            getDocs(collection(db, 'users', uid, 'categoryGroups')),
          ]);

          const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
          oldTx.forEach(d => operations.push(b => b.delete(d.ref)));
          oldAcc.forEach(d => operations.push(b => b.delete(d.ref)));
          oldGrp.forEach(d => operations.push(b => b.delete(d.ref)));
          oldPpl.forEach(d => operations.push(b => b.delete(d.ref)));
          oldCat.forEach(d => operations.push(b => b.delete(d.ref)));

          for (const acc of data.accounts) {
            operations.push(b => b.set(doc(db, 'users', uid, 'accounts', acc.id), sanitizeAccount(acc)));
          }
          for (const catGrp of data.categoryGroups) {
            operations.push(b => b.set(doc(db, 'users', uid, 'categoryGroups', catGrp.id), sanitizeCategoryGroup(catGrp)));
          }
          for (const tx of data.transactions) {
            operations.push(b => b.set(doc(db, 'users', uid, 'transactions', tx.id), sanitizeTx(tx)));
          }
          if (Array.isArray(data.groups)) {
            for (const grp of data.groups) {
              operations.push(b => b.set(doc(db, 'users', uid, 'groups', grp.id), sanitizeGroup(grp)));
            }
          }
          if (Array.isArray(data.people)) {
            for (const p of data.people) {
              operations.push(b => b.set(doc(db, 'users', uid, 'people', p.id), sanitizePerson(p)));
            }
          }

          // Await cloud write in chunks of 400 before changing local state
          await commitBatchesInChunks(operations, 400);

          setCloudSyncStatus('synced');
          setSyncProgress(100);
          setSyncStage('100% In Sync');
          setLastSyncedAt(new Date());
        }

        // Only update local state once cloud write succeeded
        setAccounts(data.accounts);
        setCategoryGroups(data.categoryGroups);
        setTransactions(data.transactions);
        if (Array.isArray(data.people)) {
          setPeople(data.people);
        }
        if (Array.isArray(data.groups)) {
          setGroups(data.groups);
        }

        return true;
      }
      return false;
    } catch (err) {
      console.error('Import failed:', err);
      const errInfo = handleFirestoreError(err, OperationType.WRITE, 'importJSON');
      setSyncError(`Import failed: ${errInfo.error}`);
      return false;
    }
  };

  return (
    <LedgerContext.Provider
      value={{
        accounts,
        categoryGroups,
        transactions,
        people,
        groups,
        activeGroupId,
        sessionGroupId,
        groupSummaries,
        personDebtSummaries,
        totalPendingOwed,
        calculatedBalances,
        totalNetWorth,
        formatEUR,
        monthStats,
        categoryGroupStats,
        currentUser,
        isAuthReady,
        cloudSyncStatus,
        syncProgress,
        syncStage,
        lastSyncedAt,
        syncError,
        dismissSyncError,
        isSessionExpired,
        reauthenticate,
        pendingConflict,
        resolveConflict,
        signInWithGoogle,
        signOutUser,
        syncNow,
        clearDeviceCacheAndSignOut,
        resetCloudDatabase,
        resetToInitial,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        transferFunds,
        addAccount,
        updateAccount,
        deleteAccount,
        addPerson,
        updatePerson,
        deletePerson,
        settleRepayment,
        setSessionGroupId,
        clearSessionGroup,
        addGroup,
        updateGroup,
        deleteGroup,
        reorderGroups,
        togglePinGroup,
        updateCategoryGroupTarget,
        addCategoryItem,
        updateCategoryItem,
        deleteCategoryItem,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        exportJSON,
        exportCSV,
        importJSON,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
};
