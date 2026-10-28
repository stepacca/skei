import React, { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Transaction } from '../types';
import {
  Search,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const {
    accounts,
    categoryGroups,
    transactions,
    monthStats,
    formatEUR,
    deleteTransaction,
    exportCSV,
    exportJSON,
    importJSON,
    resetToInitial,
  } = useLedger();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'month' | '30days' | 'all'>('month');

  // Interactive SVG Donut Hover State
  const [hoveredCategory, setHoveredCategory] = useState<{
    name: string;
    amount: number;
    percent: number;
    color: string;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (dateRangeFilter === 'month' && !t.date.startsWith(currentMonthPrefix)) return false;
      if (dateRangeFilter === '30days' && t.date < thirtyDaysAgoStr) return false;
      if (selectedTypeFilter !== 'all' && t.type !== selectedTypeFilter) return false;

      if (
        selectedAccountFilter !== 'all' &&
        t.accountId !== selectedAccountFilter &&
        t.toAccountId !== selectedAccountFilter
      ) {
        return false;
      }

      if (selectedGroupFilter !== 'all') {
        if (t.type !== 'expense') return false;
        if (t.groupId !== selectedGroupFilter) {
          const cat = categoryGroups
            .flatMap(g => g.categories)
            .find(c => c.id === t.categoryId);
          if (!cat || cat.groupId !== selectedGroupFilter) return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const noteMatch = (t.note || '').toLowerCase().includes(query);
        const amountMatch = t.amount.toString().includes(query);
        const accName = accounts.find(a => a.id === t.accountId)?.name.toLowerCase() || '';
        const toAccName = t.toAccountId
          ? accounts.find(a => a.id === t.toAccountId)?.name.toLowerCase() || ''
          : '';
        const catName =
          categoryGroups
            .flatMap(g => g.categories)
            .find(c => c.id === t.categoryId)
            ?.name.toLowerCase() || '';

        return (
          noteMatch ||
          amountMatch ||
          accName.includes(query) ||
          toAccName.includes(query) ||
          catName.includes(query)
        );
      }

      return true;
    });
  }, [
    transactions,
    dateRangeFilter,
    currentMonthPrefix,
    thirtyDaysAgoStr,
    selectedTypeFilter,
    selectedAccountFilter,
    selectedGroupFilter,
    searchQuery,
    accounts,
    categoryGroups,
  ]);

  // Aggregate Category Expense Data for Donut Chart
  const categoryExpenses = useMemo(() => {
    const expenses = transactions.filter(
      t => t.type === 'expense' && t.date.startsWith(currentMonthPrefix)
    );
    const totalExp = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const map = new Map<string, { name: string; amount: number; color: string }>();
    const colors = [
      '#09090b',
      '#4f46e5',
      '#0284c7',
      '#16a34a',
      '#d97706',
      '#dc2626',
      '#9333ea',
      '#0891b2',
      '#db2777',
      '#64748b',
    ];

    let colorIdx = 0;
    for (const tx of expenses) {
      const cat = categoryGroups
        .flatMap(g => g.categories)
        .find(c => c.id === tx.categoryId);
      const name = cat ? cat.name : 'Uncategorized';
      const existing = map.get(name) || {
        name,
        amount: 0,
        color: colors[colorIdx++ % colors.length],
      };
      existing.amount += Number(tx.amount) || 0;
      map.set(name, existing);
    }

    const items = Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map(item => ({
        ...item,
        percent: totalExp > 0 ? (item.amount / totalExp) * 100 : 0,
      }));

    return { total: totalExp, items };
  }, [transactions, currentMonthPrefix, categoryGroups]);

  // Daily Spending timeline over current month
  const dailySpendData = useMemo(() => {
    const days: { day: number; label: string; amount: number }[] = [];
    const currentMonthNum = now.getMonth();
    const currentYearNum = now.getFullYear();
    const daysToShow = monthStats.currentDayOfMonth;

    for (let d = 1; d <= daysToShow; d++) {
      const dateStr = `${currentYearNum}-${String(currentMonthNum + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const dayTxs = transactions.filter(t => t.type === 'expense' && t.date === dateStr);
      const dayAmount = dayTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      days.push({
        day: d,
        label: `${d}`,
        amount: dayAmount,
      });
    }

    const maxDaySpend = Math.max(...days.map(d => d.amount), 10);
    return { days, maxDaySpend };
  }, [transactions, now, monthStats.currentDayOfMonth]);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const content = event.target?.result as string;
      if (content) {
        const success = await importJSON(content);
        if (success) {
          alert('Data imported successfully!');
        } else {
          alert('Could not parse backup file. Please ensure it is a valid Skei export.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header & Data Actions */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
            Personal Statistics & Ledger
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">
            Spending & History
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Visual breakdown of all expenses, daily burn rates, and searchable history.
          </p>
        </div>

        {/* Portability tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors flex items-center gap-1.5"
            title="Import backup"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors flex items-center gap-1.5"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportJSON}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors flex items-center gap-1.5"
            title="Download JSON backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm('Reset all transactions and accounts to sample European data?')) {
                resetToInitial();
              }
            }}
            className="px-2.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-red-600 rounded-xl transition-colors flex items-center gap-1"
            title="Reset to sample data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Charts: Donut + Velocity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut Chart */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Expense Breakdown</h3>
              <p className="text-xs text-zinc-400">Current month by category</p>
            </div>
            <span className="font-mono text-xs font-bold text-zinc-900 tabular-nums">
              {formatEUR(categoryExpenses.total)}
            </span>
          </div>

          <div className="py-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#f4f4f5"
                  strokeWidth="18"
                  fill="transparent"
                />
                {categoryExpenses.items.map(item => {
                  const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -accumulatedOffset;
                  accumulatedOffset += (item.percent / 100) * circumference;

                  return (
                    <circle
                      key={item.name}
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke={item.color}
                      strokeWidth="18"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      fill="transparent"
                      className="cursor-pointer transition-all duration-200 hover:opacity-80"
                      onMouseEnter={() => setHoveredCategory(item)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  );
                })}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                <span className="text-[10px] uppercase font-mono text-zinc-400 block truncate max-w-[90px]">
                  {hoveredCategory ? hoveredCategory.name : 'Total Out'}
                </span>
                <span className="font-mono text-sm font-bold text-zinc-950 tabular-nums">
                  {formatEUR(hoveredCategory ? hoveredCategory.amount : categoryExpenses.total)}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {hoveredCategory ? `${hoveredCategory.percent.toFixed(1)}%` : '100%'}
                </span>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-1.5 text-xs">
              {categoryExpenses.items.slice(0, 5).map(item => (
                <div
                  key={item.name}
                  onMouseEnter={() => setHoveredCategory(item)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`p-1.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    hoveredCategory?.name === item.name ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-zinc-800 truncate">{item.name}</span>
                  </div>
                  <div className="font-mono font-bold text-zinc-950 tabular-nums shrink-0 ml-2">
                    {formatEUR(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Velocity Bar Chart */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Daily Burn Velocity</h3>
              <p className="text-xs text-zinc-400">Daily expenses this month</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-zinc-950 tabular-nums">
                {formatEUR(monthStats.dailyVelocity)}/day
              </span>
            </div>
          </div>

          <div className="py-4">
            <div className="h-36 w-full flex items-end gap-1.5 pt-6 pb-2 px-1 border-b border-zinc-200">
              {dailySpendData.days.map(d => {
                const heightPercent = Math.max(
                  4,
                  Math.min(100, (d.amount / dailySpendData.maxDaySpend) * 100)
                );
                const isOverAvg = d.amount > monthStats.dailyVelocity;

                return (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 text-white text-[10px] font-mono py-1 px-1.5 rounded-md whitespace-nowrap pointer-events-none z-20">
                      Day {d.day}: {formatEUR(d.amount)}
                    </div>
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        isOverAvg ? 'bg-zinc-950' : 'bg-zinc-200 group-hover:bg-zinc-400'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-2 px-1">
              <span>Day 1</span>
              <span>Today (Day {monthStats.currentDayOfMonth})</span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Projected Month End:</span>
            <span className="font-mono font-bold text-zinc-900">
              {formatEUR(monthStats.projectedMonthEndExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* Filterable Financial Ledger Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-zinc-200/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search note, category, or bank..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl self-start">
              <button
                onClick={() => setDateRangeFilter('month')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  dateRangeFilter === 'month'
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateRangeFilter('30days')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  dateRangeFilter === '30days'
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setDateRangeFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  dateRangeFilter === 'all'
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Quick Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedAccountFilter}
              onChange={e => setSelectedAccountFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 text-xs focus:outline-none focus:border-zinc-950"
            >
              <option value="all">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={e => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 text-xs focus:outline-none focus:border-zinc-950"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
              <option value="transfer">Transfers</option>
            </select>

            <span className="text-zinc-400 text-xs ml-auto">
              {filteredTransactions.length} entries
            </span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Account</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const account = accounts.find(a => a.id === tx.accountId);
                  const toAccount = tx.toAccountId
                    ? accounts.find(a => a.id === tx.toAccountId)
                    : null;
                  const category = categoryGroups
                    .flatMap(g => g.categories)
                    .find(c => c.id === tx.categoryId);

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50 transition-colors group">
                      <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap">
                        {tx.date}
                      </td>

                      <td className="py-3 px-4 font-semibold text-zinc-900">
                        {tx.note || '—'}
                      </td>

                      <td className="py-3 px-4 text-zinc-600">
                        {tx.type === 'transfer' ? (
                          <span className="text-indigo-600 font-medium">Transfer</span>
                        ) : category ? (
                          <span>{category.name}</span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-600 whitespace-nowrap">
                        {tx.type === 'transfer' ? (
                          <span>
                            {account?.name} → {toAccount?.name}
                          </span>
                        ) : (
                          <span>{account?.name}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs sm:text-sm tabular-nums ${
                            tx.type === 'expense'
                              ? 'text-zinc-950'
                              : tx.type === 'income'
                              ? 'text-emerald-600'
                              : 'text-indigo-600'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {formatEUR(tx.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this transaction?')) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 rounded transition-all"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
