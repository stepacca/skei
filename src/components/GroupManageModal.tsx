import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { GroupOccasion } from '../types';
import {
  X,
  Plus,
  Pin,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit2,
  Check,
  FolderKanban,
} from 'lucide-react';

interface GroupManageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_EMOJIS = ['🎓', '✈️', '🎉', '🏛️', '🏠', '🏕️', '🚗', '💍', '🍕', '🏖️', '⛷️', '🎸'];

export const GroupManageModal: React.FC<GroupManageModalProps> = ({ isOpen, onClose }) => {
  const {
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    togglePinGroup,
    groupSummaries,
    formatEUR,
  } = useLedger();

  const [isCreating, setIsCreating] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [description, setDescription] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  if (!isOpen) return null;

  const sortedGroups = [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleStartCreate = () => {
    setName('');
    setEmoji('🎓');
    setDescription('');
    setBudgetStr('');
    setIsPinned(false);
    setEditingGroupId(null);
    setIsCreating(true);
  };

  const handleStartEdit = (group: GroupOccasion) => {
    setName(group.name);
    setEmoji(group.emoji);
    setDescription(group.description || '');
    setBudgetStr(group.budget ? group.budget.toString() : '');
    setIsPinned(!!group.isPinnedAlwaysActive);
    setEditingGroupId(group.id);
    setIsCreating(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const budgetVal = budgetStr ? parseFloat(budgetStr.replace(',', '.')) : undefined;

    if (editingGroupId) {
      updateGroup(editingGroupId, {
        name: name.trim(),
        emoji: emoji || '📁',
        description: description.trim() || undefined,
        budget: budgetVal && !isNaN(budgetVal) && budgetVal > 0 ? budgetVal : undefined,
        isPinnedAlwaysActive: isPinned,
      });
    } else {
      addGroup({
        name: name.trim(),
        emoji: emoji || '📁',
        description: description.trim() || undefined,
        budget: budgetVal && !isNaN(budgetVal) && budgetVal > 0 ? budgetVal : undefined,
        isPinnedAlwaysActive: isPinned,
      });
    }

    setIsCreating(false);
    setEditingGroupId(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedGroups.length) return;

    const newOrder = [...sortedGroups];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    reorderGroups(newOrder.map(g => g.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <FolderKanban className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">Groups & Occasions</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Organize trips, semester abroad, events & projects
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

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Action Header */}
          {!isCreating && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Active Groups ({sortedGroups.length})
              </span>
              <button
                onClick={handleStartCreate}
                className="px-3 py-1.5 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Group</span>
              </button>
            </div>
          )}

          {/* Create / Edit Form */}
          {isCreating && (
            <form onSubmit={handleSave} className="p-4 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-700 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-700 pb-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  {editingGroupId ? 'Edit Group' : 'Create New Group / Occasion'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {/* Emoji Presets */}
              <div>
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Emoji Icon
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all ${
                        emoji === e
                          ? 'bg-white dark:bg-zinc-700 ring-2 ring-zinc-950 dark:ring-zinc-100 shadow-xs scale-110'
                          : 'bg-white/80 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                  <input
                    type="text"
                    maxLength={3}
                    value={emoji}
                    onChange={e => setEmoji(e.target.value)}
                    className="w-10 h-8 text-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-950 dark:text-white"
                    title="Custom Emoji"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Semester Abroad, Rome Trip, Birthday Party"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-400 font-medium text-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 6 months in Madrid, flights, courses"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-400 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Budget Target in € (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 3500.00"
                  value={budgetStr}
                  onChange={e => setBudgetStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-400 font-mono text-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* Pin as Always Active */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={e => setIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-950 focus:ring-zinc-900 border-zinc-300 dark:border-zinc-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 rotate-45" />
                      <span>Pin as Always Active (Default)</span>
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                      All new expenses will automatically tag to this group (e.g. during a 6-month stay abroad)
                    </span>
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingGroupId ? 'Save Changes' : 'Create Group'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Groups List */}
          <div className="space-y-2">
            {sortedGroups.map((group, index) => {
              const summary = groupSummaries.find(s => s.group.id === group.id);
              const spent = summary?.totalSpent || 0;

              return (
                <div
                  key={group.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    group.isPinnedAlwaysActive
                      ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-200 dark:ring-indigo-800'
                      : 'border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{group.emoji}</span>
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                            {group.name}
                          </span>
                          {group.isPinnedAlwaysActive && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white flex items-center gap-0.5 shrink-0">
                              <Pin className="w-2.5 h-2.5 rotate-45" />
                              Pinned
                            </span>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{group.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className="p-0.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20 rounded"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === sortedGroups.length - 1}
                          className="p-0.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20 rounded"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Pin Toggle */}
                      <button
                        type="button"
                        onClick={() => togglePinGroup(group.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          group.isPinnedAlwaysActive
                            ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200'
                            : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                        title={
                          group.isPinnedAlwaysActive
                            ? 'Unpin always active'
                            : 'Pin as Always Active (auto-tags all new expenses)'
                        }
                      >
                        <Pin className="w-3.5 h-3.5 rotate-45" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(group)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Edit Group"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete with In-app confirmation */}
                      <button
                        type="button"
                        onClick={() => setDeletingGroupId(group.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Spend & Budget Footer */}
                  <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Total spent: <strong className="text-zinc-900 dark:text-white font-mono font-bold">{formatEUR(spent)}</strong>
                      {summary && summary.transactionCount > 0 && ` (${summary.transactionCount} items)`}
                    </span>
                    {group.budget ? (
                      <span className="font-mono text-zinc-600 dark:text-zinc-400">
                        Budget: {formatEUR(group.budget)} ({((spent / group.budget) * 100).toFixed(0)}%)
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">No budget set</span>
                    )}
                  </div>
                </div>
              );
            })}

            {sortedGroups.length === 0 && (
              <div className="text-center py-8 text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">No groups created yet</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Add trips, events, or semester abroad to track their collective expenses
                </p>
              </div>
            )}
          </div>
        </div>

        {/* In-app Deletion Confirm */}
        {deletingGroupId && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs animate-in fade-in">
            <span className="text-rose-900 dark:text-rose-300 font-medium">
              Delete this group? (Existing transactions will remain untagged)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingGroupId(null)}
                className="px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteGroup(deletingGroupId);
                  setDeletingGroupId(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Groups can be pinned or activated directly in Quick Log</span>
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
