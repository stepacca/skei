import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { X, ArrowRightLeft, Check } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFromAccountId?: string;
  defaultToAccountId?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  defaultFromAccountId,
  defaultToAccountId,
}) => {
  const { accounts, calculatedBalances, transferFunds, formatEUR } = useLedger();

  const activeAccounts = accounts.filter(a => !a.isArchived);

  const [fromAccountId, setFromAccountId] = useState<string>(() => {
    return defaultFromAccountId && accounts.some(a => a.id === defaultFromAccountId && !a.isArchived)
      ? defaultFromAccountId
      : activeAccounts[0]?.id || '';
  });
  const [toAccountId, setToAccountId] = useState<string>(() => {
    return defaultToAccountId && accounts.some(a => a.id === defaultToAccountId && !a.isArchived)
      ? defaultToAccountId
      : activeAccounts[1]?.id || activeAccounts[0]?.id || '';
  });
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('Account transfer');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const validFrom = defaultFromAccountId && activeAccounts.some(a => a.id === defaultFromAccountId)
      ? defaultFromAccountId
      : activeAccounts[0]?.id || '';

    const validTo = defaultToAccountId && activeAccounts.some(a => a.id === defaultToAccountId)
      ? defaultToAccountId
      : (activeAccounts.find(a => a.id !== validFrom)?.id || activeAccounts[1]?.id || validFrom);

    setFromAccountId(validFrom);
    setToAccountId(validTo);
    setError('');
  }, [isOpen, defaultFromAccountId, defaultToAccountId, accounts]);

  if (!isOpen) return null;

  const fromAccount = activeAccounts.find(a => a.id === fromAccountId);
  const toAccount = activeAccounts.find(a => a.id === toAccountId);

  const fromBalance = fromAccount ? calculatedBalances[fromAccount.id] ?? fromAccount.initialBalance : 0;
  const toBalance = toAccount ? calculatedBalances[toAccount.id] ?? toAccount.initialBalance : 0;

  const parsedAmount = parseFloat(amountStr) || 0;

  const handleSwap = () => {
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setError('Please enter an amount greater than €0.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setError('Please choose two different accounts to transfer between.');
      return;
    }
    if (!fromAccountId || !toAccountId) {
      setError('Please select valid accounts for the transfer.');
      return;
    }

    transferFunds({
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
      note: note.trim() || 'Account transfer',
      date,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl max-w-md w-full p-5 sm:p-6 relative transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">Move Money</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Instant transfer between your accounts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close transfer modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Amount Input */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Amount (€)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-zinc-400 dark:text-zinc-500 text-xl font-medium">
                €
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={e => {
                  setAmountStr(e.target.value);
                  setError('');
                }}
                placeholder="0.00"
                autoFocus
                className="w-full pl-9 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-mono text-2xl font-bold text-zinc-950 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400 focus:bg-white dark:focus:bg-zinc-800 tabular-nums"
              />
            </div>
          </div>

          {/* Account Route: From -> Swap -> To */}
          <div className="space-y-2 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                From Account
              </label>
              <select
                value={fromAccountId}
                onChange={e => {
                  setFromAccountId(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
              >
                {activeAccounts.map(acc => {
                  const bal = calculatedBalances[acc.id] ?? acc.initialBalance;
                  return (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatEUR(bal)})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={handleSwap}
                className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white shadow-xs transition-colors"
                title="Swap accounts"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                To Account
              </label>
              <select
                value={toAccountId}
                onChange={e => {
                  setToAccountId(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
              >
                {activeAccounts.map(acc => {
                  const bal = calculatedBalances[acc.id] ?? acc.initialBalance;
                  return (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatEUR(bal)})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Impact preview */}
          {parsedAmount > 0 && fromAccount && toAccount && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 text-xs space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">{fromAccount.name}:</span>
                <span className="text-zinc-900 dark:text-zinc-200">{formatEUR(fromBalance - parsedAmount)}</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">{toAccount.name}:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{formatEUR(toBalance + parsedAmount)}</span>
              </div>
            </div>
          )}

          {/* Note & Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Note
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Savings deposit"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={parsedAmount <= 0 || fromAccountId === toAccountId || !fromAccountId || !toAccountId}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Transfer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
