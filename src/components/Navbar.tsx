import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { Calculator, Receipt, Wallet, BarChart3, Settings, Cloud, Sun, Moon, RefreshCw, Check } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeTab: 'log' | 'movements' | 'accounts' | 'stats';
  setActiveTab: (tab: 'log' | 'movements' | 'accounts' | 'stats') => void;
  openTransfer: () => void;
  openSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openTransfer,
  openSettings,
}) => {
  const { totalNetWorth, formatEUR, currentUser, cloudSyncStatus, syncProgress, syncNow } = useLedger();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = async () => {
    try {
      setIsSyncing(true);
      await syncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  const navLinks: {
    id: 'log' | 'movements' | 'accounts' | 'stats';
    label: string;
    icon: React.ElementType;
  }[] = [
    { id: 'log', label: 'Quick Log', icon: Calculator },
    { id: 'movements', label: 'Movements', icon: Receipt },
    { id: 'accounts', label: 'Accounts & Transfers', icon: Wallet },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
  ];

  const isSyncActive = cloudSyncStatus === 'syncing' || isSyncing;

  return (
    <>
      {/* ========================================================================= */}
      {/* MOBILE HEADER (sm:hidden) - Safe Area Aware so content never hides notch */}
      {/* ========================================================================= */}
      <header
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        className="sm:hidden fixed top-0 inset-x-0 z-30 bg-[#FAFAFA] dark:bg-[#09090b] border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors"
      >
        <div className="px-3.5 h-12.5 flex items-center justify-between gap-2">
          {/* Brand & Interactive Mobile Tap-to-Sync Button */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setActiveTab('log')}
              className="flex items-center gap-1.5 focus:outline-none"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-950 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 font-mono text-xs font-bold shadow-2xs">
                €
              </div>
              <span className="text-sm font-bold tracking-tight text-zinc-950 dark:text-white leading-none">
                Skei
              </span>
            </button>

            {/* Mobile Tap-to-Sync Pill */}
            {currentUser && (
              <button
                onClick={handleSyncClick}
                disabled={isSyncActive}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all active:scale-95 border cursor-pointer ${
                  isSyncActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    : cloudSyncStatus === 'synced'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}
                title="Tap to sync with Google Cloud"
              >
                {isSyncActive ? (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>{syncProgress}%</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Sync</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right Mobile Actions: Theme toggle, Net Balance, Settings */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 rounded-lg transition-colors border border-zinc-200/50 dark:border-zinc-800 cursor-pointer"
              title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-zinc-600" />
              )}
            </button>

            {/* Compact Net Balance */}
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-zinc-950 dark:text-white tabular-nums block">
                {formatEUR(totalNetWorth)}
              </span>
            </div>

            {/* Settings trigger */}
            <button
              onClick={openSettings}
              className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 rounded-lg transition-colors border border-zinc-200/50 dark:border-zinc-800 cursor-pointer"
              title="Settings & Reset Tools"
              aria-label="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* DESKTOP HEADER (hidden sm:block) */}
      {/* ========================================================================= */}
      <header className="hidden sm:block sticky top-0 z-30 bg-[#FAFAFA]/95 dark:bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo & Interactive Cloud Sync Pill */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('log')}
              className="flex items-center gap-2 group text-left focus:outline-none cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-mono text-sm font-bold shadow-2xs group-hover:scale-105 transition-transform">
                €
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-zinc-950 dark:text-white block leading-tight">
                  Skei
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block leading-tight">
                  Multi-Device Cloud
                </span>
              </div>
            </button>

            {/* Desktop Tap-to-Sync Button */}
            {currentUser && (
              <button
                onClick={handleSyncClick}
                disabled={isSyncActive}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 border cursor-pointer ${
                  isSyncActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    : cloudSyncStatus === 'synced'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}
                title="Force manual sync with Google Cloud"
              >
                {isSyncActive ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Syncing {syncProgress}%</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Sync Now</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
            {navLinks.map(link => {
              const isActive = activeTab === link.id;
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-200/50 dark:border-zinc-800 cursor-pointer"
              title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-600" />
              )}
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton variant="header" />

            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-zinc-400 dark:text-zinc-500 block tracking-wider">
                Net Balance
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-zinc-950 dark:text-white tabular-nums">
                {formatEUR(totalNetWorth)}
              </span>
            </div>

            {/* User Avatar or Settings button */}
            {currentUser?.photoURL ? (
              <button
                onClick={openSettings}
                className="relative rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700 hover:ring-zinc-400 dark:hover:ring-zinc-500 transition-all focus:outline-none cursor-pointer"
                title={`${currentUser.displayName || currentUser.email} (Open Settings & Cloud Hub)`}
              >
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
              </button>
            ) : (
              <button
                onClick={openSettings}
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-200/50 dark:border-zinc-800 cursor-pointer"
                title="Settings & Reset Tools"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
