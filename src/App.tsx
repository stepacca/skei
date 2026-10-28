import React, { useState } from 'react';
import { LedgerProvider, useLedger } from './context/LedgerContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { BottomTabBar } from './components/BottomTabBar';
import { QuickLogPanel } from './components/QuickLogPanel';
import { MovementsView } from './components/MovementsView';
import { AccountsView } from './components/AccountsView';
import { StatsView } from './components/StatsView';
import { TransferModal } from './components/TransferModal';
import { SettingsModal } from './components/SettingsModal';
import { CategoryCustomizerModal } from './components/CategoryCustomizerModal';
import { WelcomeGuestCard } from './components/WelcomeGuestCard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthGate } from './components/AuthGate';
import { SyncConflictModal } from './components/SyncConflictModal';
import { TransactionEditModal } from './components/TransactionEditModal';
import { Transaction } from './types';
import { ArrowRightLeft, ArrowDownLeft, ArrowUpRight, AlertTriangle, X } from 'lucide-react';

function QuickLogMainView({
  onNavigateToMovements,
  onNavigateToAccounts,
  onOpenCategories,
  openSettings,
}: {
  onNavigateToMovements: () => void;
  onNavigateToAccounts: () => void;
  onOpenCategories: () => void;
  openSettings: (tab?: 'overview' | 'groups' | 'categories' | 'accounts' | 'people' | 'data') => void;
}) {
  const { transactions, accounts, categoryGroups, formatEUR } = useLedger();
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const recentLogs = transactions.slice(0, 3);

  const allCategories = categoryGroups.flatMap(g => g.categories);

  return (
    <div className="space-y-4">
      {/* Welcome Card for new/guest users with Google Auth push & setup prompts */}
      <WelcomeGuestCard
        onNavigateToAccounts={onNavigateToAccounts}
        onOpenCategories={onOpenCategories}
      />

      {/* Primary Hero: The POS Terminal Quick Log Numpad */}
      <QuickLogPanel openSettings={openSettings} />

      {/* Recent quick transactions below numpad for immediate confirmation */}
      {recentLogs.length > 0 && (
        <div className="max-w-lg md:max-w-5xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-3.5 sm:p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Recent Activity (Tap to Edit)
            </span>
            <button
              onClick={onNavigateToMovements}
              className="text-[11px] font-semibold text-zinc-950 dark:text-zinc-200 hover:underline"
            >
              View All Movements →
            </button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {recentLogs.map(tx => {
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
                  className="py-2 px-1 -mx-1 rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 transition-colors group select-none"
                  title="Tap to edit this movement"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'expense'
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                          : tx.type === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
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
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                          {tx.note || (tx.type === 'transfer' ? 'Transfer' : 'Expense')}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate">
                        {tx.type === 'transfer'
                          ? `${acc} → ${toAcc}`
                          : `${acc} · ${cat?.name || 'Unsorted'}${subCat ? ` › ${subCat.name}` : ''}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono font-bold text-xs tabular-nums ${
                        tx.type === 'expense'
                          ? 'text-zinc-950 dark:text-zinc-100'
                          : tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatEUR(tx.amount)}
                    </span>
                    <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Edit
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Edit Modal for Recent Activity */}
      <TransactionEditModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
      />
    </div>
  );
}

export function AppContent() {
  const { currentUser, clearSessionGroup, syncError, dismissSyncError } = useLedger();
  const [activeTab, setActiveTab] = useState<'log' | 'movements' | 'accounts' | 'stats'>('log');

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    'overview' | 'groups' | 'categories' | 'accounts' | 'people' | 'data'
  >('overview');
  const [isCategoryCustomizerOpen, setIsCategoryCustomizerOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string | undefined>();
  const [transferToId, setTransferToId] = useState<string | undefined>();

  // If user is not logged in, enforce the mandatory Google Sign-In Gate
  if (!currentUser) {
    return <AuthGate />;
  }

  const handleSwitchTab = (tab: 'log' | 'movements' | 'accounts' | 'stats') => {
    clearSessionGroup();
    setActiveTab(tab);
  };

  const handleOpenSettings = (
    tab: 'overview' | 'groups' | 'categories' | 'accounts' | 'people' | 'data' = 'overview'
  ) => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const handleOpenTransfer = (fromId?: string, toId?: string) => {
    setTransferFromId(fromId);
    setTransferToId(toId);
    setIsTransferModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090b] flex flex-col font-sans text-zinc-900 dark:text-zinc-100 antialiased transition-colors">
      {/* Interactive Cloud vs Local Divergence Dialog */}
      <SyncConflictModal />

      {/* Top Header with Safe Area Notch Support */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSwitchTab}
        openTransfer={() => handleOpenTransfer()}
        openSettings={() => handleOpenSettings('overview')}
      />

      {/* Main Viewport Content (Safe Area offset on mobile to clear fixed top header and fixed bottom bar) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 mobile-safe-layout">
        {syncError && (
          <div className="mb-4 p-3 sm:p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-900 dark:text-red-200 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold block">Cloud Sync Notice:</span>
                <span className="text-[11px] opacity-90 truncate block">{syncError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissSyncError}
              className="p-1 rounded-lg hover:bg-red-200/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 shrink-0 transition-colors"
              title="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {activeTab === 'log' && (
          <QuickLogMainView
            onNavigateToMovements={() => handleSwitchTab('movements')}
            onNavigateToAccounts={() => handleSwitchTab('accounts')}
            onOpenCategories={() => handleOpenSettings('categories')}
            openSettings={handleOpenSettings}
          />
        )}

        {activeTab === 'movements' && <MovementsView />}

        {activeTab === 'accounts' && (
          <AccountsView onOpenTransfer={handleOpenTransfer} />
        )}

        {activeTab === 'stats' && (
          <StatsView onOpenCategories={() => handleOpenSettings('categories')} />
        )}
      </main>

      {/* Global Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        defaultFromAccountId={transferFromId}
        defaultToAccountId={transferToId}
      />

      {/* Settings & Customization Hub Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
      />

      {/* Category Customizer Modal */}
      <CategoryCustomizerModal
        isOpen={isCategoryCustomizerOpen}
        onClose={() => setIsCategoryCustomizerOpen(false)}
      />

      {/* Offline Mode Alert Toast */}
      <OfflineIndicator />

      {/* Modern Mobile Bottom Tab Bar with Safe Area Bottom */}
      <BottomTabBar activeTab={activeTab} setActiveTab={handleSwitchTab} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LedgerProvider>
        <AppContent />
      </LedgerProvider>
    </ThemeProvider>
  );
}
