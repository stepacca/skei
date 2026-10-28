import React from 'react';
import { QuickLogPanel } from './QuickLogPanel';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl">
        <QuickLogPanel isModal={true} onClose={onClose} onSuccess={onClose} />
      </div>
    </div>
  );
};
