import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Cloud, Smartphone, AlertTriangle, ArrowRight, Check } from 'lucide-react';

export const SyncConflictModal: React.FC = () => {
  const { pendingConflict, resolveConflict } = useLedger();
  const [isResolving, setIsResolving] = useState(false);

  if (!pendingConflict) return null;

  const handleResolve = async (resolution: 'cloud' | 'local') => {
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
              Cloud vs. Local Data Divergence
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Your device has data that differs from your Google Cloud ledger.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Cloud Option */}
          <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Google Cloud
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Authoritative multi-device cloud store.
              </p>
              <div className="font-mono text-xs font-bold text-zinc-950 dark:text-white pt-1">
                {pendingConflict.cloudCount} items in cloud
              </div>
            </div>

            <button
              onClick={() => handleResolve('cloud')}
              disabled={isResolving}
              className="w-full py-2.5 px-3 bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Use Cloud Data</span>
            </button>
          </div>

          {/* Local Option */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                This Device
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Overwrites your cloud database with this phone/PC's data.
              </p>
              <div className="font-mono text-xs font-bold text-zinc-950 dark:text-white pt-1">
                {pendingConflict.localCount} items on device
              </div>
            </div>

            <button
              onClick={() => handleResolve('local')}
              disabled={isResolving}
              className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>Upload Local to Cloud</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
          Choosing "Use Cloud Data" will align this device with your other synchronized devices.
        </p>
      </div>
    </div>
  );
};
