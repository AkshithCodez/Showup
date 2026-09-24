'use client';

import React, { useState, useEffect } from 'react';
import { useGameSocket } from '../context/GameSocketContext';
import { getSavedPlayerName } from '../lib/playerId';
import { normalizeRoomCode } from '@showup/shared';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const { joinRoom, isConnected } = useGameSocket();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPlayerName(getSavedPlayerName());
      setRoomCode('');
      setLocalError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = playerName.trim();
    const trimmedCode = roomCode.trim();

    if (!trimmedName) {
      setLocalError('Please enter a Trainer name.');
      return;
    }
    if (trimmedName.length > 18) {
      setLocalError('Trainer name must be at most 18 characters.');
      return;
    }
    if (!trimmedCode) {
      setLocalError('Please enter a Room Code.');
      return;
    }

    const normalized = normalizeRoomCode(trimmedCode);
    joinRoom(normalized, trimmedName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border bg-surface-elevated flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Join Existing Battle
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {localError && (
            <div className="p-3 text-xs rounded-lg bg-red-950/60 border border-red-500/40 text-red-300">
              {localError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Trainer Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Blue, Steven, Dawn"
              maxLength={18}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. PKMN-X7K2 or X7K2"
              maxLength={12}
              className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono tracking-widest text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Case-insensitive. You can type the 4-character suffix or full code.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConnected}
              className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-950/50"
            >
              Enter Battle Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
