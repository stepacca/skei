import React from 'react';
import { Calculator, Receipt, Wallet, BarChart3 } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: 'log' | 'movements' | 'accounts' | 'stats';
  setActiveTab: (tab: 'log' | 'movements' | 'accounts' | 'stats') => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, setActiveTab }) => {
  const tabs: {
    id: 'log' | 'movements' | 'accounts' | 'stats';
    label: string;
    icon: React.ElementType;
    isPrimary?: boolean;
  }[] = [
    { id: 'log', label: 'Log', icon: Calculator, isPrimary: true },
    { id: 'movements', label: 'Movements', icon: Receipt },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <nav
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
      className="fixed bottom-0 inset-x-0 z-40 bg-[#FAFAFA] dark:bg-[#09090b] border-t border-zinc-200/80 dark:border-zinc-800/80 md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] transition-colors"
    >
      <div className="grid grid-cols-4 items-center h-13 max-w-md mx-auto px-2 pt-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-transform active:scale-95 focus:outline-none select-none"
              aria-label={tab.label}
            >
              {tab.isPrimary ? (
                <div
                  className={`w-9 h-8.5 rounded-xl flex items-center justify-center transition-all shadow-xs ${
                    isActive
                      ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 ring-2 ring-zinc-900/10 dark:ring-zinc-100/20'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
              ) : (
                <div
                  className={`p-1 rounded-xl transition-colors ${
                    isActive
                      ? 'text-zinc-950 dark:text-white'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                </div>
              )}
              <span
                className={`text-[10.5px] font-medium tracking-tight mt-0.5 ${
                  isActive
                    ? 'text-zinc-950 dark:text-white font-semibold'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
