import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Cloud, Check, RefreshCw, AlertTriangle, Clock } from 'lucide-react';

export const SyncHubCard: React.FC = () => {
  const {
    currentUser,
    cloudSyncStatus,
    syncProgress,
    syncStage,
    lastSyncedAt,
    syncNow,
  } = useLedger();

  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await syncNow();
    } catch {
      // Handled in context
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Just now';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 15) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isSyncActive = cloudSyncStatus === 'syncing' || isSyncing;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-4 transition-colors">
      {/* Header with User Info and Status Pill */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3 min-w-0">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt="Avatar"
              className="w-10 h-10 rounded-2xl object-cover ring-2 ring-emerald-500/20 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 dark:bg-zinc-800 text-white flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5 text-emerald-400 stroke-[2]" />
            </div>
          )}
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                {currentUser?.displayName || 'Cloud Synchronizer'}
              </h3>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {currentUser?.email || 'Logged in via Google'}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
            cloudSyncStatus === 'synced'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800'
              : cloudSyncStatus === 'syncing'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800'
          }`}
        >
          {cloudSyncStatus === 'synced' ? (
            <>
              <Check className="w-3 h-3 stroke-[3]" />
              <span>100% In Sync</span>
            </>
          ) : cloudSyncStatus === 'syncing' ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin stroke-[2.5]" />
              <span>Syncing</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3" />
              <span>Offline Queue</span>
            </>
          )}
        </div>
      </div>

      {/* Real-time Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'synced' ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`} />
            {syncStage}
          </span>
          <span className="font-mono font-bold text-zinc-950 dark:text-white tabular-nums">
            {syncProgress}%
          </span>
        </div>

        {/* Progress track */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-zinc-200/80 dark:border-zinc-700">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              cloudSyncStatus === 'synced'
                ? 'bg-emerald-500'
                : cloudSyncStatus === 'offline'
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-indigo-500 to-emerald-500 animate-pulse'
            }`}
            style={{ width: `${Math.max(5, syncProgress)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last Synced: {formatLastSync(lastSyncedAt)}
          </span>
          <span>5 Collections Streamed</span>
        </div>
      </div>

      {/* Manual Tap-to-Sync Button (Crucial for Mobile WebApp / PWA) */}
      <button
        onClick={handleManualSync}
        disabled={isSyncActive}
        className="w-full py-2.5 px-4 bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        title="Force manual sync check with Google Cloud"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncActive ? 'animate-spin' : ''}`} />
        <span>{isSyncActive ? 'Synchronizing with Google Cloud...' : 'Tap to Force Sync Now'}</span>
      </button>
    </div>
  );
};
