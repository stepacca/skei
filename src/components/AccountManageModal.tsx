import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Account, AccountType } from '../types';
import { getIcon } from '../utils/icons';
import { X, Plus, Edit2, Trash2, Check, CreditCard, Landmark, Vault, Banknote, AlertCircle } from 'lucide-react';

interface AccountManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEditingAccount?: Account | null;
}

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: string }[] = [
  { type: 'checking', label: 'Checking', icon: 'Landmark' },
  { type: 'savings', label: 'Savings', icon: 'Vault' },
  { type: 'credit', label: 'Credit Card', icon: 'CreditCard' },
  { type: 'cash', label: 'Cash Wallet', icon: 'Banknote' },
  { type: 'investment', label: 'Investment', icon: 'Landmark' },
];

export const AccountManageModal: React.FC<AccountManageModalProps> = ({
  isOpen,
  onClose,
  initialEditingAccount = null,
}) => {
  const { accounts, calculatedBalances, addAccount, updateAccount, deleteAccount, formatEUR } =
    useLedger();

  const [isCreating, setIsCreating] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(
    initialEditingAccount ? initialEditingAccount.id : null
  );

  const [formName, setFormName] = useState(initialEditingAccount ? initialEditingAccount.name : '');
  const [formType, setFormType] = useState<AccountType>(
    initialEditingAccount ? initialEditingAccount.type : 'checking'
  );
  const [formBalance, setFormBalance] = useState(
    initialEditingAccount ? initialEditingAccount.initialBalance.toString() : '0'
  );
  const [formInstitution, setFormInstitution] = useState(
    initialEditingAccount ? initialEditingAccount.institution || '' : ''
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setFormName('');
    setFormType('checking');
    setFormBalance('0');
    setFormInstitution('');
    setEditingAccountId(null);
    setErrorMessage(null);
    setIsCreating(true);
  };

  const handleStartEdit = (acc: Account) => {
    setFormName(acc.name);
    setFormType(acc.type);
    setFormBalance(acc.initialBalance.toString());
    setFormInstitution(acc.institution || '');
    setEditingAccountId(acc.id);
    setErrorMessage(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingAccountId(null);
    setErrorMessage(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const initial = parseFloat(formBalance) || 0;
    const iconForType: Record<AccountType, string> = {
      checking: 'Landmark',
      savings: 'Vault',
      credit: 'CreditCard',
      cash: 'Banknote',
      investment: 'Landmark',
    };

    if (editingAccountId) {
      updateAccount(editingAccountId, {
        name: formName.trim(),
        type: formType,
        initialBalance: initial,
        institution: formInstitution.trim() || undefined,
        icon: iconForType[formType] || 'CreditCard',
      });
    } else {
      addAccount({
        name: formName.trim(),
        type: formType,
        initialBalance: initial,
        currency: 'EUR',
        color: '#18181b',
        icon: iconForType[formType] || 'CreditCard',
        institution: formInstitution.trim() || undefined,
      });
    }

    handleCancel();
  };

  const handleDelete = (id: string) => {
    deleteAccount(id);
    handleCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shadow-xs">
              <CreditCard className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">Accounts & Wallets</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage bank accounts, debit cards, cash, and balances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Create / Edit Form */}
          {(isCreating || editingAccountId) && (
            <form
              onSubmit={handleSave}
              className="p-4 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/90 dark:border-zinc-700 space-y-3 animate-in fade-in"
            >
              <span className="font-bold text-xs text-zinc-950 dark:text-white block">
                {editingAccountId ? 'Edit Account' : 'Add New Account'}
              </span>

              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. N26 Main, Revolut, Cash Wallet"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as AccountType)}
                    className="w-full px-2.5 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                  >
                    {ACCOUNT_TYPES.map(t => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Initial Balance (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formBalance}
                    onChange={e => setFormBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Institution (Optional)
                </label>
                <input
                  type="text"
                  value={formInstitution}
                  onChange={e => setFormInstitution(e.target.value)}
                  placeholder="e.g. N26, Trade Republic, Santander"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingAccountId ? 'Save Changes' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Accounts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Active Accounts ({accounts.filter(a => !a.isArchived).length})
              </span>
              {!isCreating && !editingAccountId && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Account</span>
                </button>
              )}
            </div>

            {accounts.filter(a => !a.isArchived).map(acc => {
              const currentBalance = calculatedBalances[acc.id] ?? acc.initialBalance;
              const Icon = getIcon(acc.icon, Landmark);

              return (
                <div
                  key={acc.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-between gap-3 group hover:bg-zinc-100/70 dark:hover:bg-zinc-700/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shrink-0 shadow-2xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-xs text-zinc-950 dark:text-white block truncate">
                        {acc.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block capitalize">
                        {acc.institution ? `${acc.institution} · ` : ''}
                        {acc.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs font-bold text-zinc-950 dark:text-white tabular-nums">
                      {formatEUR(currentBalance)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(acc)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/80 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Edit account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end text-xs shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
