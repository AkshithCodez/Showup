'use client';

import React, { useState } from 'react';
import { CreateRoomModal } from './CreateRoomModal';
import { JoinRoomModal } from './JoinRoomModal';
import { useGameSocket } from '../context/GameSocketContext';

export function LandingView() {
  const { error, clearError } = useGameSocket();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Error notification if returned from server before entering room */}
      {error && (
        <div className="w-full max-w-md mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center justify-between">
          <div className="text-sm text-red-200">{error}</div>
          <button
            onClick={clearError}
            className="text-xs text-red-400 hover:text-white px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="w-full max-w-xl text-center space-y-8">
        {/* Main Hero Title */}
        <div className="space-y-3">
          <div className="inline-block mb-1">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
              Pokémon Team Draft & Battle
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white uppercase">
            SHOW<span className="text-red-500">UP</span>
          </h1>

          <p className="text-lg sm:text-xl font-medium text-slate-300">
            Randomize. Build. Battle.
          </p>

          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Draft a competitive Pokémon squad through randomized "1 of 3" choices,
            configure custom sets, and face your friend in real-time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-52 py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider text-sm bg-red-600 hover:bg-red-500 text-white transition-all shadow-xl shadow-red-950/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            Create Battle
          </button>

          <button
            onClick={() => setIsJoinOpen(true)}
            className="w-full sm:w-52 py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider text-sm bg-surface-elevated hover:bg-slate-800 border border-surface-border text-slate-200 hover:text-white transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            Join Battle
          </button>
        </div>

        {/* Feature Badges */}
        <div className="pt-8 border-t border-surface-border/60 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-surface/50 border border-surface-border/50">
            <div className="text-xs font-bold text-slate-300">1 of 3 Draft</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Randomized pools</div>
          </div>
          <div className="p-3 rounded-lg bg-surface/50 border border-surface-border/50">
            <div className="text-xs font-bold text-slate-300">Authoritative</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Server-synced rooms</div>
          </div>
          <div className="p-3 rounded-lg bg-surface/50 border border-surface-border/50">
            <div className="text-xs font-bold text-slate-300">Showdown Ready</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Competitive rules</div>
          </div>
        </div>
      </div>

      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />
    </div>
  );
}
