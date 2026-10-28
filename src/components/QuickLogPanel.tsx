import React, { useState, useEffect, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { getIcon } from '../utils/icons';
import { CategoryCustomizerModal } from './CategoryCustomizerModal';
import { GroupManageModal } from './GroupManageModal';
import { PersonManageModal } from './PersonManageModal';
import { TransactionEditModal } from './TransactionEditModal';
import { TransactionType, CategoryItem, Transaction } from '../types';
import {
  Check,
  X,
  Plus,
  Clock,
  Landmark,
  Pin,
  FolderKanban,
  Settings,
  Users,
} from 'lucide-react';

interface QuickLogPanelProps {
  onSuccess?: () => void;
  isModal?: boolean;
  onClose?: () => void;
  initialDate?: string;
  openSettings?: (initialTab?: 'overview' | 'groups' | 'categories' | 'accounts' | 'people' | 'data') => void;
}

export const QuickLogPanel: React.FC<QuickLogPanelProps> = ({
  onSuccess,
  isModal = false,
  onClose,
  initialDate,
  openSettings,
}) => {
  const {
    accounts,
    categoryGroups,
    people,
    groups,
    activeGroupId,
    setSessionGroupId,
    addTransaction,
    transferFunds,
    formatEUR,
  } = useLedger();

  const [txType, setTxType] = useState<TransactionType>('expense');

  // POS Terminal Numpad: integer cents (450 = 4,50 €)
  const [cents, setCents] = useState<number>(0);

  // Paid With Account
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

  // Keep selectedAccountId synced if accounts load after init
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Single-use chip: Someone owes me for this (turns off automatically after 1 log)
  const [activeOwedPersonId, setActiveOwedPersonId] = useState<string | null>(null);

  // Management modals
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);

  // Quick edit modal for bottom toast
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Optional Note & Date
  const [showOptionalDetails, setShowOptionalDetails] = useState<boolean>(!!initialDate);
  const [note, setNote] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );

  // Flash warning if category clicked when cents == 0
  const [zeroWarning, setZeroWarning] = useState(false);

  // Bottom Pop-up Toast note with Edit button (as requested by user)
  const [bottomToast, setBottomToast] = useState<{
    tx: Transaction;
    categoryName: string;
    amountStr: string;
  } | null>(null);

  useEffect(() => {
    if (initialDate) {
      setTxDate(initialDate);
      setShowOptionalDetails(true);
    }
  }, [initialDate]);

  // Auto-dismiss bottom toast after 4.5 seconds
  useEffect(() => {
    if (!bottomToast) return;
    const timer = setTimeout(() => {
      setBottomToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [bottomToast]);

  // Filter ONLY MAIN categories by Expense vs Income, and GUARANTEE Sort Later is #1
  const activeMainCategories: CategoryItem[] = useMemo(() => {
    if (txType === 'income') {
      const incGroup = categoryGroups.find(g => g.kind === 'income');
      if (incGroup) return incGroup.categories;
      return categoryGroups.flatMap(g => g.categories.filter(c => c.kind === 'income'));
    }

    // Expense mode
    const allExpenseCats = categoryGroups
      .filter(g => g.kind !== 'income')
      .flatMap(g => g.categories);

    let sortLater = allExpenseCats.find(c => c.isDefaultSortLater || c.id === 'cat-sort-later');
    if (!sortLater) {
      sortLater = {
        id: 'cat-sort-later',
        groupId: categoryGroups[0]?.id || 'grp-essentials',
        name: 'Sort Later',
        icon: 'Clock',
        color: '#f59e0b',
        kind: 'expense',
        isDefaultSortLater: true,
        subcategories: [],
      };
    }

    const others = allExpenseCats.filter(c => c.id !== sortLater?.id);
    return [sortLater, ...others];
  }, [categoryGroups, txType]);

  // Groups sorted by custom order
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [groups]);

  // POS Keypad handler
  const handleDigit = (digit: number) => {
    setZeroWarning(false);
    setCents(prev => {
      if (prev >= 9999999) return prev;
      return prev * 10 + digit;
    });
  };

  const handleBackspace = () => {
    setCents(prev => Math.floor(prev / 10));
  };

  const handleClear = () => {
    setCents(0);
  };

  // Physical Keyboard Input Support (desktop/laptop/iPad)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (isCategoryManagerOpen || isGroupModalOpen || isPersonModalOpen || isEditModalOpen) {
        return;
      }

      // Digits 0-9
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(parseInt(e.key, 10));
        return;
      }

      // Backspace or Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleBackspace();
        return;
      }

      // 'c' or 'C' or 'Escape' to clear
      if (e.key === 'c' || e.key === 'C' || e.key === 'Escape') {
        e.preventDefault();
        handleClear();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCategoryManagerOpen, isGroupModalOpen, isPersonModalOpen, isEditModalOpen]);

  const amountInEuros = cents / 100;

  // Instant 1-Tap Category Log Action
  const handleTapCategory = (category: CategoryItem) => {
    if (cents <= 0) {
      setZeroWarning(true);
      setTimeout(() => setZeroWarning(false), 1600);
      return;
    }

    const parentGroup = categoryGroups.find(g =>
      g.categories.some(c => c.id === category.id)
    );

    const targetAccount = selectedAccountId || accounts[0]?.id || '';
    const nowIso = new Date().toISOString();
    const generatedId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const loggedTx: Transaction = {
      id: generatedId,
      type: txType === 'income' ? 'income' : 'expense',
      amount: amountInEuros,
      accountId: targetAccount,
      categoryId: category.id,
      groupId: parentGroup?.id,
      occasionGroupId: activeGroupId || undefined,
      note: note.trim() || (category.isDefaultSortLater ? 'Sort Later' : category.name),
      date: txDate,
      owedByPersonId: activeOwedPersonId || undefined,
      owedAmount: activeOwedPersonId ? amountInEuros : undefined,
      isSettled: false,
      createdAt: nowIso,
    };

    addTransaction(loggedTx);

    // Show small bottom pop up note with Edit button
    setBottomToast({
      tx: loggedTx,
      categoryName: category.name,
      amountStr: formatEUR(amountInEuros),
    });

    // Reset temporary states
    setActiveOwedPersonId(null);
    setCents(0);
    setNote('');
    setShowOptionalDetails(false);

    if (onSuccess) onSuccess();
  };

  // Instant 1-Tap Transfer Action
  const handleTapDestinationAccount = (toAccountId: string) => {
    if (cents <= 0) {
      setZeroWarning(true);
      setTimeout(() => setZeroWarning(false), 1600);
      return;
    }

    if (toAccountId === selectedAccountId) {
      return;
    }

    const toAcc = accounts.find(a => a.id === toAccountId);

    transferFunds({
      fromAccountId: selectedAccountId,
      toAccountId,
      amount: amountInEuros,
      note: note.trim() || 'Transfer',
      date: txDate,
    });

    setCents(0);
    setNote('');
    setShowOptionalDetails(false);

    if (onSuccess) onSuccess();
  };

  const formattedPosDisplay = (cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // =========================================================================
  // SUB-RENDER COMPONENTS
  // =========================================================================

  // 1. Mode Switcher + Mobile Settings Button
  const renderModeSwitcher = () => (
    <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
        {(['expense', 'income', 'transfer'] as TransactionType[]).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setTxType(type);
              setZeroWarning(false);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all select-none ${
              txType === type
                ? type === 'expense'
                  ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                  : type === 'income'
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs'
                  : 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {openSettings && (
          <button
            type="button"
            onClick={() => openSettings('overview')}
            className="sm:hidden p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            title="Settings & Customization"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  // 2. Groups & Occasions Tags + Someone Owes Me Tags
  const renderTagsSection = () => {
    if (txType !== 'expense') return null;

    return (
      <div className="space-y-1.5 py-0.5">
        {/* Groups Rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1 shrink-0">
            <FolderKanban className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>Group:</span>
          </span>

          {sortedGroups.map(group => {
            const isSelected = activeGroupId === group.id;
            const isPinned = !!group.isPinnedAlwaysActive;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSessionGroupId('none');
                  } else {
                    setSessionGroupId(group.id);
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                  isSelected
                    ? 'bg-purple-600 dark:bg-purple-500 text-white shadow-xs ring-2 ring-purple-300 dark:ring-purple-700 scale-[1.02]'
                    : isPinned
                    ? 'bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-300 border border-purple-200/90 dark:border-purple-800/70 shadow-2xs'
                    : 'bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs'
                }`}
                title={
                  isPinned
                    ? `Pinned Always Active: ${group.name} (Tap to turn off for this session)`
                    : `Tap to tag expenses with ${group.name}`
                }
              >
                {isPinned && <Pin className="w-2.5 h-2.5 rotate-45 text-purple-400 shrink-0" />}
                <span>{group.emoji}</span>
                <span>{group.name}</span>
                {isSelected && (
                  <span className="text-[9px] bg-purple-700 dark:bg-purple-600 px-1 py-0.2 rounded font-mono">
                    Active
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsGroupModalOpen(true)}
            className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold border border-dashed border-purple-300 dark:border-purple-800 hover:border-purple-600 dark:hover:border-purple-500 bg-white dark:bg-zinc-900 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-800 dark:text-purple-300 transition-all flex items-center gap-0.5 shrink-0 shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>Group</span>
          </button>
        </div>

        {/* Someone Owes Me Rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1 shrink-0">
            <Users className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Owed:</span>
          </span>

          {people.map(person => {
            const isActive = activeOwedPersonId === person.id;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() =>
                  setActiveOwedPersonId(prev => (prev === person.id ? null : person.id))
                }
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                  isActive
                    ? 'bg-amber-500 dark:bg-amber-600 text-white shadow-xs ring-2 ring-amber-300 dark:ring-amber-700 scale-[1.02]'
                    : 'bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-200/90 dark:border-amber-800/60 shadow-2xs'
                }`}
                title={
                  isActive
                    ? `Active: Next logged expense will be marked owed by ${person.name}`
                    : `Tap to mark next expense as owed by ${person.name}`
                }
              >
                <span>↩</span>
                <span>{person.emoji}</span>
                <span>{person.name}</span>
                {isActive && (
                  <span className="text-[9px] bg-amber-600 dark:bg-amber-500 px-1 py-0.2 rounded font-mono">
                    Active
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsPersonModalOpen(true)}
            className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold border border-dashed border-amber-300 dark:border-amber-800 hover:border-amber-600 dark:hover:border-amber-500 bg-white dark:bg-zinc-900 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-900 dark:text-amber-300 transition-all flex items-center gap-0.5 shrink-0 shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>Person</span>
          </button>
        </div>
      </div>
    );
  };

  // 3. Paid With / Received In Account
  const renderAccountSelector = () => (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0 select-none">
        {txType === 'income' ? 'RECEIVED IN:' : 'PAID WITH:'}
      </span>
      <div className="flex gap-1.5 items-center shrink-0">
        {accounts
          .filter(a => !a.isArchived)
          .map(acc => {
            const isSelected = selectedAccountId === acc.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedAccountId(acc.id)}
                className={`px-2.5 py-1 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all shrink-0 select-none ${
                  isSelected
                    ? 'border-zinc-950 dark:border-zinc-100 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs scale-[1.01]'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {acc.name}
              </button>
            );
          })}
      </div>
    </div>
  );

  // 4. POS Terminal Display
  const renderAmountDisplay = () => (
    <div
      className={`rounded-2xl py-2 px-3 sm:p-3.5 text-center select-none shadow-2xs relative transition-all ${
        zeroWarning
          ? 'bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 animate-pulse'
          : 'bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/90 dark:border-zinc-800'
      }`}
    >
      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-0.5">
        {zeroWarning
          ? '⚠️ Please enter amount first'
          : txType === 'expense'
          ? 'Expense'
          : txType === 'income'
          ? 'Income'
          : 'Transfer'}
      </span>
      <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-zinc-950 dark:text-white tabular-nums flex items-baseline justify-center gap-1">
        <span>{formattedPosDisplay}</span>
        <span className="text-xl sm:text-2xl font-semibold text-zinc-400 dark:text-zinc-500">€</span>
      </div>

      {cents > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 shadow-xs transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );

  // 5. POS Keypad (1 - 9, C, 0, ⌫)
  const renderKeypad = () => (
    <div className="grid grid-cols-3 gap-1.5 select-none">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <button
          key={num}
          type="button"
          onClick={() => handleDigit(num)}
          className="h-10 sm:h-12 bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 active:scale-95 font-mono text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white rounded-2xl transition-transform flex items-center justify-center focus:outline-none shadow-2xs border border-transparent dark:border-zinc-700/40"
        >
          {num}
        </button>
      ))}
      {/* Row 4: C, 0, Backspace */}
      <button
        type="button"
        onClick={handleClear}
        className="h-10 sm:h-12 bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 active:scale-95 text-zinc-500 dark:text-zinc-400 font-bold text-sm sm:text-base rounded-2xl transition-transform flex items-center justify-center focus:outline-none shadow-2xs border border-transparent dark:border-zinc-700/40"
      >
        C
      </button>
      <button
        type="button"
        onClick={() => handleDigit(0)}
        className="h-10 sm:h-12 bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 active:scale-95 font-mono text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white rounded-2xl transition-transform flex items-center justify-center focus:outline-none shadow-2xs border border-transparent dark:border-zinc-700/40"
      >
        0
      </button>
      <button
        type="button"
        onClick={handleBackspace}
        className="h-10 sm:h-12 bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 active:scale-95 text-zinc-700 dark:text-zinc-300 rounded-2xl transition-transform flex items-center justify-center focus:outline-none shadow-2xs border border-transparent dark:border-zinc-700/40"
        aria-label="Backspace"
      >
        ⌫
      </button>
    </div>
  );

  // 6. Main Categories or Destination Accounts Grid (Tap to log)
  const renderCategories = () => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
          {txType === 'transfer'
            ? 'Transfer To (Tap account to send)'
            : 'Category (Tap category to log)'}
        </span>

        {txType !== 'transfer' && (
          <button
            type="button"
            onClick={() => {
              if (openSettings) {
                openSettings('categories');
              } else {
                setIsCategoryManagerOpen(true);
              }
            }}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all flex items-center gap-1 shadow-2xs"
            title="Manage categories & subcategories"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Categories</span>
          </button>
        )}
      </div>

      {txType === 'transfer' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[380px] overflow-y-auto pr-0.5">
          {accounts
            .filter(a => !a.isArchived && a.id !== selectedAccountId)
            .map(acc => {
              const Icon = getIcon(acc.icon, Landmark);
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleTapDestinationAccount(acc.id)}
                  className="px-3 py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-600 hover:text-white text-indigo-950 dark:text-indigo-200 text-left transition-all active:scale-95 shadow-2xs group flex items-center gap-2.5 select-none"
                  title={`Transfer to ${acc.name}`}
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-700 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate leading-tight">{acc.name}</div>
                    <div className="text-[10px] uppercase font-mono opacity-60">
                      Tap to Send
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      ) : (
        /* Main Categories Grid: Instant 1-Tap Commit (Subcategories accessible via bottom Edit toast) */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 max-h-[380px] overflow-y-auto pr-1">
          {activeMainCategories.map(cat => {
            const Icon = getIcon(cat.icon);
            const isSortLater = cat.isDefaultSortLater || cat.id === 'cat-sort-later';

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleTapCategory(cat)}
                className={`px-2 py-1.5 sm:px-2.5 sm:py-2.5 rounded-2xl border text-left flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 select-none shadow-2xs group ${
                  isSortLater
                    ? 'border-amber-400 dark:border-amber-500/80 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-200 font-bold ring-1 ring-amber-300 dark:ring-amber-700/60'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-800 dark:text-zinc-200'
                }`}
                title={isSortLater ? 'Log to Sort Later' : `Log to ${cat.name}`}
              >
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSortLater
                      ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 group-hover:bg-amber-300 dark:group-hover:bg-amber-800'
                      : 'bg-zinc-100 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold truncate leading-tight">
                  {cat.name}
                </span>
              </button>
            );
          })}

          {/* Manage / Add category button */}
          <button
            type="button"
            onClick={() => setIsCategoryManagerOpen(true)}
            className="px-2 py-1.5 sm:px-2.5 sm:py-2.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-300 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage</span>
          </button>
        </div>
      )}
    </div>
  );

  // 7. Optional Note & Date Accordion
  const renderOptionalDetails = () => (
    <div>
      <button
        type="button"
        onClick={() => setShowOptionalDetails(!showOptionalDetails)}
        className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors px-1"
      >
        <span>
          {showOptionalDetails
            ? '− Hide Note / Date'
            : `+ Note / Date (${
                txDate === new Date().toISOString().split('T')[0] ? 'Today' : txDate
              })`}
        </span>
      </button>

      {showOptionalDetails && (
        <div className="mt-1.5 p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs grid grid-cols-2 gap-2 animate-in fade-in">
          <div>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note / Merchant (optional)"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100"
            />
          </div>
          <div>
            <input
              type="date"
              value={txDate}
              onChange={e => setTxDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100"
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-sm relative transition-colors ${
        isModal
          ? 'max-w-md w-full mx-auto p-3.5 sm:p-4'
          : 'p-2.5 sm:p-5 w-full mx-auto max-w-lg md:max-w-5xl'
      }`}
    >
      {/* ========================================================================= */}
      {/* MOBILE LAYOUT (<md)                                                      */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-2">
        {renderModeSwitcher()}
        {renderTagsSection()}
        {renderAccountSelector()}
        {renderAmountDisplay()}
        {renderKeypad()}
        {renderCategories()}
        {renderOptionalDetails()}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (md: and up): 2-COLUMN SPLIT WORKSTATION                  */}
      {/* ========================================================================= */}
      <div className="hidden md:grid md:grid-cols-12 md:gap-6 md:items-start">
        {/* Left Column: Fixed Keypad Panel */}
        <div className="md:col-span-5 flex flex-col space-y-3">
          {renderModeSwitcher()}
          {renderAmountDisplay()}
          {renderAccountSelector()}
          {renderKeypad()}
          {renderOptionalDetails()}
        </div>

        {/* Right Column: Tags & Categories */}
        <div className="md:col-span-7 flex flex-col space-y-3 border-l border-zinc-100 dark:border-zinc-800 pl-6">
          {renderTagsSection()}
          {renderCategories()}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM POP-UP NOTE WITH EDIT BUTTON (As requested by user!)              */}
      {/* ========================================================================= */}
      {bottomToast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 px-3.5 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 border border-zinc-800 dark:border-zinc-300 max-w-sm w-[92vw] sm:w-auto justify-between">
          <div className="flex items-center gap-2 truncate">
            <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 stroke-[2.5] shrink-0" />
            <span className="truncate">
              Transaction logged · <strong className="font-mono">{bottomToast.amountStr}</strong> in {bottomToast.categoryName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(bottomToast.tx);
                setIsEditModalOpen(true);
                setBottomToast(null);
              }}
              className="px-2.5 py-1 rounded-xl bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setBottomToast(null)}
              className="p-1 text-zinc-400 hover:text-white dark:hover:text-zinc-900 rounded-lg"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Transaction Edit Modal (Triggered by Edit button in bottom toast) */}
      <TransactionEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
      />

      {/* Unified Category Manager Modal */}
      <CategoryCustomizerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        initialKind={txType === 'income' ? 'income' : 'expense'}
      />

      {/* Group & Occasion Manager Modal */}
      <GroupManageModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />

      {/* Person & Debt Manager Modal */}
      <PersonManageModal
        isOpen={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
      />
    </div>
  );
};
