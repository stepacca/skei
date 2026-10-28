import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { CategoryItem, CategoryKind, Subcategory } from '../types';
import { getIcon } from '../utils/icons';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  Sliders,
  FolderTree,
} from 'lucide-react';

interface CategoryCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialKind?: CategoryKind;
}

const AVAILABLE_ICONS = [
  'Tag',
  'Utensils',
  'ShoppingCart',
  'Home',
  'Zap',
  'Car',
  'HeartPulse',
  'Film',
  'Tv',
  'Plane',
  'Laptop',
  'ShoppingBag',
  'ShieldCheck',
  'TrendingUp',
  'Landmark',
  'Banknote',
  'Clock',
  'Coffee',
  'Briefcase',
  'Gift',
  'Sparkles',
  'Award',
  'Receipt',
  'Coins',
];

const AVAILABLE_COLORS = [
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
];

export interface CategoryManagerContentProps {
  initialKind?: CategoryKind;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const CategoryManagerContent: React.FC<CategoryManagerContentProps> = ({
  initialKind = 'expense',
  onClose,
  isEmbedded = false,
}) => {
  const {
    categoryGroups,
    addCategoryItem,
    updateCategoryItem,
    deleteCategoryItem,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useLedger();

  const [activeTab, setActiveTab] = useState<CategoryKind>(initialKind);

  // Main Category creation/editing state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [selectedColor, setSelectedColor] = useState('#09090b');

  // Accordion state for viewing/managing subcategories
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Subcategory creation/editing state
  const [addingSubcatForCatId, setAddingSubcatForCatId] = useState<string | null>(null);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [editingSubcat, setEditingSubcat] = useState<{
    catId: string;
    subId: string;
    name: string;
  } | null>(null);

  // In-app deletion confirm state
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // Filter groups and categories by kind
  const filteredGroups = categoryGroups.filter(g =>
    activeTab === 'income' ? g.kind === 'income' : g.kind !== 'income'
  );

  const allCategoriesOfKind: CategoryItem[] = filteredGroups.flatMap(g =>
    g.categories.filter(c => c.kind === activeTab || (!c.kind && activeTab === 'expense'))
  );

  const targetGroupId = filteredGroups[0]?.id || categoryGroups[0]?.id || 'grp-essentials';

  const handleStartAddCategory = () => {
    setCategoryName('');
    setSelectedIcon(activeTab === 'income' ? 'Landmark' : 'Tag');
    setSelectedColor(activeTab === 'income' ? '#16a34a' : '#09090b');
    setEditingCategoryId(null);
    setIsAddingCategory(true);
  };

  const handleStartEditCategory = (cat: CategoryItem) => {
    setCategoryName(cat.name);
    setSelectedIcon(cat.icon || 'Tag');
    setSelectedColor(cat.color || '#09090b');
    setEditingCategoryId(cat.id);
    setIsAddingCategory(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    if (editingCategoryId) {
      updateCategoryItem(editingCategoryId, {
        name: categoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });
    } else {
      addCategoryItem(targetGroupId, {
        name: categoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
        kind: activeTab,
        subcategories: [],
      });
    }

    setIsAddingCategory(false);
    setEditingCategoryId(null);
    setCategoryName('');
  };

  const handleAddSubcategory = (catId: string) => {
    if (!newSubcatName.trim()) return;
    addSubcategory(catId, newSubcatName.trim());
    setNewSubcatName('');
    setAddingSubcatForCatId(null);
  };

  const handleSaveEditSubcategory = () => {
    if (!editingSubcat || !editingSubcat.name.trim()) return;
    updateSubcategory(editingSubcat.catId, editingSubcat.subId, editingSubcat.name.trim());
    setEditingSubcat(null);
  };

  const toggleExpandCategory = (catId: string) => {
    setExpandedCatId(prev => (prev === catId ? null : catId));
    setAddingSubcatForCatId(null);
    setEditingSubcat(null);
  };

  const content = (
    <>
      {/* Optional Header when not embedded */}
      {!isEmbedded && (
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                Category Manager
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                Organize main categories & sub-categories for quick logging
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

        {/* Tab switch between Expense and Income */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl my-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('expense');
              setIsAddingCategory(false);
              setExpandedCatId(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'expense'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Expenses ({allCategoriesOfKind.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('income');
              setIsAddingCategory(false);
              setExpandedCatId(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'income'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Income
          </button>
        </div>

        {/* Scrollable list & forms container */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-3">
          {/* Main Category Add/Edit Form */}
          {isAddingCategory ? (
            <form
              onSubmit={handleSaveCategory}
              className="p-4 bg-zinc-50 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                  {editingCategoryId
                    ? 'Edit Main Category'
                    : `New ${activeTab === 'expense' ? 'Expense' : 'Income'} Main Category`}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  placeholder="e.g. Groceries, Tech, Housing"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400"
                  autoFocus
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Choose Icon
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                  {AVAILABLE_ICONS.map(iconName => {
                    const IconComp = getIcon(iconName);
                    const isSel = selectedIcon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setSelectedIcon(iconName)}
                        className={`p-1.5 rounded-lg transition-all ${
                          isSel
                            ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 scale-105 shadow-2xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                        title={iconName}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Color Accent
                </label>
                <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                  {AVAILABLE_COLORS.map(color => {
                    const isSel = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                          isSel ? 'ring-2 ring-offset-2 ring-zinc-950 dark:ring-white scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {isSel && <Check className="w-3 h-3 text-white drop-shadow-sm" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="px-3 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {editingCategoryId ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {activeTab === 'expense' ? 'Main Expense Categories' : 'Main Income Categories'}
              </span>
              <button
                type="button"
                onClick={handleStartAddCategory}
                className="px-2.5 py-1 text-xs font-semibold text-white dark:text-zinc-950 bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl shadow-xs transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>
          )}

          {/* Categories List with Subcategories Accordion */}
          <div className="space-y-2">
            {allCategoriesOfKind.map(cat => {
              const Icon = getIcon(cat.icon);
              const isSortLater = cat.isDefaultSortLater || cat.id === 'cat-sort-later';
              const isExpanded = expandedCatId === cat.id;
              const subcats = cat.subcategories || [];

              return (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 overflow-hidden transition-all shadow-2xs"
                >
                  {/* Category Row */}
                  <div className="p-3 flex items-center justify-between gap-3">
                    <div
                      onClick={() => toggleExpandCategory(cat.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: `${cat.color || '#09090b'}20`,
                          color: cat.color || '#09090b',
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-900 dark:text-white truncate">
                            {cat.name}
                          </span>
                          {isSortLater && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              Quick Log Default
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          {subcats.length} {subcats.length === 1 ? 'sub-category' : 'sub-categories'} · Tap to {isExpanded ? 'collapse' : 'view'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleExpandCategory(cat.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors"
                        title={isExpanded ? 'Collapse' : 'Manage Sub-categories'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEditCategory(cat)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors"
                        title="Edit category name or icon"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!isSortLater && (
                        <button
                          type="button"
                          onClick={() => setDeletingCatId(cat.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategories Accordion Content */}
                  {isExpanded && (
                    <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Sub-categories for {cat.name}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setAddingSubcatForCatId(cat.id);
                            setNewSubcatName('');
                          }}
                          className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Sub-category</span>
                        </button>
                      </div>

                      {/* Inline Add Subcategory input */}
                      {addingSubcatForCatId === cat.id && (
                        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 animate-in fade-in">
                          <input
                            type="text"
                            value={newSubcatName}
                            onChange={e => setNewSubcatName(e.target.value)}
                            placeholder="e.g. Groceries, Coffee, Takeaway..."
                            className="flex-1 px-2.5 py-1 bg-transparent text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubcategory(cat.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubcategory(cat.id)}
                            className="px-2.5 py-1 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-lg text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingSubcatForCatId(null)}
                            className="px-2 py-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Subcategories badges/list */}
                      {subcats.length === 0 ? (
                        <div className="text-center py-3 text-zinc-400 dark:text-zinc-500 text-xs italic">
                          No sub-categories yet. Tap + Add Sub-category to create one.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {subcats.map(sub => {
                            const isEditingThis =
                              editingSubcat?.catId === cat.id && editingSubcat?.subId === sub.id;

                            if (isEditingThis) {
                              return (
                                <div
                                  key={sub.id}
                                  className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-300 dark:border-zinc-700 flex items-center gap-1"
                                >
                                  <input
                                    type="text"
                                    value={editingSubcat.name}
                                    onChange={e =>
                                      setEditingSubcat({ ...editingSubcat, name: e.target.value })
                                    }
                                    className="flex-1 px-2 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveEditSubcategory();
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveEditSubcategory}
                                    className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                                    title="Save"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSubcat(null)}
                                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={sub.id}
                                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 flex items-center justify-between gap-2 group transition-colors"
                              >
                                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                  {sub.name}
                                </span>

                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingSubcat({
                                        catId: cat.id,
                                        subId: sub.id,
                                        name: sub.name,
                                      })
                                    }
                                    className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded"
                                    title="Edit sub-category"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteSubcategory(cat.id, sub.id)}
                                    className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                                    title="Delete sub-category"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* In-app Deletion Confirm Banner */}
        {deletingCatId && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center justify-between text-xs animate-in fade-in shrink-0">
            <span className="text-rose-900 dark:text-rose-300 font-medium">
              Delete this main category? Sub-categories will also be removed.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingCatId(null)}
                className="px-2.5 py-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCategoryItem(deletingCatId);
                  setDeletingCatId(null);
                }}
                className="px-3 py-1 rounded-xl bg-rose-600 text-white font-bold shadow-xs hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Footer when not embedded */}
        {!isEmbedded && onClose && (
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-xl transition-colors text-center shadow-xs"
            >
              Done
            </button>
          </div>
        )}
    </>
  );

  if (isEmbedded) {
    return <div className="space-y-3 flex flex-col">{content}</div>;
  }

  return content;
};

export const CategoryCustomizerModal: React.FC<CategoryCustomizerModalProps> = ({
  isOpen,
  onClose,
  initialKind = 'expense',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl max-w-xl w-full p-4 sm:p-6 relative text-xs text-zinc-900 dark:text-zinc-100 transition-colors max-h-[90vh] flex flex-col">
        <CategoryManagerContent initialKind={initialKind} onClose={onClose} isEmbedded={false} />
      </div>
    </div>
  );
};
