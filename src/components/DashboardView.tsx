import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { QuickLogPanel } from './QuickLogPanel';
import { TransactionEditModal } from './TransactionEditModal';
import { Transaction } from '../types';
import { getIcon } from '../utils/icons';
import {
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Plus,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenTransfer: (fromId?: string, toId?: string) => void;
  onNavigateTab: (tab: 'overview' | 'quicklog' | 'accounts' | 'categories' | 'analytics') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenTransfer,
  onNavigateTab,
}) => {
  const {
    accounts,
    categoryGroups,
    transactions,
    calculatedBalances,
    totalNetWorth,
    monthStats,
    categoryGroupStats,
  } = useLedger();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const activeAccounts = accounts.filter(a => !a.isArchived);
  const recentTransactions = transactions.slice(0, 6);
  const allCategories = categoryGroups.flatMap(g => g.categories);

  return (
    <div className="space-y-6">
      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Net Worth */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Total Net Worth
            </span>
            <span className="text-xs text-zinc-400 font-mono">Real-time</span>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-zinc-950 tabular-nums">
            ${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
            <span>
              {activeAccounts.length} {activeAccounts.length === 1 ? 'account' : 'accounts'} connected
            </span>
          </div>
        </div>

        {/* Metric 2: Month Outflow */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Month Outflow
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Day {monthStats.currentDayOfMonth}/{monthStats.daysInMonth}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-zinc-950 tabular-nums">
            ${monthStats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Velocity: <span className="font-mono text-zinc-800 font-medium">${monthStats.dailyVelocity.toFixed(1)}/day</span>
          </div>
        </div>

        {/* Metric 3: Month Inflow */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Month Inflow
            </span>
            <span className="text-xs text-emerald-600 font-medium">Deposits</span>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-700 tabular-nums">
            +${monthStats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Direct deposits & revenue
          </div>
        </div>

        {/* Metric 4: Net Month Balance */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Net Surplus / Rate
            </span>
            <span className="text-xs font-mono text-zinc-400">Net Flow</span>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums ${
              monthStats.netSavings >= 0 ? 'text-zinc-950' : 'text-red-600'
            }`}
          >
            {monthStats.netSavings >= 0 ? '+' : ''}$
            {monthStats.netSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Projected Month Spend:{' '}
            <span className="font-mono font-medium text-zinc-800">
              ${monthStats.projectedMonthEndExpense.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Speed Numpad & Quick Entry Box */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Quick Logging
            </h2>
            <span className="text-xs text-zinc-500">Fast numpad or smart natural text</span>
          </div>

          <QuickLogPanel />
        </div>

        {/* Right Column (5 cols): Accounts snapshot + Category Allocation Overview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Account Balances Card */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Active Accounts</h3>
                <p className="text-xs text-zinc-500">Live balances and transfer routing</p>
              </div>
              <button
                onClick={() => onOpenTransfer()}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer</span>
              </button>
            </div>

            <div className="space-y-2">
              {activeAccounts.slice(0, 4).map(acc => {
                const bal = calculatedBalances[acc.id] ?? acc.initialBalance;
                const Icon = getIcon(acc.icon, CreditCard);
                return (
                  <div
                    key={acc.id}
                    className="p-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-800 shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-zinc-900 truncate leading-tight">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 capitalize">{acc.type}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono font-bold text-xs tabular-nums ${
                          bal < 0 ? 'text-red-600' : 'text-zinc-950'
                        }`}
                      >
                        ${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => onOpenTransfer(acc.id, undefined)}
                        className="p-1 text-zinc-400 hover:text-indigo-600"
                        title="Transfer from this account"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => onNavigateTab('accounts')}
              className="mt-3 w-full py-2 text-center text-xs font-semibold text-zinc-600 hover:text-zinc-950 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors block"
            >
              Manage All Accounts & Transfers →
            </button>
          </div>

          {/* Category Allocation Progress */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Category Plan & Targets</h3>
                <p className="text-xs text-zinc-500">Actual spend vs planned share</p>
              </div>
              <button
                onClick={() => onNavigateTab('categories')}
                className="text-xs font-semibold text-zinc-900 hover:underline flex items-center gap-1"
              >
                <span>Plan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {categoryGroupStats.slice(0, 4).map(stat => {
                const isOver = stat.variancePercent > 2;
                return (
                  <div key={stat.group.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-900 truncate">
                        {stat.group.name}
                      </span>
                      <div className="font-mono text-[11px] text-zinc-600 tabular-nums">
                        ${stat.actualAmount.toFixed(0)}{' '}
                        <span className="text-zinc-400">
                          ({stat.actualPercent.toFixed(0)}% / {stat.group.targetAllocationPercent}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200">
                      <div
                        className={`h-full transition-all ${
                          isOver ? 'bg-amber-600' : 'bg-zinc-900'
                        }`}
                        style={{
                          width: `${Math.min(100, (stat.actualPercent / (stat.group.targetAllocationPercent || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => onNavigateTab('categories')}
              className="mt-4 w-full py-2 text-center text-xs font-semibold text-zinc-600 hover:text-zinc-950 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors block"
            >
              Detailed Velocity & Projections →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Ledger Strip */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Recent Transactions</h3>
            <p className="text-xs text-zinc-500">Latest expense logs and account routing</p>
          </div>
          <button
            onClick={() => onNavigateTab('analytics')}
            className="text-xs font-semibold text-zinc-900 hover:underline flex items-center gap-1"
          >
            <span>Full Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-zinc-100">
          {recentTransactions.map(tx => {
            const acc = accounts.find(a => a.id === tx.accountId)?.name || tx.accountId;
            const toAcc = tx.toAccountId
              ? accounts.find(a => a.id === tx.toAccountId)?.name || tx.toAccountId
              : null;
            const cat = allCategories.find(c => c.id === tx.categoryId);
            const subCat = cat?.subcategories?.find(s => s.id === tx.subcategoryId);

            return (
              <div
                key={tx.id}
                onClick={() => setEditingTx(tx)}
                className="py-2.5 px-2 -mx-2 rounded-xl flex items-center justify-between gap-4 text-xs cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group select-none"
                title="Click to edit movement"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      tx.type === 'expense'
                        ? 'bg-zinc-100 text-zinc-800'
                        : tx.type === 'income'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {tx.type === 'expense' ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : tx.type === 'income' ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-zinc-950 truncate block">
                      {tx.note || (tx.type === 'transfer' ? 'Transfer' : 'Expense')}
                    </span>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5 truncate">
                      <span>{tx.date}</span>
                      <span>·</span>
                      <span>
                        {tx.type === 'transfer' ? `${acc} → ${toAcc}` : `${acc}`}
                      </span>
                      {cat && (
                        <>
                          <span>·</span>
                          <span className="text-zinc-600 font-medium">
                            {cat.name}
                            {subCat && (
                              <span className="text-zinc-400 font-normal"> › {subCat.name}</span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`font-mono font-bold text-xs sm:text-sm tabular-nums shrink-0 ${
                      tx.type === 'expense'
                        ? 'text-zinc-950'
                        : tx.type === 'income'
                        ? 'text-emerald-600'
                        : 'text-indigo-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}$
                    {tx.amount.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Edit Modal */}
      <TransactionEditModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
      />
    </div>
  );
};
