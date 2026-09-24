'use client';

import React from 'react';
import { useGameSocket } from '../context/GameSocketContext';

export function Header() {
  const { isConnected } = useGameSocket();

  return (
    <header className="w-full border-b border-surface-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full border-2 border-red-500 flex items-center justify-center bg-gradient-to-b from-red-600 to-white relative shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white" />
            <div className="absolute w-full h-[2px] bg-slate-900 top-1/2 -translate-y-1/2" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-black text-xl tracking-wider text-white">
              SHOW<span className="text-red-500">UP</span>
            </span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-surface-border text-slate-400 uppercase tracking-widest">
              Alpha
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500 animate-pulse'
            }`}
          />
          <span className={isConnected ? 'text-slate-300' : 'text-amber-400'}>
            {isConnected ? 'Server Connected' : 'Connecting to Server...'}
          </span>
        </div>
      </div>
    </header>
  );
}
