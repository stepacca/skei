import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Person } from '../types';
import { X, Plus, Edit2, Trash2, Check, Users, AlertCircle } from 'lucide-react';

interface PersonManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEditingPerson?: Person | null;
}

const PRESET_EMOJIS = ['👤', '👨‍👩‍👦', '👩', '👨', '🤝', '💼', '🏖️', '🍕', '🏠', '❤️', '🚗', '🎓', '✈️', '🐶'];

export const PersonManageModal: React.FC<PersonManageModalProps> = ({
  isOpen,
  onClose,
  initialEditingPerson = null,
}) => {
  const { people, personDebtSummaries, addPerson, updatePerson, deletePerson, formatEUR } =
    useLedger();

  const [isCreating, setIsCreating] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(
    initialEditingPerson ? initialEditingPerson.id : null
  );

  const [name, setName] = useState(initialEditingPerson ? initialEditingPerson.name : '');
  const [emoji, setEmoji] = useState(initialEditingPerson ? initialEditingPerson.emoji : '👤');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setName('');
    setEmoji('👤');
    setEditingPersonId(null);
    setErrorMessage(null);
    setIsCreating(true);
  };

  const handleStartEdit = (p: Person) => {
    setName(p.name);
    setEmoji(p.emoji);
    setEditingPersonId(p.id);
    setErrorMessage(null);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingPersonId(null);
    setName('');
    setErrorMessage(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingPersonId) {
      updatePerson(editingPersonId, {
        name: name.trim(),
        emoji,
      });
    } else {
      addPerson({
        name: name.trim(),
        emoji,
      });
    }

    handleCancelForm();
  };

  const handleDelete = (id: string) => {
    const res = deletePerson(id);
    if (!res.success) {
      setErrorMessage(res.error || 'Cannot delete person with active debts.');
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">People & Debts</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Track shared expenses and who owes you money
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
          {(isCreating || editingPersonId) && (
            <form
              onSubmit={handleSave}
              className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 space-y-3 animate-in fade-in"
            >
              <span className="font-bold text-xs text-amber-950 dark:text-amber-200 block">
                {editingPersonId ? 'Edit Person' : 'Add New Person'}
              </span>

              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Name / Relationship
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Alex, Parents, Roommates"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Avatar Emoji
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all ${
                        emoji === em
                          ? 'bg-amber-500 text-white ring-2 ring-amber-300 dark:ring-amber-700 scale-105'
                          : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingPersonId ? 'Save Changes' : 'Add Person'}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of People */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Registered People ({people.length})
              </span>
              {!isCreating && !editingPersonId && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold border border-dashed border-amber-300 dark:border-amber-800 hover:border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>Add Person</span>
                </button>
              )}
            </div>

            {people.length === 0 ? (
              <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 text-xs">
                No people added yet. Add family, roommates or friends to track shared expenses.
              </div>
            ) : (
              people.map(person => {
                const summary = personDebtSummaries.find(s => s.person.id === person.id);
                const hasOpenDebt = summary && summary.totalOwed > 0;

                return (
                  <div
                    key={person.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-between gap-3 group hover:bg-zinc-100/70 dark:hover:bg-zinc-700/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                        {person.emoji}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-xs text-zinc-950 dark:text-white block truncate">
                          {person.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                          {hasOpenDebt ? (
                            <span className="text-amber-700 dark:text-amber-400 font-bold">
                              Owes {formatEUR(summary.totalOwed)} ({summary.openCount} items)
                            </span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500">All settled</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(person)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/80 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Edit person"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(person.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete person"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
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
