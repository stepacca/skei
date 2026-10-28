import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Cloud, Smartphone, AlertTriangle, Check, Layers, RefreshCw } from 'lucide-react';

export const SyncConflictModal: React.FC = () => {
  const { pendingConflict, resolveConflict } = useLedger();
  const [isResolving, setIsResolving] = useState(false);

  if (!pendingConflict) return null;

  const handleResolve = async (resolution: 'merge' | 'cloud' | 'local') => {
    try {
      setIsResolving(true);
      await resolveConflict(resolution);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-950 dark:text-white">
              Multi-Device Data Sync
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              New records were found between this device and your Google Cloud ledger.
            </p>
          </div>
        </div>

        {/* Primary Recommended Option: Granular Smart Merge */}
        <div className="p-4.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm text-zinc-950 dark:text-white block">
                  Smart Merge (Combine Both)
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                  Preserves transactions from both devices with zero data loss.
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-2xs">
              Recommended
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-zinc-600 dark:text-zinc-300 pt-1">
            <span className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {pendingConflict.cloudCount} cloud items
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
              {pendingConflict.localCount} device items
            </span>
          </div>

          <button
            onClick={() => handleResolve('merge')}
            disabled={isResolving}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isResolving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Merge & Synchronize Everything</span>
          </button>
        </div>

        {/* Secondary manual override options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Cloud Only */}
          <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-2.5 flex flex-col justify-between">
            <div>
              <span className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                Keep Cloud Only
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Discard uncommitted device changes and adopt cloud state.
              </p>
            </div>

            <button
              onClick={() => handleResolve('cloud')}
              disabled={isResolving}
              className="w-full py-2 px-2.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-[11px] transition-all disabled:opacity-60 cursor-pointer"
            >
              Use Cloud State
            </button>
          </div>

          {/* Local Only */}
          <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-2.5 flex flex-col justify-between">
            <div>
              <span className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                Keep Device Only
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Force overwrite cloud database with this device's data.
              </p>
            </div>

            <button
              onClick={() => handleResolve('local')}
              disabled={isResolving}
              className="w-full py-2 px-2.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-[11px] transition-all disabled:opacity-60 cursor-pointer"
            >
              Overwrite Cloud
            </button>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
          Smart Merge compares individual item timestamps so concurrent additions on different devices are both kept.
        </p>
      </div>
    </div>
  );
};
