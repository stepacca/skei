import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Wallet, Sliders, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface WelcomeGuestCardProps {
  onNavigateToAccounts: () => void;
  onOpenCategories: () => void;
}

export const WelcomeGuestCard: React.FC<WelcomeGuestCardProps> = ({
  onNavigateToAccounts,
  onOpenCategories,
}) => {
  const { currentUser, transactions } = useLedger();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('skei_dismiss_onboarding') === 'true';
  });

  // Only show for fresh accounts with 0 transactions that haven't dismissed the onboarding card
  if (isDismissed || transactions.length > 0) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('skei_dismiss_onboarding', 'true');
  };

  return (
    <div className="max-w-lg md:max-w-5xl mx-auto bg-gradient-to-br from-emerald-500/10 via-white to-blue-500/5 dark:from-emerald-950/20 dark:via-zinc-900 dark:to-blue-950/15 rounded-3xl border border-emerald-300/80 dark:border-emerald-800/60 p-4 sm:p-5 shadow-xs relative overflow-hidden transition-colors">
      {/* Decorative subtle background aura */}
      <div className="absolute -right-12 -top-12 w-36 h-36 bg-emerald-400/10 dark:bg-emerald-400/5 rounded-full blur-2xl pointer-events-none" />

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
        title="Dismiss welcome card"
        aria-label="Dismiss welcome card"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="space-y-3.5 pr-6">
        {/* Header Badge & Title */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-zinc-950 dark:text-white">
                Start logging your skei!
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Cloud Connected
              </span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
              💡 Fun fact: <em>Schei</em> means money in Veneto dialect.
            </p>
          </div>
        </div>

        {/* Setup Prompt Explanation */}
        <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p>
            Your ledger is now linked to <strong>{currentUser?.email || 'your Google account'}</strong>. Any movement logged here synchronizes automatically across your phone, tablet, and PC in real time.
          </p>
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
            To get started, personalize your accounts and spending categories, or log your very first expense on the numpad below.
          </p>
        </div>

        {/* Prompt: Customize Accounts & Categories */}
        <div className="pt-2 border-t border-emerald-200/60 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Recommended first steps:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToAccounts}
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200/90 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Customize Accounts</span>
            </button>
            <button
              onClick={onOpenCategories}
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200/90 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Customize Categories</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

