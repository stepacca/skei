import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { GroupManageModal } from './GroupManageModal';
import { CategoryCustomizerModal, CategoryManagerContent } from './CategoryCustomizerModal';
import { AccountManageModal } from './AccountManageModal';
import { PersonManageModal } from './PersonManageModal';
import {
  X,
  Settings,
  FolderKanban,
  Tag,
  CreditCard,
  Users,
  Database,
  Download,
  Upload,
  RotateCcw,
  Pin,
  ChevronRight,
  Sliders,
  Plus,
  Landmark,
  Cloud,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  Laptop,
  HardDrive,
  AlertOctagon,
  Trash2,
} from 'lucide-react';
import { getIcon } from '../utils/icons';
import { PWAInstallButton } from './PWAInstallButton';
import { SyncHubCard } from './SyncHubCard';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'overview' | 'groups' | 'categories' | 'accounts' | 'people' | 'data';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'overview',
}) => {
  const {
    groups,
    categoryGroups,
    accounts,
    people,
    totalPendingOwed,
    calculatedBalances,
    formatEUR,
    exportCSV,
    exportJSON,
    importJSON,
    currentUser,
    cloudSyncStatus,
    signInWithGoogle,
    signOutUser,
    syncNow,
    clearDeviceCacheAndSignOut,
    resetCloudDatabase,
  } = useLedger();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'groups' | 'categories' | 'accounts' | 'people' | 'data'
  >(initialTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Sub-modals for each entity type
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);

  const [confirmClearCache, setConfirmClearCache] = useState(false);
  const [confirmWipeCloud, setConfirmWipeCloud] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const totalCategories = categoryGroups.reduce((sum, g) => sum + g.categories.length, 0);
  const pinnedGroup = groups.find(g => g.isPinnedAlwaysActive && !g.isArchived);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        const success = await importJSON(text);
        if (success) {
          setImportStatus({ type: 'success', message: 'Backup restored successfully!' });
        } else {
          setImportStatus({ type: 'error', message: 'Failed to parse backup JSON file.' });
        }
      } catch {
        setImportStatus({ type: 'error', message: 'Invalid file format.' });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl w-full sm:max-w-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 transition-colors">
        {/* Mobile grab handle */}
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center">
              <Settings className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">Settings & Customization</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Manage your groups, categories, accounts and preferences
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

        {/* Navigation Sub-bar */}
        <div className="flex items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: 'overview', label: 'Hub' },
            { id: 'groups', label: `Groups (${groups.length})` },
            { id: 'categories', label: `Categories (${totalCategories})` },
            { id: 'accounts', label: `Accounts (${accounts.length})` },
            { id: 'people', label: `People (${people.length})` },
            { id: 'data', label: 'Data & Backup' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* OVERVIEW / HUB */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* Appearance / Dark Mode Selector */}
              <div className="p-3.5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                    {theme === 'dark' ? (
                      <Moon className="w-4 h-4 text-amber-400" />
                    ) : theme === 'light' ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Laptop className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-white text-xs block">Appearance</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Light, Dark, or System Sync</span>
                  </div>
                </div>

                <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
                  {(['light', 'dark', 'system'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setTheme(mode)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                        theme === mode
                          ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cloud Account & Real-Time Sync Hub with Progress Bar */}
              <SyncHubCard />

              {/* Native PWA Installation Prompt */}
              <PWAInstallButton variant="settings" />

              {/* Groups Hub Card */}
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="w-full p-3.5 sm:p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 text-left transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-lg shrink-0">
                    <FolderKanban className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-zinc-900 dark:text-white text-sm">Groups & Occasions</span>
                      {pinnedGroup && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-600 text-white flex items-center gap-0.5">
                          <Pin className="w-2.5 h-2.5 rotate-45" />
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                      {groups.length} groups (Trips, semester abroad, events)
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Categories Hub Card */}
              <button
                onClick={() => setActiveTab('categories')}
                className="w-full p-3.5 sm:p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">Categories & Allocation</span>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                      {totalCategories} categories across {categoryGroups.length} groups
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Accounts Hub Card */}
              <button
                onClick={() => setIsAccountModalOpen(true)}
                className="w-full p-3.5 sm:p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 text-left transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">Bank Accounts & Wallets</span>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                      {accounts.length} accounts configured
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* People & Debt Recovery Card */}
              <button
                onClick={() => setIsPersonModalOpen(true)}
                className="w-full p-3.5 sm:p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 text-left transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">People & Debt Recovery</span>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                      {people.length} people · Pending owed:{' '}
                      <strong className="text-zinc-900 dark:text-white font-mono">{formatEUR(totalPendingOwed)}</strong>
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Data & Export Card */}
              <button
                onClick={() => setActiveTab('data')}
                className="w-full p-3.5 sm:p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">Data Backup & Export</span>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                      Download JSON backup, export CSV movements, or restore data
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>
          )}

          {/* GROUPS TAB */}
          {activeTab === 'groups' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Configured Groups</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                    Pinned groups auto-tag new expenses across sessions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold border border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-600 dark:hover:border-purple-400 bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-300 transition-all flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
                  <span>Add Group</span>
                </button>
              </div>

              <div className="space-y-2">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{group.emoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-900 dark:text-white">{group.name}</span>
                          {group.isPinnedAlwaysActive && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-600 text-white font-bold">
                              Pinned
                            </span>
                          )}
                        </div>
                        {group.budget && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                            Budget: {formatEUR(group.budget)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsGroupModalOpen(true)}
                      className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                    >
                      Edit →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORIES TAB - Direct Unified Category Manager */}
          {activeTab === 'categories' && (
            <div className="space-y-3">
              <CategoryManagerContent isEmbedded={true} initialKind="expense" />
            </div>
          )}

          {/* ACCOUNTS TAB */}
          {activeTab === 'accounts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Accounts & Wallets</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                    Configured accounts and their current balances.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-400 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Account</span>
                </button>
              </div>

              <div className="space-y-2">
                {accounts.map(acc => {
                  const bal = calculatedBalances[acc.id] ?? acc.initialBalance;
                  const Icon = getIcon(acc.icon, Landmark);

                  return (
                    <div
                      key={acc.id}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-white block">{acc.name}</span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">{acc.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-zinc-950 dark:text-white">
                          {formatEUR(bal)}
                        </span>
                        <button
                          onClick={() => setIsAccountModalOpen(true)}
                          className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                        >
                          Edit →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-sm">People & Debts</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                    Track who owes you for shared expenses.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPersonModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold border border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-500 dark:hover:border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 transition-all flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>Add Person</span>
                </button>
              </div>

              <div className="space-y-2">
                {people.map(person => (
                  <div
                    key={person.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{person.emoji}</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{person.name}</span>
                    </div>
                    <button
                      onClick={() => setIsPersonModalOpen(true)}
                      className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                    >
                      Manage →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA & BACKUP TAB */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />

              {importStatus && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <span>{importStatus.message}</span>
                  <button
                    onClick={() => setImportStatus(null)}
                    className="text-xs font-bold underline ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="font-bold text-zinc-900 dark:text-white block text-xs">Export & Backup</span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Save a full backup of all accounts, groups, categories, movements, and debt records.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={exportJSON}
                    className="px-3 py-1.5 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Backup</span>
                  </button>
                  <button
                    onClick={exportCSV}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="font-bold text-zinc-900 dark:text-white block text-xs">Restore Backup</span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Import a previously saved JSON backup file to overwrite current data.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose JSON File</span>
                </button>
              </div>

              {/* DUAL RESET ACTIONS: LOCAL DEVICE CACHE vs CLOUD DATABASE */}
              {/* Action 1: Clear Local Device Cache */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2.5">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                  <HardDrive className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="font-bold text-xs">Clear Local Device Cache & Log Out</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Purges all offline cache and movements saved on this specific phone or browser, then signs you out. Your Google Cloud account and data on other devices remain completely safe and untouched.
                </p>

                {confirmClearCache ? (
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 space-y-2 mt-2">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Clear device cache now? You will be signed out and returned to the login screen.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmClearCache(false)}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          setConfirmClearCache(false);
                          await clearDeviceCacheAndSignOut();
                          onClose();
                        }}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xs cursor-pointer"
                      >
                        Yes, Clear Cache & Log Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearCache(true)}
                    className="px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>Clear Device Cache & Log Out</span>
                  </button>
                )}
              </div>

              {/* Action 2: Wipe Cloud Database & Start Fresh */}
              <div className="p-4 bg-rose-50/70 dark:bg-rose-950/25 rounded-2xl border border-rose-200/90 dark:border-rose-900/60 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-950 dark:text-rose-200">
                  <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="font-bold text-xs">Wipe Cloud Database & Start Fresh</span>
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                  Permanently deletes all logged movements, contacts, and custom groups from your Google Cloud database in Firestore. Resets your accounts to 0.00 balances. This change synchronizes immediately to all your devices.
                </p>

                {confirmWipeCloud ? (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 space-y-2.5 mt-2">
                    <p className="text-xs font-semibold text-rose-900 dark:text-rose-200 leading-snug">
                      Are you sure you want to completely wipe your Google Cloud ledger? All transactions will be permanently deleted and cannot be recovered.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmWipeCloud(false)}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          setConfirmWipeCloud(false);
                          await resetCloudDatabase();
                          onClose();
                        }}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
                      >
                        Yes, Wipe Cloud Database
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmWipeCloud(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Wipe Cloud Database & Start Fresh</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
          <span>Skei v1.2</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      <GroupManageModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />

      <CategoryCustomizerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <AccountManageModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />

      <PersonManageModal
        isOpen={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
      />
    </div>
  );
};
