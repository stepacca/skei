import React, { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Transaction, CategoryItem } from '../types';
import { getIcon } from '../utils/icons';
import { CategoryCustomizerModal } from './CategoryCustomizerModal';
import { QuickLogPanel } from './QuickLogPanel';
import { TransactionEditModal } from './TransactionEditModal';
import {
  Search,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Edit3,
  X,
  Tag,
  Sliders,
  ChevronDown,
  Clock,
  Plus,
  Calendar,
  FolderKanban,
} from 'lucide-react';

export const MovementsView: React.FC = () => {
  const {
    transactions,
    accounts,
    people,
    groups,
    categoryGroups,
    formatEUR,
    updateTransaction,
    deleteTransaction,
  } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'unsorted' | 'expense' | 'income' | 'transfer'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Modal / Drawer states
  const [categorizingTx, setCategorizingTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isCategoryCustomizerOpen, setIsCategoryCustomizerOpen] = useState(false);

  // Add expense on specific day modal
  const [addDayModalDate, setAddDayModalDate] = useState<string | null>(null);

  const allCategories = useMemo(
    () => categoryGroups.flatMap(g => g.categories),
    [categoryGroups]
  );

  const sortLaterCat = useMemo(
    () => allCategories.find(c => c.isDefaultSortLater || c.id === 'cat-sort-later'),
    [allCategories]
  );

  // Count unsorted items
  const unsortedCount = useMemo(() => {
    return transactions.filter(
      t => t.type === 'expense' && (t.categoryId === sortLaterCat?.id || !t.categoryId)
    ).length;
  }, [transactions, sortLaterCat]);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter === 'unsorted') {
        if (t.type !== 'expense') return false;
        if (t.categoryId !== sortLaterCat?.id && t.categoryId) return false;
      } else if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }

      if (
        accountFilter !== 'all' &&
        t.accountId !== accountFilter &&
        t.toAccountId !== accountFilter
      ) {
        return false;
      }

      if (groupFilter !== 'all' && t.occasionGroupId !== groupFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const noteMatch = (t.note || '').toLowerCase().includes(q);
        const amountMatch = t.amount.toString().includes(q);
        const cat = allCategories.find(c => c.id === t.categoryId);
        const catName = cat?.name.toLowerCase() || '';
        const subCatName =
          cat?.subcategories?.find(s => s.id === t.subcategoryId)?.name.toLowerCase() || '';
        const accName =
          accounts.find(a => a.id === t.accountId)?.name.toLowerCase() || '';
        const grpName =
          groups.find(g => g.id === t.occasionGroupId)?.name.toLowerCase() || '';
        return (
          noteMatch ||
          amountMatch ||
          catName.includes(q) ||
          subCatName.includes(q) ||
          accName.includes(q) ||
          grpName.includes(q)
        );
      }
      return true;
    });
  }, [transactions, typeFilter, accountFilter, groupFilter, searchQuery, allCategories, accounts, groups, sortLaterCat]);

  // Group by relative date
  const groupedTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const dateGroups: { [date: string]: Transaction[] } = {};
    for (const tx of filtered) {
      if (!dateGroups[tx.date]) {
        dateGroups[tx.date] = [];
      }
      dateGroups[tx.date].push(tx);
    }

    return Object.entries(dateGroups).map(([date, txs]) => {
      let label = date;
      if (date === todayStr) label = 'Today';
      else if (date === yesterdayStr) label = 'Yesterday';
      else {
        try {
          const parsedDate = new Date(date + 'T00:00:00');
          label = parsedDate.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          });
        } catch {
          label = date;
        }
      }

      const dayTotal = txs.reduce((sum, t) => {
        if (t.type === 'expense') return sum - t.amount;
        if (t.type === 'income') return sum + t.amount;
        return sum;
      }, 0);

      return { date, label, txs, dayTotal };
    });
  }, [filtered]);

  const handleSelectCategory = (catId: string, subId?: string) => {
    if (!categorizingTx) return;
    const parentGroup = categoryGroups.find(g =>
      g.categories.some(c => c.id === catId)
    );
    updateTransaction(categorizingTx.id, {
      categoryId: catId,
      subcategoryId: subId || undefined,
      groupId: parentGroup?.id,
    });
    setCategorizingTx(null);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-14">
      {/* Top Header & Search */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Movements
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Review history & tap any category to sort or reorganize
            </p>
          </div>
          <button
            onClick={() => setIsCategoryCustomizerOpen(true)}
            className="px-2.5 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-xl shadow-2xs transition-all flex items-center gap-1"
            title="Add or manage categories"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search note, category, or account..."
            className="w-full pl-9 pr-8 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
              typeFilter === 'all'
                ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            All
          </button>

          {/* Quick Unsorted Filter Pill */}
          <button
            onClick={() => setTypeFilter('unsorted')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
              typeFilter === 'unsorted'
                ? 'bg-amber-500 text-white shadow-xs'
                : unsortedCount > 0
                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Sort Later</span>
            {unsortedCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  typeFilter === 'unsorted'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200'
                }`}
              >
                {unsortedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
              typeFilter === 'expense'
                ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Expenses
          </button>

          <button
            onClick={() => setTypeFilter('income')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
              typeFilter === 'income'
                ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Income
          </button>

          <button
            onClick={() => setTypeFilter('transfer')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
              typeFilter === 'transfer'
                ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Transfers
          </button>

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {/* Group Filter */}
            {groups.length > 0 && (
              <select
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 rounded-xl font-semibold text-xs focus:outline-none shrink-0"
                title="Filter by group / occasion"
              >
                <option value="all">All Groups</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {g.name}
                  </option>
                ))}
              </select>
            )}

            {accounts.length > 1 && (
              <select
                value={accountFilter}
                onChange={e => setAccountFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl text-zinc-700 dark:text-zinc-300 font-semibold text-xs focus:outline-none shrink-0"
              >
                <option value="all">All Accounts</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Movements list grouped by day */}
      {groupedTransactions.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs shadow-xs">
          {typeFilter === 'unsorted'
            ? 'Great job! No items waiting to be sorted.'
            : 'No movements match your criteria.'}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedTransactions.map(group => (
            <div
              key={group.date}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden transition-colors"
            >
              {/* Day Header with + Add on this day button */}
              <div className="bg-zinc-50/80 dark:bg-zinc-800/80 px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{group.label}</span>
                  {/* Tap on Day to Add Expense */}
                  <button
                    onClick={() => setAddDayModalDate(group.date)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-950 dark:hover:bg-zinc-700 hover:text-white text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] transition-colors"
                    title={`Add expense on ${group.label}`}
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>Add</span>
                  </button>
                </div>

                <span
                  className={`font-mono font-medium text-[11px] tabular-nums ${
                    group.dayTotal < 0
                      ? 'text-zinc-600 dark:text-zinc-400'
                      : group.dayTotal > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {group.dayTotal !== 0 ? (group.dayTotal > 0 ? '+' : '') + formatEUR(group.dayTotal) : ''}
                </span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {group.txs.map(tx => {
                  const account = accounts.find(a => a.id === tx.accountId);
                  const toAccount = tx.toAccountId
                    ? accounts.find(a => a.id === tx.toAccountId)
                    : null;
                  const category = allCategories.find(c => c.id === tx.categoryId);
                  const subcategory = category?.subcategories?.find(s => s.id === tx.subcategoryId);
                  const isSortLater = category?.isDefaultSortLater || (!category && tx.type === 'expense');
                  const CatIcon = category ? getIcon(category.icon) : Clock;

                  return (
                    <div
                      key={tx.id}
                      className={`p-3.5 sm:p-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60 transition-colors flex items-center justify-between gap-3 text-xs ${
                        isSortLater && tx.type === 'expense' ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                            isSortLater && tx.type === 'expense'
                              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400'
                              : tx.type === 'expense'
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                              : tx.type === 'income'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {tx.type === 'expense' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : tx.type === 'income' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowRightLeft className="w-4 h-4" />
                          )}
                        </div>

                        <div className="truncate min-w-0 flex-1">
                          {/* Note / Description */}
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-zinc-950 dark:text-zinc-100 text-sm truncate leading-tight">
                              {tx.note || (tx.type === 'transfer' ? 'Transfer' : 'Expense')}
                            </span>
                          </div>

                          {/* Account & Category Pill & Debt Recovery Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                              {tx.type === 'transfer'
                                ? `${account?.name || tx.accountId} → ${toAccount?.name || tx.toAccountId}`
                                : account?.name || tx.accountId}
                            </span>

                            {tx.type !== 'transfer' && (
                              <>
                                <span>·</span>
                                <button
                                  onClick={() => setCategorizingTx(tx)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 font-semibold rounded-lg transition-colors cursor-pointer ${
                                    isSortLater
                                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 ring-1 ring-amber-300 dark:ring-amber-700'
                                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                                  }`}
                                  title="Click to sort or change category"
                                >
                                  <CatIcon className="w-3 h-3" />
                                  <span>{category?.name || 'Sort Later'}</span>
                                  {subcategory && (
                                    <>
                                      <span className="text-zinc-400 dark:text-zinc-500">›</span>
                                      <span className="text-zinc-950 dark:text-zinc-100 font-bold">{subcategory.name}</span>
                                    </>
                                  )}
                                  <ChevronDown className="w-3 h-3 opacity-60" />
                                </button>
                              </>
                            )}

                            {/* Group / Occasion Badge */}
                            {tx.occasionGroupId && (() => {
                              const grp = groups.find(g => g.id === tx.occasionGroupId);
                              if (!grp) return null;
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-semibold">
                                  <span>{grp.emoji}</span>
                                  <span>{grp.name}</span>
                                </span>
                              );
                            })()}

                            {/* Debt Badge: Someone owes me */}
                            {tx.owedByPersonId && (() => {
                              const owedPerson = people.find(p => p.id === tx.owedByPersonId);
                              const owedAmt = tx.owedAmount !== undefined ? tx.owedAmount : tx.amount;
                              return tx.isSettled ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium">
                                  <span>✓ Settled by {owedPerson?.name || 'Person'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[10px] font-bold">
                                  <span>↩</span>
                                  <span>{owedPerson?.emoji || '👤'}</span>
                                  <span>{owedPerson?.name || 'Person'} owes {formatEUR(owedAmt)}</span>
                                </span>
                              );
                            })()}

                            {/* Variance Badges */}
                            {tx.varianceTag === 'unrecovered_discount' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-[10px] font-bold">
                                [Unrecovered Discount]
                              </span>
                            )}
                            {tx.varianceTag === 'repayment_extra' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold">
                                [Repayment Extra]
                              </span>
                            )}
                            {tx.tags?.includes('debt_repayment') && !tx.varianceTag && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-medium">
                                ↩ Debt Reimbursement
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono font-bold text-sm sm:text-base tabular-nums ${
                            tx.type === 'expense'
                              ? 'text-zinc-950 dark:text-zinc-100'
                              : tx.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {formatEUR(tx.amount)}
                        </span>

                        {/* Edit details */}
                        <button
                          onClick={() => handleOpenEdit(tx)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Edit transaction (date, amount, note, category)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setTxToDelete(tx)}
                          className="p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recategorize Drawer with Subcategory selection */}
      {categorizingTx && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-5 relative animate-in fade-in transition-colors max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Assign Category & Sub-category
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {categorizingTx.note || 'Movement'} · {formatEUR(categorizingTx.amount)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCategoryCustomizerOpen(true)}
                  className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Manage</span>
                </button>
                <button
                  onClick={() => setCategorizingTx(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {categoryGroups
                .filter(g =>
                  categorizingTx.type === 'income' ? g.kind === 'income' : g.kind !== 'income'
                )
                .map(group => (
                  <div key={group.id} className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 px-1">
                      {group.name}
                    </span>
                    <div className="space-y-1.5">
                      {group.categories.map(cat => {
                        const isCurrent = categorizingTx.categoryId === cat.id;
                        const Icon = getIcon(cat.icon);
                        const subcats = cat.subcategories || [];

                        return (
                          <div
                            key={cat.id}
                            className={`p-2 rounded-2xl border transition-colors ${
                              isCurrent
                                ? 'border-zinc-950 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-800/90'
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectCategory(cat.id)}
                                className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex-1 text-left"
                              >
                                <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                                <span className="truncate">{cat.name}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSelectCategory(cat.id)}
                                className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-950 hover:text-white dark:hover:bg-zinc-200 dark:hover:text-zinc-950 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
                              >
                                Select
                              </button>
                            </div>

                            {/* Subcategories if any */}
                            {subcats.length > 0 && (
                              <div className="mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-700/60 flex flex-wrap gap-1">
                                {subcats.map(sub => {
                                  const isSubCurrent =
                                    categorizingTx.categoryId === cat.id &&
                                    categorizingTx.subcategoryId === sub.id;

                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => handleSelectCategory(cat.id, sub.id)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                        isSubCurrent
                                          ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-2xs'
                                          : 'bg-zinc-100/80 dark:bg-zinc-700/70 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300'
                                      }`}
                                    >
                                      {sub.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Shared Transaction Edit Modal */}
      <TransactionEditModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
      />

      {/* Add on Specific Day Modal */}
      {addDayModalDate && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <QuickLogPanel
              isModal={true}
              initialDate={addDayModalDate}
              onClose={() => setAddDayModalDate(null)}
              onSuccess={() => setAddDayModalDate(null)}
            />
          </div>
        </div>
      )}

      {/* Category Customizer Modal */}
      <CategoryCustomizerModal
        isOpen={isCategoryCustomizerOpen}
        onClose={() => setIsCategoryCustomizerOpen(false)}
      />

      {/* In-App Delete Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-sm w-full p-5 text-center animate-in fade-in transition-colors">
            <div className="w-11 h-11 mx-auto mb-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">Delete Movement</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-5">
              Are you sure you want to delete <span className="font-semibold text-zinc-900 dark:text-zinc-100">"{txToDelete.note || 'movement'}"</span> ({formatEUR(txToDelete.amount)})? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(txToDelete.id);
                  setTxToDelete(null);
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
