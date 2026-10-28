import React, { useState, useMemo } from 'react';
import { useLedger, PersonDebtSummary } from '../context/LedgerContext';
import { Account, AccountType, Person, Transaction } from '../types';
import { getIcon } from '../utils/icons';
import {
  CreditCard,
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
  Trash2,
  X,
  Check,
  CheckCircle2,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  FolderKanban,
  Pin,
} from 'lucide-react';
import { GroupManageModal } from './GroupManageModal';

interface AccountsViewProps {
  onOpenTransfer: (fromId?: string, toId?: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ onOpenTransfer }) => {
  const {
    accounts,
    calculatedBalances,
    totalNetWorth,
    transactions,
    people,
    groups,
    groupSummaries,
    personDebtSummaries,
    totalPendingOwed,
    formatEUR,
    addAccount,
    updateAccount,
    deleteAccount,
    addPerson,
    updatePerson,
    deletePerson,
    settleRepayment,
    categoryGroups,
    cloudSyncStatus,
  } = useLedger();

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Account Modal state
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountType>('checking');
  const [formBalance, setFormBalance] = useState('');
  const [formInstitution, setFormInstitution] = useState('');

  // Person Modal state (Add / Edit)
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [personName, setPersonName] = useState('');
  const [personEmoji, setPersonEmoji] = useState('👤');
  const [personDeleteError, setPersonDeleteError] = useState<string | null>(null);

  // Repayment Modal state
  const [repaymentPerson, setRepaymentPerson] = useState<PersonDebtSummary | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [actualReceivedInput, setActualReceivedInput] = useState<string>('');
  const [repaymentAccountId, setRepaymentAccountId] = useState<string>('');
  const [repaymentDate, setRepaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [repaymentNote, setRepaymentNote] = useState<string>('');
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Collapsible People & Recoverable Debts section (defaults to true if there are pending debts)
  const [isPeopleSectionOpen, setIsPeopleSectionOpen] = useState(() => totalPendingOwed > 0);

  // Expanded person cards for seeing detailed open/settled items
  const [expandedPersonIds, setExpandedPersonIds] = useState<Record<string, boolean>>({});

  const activeAccounts = accounts.filter(a => !a.isArchived);

  // Transfers history
  const transferTransactions = transactions
    .filter(t => t.type === 'transfer')
    .slice(0, 15);

  const togglePersonExpand = (id: string) => {
    setExpandedPersonIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Add Account modal
  const handleOpenAddAccount = () => {
    setFormName('');
    setFormType('checking');
    setFormBalance('0');
    setFormInstitution('');
    setEditingAccount(null);
    setIsAddAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setFormName(acc.name);
    setFormType(acc.type);
    setFormBalance(acc.initialBalance.toString());
    setFormInstitution(acc.institution || '');
    setIsAddAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const initial = parseFloat(formBalance) || 0;
    const iconForType: Record<AccountType, string> = {
      checking: 'Landmark',
      savings: 'Vault',
      credit: 'CreditCard',
      cash: 'Banknote',
      investment: 'TrendingUp',
    };

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: formName.trim(),
        type: formType,
        initialBalance: initial,
        institution: formInstitution.trim() || undefined,
        icon: iconForType[formType],
      });
    } else {
      addAccount({
        name: formName.trim(),
        type: formType,
        initialBalance: initial,
        currency: 'EUR',
        color: '#09090b',
        icon: iconForType[formType],
        institution: formInstitution.trim() || undefined,
      });
    }

    setIsAddAccountModalOpen(false);
  };

  // Open Add / Edit Person modal
  const handleOpenAddPerson = () => {
    setEditingPerson(null);
    setPersonName('');
    setPersonEmoji('👤');
    setPersonDeleteError(null);
    setIsPersonModalOpen(true);
  };

  const handleOpenEditPerson = (p: Person) => {
    setEditingPerson(p);
    setPersonName(p.name);
    setPersonEmoji(p.emoji);
    setPersonDeleteError(null);
    setIsPersonModalOpen(true);
  };

  const handleSavePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;

    if (editingPerson) {
      updatePerson(editingPerson.id, {
        name: personName.trim(),
        emoji: personEmoji || '👤',
      });
    } else {
      addPerson({
        name: personName.trim(),
        emoji: personEmoji || '👤',
      });
    }
    setIsPersonModalOpen(false);
  };

  const handleDeletePerson = (id: string) => {
    const res = deletePerson(id);
    if (!res.success) {
      setPersonDeleteError(res.error || 'Cannot delete person.');
    } else {
      setIsPersonModalOpen(false);
    }
  };

  // Open Repayment Modal
  const handleOpenRepayment = (summary: PersonDebtSummary) => {
    setRepaymentPerson(summary);
    // Pre-select all open transactions by default
    const openIds = summary.openTransactions.map(t => t.id);
    setSelectedTxIds(openIds);
    setActualReceivedInput(summary.totalOwed.toFixed(2));
    setRepaymentAccountId(accounts[0]?.id || '');
    setRepaymentDate(new Date().toISOString().split('T')[0]);
    setRepaymentNote('');
  };

  // Toggle selection of a single transaction in Repayment modal
  const toggleSelectTx = (id: string) => {
    setSelectedTxIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // Recalculate default expected total for selection
      if (repaymentPerson) {
        const sum = repaymentPerson.openTransactions
          .filter(t => next.includes(t.id))
          .reduce(
            (s, t) => s + (Number(t.owedAmount !== undefined ? t.owedAmount : t.amount) || 0),
            0
          );
        setActualReceivedInput(sum.toFixed(2));
      }
      return next;
    });
  };

  // Select all or clear selection
  const handleSelectAllTxs = (select: boolean) => {
    if (!repaymentPerson) return;
    if (select) {
      const allIds = repaymentPerson.openTransactions.map(t => t.id);
      setSelectedTxIds(allIds);
      setActualReceivedInput(repaymentPerson.totalOwed.toFixed(2));
    } else {
      setSelectedTxIds([]);
      setActualReceivedInput('0.00');
    }
  };

  // Expected subtotal of currently selected transactions
  const selectedExpectedSubtotal = useMemo(() => {
    if (!repaymentPerson) return 0;
    return repaymentPerson.openTransactions
      .filter(t => selectedTxIds.includes(t.id))
      .reduce((s, t) => s + (Number(t.owedAmount !== undefined ? t.owedAmount : t.amount) || 0), 0);
  }, [repaymentPerson, selectedTxIds]);

  const actualReceivedNum = parseFloat(actualReceivedInput) || 0;
  const repaymentDifference = Number((actualReceivedNum - selectedExpectedSubtotal).toFixed(2));

  const handleConfirmRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentPerson || selectedTxIds.length === 0) return;
    if (actualReceivedNum <= 0) return;

    settleRepayment({
      personId: repaymentPerson.person.id,
      selectedTransactionIds: selectedTxIds,
      expectedTotal: selectedExpectedSubtotal,
      actualAmountReceived: actualReceivedNum,
      toAccountId: repaymentAccountId || accounts[0]?.id || '',
      date: repaymentDate,
      note: repaymentNote.trim() || undefined,
    });

    setRepaymentPerson(null);
  };

  const findCategory = (categoryId?: string) => {
    return categoryGroups.flatMap(g => g.categories).find(c => c.id === categoryId);
  };

  const POPULAR_EMOJIS = ['👨‍👩‍👦', '👤', '👩', '👨', '🤝', '💼', '🏖️', '🍕', '🏠', '❤️', '🚗', '🎓'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Banner / Summary Strip */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
            Total Net Balance (All Accounts)
          </span>
          <div className="text-3xl sm:text-4xl font-mono font-bold text-zinc-950 dark:text-white tabular-nums">
            {formatEUR(totalNetWorth)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>
              {activeAccounts.length} {activeAccounts.length === 1 ? 'account' : 'accounts'} connected
            </span>
            {cloudSyncStatus === 'synced' && (
              <>
                <span>·</span>
                <span>Real-time balance updates</span>
              </>
            )}
            {totalPendingOwed > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  {formatEUR(totalPendingOwed)} to recover from people
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenTransfer()}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Transfer Money</span>
          </button>
          <button
            onClick={handleOpenAddAccount}
            className="px-2.5 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-xl shadow-2xs transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PEOPLE & DEBT RECOVERY SECTION ("Someone owes me for this") */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setIsPeopleSectionOpen(prev => !prev)}
            className="flex items-center gap-2 group text-left focus:outline-none"
          >
            <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white uppercase tracking-wider flex items-center gap-1.5 transition-colors">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>People & Recoverable Debts ({personDebtSummaries.length})</span>
            </h2>
            {totalPendingOwed > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Pending: {formatEUR(totalPendingOwed)}
              </span>
            )}
            <div className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
              {isPeopleSectionOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          <button
            onClick={handleOpenAddPerson}
            className="px-2.5 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-700/60 hover:border-amber-600 dark:hover:border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl shadow-2xs transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Add Person</span>
          </button>
        </div>

        {isPeopleSectionOpen && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {personDebtSummaries.length === 0 ? (
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg">
                  👥
                </div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">No people tracked yet</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Track who owes you for shared dinners, groceries, or group expenses.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddPerson}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xs transition-colors"
                >
                  + Add Person
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {personDebtSummaries.map(summary => {
                  const isExpanded = !!expandedPersonIds[summary.person.id];
                  const hasOpen = summary.totalOwed > 0;

                  return (
                    <div
                      key={summary.person.id}
                      className={`bg-white dark:bg-zinc-900 rounded-2xl border transition-all shadow-xs ${
                        hasOpen
                          ? 'border-amber-200/90 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700'
                          : 'border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      } p-4 sm:p-5 flex flex-col justify-between`}
                    >
                      <div>
                        {/* Person Card Top Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                              {summary.person.emoji}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-zinc-950 dark:text-white truncate leading-tight">
                                  {summary.person.name}
                                </h3>
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                {hasOpen ? (
                                  <span className="font-medium text-amber-700 dark:text-amber-400">
                                    {summary.openCount} open {summary.openCount === 1 ? 'item' : 'items'}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 dark:text-zinc-500">All debts settled</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEditPerson(summary.person)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Edit person"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Owed Amount Row */}
                        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block font-medium">
                              {hasOpen ? 'Owes you' : 'Current balance'}
                            </span>
                            <div
                              className={`text-2xl font-mono font-bold tracking-tight tabular-nums ${
                                hasOpen ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'
                              }`}
                            >
                              {formatEUR(summary.totalOwed)}
                            </div>
                          </div>

                          {summary.totalSettled > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block font-medium">
                                Recovered
                              </span>
                              <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatEUR(summary.totalSettled)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Person Card Actions */}
                      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                        {hasOpen ? (
                          <button
                            onClick={() => handleOpenRepayment(summary)}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Received ({formatEUR(summary.totalOwed)})</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 py-2 px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-xl text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                            <span>No Pending Debts</span>
                          </button>
                        )}

                        <button
                          onClick={() => togglePersonExpand(summary.person.id)}
                          className="py-2 px-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1 shrink-0"
                          title={isExpanded ? 'Hide items' : 'View open and past items'}
                        >
                          <span>{summary.openCount + summary.settledTransactions.length} items</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </button>
                      </div>

                      {/* Expanded items list */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2 animate-in fade-in">
                          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Open Expenses ({summary.openCount})
                          </div>
                          {summary.openTransactions.length === 0 ? (
                            <div className="text-xs text-zinc-400 dark:text-zinc-500 italic py-1">No open items.</div>
                          ) : (
                            <div className="space-y-1.5">
                              {summary.openTransactions.map(t => {
                                const cat = findCategory(t.categoryId);
                                return (
                                  <div
                                    key={t.id}
                                    className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between text-xs gap-2"
                                  >
                                    <div className="min-w-0 truncate">
                                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {t.note || cat?.name || 'Expense'}
                                      </div>
                                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5">
                                        <span>{t.date}</span>
                                        {cat && <span>· {cat.name}</span>}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="font-mono font-bold text-amber-800 dark:text-amber-400">
                                        {formatEUR(t.owedAmount !== undefined ? t.owedAmount : t.amount)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {summary.settledTransactions.length > 0 && (
                            <div className="pt-2">
                              <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                Recently Recovered ({summary.settledTransactions.length})
                              </div>
                              <div className="space-y-1">
                                {summary.settledTransactions.slice(0, 3).map(t => (
                                  <div
                                    key={t.id}
                                    className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400"
                                  >
                                    <span className="truncate">{t.note || 'Expense'}</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                      {formatEUR(t.owedAmount || t.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ACCOUNTS & BALANCES SECTION */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Your Accounts & Balances
          </h2>
          <span className="text-xs text-zinc-400">Tap transfer to reallocate</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {activeAccounts.map(account => {
            const currentBal = calculatedBalances[account.id] ?? account.initialBalance;
            const netChange = currentBal - account.initialBalance;
            const Icon = getIcon(account.icon, CreditCard);

            return (
              <div
                key={account.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h3 className="text-sm font-bold text-zinc-950 dark:text-white truncate leading-tight">
                          {account.name}
                        </h3>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 capitalize mt-0.5">
                          {account.type} {account.institution ? `· ${account.institution}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditAccount(account)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Edit account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {activeAccounts.length > 1 && (
                        <button
                          onClick={() => setAccountToDelete(account)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Delete account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Current Balance */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                        Current Balance
                      </span>
                      <div
                        className={`text-2xl font-mono font-bold tracking-tight tabular-nums ${
                          currentBal < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-950 dark:text-white'
                        }`}
                      >
                        {formatEUR(currentBal)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                        Net Activity
                      </span>
                      <span
                        className={`text-xs font-mono font-medium tabular-nums ${
                          netChange > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : netChange < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {netChange > 0 ? '+' : ''}
                        {formatEUR(netChange)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Action Buttons */}
                <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                  <button
                    onClick={() => onOpenTransfer(account.id, undefined)}
                    className="flex-1 py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>Transfer Out</span>
                  </button>
                  <button
                    onClick={() => onOpenTransfer(undefined, account.id)}
                    className="flex-1 py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>Receive In</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inter-Account Transfers History */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Inter-Account Transfers</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">History of money moved between your accounts</p>
          </div>
          <button
            onClick={() => onOpenTransfer()}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>New Transfer</span>
          </button>
        </div>

        {transferTransactions.length === 0 ? (
          <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-xs">
            No transfers logged yet. Use Transfer Money to move funds.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {transferTransactions.map(tx => {
              const fromAcc = accounts.find(a => a.id === tx.accountId)?.name || tx.accountId;
              const toAcc =
                accounts.find(a => a.id === tx.toAccountId)?.name || tx.toAccountId || 'Account';
              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                        <span>{fromAcc}</span>
                        <span className="text-zinc-400 dark:text-zinc-500">→</span>
                        <span>{toAcc}</span>
                      </div>
                      <div className="text-zinc-400 dark:text-zinc-500 text-[11px] mt-0.5 truncate">
                        {tx.date} {tx.note ? `· ${tx.note}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                    {formatEUR(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* REPAYMENT SETTLEMENT MODAL (One-by-one checkbox selection & variances) */}
      {/* ========================================================================= */}
      {repaymentPerson && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full p-5 sm:p-6 relative max-h-[90vh] flex flex-col transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{repaymentPerson.person.emoji}</span>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white leading-tight">
                    Record Repayment from {repaymentPerson.person.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Select which expenses are being settled and reconcile
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRepaymentPerson(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleConfirmRepayment}
              className="space-y-4 text-xs overflow-y-auto py-3 pr-1"
            >
              {/* Step 1: Select Open Transactions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                    1. Select expenses being settled ({selectedTxIds.length} of{' '}
                    {repaymentPerson.openTransactions.length})
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleSelectAllTxs(true)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllTxs(false)}
                      className="text-zinc-500 dark:text-zinc-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700">
                  {repaymentPerson.openTransactions.map(t => {
                    const isSelected = selectedTxIds.includes(t.id);
                    const cat = findCategory(t.categoryId);
                    const owed = t.owedAmount !== undefined ? t.owedAmount : t.amount;

                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleSelectTx(t.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by row click
                            className="w-4 h-4 rounded text-amber-600 accent-amber-600 cursor-pointer"
                          />
                          <div className="truncate">
                            <div className="font-bold text-xs truncate">
                              {t.note || cat?.name || 'Expense'}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                              <span>{t.date}</span>
                              {cat && <span>· {cat.name}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="font-mono font-bold text-xs text-amber-900 dark:text-amber-300 shrink-0">
                          {formatEUR(owed)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal of selection */}
                <div className="mt-2 flex items-center justify-between px-1 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">Selected Expenses Total:</span>
                  <span className="font-mono font-bold text-zinc-950 dark:text-white text-sm">
                    {formatEUR(selectedExpectedSubtotal)}
                  </span>
                </div>
              </div>

              {/* Step 2: Actual Amount Received & Difference reconciliation */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-2.5">
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                  2. Actual amount received (€)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-mono text-sm">
                      €
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={actualReceivedInput}
                      onChange={e => setActualReceivedInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl font-mono text-sm font-bold text-zinc-950 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setActualReceivedInput(selectedExpectedSubtotal.toFixed(2))}
                    className="px-2.5 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 rounded-xl transition-colors"
                  >
                    Reset to Exact
                  </button>
                </div>

                {/* Variance feedback banner */}
                {repaymentDifference > 0 && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-900 dark:text-emerald-300 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold">
                        +{formatEUR(repaymentDifference)} Round-up extra!
                      </span>
                      <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">
                        {formatEUR(selectedExpectedSubtotal)} will settle the debt, and the extra{' '}
                        {formatEUR(repaymentDifference)} will be recorded as Income tagged{' '}
                        <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 rounded font-mono font-semibold">
                          [Repayment Extra]
                        </code>
                        .
                      </p>
                    </div>
                  </div>
                )}

                {repaymentDifference < 0 && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-950 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold">
                        {formatEUR(repaymentDifference)} Shortfall discount accepted
                      </span>
                      <p className="mt-0.5 text-amber-800 dark:text-amber-400">
                        The expenses will be marked settled. The {formatEUR(Math.abs(repaymentDifference))}{' '}
                        difference becomes a personal expense tagged{' '}
                        <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded font-mono font-semibold">
                          [Unrecovered Discount]
                        </code>{' '}
                        under the original category.
                      </p>
                    </div>
                  </div>
                )}

                {repaymentDifference === 0 && selectedExpectedSubtotal > 0 && (
                  <div className="p-2 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-xl text-zinc-600 dark:text-zinc-400 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Exact match: 100% of selected debt will be settled.</span>
                  </div>
                )}
              </div>

              {/* Step 3: Deposit account & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Deposit to Account
                  </label>
                  <select
                    value={repaymentAccountId || accounts[0]?.id}
                    onChange={e => setRepaymentAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-950 dark:text-zinc-100 focus:outline-none"
                  >
                    {activeAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatEUR(calculatedBalances[a.id] || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Date Received</label>
                  <input
                    type="date"
                    value={repaymentDate}
                    onChange={e => setRepaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-950 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={repaymentNote}
                  onChange={e => setRepaymentNote(e.target.value)}
                  placeholder={`e.g. Bank transfer reimbursement from ${repaymentPerson.person.name}`}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRepaymentPerson(null)}
                  className="flex-1 py-2.5 px-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedTxIds.length === 0 || actualReceivedNum <= 0}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm ({formatEUR(actualReceivedNum)})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT PERSON MODAL */}
      {/* ========================================================================= */}
      {isPersonModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-sm w-full p-6 relative transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                {editingPerson ? 'Edit Person' : 'Add Person'}
              </h3>
              <button
                onClick={() => setIsPersonModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={personName}
                  onChange={e => setPersonName(e.target.value)}
                  placeholder="e.g. Parents, Marco, Roommate, Alex"
                  className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Avatar Emoji</label>
                <div className="flex flex-wrap gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                  {POPULAR_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setPersonEmoji(em)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                        personEmoji === em
                          ? 'bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500 scale-110 shadow-xs'
                          : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {personDeleteError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-850 text-red-700 dark:text-red-300 rounded-xl text-[11px]">
                  {personDeleteError}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                {editingPerson && (
                  <button
                    type="button"
                    onClick={() => handleDeletePerson(editingPerson.id)}
                    className="py-2.5 px-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold rounded-xl"
                    title="Delete person (only if 0 transactions)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPersonModalOpen(false)}
                  className="flex-1 py-2.5 px-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {editingPerson ? 'Save Changes' : 'Create Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT ACCOUNT MODAL */}
      {/* ========================================================================= */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 relative transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                {editingAccount ? 'Edit Account' : 'Add Account'}
              </h3>
              <button
                onClick={() => setIsAddAccountModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. N26, Revolut, ING, Bargeld"
                  className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['checking', 'savings', 'credit', 'cash', 'investment'] as AccountType[]).map(
                    t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormType(t)}
                        className={`p-2 rounded-xl border text-center capitalize transition-colors ${
                          formType === t
                            ? 'border-zinc-950 dark:border-zinc-100 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-medium'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {t}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Initial Balance (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formBalance}
                    onChange={e => setFormBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Bank / Institution
                  </label>
                  <input
                    type="text"
                    value={formInstitution}
                    onChange={e => setFormInstitution(e.target.value)}
                    placeholder="e.g. N26, Sparkasse"
                    className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="flex-1 py-2.5 px-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {editingAccount ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-sm w-full p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-sm text-zinc-950 dark:text-white">Delete {accountToDelete.name}?</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to remove this account? Existing movements associated with this account will remain in your history.
            </p>
            <div className="flex gap-2 pt-1 text-xs">
              <button
                onClick={() => setAccountToDelete(null)}
                className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteAccount(accountToDelete.id);
                  setAccountToDelete(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Manage Modal */}
      <GroupManageModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </div>
  );
};
