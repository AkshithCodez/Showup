'use client';

import React from 'react';
import { useGameSocket } from '../context/GameSocketContext';

export function TeamBuildingView() {
  const { room, player } = useGameSocket();

  if (!room || !player || !room.draft) return null;

  const team = room.draft.myDraft.team;
  const opponent = room.players.find((p) => p.id !== player.id);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10 flex-1 flex flex-col justify-center items-center">
      {/* Hero Badge */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Phase 2 Complete</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black uppercase text-white tracking-wide">
          Pokémon Draft Complete!
        </h1>

        <p className="text-base text-slate-300 font-medium max-w-md mx-auto">
          Both trainers have locked in their 6-Pokémon competitive rosters.
        </p>
      </div>

      {/* 6-Pokemon Squad Showcase */}
      <div className="w-full bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl mb-8">
        <div className="flex items-center justify-between mb-4 border-b border-surface-border pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Your Drafted Battle Squad ({team.length} / 6)
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Trainer: {player.name}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {team.map((pokemon, idx) => (
            <div
              key={`${pokemon.id}-${idx}`}
              className="bg-surface-elevated border border-surface-border rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-md hover:border-slate-500 transition-all group"
            >
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">
                Slot {idx + 1}
              </div>

              <div className="w-20 h-20 flex items-center justify-center my-2">
                <img
                  src={pokemon.sprite.animated || pokemon.sprite.front || ''}
                  alt={pokemon.displayName}
                  onError={(e) => {
                    if (pokemon.sprite.front && e.currentTarget.src !== pokemon.sprite.front) {
                      e.currentTarget.src = pokemon.sprite.front;
                    }
                  }}
                  className="max-h-20 max-w-20 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
                />
              </div>

              <div className="text-xs font-bold text-white uppercase tracking-wider mt-1 truncate w-full">
                {pokemon.displayName}
              </div>

              <div className="text-[10px] font-mono text-red-400 font-semibold mt-0.5">
                BST {pokemon.bst}
              </div>

              <div className="flex gap-1 mt-1.5 flex-wrap justify-center">
                {pokemon.types.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 uppercase"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Step Info Box */}
      <div className="w-full max-w-xl bg-surface-elevated/70 border border-surface-border rounded-xl p-6 text-center space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Next Phase: Team Building
        </div>
        <p className="text-sm text-slate-300">
          Set configuration, moves, abilities, items, EVs/IVs, and Tera types will unlock in <span className="text-red-400 font-semibold">Phase 3</span>.
        </p>
        <p className="text-xs text-slate-500">
          Multiplayer synchronization is active with {opponent ? opponent.name : 'opponent'}.
        </p>
      </div>
    </div>
  );
}
