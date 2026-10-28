import React, { useState, useMemo, useRef } from 'react';
import { useLedger } from '../context/LedgerContext';
import { CategoryCustomizerModal } from './CategoryCustomizerModal';
import { GroupManageModal } from './GroupManageModal';
import {
  Download,
  Upload,
  RotateCcw,
  Sliders,
  Plus,
  FolderKanban,
  Pin,
  PieChart,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type PeriodFilter = 'D' | 'W' | 'M' | 'Y' | 'All' | 'Custom';

interface StatsViewProps {
  onOpenCategories?: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ onOpenCategories }) => {
  const {
    categoryGroups,
    transactions,
    groups,
    groupSummaries,
    totalPendingOwed,
    formatEUR,
    exportCSV,
    exportJSON,
    importJSON,
    resetToInitial,
  } = useLedger();

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isCategoryCustomizerOpen, setIsCategoryCustomizerOpen] = useState(false);

  // Period filter: D = Today, W = This Week, M = This Month, Y = This Year, All = All Time, Custom
  const [period, setPeriod] = useState<PeriodFilter>('M');

  // Distribution section toggle: Expenses vs Income
  const [distKind, setDistKind] = useState<'expense' | 'income'>('expense');

  // Custom range
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split('T')[0]);

  // Donut hover state
  const [hoveredCategory, setHoveredCategory] = useState<{
    name: string;
    amount: number;
    percent: number;
    color: string;
  } | null>(null);

  // In-app toast feedback & modal confirm state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [refDate, setRefDate] = useState<Date>(() => new Date());

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    setRefDate(new Date());
  };

  const { startDate, endDate, periodLabel, isCurrentPeriod } = useMemo(() => {
    const toLocalDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const today = new Date();
    const todayStr = toLocalDateStr(today);

    if (period === 'D') {
      const s = toLocalDateStr(refDate);
      const isToday = s === todayStr;
      const formatted = refDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return {
        startDate: s,
        endDate: s,
        periodLabel: isToday ? `Today · ${formatted}` : formatted,
        isCurrentPeriod: isToday,
      };
    }

    if (period === 'W') {
      const d = new Date(refDate);
      const day = d.getDay();
      const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
      const monDate = new Date(d.getFullYear(), d.getMonth(), diffToMon);
      const sunDate = new Date(monDate.getFullYear(), monDate.getMonth(), monDate.getDate() + 6);
      const s = toLocalDateStr(monDate);
      const e = toLocalDateStr(sunDate);
      const isCurrent = s <= todayStr && todayStr <= e;
      const monFmt = monDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const sunFmt = sunDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return {
        startDate: s,
        endDate: e,
        periodLabel: `${monFmt} – ${sunFmt}`,
        isCurrentPeriod: isCurrent,
      };
    }

    if (period === 'M') {
      const y = refDate.getFullYear();
      const m = refDate.getMonth();
      const s = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const e = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const isCurrent = y === today.getFullYear() && m === today.getMonth();
      const label = refDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      return {
        startDate: s,
        endDate: e,
        periodLabel: label,
        isCurrentPeriod: isCurrent,
      };
    }

    if (period === 'Y') {
      const y = refDate.getFullYear();
      const s = `${y}-01-01`;
      const e = `${y}-12-31`;
      const isCurrent = y === today.getFullYear();
      return {
        startDate: s,
        endDate: e,
        periodLabel: `${y}`,
        isCurrentPeriod: isCurrent,
      };
    }

    if (period === 'Custom') {
      return {
        startDate: customStart,
        endDate: customEnd,
        periodLabel: `${customStart} to ${customEnd}`,
        isCurrentPeriod: false,
      };
    }

    return {
      startDate: '1970-01-01',
      endDate: '2999-12-31',
      periodLabel: 'All Time',
      isCurrentPeriod: true,
    };
  }, [period, refDate, customStart, customEnd]);

  const handlePrevPeriod = () => {
    const d = new Date(refDate);
    if (period === 'D') d.setDate(d.getDate() - 1);
    else if (period === 'W') d.setDate(d.getDate() - 7);
    else if (period === 'M') d.setMonth(d.getMonth() - 1);
    else if (period === 'Y') d.setFullYear(d.getFullYear() - 1);
    setRefDate(d);
  };

  const handleNextPeriod = () => {
    const d = new Date(refDate);
    if (period === 'D') d.setDate(d.getDate() + 1);
    else if (period === 'W') d.setDate(d.getDate() + 7);
    else if (period === 'M') d.setMonth(d.getMonth() + 1);
    else if (period === 'Y') d.setFullYear(d.getFullYear() + 1);
    setRefDate(d);
  };

  const handleResetCurrent = () => {
    setRefDate(new Date());
  };

  const periodTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (period === 'Custom') return t.date >= customStart && t.date <= customEnd;
      if (period === 'All') return true;
      return t.date >= startDate && t.date <= endDate;
    });
  }, [transactions, period, startDate, endDate, customStart, customEnd]);

  const { totalExpense, totalIncome, totalTransfer, netFlow, expenseCount } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    let xfr = 0;
    let expItems = 0;

    for (const t of periodTransactions) {
      if (t.type === 'expense') {
        expItems++;
        if (t.varianceTag === 'unrecovered_discount') {
          exp += t.amount;
        } else if (t.owedAmount && t.owedAmount > 0) {
          exp += Math.max(0, t.amount - t.owedAmount);
        } else {
          exp += t.amount;
        }
      } else if (t.type === 'income') {
        if (t.tags?.includes('debt_repayment') && t.varianceTag !== 'repayment_extra') {
          // Principal debt repayment does not inflate personal income
        } else {
          inc += t.amount;
        }
      } else if (t.type === 'transfer') {
        xfr += t.amount;
      }
    }

    return {
      totalExpense: exp,
      totalIncome: inc,
      totalTransfer: xfr,
      netFlow: inc - exp,
      expenseCount: expItems,
    };
  }, [periodTransactions]);

  const [expandedCatName, setExpandedCatName] = useState<string | null>(null);

  const categoryBreakdown = useMemo(() => {
    const isExpense = distKind === 'expense';
    const total = isExpense ? totalExpense : totalIncome;

    const filtered = periodTransactions.filter(t => {
      if (isExpense) return t.type === 'expense';
      if (t.type !== 'income') return false;
      if (t.tags?.includes('debt_repayment') && t.varianceTag !== 'repayment_extra') return false;
      return true;
    });

    const map = new Map<
      string,
      {
        id: string;
        name: string;
        amount: number;
        color: string;
        subMap: Map<string, { name: string; amount: number }>;
      }
    >();

    const colors = isExpense
      ? [
          '#09090b',
          '#ea580c',
          '#16a34a',
          '#0284c7',
          '#4f46e5',
          '#d97706',
          '#dc2626',
          '#9333ea',
          '#0891b2',
          '#db2777',
          '#64748b',
          '#059669',
        ]
      : [
          '#16a34a',
          '#0284c7',
          '#059669',
          '#8b5cf6',
          '#10b981',
          '#06b6d4',
          '#3b82f6',
          '#6366f1',
        ];

    let cIdx = 0;
    for (const tx of filtered) {
      let share = tx.amount;
      if (isExpense) {
        if (tx.varianceTag === 'unrecovered_discount') {
          share = tx.amount;
        } else if (tx.owedAmount && tx.owedAmount > 0) {
          share = Math.max(0, tx.amount - tx.owedAmount);
        }
      }

      if (share <= 0) continue;

      const cat = categoryGroups
        .flatMap(g => g.categories)
        .find(c => c.id === tx.categoryId);
      const name = cat ? cat.name : 'Uncategorized';
      const catId = cat ? cat.id : 'uncat';

      let item = map.get(name);
      if (!item) {
        item = {
          id: catId,
          name,
          amount: 0,
          color: cat?.color || colors[cIdx++ % colors.length],
          subMap: new Map(),
        };
        map.set(name, item);
      }
      item.amount += share;

      // Track subcategory
      const sub = cat?.subcategories?.find(s => s.id === tx.subcategoryId);
      const subName = sub ? sub.name : 'General / Main';
      const currentSub = item.subMap.get(subName) || { name: subName, amount: 0 };
      currentSub.amount += share;
      item.subMap.set(subName, currentSub);
    }

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map(item => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        color: item.color,
        percent: total > 0 ? (item.amount / total) * 100 : 0,
        subcategories: Array.from(item.subMap.values())
          .sort((a, b) => b.amount - a.amount)
          .map(s => ({
            ...s,
            percent: item.amount > 0 ? (s.amount / item.amount) * 100 : 0,
          })),
      }));
  }, [periodTransactions, categoryGroups, totalExpense, totalIncome, distKind]);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const content = event.target?.result as string;
      if (content) {
        const success = await importJSON(content);
        if (success) {
          showToast('Data imported successfully!');
        } else {
          showToast('Failed to parse backup JSON file.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-14 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 px-4 py-2 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card with Period Filter and Category Shortcut */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Statistics & Distribution
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Spending breakdown, category distribution, and occasions
            </p>
          </div>

          <button
            onClick={() => setIsCategoryCustomizerOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center gap-1.5"
            title="Manage categories"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Categories</span>
          </button>
        </div>

        {/* Period Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl select-none">
          {(['D', 'W', 'M', 'Y', 'All', 'Custom'] as PeriodFilter[]).map(lbl => {
            const isActive = period === lbl;
            const fullLabels: Record<PeriodFilter, string> = {
              D: 'Today',
              W: 'Week',
              M: 'Month',
              Y: 'Year',
              All: 'All Time',
              Custom: 'Custom',
            };
            return (
              <button
                key={lbl}
                onClick={() => handlePeriodChange(lbl)}
                title={fullLabels[lbl]}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {lbl}
              </button>
            );
          })}
        </div>

        {/* Historical Period Navigation Strip */}
        {period !== 'All' && period !== 'Custom' && (
          <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={handlePrevPeriod}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white capitalize truncate">
                {periodLabel}
              </span>
              {!isCurrentPeriod ? (
                <button
                  type="button"
                  onClick={handleResetCurrent}
                  className="px-2 py-0.5 rounded-lg bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[10px] font-bold transition-all shadow-2xs hover:opacity-90 shrink-0"
                  title="Jump to current period"
                >
                  Current
                </button>
              ) : (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Current
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextPeriod}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
              title="Next period"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Custom Date Pickers */}
        {period === 'Custom' && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 grid grid-cols-2 gap-2 text-xs animate-in fade-in">
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-950 dark:text-zinc-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-950 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-3 sm:p-4 shadow-2xs transition-colors">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-mono tracking-wider block mb-0.5">
            Outflow
          </span>
          <span className="font-mono text-base sm:text-lg font-bold text-zinc-950 dark:text-white tabular-nums block">
            {formatEUR(totalExpense)}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">
            {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-3 sm:p-4 shadow-2xs transition-colors">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-mono tracking-wider block mb-0.5">
            Inflow
          </span>
          <span className="font-mono text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block">
            +{formatEUR(totalIncome)}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">
            Deposits
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-3 sm:p-4 shadow-2xs transition-colors">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-mono tracking-wider block mb-0.5">
            Net Flow
          </span>
          <span
            className={`font-mono text-base sm:text-lg font-bold tabular-nums block ${
              netFlow >= 0 ? 'text-zinc-950 dark:text-white' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {netFlow >= 0 ? '+' : ''}
            {formatEUR(netFlow)}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">
            {periodTransactions.length} items
          </span>
        </div>
      </div>

      {/* Recoverable Debt Info Banner */}
      {totalPendingOwed > 0 && (
        <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/60 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200 shadow-2xs transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-base">↩</span>
            <div>
              <span className="font-bold">
                {formatEUR(totalPendingOwed)} Pending Recovery from People
              </span>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Debts owed to you are automatically excluded from your personal outflow charts
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 shrink-0">
            Excluded
          </span>
        </div>
      )}

      {/* Category Distribution Donut Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Category Distribution</h3>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              For selected period ({period})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Expenses vs Income Switch */}
            <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl select-none">
              <button
                type="button"
                onClick={() => {
                  setDistKind('expense');
                  setHoveredCategory(null);
                  setExpandedCatName(null);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  distKind === 'expense'
                    ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Expenses
              </button>
              <button
                type="button"
                onClick={() => {
                  setDistKind('income');
                  setHoveredCategory(null);
                  setExpandedCatName(null);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  distKind === 'income'
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Income
              </button>
            </div>

            <button
              onClick={() => (onOpenCategories ? onOpenCategories() : setIsCategoryCustomizerOpen(true))}
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Manage categories"
            >
              <Sliders className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
              <span>Edit</span>
            </button>
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white tabular-nums ml-1">
              {formatEUR(distKind === 'expense' ? totalExpense : totalIncome)}
            </span>
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs">
            {distKind === 'expense'
              ? 'No expenses recorded in this period.'
              : 'No income recorded in this period.'}
          </div>
        ) : (
          <div className="py-2 flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-zinc-100 dark:stroke-zinc-800"
                  strokeWidth="18"
                  fill="transparent"
                />
                {categoryBreakdown.map(item => {
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

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                <span className="text-[10px] uppercase font-mono text-zinc-400 dark:text-zinc-500 block truncate max-w-[90px]">
                  {hoveredCategory
                    ? hoveredCategory.name
                    : distKind === 'expense'
                    ? 'Outflow'
                    : 'Inflow'}
                </span>
                <span className="font-mono text-sm font-bold text-zinc-950 dark:text-white tabular-nums">
                  {formatEUR(
                    hoveredCategory
                      ? hoveredCategory.amount
                      : distKind === 'expense'
                      ? totalExpense
                      : totalIncome
                  )}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {hoveredCategory ? `${hoveredCategory.percent.toFixed(1)}%` : '100%'}
                </span>
              </div>
            </div>

            {/* Category rows with Subcategory drill-down */}
            <div className="w-full max-w-xs space-y-1.5 text-xs max-h-60 overflow-y-auto pr-1">
              {categoryBreakdown.map(item => {
                const isExpanded = expandedCatName === item.name;
                const hasSubs = item.subcategories.length > 0;

                return (
                  <div key={item.name} className="space-y-1">
                    <div
                      onClick={() => setExpandedCatName(isExpanded ? null : item.name)}
                      onMouseEnter={() => setHoveredCategory(item)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                        hoveredCategory?.name === item.name || isExpanded
                          ? 'bg-zinc-100 dark:bg-zinc-800'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {item.name}
                        </span>
                        {hasSubs && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                            ({item.subcategories.length})
                          </span>
                        )}
                      </div>
                      <div className="font-mono font-bold text-zinc-950 dark:text-white tabular-nums shrink-0 ml-2">
                        {formatEUR(item.amount)}{' '}
                        <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-normal">
                          ({item.percent.toFixed(0)}%)
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Subcategories list */}
                    {isExpanded && hasSubs && (
                      <div className="pl-5 pr-1 py-1 space-y-1 bg-zinc-50/70 dark:bg-zinc-900/60 rounded-lg border-l-2 border-zinc-200 dark:border-zinc-700 animate-in fade-in">
                        {item.subcategories.map(sub => (
                          <div
                            key={sub.name}
                            className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 py-0.5"
                          >
                            <span className="truncate">{sub.name}</span>
                            <span className="font-mono tabular-nums shrink-0 font-medium text-zinc-900 dark:text-zinc-200">
                              {formatEUR(sub.amount)}{' '}
                              <span className="text-[10px] text-zinc-400 font-normal">
                                ({sub.percent.toFixed(0)}%)
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Groups & Occasions Spending */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-1.5">
              <FolderKanban className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Groups & Occasions</h3>
            </div>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Trips, events, projects & shared occasions
            </span>
          </div>
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="px-2.5 py-1 text-xs font-semibold text-purple-900 dark:text-purple-300 border border-dashed border-purple-300 dark:border-purple-800 hover:border-purple-600 dark:hover:border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl flex items-center gap-1 transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>Manage Groups</span>
          </button>
        </div>

        {groupSummaries.length === 0 ? (
          <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-xs">
            No groups created yet. Tap <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">Manage Groups</strong> to track a trip or event!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {groupSummaries.map(s => {
              const grp = s.group;

              return (
                <div
                  key={grp.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    grp.isPinnedAlwaysActive
                      ? 'bg-purple-50/40 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/80'
                      : 'bg-zinc-50/70 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{grp.emoji}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-zinc-950 dark:text-white">{grp.name}</span>
                          {grp.isPinnedAlwaysActive && (
                            <span className="px-1 py-0.2 rounded text-[9px] bg-indigo-600 text-white font-bold flex items-center gap-0.5">
                              <Pin className="w-2 h-2 rotate-45" />
                              Pinned
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {s.transactionCount} {s.transactionCount === 1 ? 'movement' : 'movements'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-zinc-950 dark:text-white block tabular-nums">
                        {formatEUR(s.totalSpent)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Backup / Export Tools Card */}
      <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-zinc-500 dark:text-zinc-400 transition-colors">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFile}
          accept=".json"
          className="hidden"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-zinc-800 dark:text-zinc-200 font-semibold hover:underline"
          >
            Import Backup
          </button>
          <span>·</span>
          <button
            onClick={exportJSON}
            className="text-zinc-800 dark:text-zinc-200 font-semibold hover:underline"
          >
            Download JSON
          </button>
          <span>·</span>
          <button
            onClick={exportCSV}
            className="text-zinc-800 dark:text-zinc-200 font-semibold hover:underline"
          >
            Export CSV
          </button>
        </div>

        <button
          onClick={() => setIsResetConfirmOpen(true)}
          className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors self-start sm:self-auto"
        >
          Reset Ledger Data
        </button>
      </div>

      {/* In-app Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-sm w-full p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-zinc-950 dark:text-white">Reset All Ledger Data?</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              This will reset your accounts, groups, categories, and movements back to zero balances and an empty ledger.
            </p>
            <div className="flex gap-2 pt-1 text-xs">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToInitial();
                  setIsResetConfirmOpen(false);
                  showToast('Ledger reset to initial state');
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs transition-colors"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Customizer Modal */}
      <CategoryCustomizerModal
        isOpen={isCategoryCustomizerOpen}
        onClose={() => setIsCategoryCustomizerOpen(false)}
      />

      {/* Group & Occasion Manager Modal */}
      <GroupManageModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </div>
  );
};
