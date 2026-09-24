'use client';

import React, { useState } from 'react';
import { useGameSocket } from '../context/GameSocketContext';
import { MAX_PLAYERS_PER_ROOM } from '@showup/shared';

export function LobbyView() {
  const { room, player, isHost, toggleReady, startDraft, leaveRoom, error, clearError } = useGameSocket();
  const [copied, setCopied] = useState(false);


  if (!room || !player) return null;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const opponent = room.players.find((p) => p.id !== player.id);
  const isOpponentPresent = Boolean(opponent);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Error alert if any */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center justify-between">
          <div className="text-sm text-red-200">{error}</div>
          <button
            onClick={clearError}
            className="text-xs text-red-400 hover:text-white px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Room Header Card */}
      <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            <span>Battle Lobby</span>
            <span>•</span>
            <span className="text-red-400">
              {room.config.draftMode === 'same-pool' ? 'Same Pool Draft' : 'Independent Draft'}
            </span>
            <span>•</span>
            <span>{room.config.teamSize}v{room.config.teamSize} Singles</span>
          </div>

          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-black tracking-wider text-white font-mono">
              {room.roomCode}
            </h1>
            <button
              onClick={copyRoomCode}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-elevated hover:bg-slate-700 border border-surface-border text-slate-300 transition-colors flex items-center space-x-1.5"
            >
              <span>{copied ? '✓ Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={leaveRoom}
            className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-surface-elevated hover:bg-slate-800 border border-surface-border text-slate-400 hover:text-red-400 transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Player Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Current Player Card */}
        <div
          className={`relative rounded-2xl border p-6 transition-all shadow-lg ${
            player.ready
              ? 'bg-surface border-emerald-500/50 shadow-emerald-950/20'
              : 'bg-surface border-surface-border'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                You
              </span>
              {player.isHost && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Host
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  player.connected ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
              />
              <span className={player.connected ? 'text-slate-400' : 'text-rose-400'}>
                {player.connected ? 'Online' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center font-black text-2xl text-white shadow-md">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xl font-bold text-white tracking-wide">{player.name}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">Trainer ID: {player.id.slice(0, 8)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-surface-border">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 uppercase font-semibold">Status:</span>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                  player.ready
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {player.ready ? '✓ Ready' : 'Not Ready'}
              </span>
            </div>

            <button
              onClick={toggleReady}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                player.ready
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
              }`}
            >
              {player.ready ? 'Cancel Ready' : 'Ready Up'}
            </button>
          </div>
        </div>

        {/* Opponent Player Card */}
        {isOpponentPresent && opponent ? (
          <div
            className={`relative rounded-2xl border p-6 transition-all shadow-lg ${
              opponent.ready
                ? 'bg-surface border-emerald-500/50 shadow-emerald-950/20'
                : 'bg-surface border-surface-border'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Opponent
                </span>
                {opponent.isHost && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Host
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    opponent.connected ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                />
                <span className={opponent.connected ? 'text-slate-400' : 'text-rose-400'}>
                  {opponent.connected ? 'Online' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-2xl text-white shadow-md">
                {opponent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xl font-bold text-white tracking-wide">{opponent.name}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">Trainer ID: {opponent.id.slice(0, 8)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-surface-border">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Status:</span>
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                    opponent.ready
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {opponent.ready ? '✓ Ready' : 'Not Ready'}
                </span>
              </div>

              <span className="text-xs text-slate-500 italic">
                {opponent.ready ? 'Waiting for you' : 'Awaiting confirmation'}
              </span>
            </div>
          </div>
        ) : (
          /* Empty Slot */
          <div className="rounded-2xl border-2 border-dashed border-surface-border bg-surface/40 p-6 flex flex-col items-center justify-center text-center min-h-[220px]">
            <div className="w-12 h-12 rounded-full bg-surface-elevated border border-surface-border flex items-center justify-center text-slate-500 mb-3 font-mono text-xl">
              ?
            </div>
            <div className="text-sm font-semibold text-slate-300 mb-1">
              Waiting for Opponent to Join...
            </div>
            <p className="text-xs text-slate-500 max-w-xs mb-3">
              Share the room code <span className="font-mono text-white font-bold">{room.roomCode}</span> with a friend.
            </p>
            <button
              onClick={copyRoomCode}
              className="text-xs text-red-400 hover:text-red-300 font-semibold"
            >
              {copied ? '✓ Copied Room Code' : 'Copy Room Code'}
            </button>
          </div>
        )}
      </div>

      {/* Derived Draft Readiness Status Box */}
      <div className="bg-surface-elevated border border-surface-border rounded-xl p-6 text-center">
        {room.canStartDraft ? (
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Ready for Draft</span>
            </div>
            <div>
              <p className="text-base text-white font-bold">
                Both trainers are locked and ready!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isHost
                  ? 'As the room host, you can now launch the 1-of-3 Pokémon draft.'
                  : 'Waiting for host to start the Pokémon draft...'}
              </p>
            </div>

            {isHost && (
              <div className="pt-2">
                <button
                  onClick={startDraft}
                  className="px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950/60 hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center space-x-2"
                >
                  <span>Start Pokémon Draft</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Lobby State
            </div>
            <p className="text-xs text-slate-500">
              {!isOpponentPresent
                ? 'Invite player 2 to start drafting.'
                : 'Both players must click "Ready Up" to proceed.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
