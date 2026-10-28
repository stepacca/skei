import React, { useState, useEffect, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Transaction, CategoryItem, Subcategory } from '../types';
import { getIcon } from '../utils/icons';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Check,
  ChevronRight,
  FolderKanban,
  Users,
} from 'lucide-react';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSaved?: () => void;
  onDeleted?: () => void;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSaved,
  onDeleted,
}) => {
  const {
    accounts,
    categoryGroups,
    people,
    groups,
    updateTransaction,
    deleteTransaction,
    addSubcategory,
    formatEUR,
  } = useLedger();

  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [occasionGroupId, setOccasionGroupId] = useState('');
  const [owedPersonId, setOwedPersonId] = useState('');
  const [owedAmount, setOwedAmount] = useState('');
  const [isSettled, setIsSettled] = useState(false);

  // Inline quick-add subcategory
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  // Delete confirm inline
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (transaction) {
      setDate(transaction.date || new Date().toISOString().split('T')[0]);
      setAmount(transaction.amount?.toString() || '');
      setNote(transaction.note || '');
      setAccountId(transaction.accountId || accounts[0]?.id || '');
      setCategoryId(transaction.categoryId || '');
      setSubcategoryId(transaction.subcategoryId || '');
      setOccasionGroupId(transaction.occasionGroupId || '');
      setOwedPersonId(transaction.owedByPersonId || '');
      setOwedAmount(
        transaction.owedAmount !== undefined
          ? transaction.owedAmount.toString()
          : transaction.amount?.toString() || ''
      );
      setIsSettled(!!transaction.isSettled);
      setIsAddingSubcategory(false);
      setNewSubcategoryName('');
      setConfirmDelete(false);
    }
  }, [transaction, accounts]);

  const allCategories = useMemo(
    () => categoryGroups.flatMap(g => g.categories),
    [categoryGroups]
  );

  const currentCategory = useMemo(
    () => allCategories.find(c => c.id === categoryId),
    [allCategories, categoryId]
  );

  const availableSubcategories: Subcategory[] = useMemo(() => {
    return currentCategory?.subcategories || [];
  }, [currentCategory]);

  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  const relevantCategories = allCategories.filter(c =>
    isIncome ? c.kind === 'income' : c.kind !== 'income'
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || transaction.amount;
    const parentGroup = categoryGroups.find(g =>
      g.categories.some(c => c.id === categoryId)
    );

    const numOwedAmount = owedPersonId
      ? parseFloat(owedAmount) || numAmount
      : undefined;

    updateTransaction(transaction.id, {
      amount: numAmount,
      date,
      note: note.trim() || (currentCategory ? currentCategory.name : 'Movement'),
      accountId,
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      groupId: parentGroup?.id,
      occasionGroupId: !isIncome && !isTransfer ? occasionGroupId || undefined : undefined,
      owedByPersonId: !isIncome && !isTransfer ? owedPersonId || undefined : undefined,
      owedAmount: numOwedAmount,
      isSettled: owedPersonId ? isSettled : undefined,
    });

    if (onSaved) onSaved();
    onClose();
  };

  const handleDelete = () => {
    deleteTransaction(transaction.id);
    if (onDeleted) onDeleted();
    onClose();
  };

  const handleCreateSubcategory = () => {
    if (!newSubcategoryName.trim() || !categoryId) return;
    addSubcategory(categoryId, newSubcategoryName.trim());
    setNewSubcategoryName('');
    setIsAddingSubcategory(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl max-w-md w-full p-5 sm:p-6 relative text-xs text-zinc-900 dark:text-zinc-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">
              Edit Transaction
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
              Update details, category, or subcategory
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Amount & Date Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
                Amount (€)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-sm font-bold text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
              />
            </div>
            <div>
              <label className="block font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
              />
            </div>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
              Note / Merchant
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Supermarket, Coffee, Bakery"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
            />
          </div>

          {/* Account Selector */}
          <div>
            <label className="block font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
              {isTransfer ? 'From Account' : transaction.type === 'income' ? 'Received In Account' : 'Paid With Account'}
            </label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Main Category */}
          {!isTransfer && (
            <div>
              <label className="block font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
                Main Category
              </label>
              <select
                value={categoryId}
                onChange={e => {
                  setCategoryId(e.target.value);
                  setSubcategoryId('');
                }}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
              >
                <option value="">Select Category</option>
                {relevantCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-Category Picker */}
          {!isTransfer && categoryId && (
            <div className="p-3 bg-zinc-50/70 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                  Sub-Category (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingSubcategory(!isAddingSubcategory)}
                  className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Sub</span>
                </button>
              </div>

              {/* Inline Subcategory Creator */}
              {isAddingSubcategory && (
                <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl animate-in fade-in">
                  <input
                    type="text"
                    value={newSubcategoryName}
                    onChange={e => setNewSubcategoryName(e.target.value)}
                    placeholder="Sub-category name..."
                    className="flex-1 px-2 py-1 bg-transparent text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSubcategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateSubcategory}
                    className="px-2 py-1 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-lg text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingSubcategory(false)}
                    className="px-1.5 py-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Subcategories selector or chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubcategoryId('')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                    !subcategoryId
                      ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-2xs'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  None (General)
                </button>
                {availableSubcategories.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubcategoryId(sub.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                      subcategoryId === sub.id
                        ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-2xs'
                        : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group / Occasion (Expense only) */}
          {!isIncome && !isTransfer && groups.length > 0 && (
            <div>
              <label className="block font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
                Group / Occasion
              </label>
              <select
                value={occasionGroupId}
                onChange={e => setOccasionGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
              >
                <option value="">None (Personal)</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Someone owes me for this (Expense only) */}
          {!isIncome && !isTransfer && people.length > 0 && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2">
              <label className="font-bold text-zinc-600 dark:text-zinc-300 text-[10px] uppercase tracking-wider block">
                Debt Recovery (Someone owes me)
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={owedPersonId}
                    onChange={e => {
                      const val = e.target.value;
                      setOwedPersonId(val);
                      if (val && !owedAmount) setOwedAmount(amount || '0');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="">Nobody (My expense)</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.emoji} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {owedPersonId && (
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={owedAmount}
                      onChange={e => setOwedAmount(e.target.value)}
                      placeholder="Amount owed"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {owedPersonId && (
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[11px]">
                  <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                  <button
                    type="button"
                    onClick={() => setIsSettled(!isSettled)}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                      isSettled
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                    }`}
                  >
                    {isSettled ? '✓ Settled' : '⏳ Pending'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delete confirmation section */}
          {confirmDelete ? (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2">
              <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                Are you sure you want to delete this movement?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2">
            {!confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                title="Delete transaction"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs font-semibold bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
