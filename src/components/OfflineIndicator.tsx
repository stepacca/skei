import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl bg-amber-500/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom-3">
      <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
      <span>Offline Mode — Logged expenses will sync when reconnected.</span>
    </div>
  );
};
