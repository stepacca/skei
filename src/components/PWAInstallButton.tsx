import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'settings' | 'banner' }> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'settings') {
      return (
        <button
          onClick={install}
          className="w-full p-3.5 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-between text-left transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-zinc-950 block">Install Skei App</span>
              <span className="text-[10px] text-zinc-500">
                Add to your home screen for full-screen offline use
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-zinc-900 px-2.5 py-1 bg-zinc-100 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
            Install
          </span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors shadow-2xs"
        title="Install Skei as an app"
      >
        <Download className="w-3.5 h-3.5 text-zinc-600" />
        <span className="hidden sm:inline">Install</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'settings' ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="w-full p-3.5 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-between text-left transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-zinc-950 block">Install on iPhone / iPad</span>
                <span className="text-[10px] text-zinc-500">
                  Open full-screen without Safari browser bars
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-zinc-900 px-2.5 py-1 bg-zinc-100 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
              How-To
            </span>
          </button>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            <Download className="w-3 h-3 text-zinc-500" />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-zinc-200 relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-950 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center text-sm font-bold font-mono">
                  €
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Install Skei on iOS</h3>
                  <p className="text-[11px] text-zinc-500">Add to your Home Screen</p>
                </div>
              </div>

              <div className="space-y-2.5 my-3 text-xs text-zinc-700 bg-zinc-50 p-3 rounded-2xl border border-zinc-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span>
                    1. Tap the <strong>Share</strong> button at the bottom of Safari.
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                    <PlusSquare className="w-3.5 h-3.5 text-zinc-800" />
                  </div>
                  <span>
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-zinc-950 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
