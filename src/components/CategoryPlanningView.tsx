import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { getIcon } from '../utils/icons';
import {
  Sliders,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const CategoryPlanningView: React.FC = () => {
  const {
    categoryGroups,
    categoryGroupStats,
    monthStats,
    formatEUR,
    updateCategoryGroupTarget,
    addCategoryItem,
  } = useLedger();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'grp-essentials': true,
    'grp-lifestyle': true,
  });

  const [isAddingCategory, setIsAddingCategory] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const totalTargetPercent = categoryGroups.reduce(
    (s, g) => s + (g.targetAllocationPercent || 0),
    0
  );

  const handleAddCategory = (groupId: string) => {
    if (!newCatName.trim()) return;
    addCategoryItem(groupId, {
      name: newCatName.trim(),
      icon: newCatIcon,
      color: '#09090b',
      kind: 'expense',
    });
    setNewCatName('');
    setIsAddingCategory(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
            Category Planning
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">
            Category Targets & Velocity
          </h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-lg">
            Plan your spending shares across macro areas and observe your daily velocity in Euros.
          </p>
        </div>

        {/* Target Sum Pill */}
        <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/90 min-w-[170px]">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
            Planned Shares
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-mono font-bold tabular-nums ${
                totalTargetPercent === 100
                  ? 'text-zinc-950'
                  : totalTargetPercent > 100
                  ? 'text-red-600'
                  : 'text-amber-600'
              }`}
            >
              {totalTargetPercent}%
            </span>
            <span className="text-xs text-zinc-500">
              {totalTargetPercent === 100 ? 'Balanced' : 'Aim for 100%'}
            </span>
          </div>
          <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all ${
                totalTargetPercent === 100
                  ? 'bg-zinc-950'
                  : totalTargetPercent > 100
                  ? 'bg-red-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(totalTargetPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Spending Distribution Bar */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-zinc-800 uppercase tracking-wider text-[11px]">
            Actual Spending Share vs Targets
          </span>
          <span className="font-mono text-zinc-600">
            Total Spent: {formatEUR(monthStats.totalExpenses)}
          </span>
        </div>

        {/* Stacked actual */}
        <div className="w-full h-3.5 rounded-full bg-zinc-100 flex overflow-hidden border border-zinc-200">
          {categoryGroupStats.map((stat, idx) => {
            const colors = ['bg-zinc-900', 'bg-indigo-600', 'bg-sky-600', 'bg-emerald-600'];
            const color = colors[idx % colors.length];
            if (stat.actualPercent <= 0) return null;
            return (
              <div
                key={stat.group.id}
                className={`${color} h-full transition-all`}
                style={{ width: `${stat.actualPercent}%` }}
                title={`${stat.group.name}: ${stat.actualPercent.toFixed(1)}% (${formatEUR(stat.actualAmount)})`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-1 text-xs">
          {categoryGroups.map((group, idx) => {
            const colors = ['bg-zinc-900', 'bg-indigo-600', 'bg-sky-600', 'bg-emerald-600'];
            const color = colors[idx % colors.length];
            const stat = categoryGroupStats.find(s => s.group.id === group.id);
            return (
              <div key={group.id} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="font-medium text-zinc-800">{group.name}</span>
                <span className="font-mono text-zinc-400 text-[11px]">
                  {stat ? stat.actualPercent.toFixed(0) : 0}% / {group.targetAllocationPercent}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Groups */}
      <div className="space-y-3.5">
        {categoryGroupStats.map((stat, idx) => {
          const { group } = stat;
          const isExpanded = !!expandedGroups[group.id];

          return (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0 font-mono text-xs font-bold">
                    0{idx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">{group.name}</h3>
                    {group.description && (
                      <p className="text-[11px] text-zinc-400">{group.description}</p>
                    )}
                  </div>
                </div>

                {/* Numbers */}
                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                      Spent
                    </span>
                    <span className="font-mono font-bold text-zinc-950 tabular-nums">
                      {formatEUR(stat.actualAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                      Velocity
                    </span>
                    <span className="font-mono text-zinc-700 tabular-nums">
                      {formatEUR(stat.dailyVelocity)}/day
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                      Month Projection
                    </span>
                    <span className="font-mono font-medium text-zinc-950 tabular-nums">
                      {formatEUR(stat.projectedMonthEnd)}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Subcategories */}
              {isExpanded && (
                <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 sm:p-5 space-y-4 animate-in fade-in">
                  {/* Target Allocation Slider */}
                  <div className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div>
                        <span className="font-semibold text-zinc-900 block">
                          Planned Share
                        </span>
                        <span className="text-zinc-400 text-[11px]">
                          Target percentage of total monthly expenses
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={group.targetAllocationPercent}
                        onChange={e =>
                          updateCategoryGroupTarget(group.id, parseInt(e.target.value) || 0)
                        }
                        className="w-28 accent-zinc-950 cursor-pointer"
                      />
                      <span className="font-mono font-bold text-xs bg-zinc-100 px-2.5 py-1 rounded-lg min-w-[48px] text-center">
                        {group.targetAllocationPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Subcategories */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        Categories & Breakdown
                      </span>
                      <button
                        onClick={() => setIsAddingCategory(isAddingCategory === group.id ? null : group.id)}
                        className="text-xs font-semibold text-zinc-950 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Category</span>
                      </button>
                    </div>

                    {isAddingCategory === group.id && (
                      <div className="mb-3 p-3 bg-white rounded-xl border border-zinc-200 flex items-center gap-2">
                        <input
                          type="text"
                          value={newCatName}
                          onChange={e => setNewCatName(e.target.value)}
                          placeholder="e.g. Pet Care, Car Insurance"
                          className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddCategory(group.id);
                          }}
                        />
                        <button
                          onClick={() => handleAddCategory(group.id)}
                          className="px-3 py-1.5 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsAddingCategory(null)}
                          className="px-2 py-1.5 text-zinc-500 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {stat.categoryBreakdown.map(({ category, amount, percentOfGroup }) => {
                        const Icon = getIcon(category.icon);
                        return (
                          <div
                            key={category.id}
                            className="p-3 bg-white rounded-xl border border-zinc-200 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-semibold text-zinc-900 truncate">
                                {category.name}
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-zinc-950 tabular-nums block">
                                {formatEUR(amount)}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {percentOfGroup.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
