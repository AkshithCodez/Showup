'use client';

import React, { useState } from 'react';
import { useGameSocket } from '../context/GameSocketContext';
import type { PokemonSummary, PokemonType } from '@showup/shared';

const TYPE_COLORS: Record<PokemonType, { bg: string; text: string; border: string }> = {
  Normal: { bg: 'bg-stone-500/20', text: 'text-stone-300', border: 'border-stone-500/40' },
  Fire: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  Water: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  Grass: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  Electric: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  Ice: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  Fighting: { bg: 'bg-red-700/20', text: 'text-red-400', border: 'border-red-700/40' },
  Poison: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  Ground: { bg: 'bg-amber-600/20', text: 'text-amber-400', border: 'border-amber-600/40' },
  Flying: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/40' },
  Psychic: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/40' },
  Bug: { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/40' },
  Rock: { bg: 'bg-yellow-700/20', text: 'text-yellow-500', border: 'border-yellow-700/40' },
  Ghost: { bg: 'bg-violet-700/20', text: 'text-violet-300', border: 'border-violet-700/40' },
  Dragon: { bg: 'bg-indigo-700/20', text: 'text-indigo-400', border: 'border-indigo-700/40' },
  Steel: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400/40' },
  Dark: { bg: 'bg-zinc-800/40', text: 'text-zinc-400', border: 'border-zinc-600/40' },
  Fairy: { bg: 'bg-rose-400/20', text: 'text-rose-300', border: 'border-rose-400/40' },
  Stellar: { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/40' },
};

export function DraftView() {
  const { room, player, selectPokemon, error, clearError } = useGameSocket();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!room || !player || !room.draft) return null;

  const { myDraft, opponentDraft, targetTeamSize, roundNumber } = room.draft;
  const isSamePool = room.config.draftMode === 'same-pool';
  const opponent = room.players.find((p) => p.id !== player.id);

  const handleSelect = (pokemonId: number) => {
    if (selectedId !== null || myDraft.lockedIn) return;
    setSelectedId(pokemonId);
    selectPokemon(pokemonId);
    // Auto-clear selection lock once updated
    setTimeout(() => setSelectedId(null), 1000);
  };

  const isLockedIn = myDraft.lockedIn;
  const isTeamComplete = myDraft.team.length >= targetTeamSize;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col flex-1">
      {/* Error alert */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center justify-between text-xs text-red-200">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-white px-2 py-0.5">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header & Status Bar */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 mb-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center font-black text-red-400 text-lg">
            {myDraft.team.length + 1 <= targetTeamSize ? myDraft.team.length + 1 : targetTeamSize}
          </div>
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <span>{isSamePool ? 'Same-Pool Draft' : 'Independent Draft'}</span>
              <span>•</span>
              <span className="text-red-400 font-mono">Room: {room.roomCode}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase mt-0.5">
              Round {isSamePool ? roundNumber : myDraft.team.length + 1} of {targetTeamSize}
            </h1>
          </div>
        </div>

        {/* Opponent Status Badge */}
        {opponent && (
          <div className="flex items-center space-x-3 bg-surface-elevated px-4 py-2.5 rounded-xl border border-surface-border text-xs">
            <span className="text-slate-400 font-medium">Opponent ({opponent.name}):</span>
            <span className="font-mono font-bold text-white">
              {opponentDraft?.teamCount ?? 0} / {targetTeamSize}
            </span>
            {isSamePool && (
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                  opponentDraft?.lockedIn
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                }`}
              >
                {opponentDraft?.lockedIn ? '✓ Locked In' : 'Deciding...'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Current Team Tray */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Your Squad ({myDraft.team.length} / {targetTeamSize})
          </span>
          <span className="text-xs text-slate-500">
            {targetTeamSize - myDraft.team.length} picks remaining
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: targetTeamSize }).map((_, idx) => {
            const drafted = myDraft.team[idx];
            if (drafted) {
              return (
                <div
                  key={drafted.id}
                  className="bg-surface border border-surface-border rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-all hover:border-slate-600 shadow-md group"
                >
                  <div className="w-16 h-16 relative flex items-center justify-center mb-1">
                    <img
                      src={drafted.sprite.animated || drafted.sprite.front || ''}
                      alt={drafted.displayName}
                      className="max-h-16 max-w-16 object-contain drop-shadow"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-xs font-bold text-white truncate w-full">
                    {drafted.displayName}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {drafted.types.map((t) => (
                      <span
                        key={t}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          TYPE_COLORS[t]?.bg || 'bg-slate-800'
                        } ${TYPE_COLORS[t]?.text || 'text-slate-300'} ${
                          TYPE_COLORS[t]?.border || 'border-slate-700'
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`empty-${idx}`}
                className="rounded-xl border-2 border-dashed border-surface-border bg-surface/30 p-2.5 flex flex-col items-center justify-center text-center min-h-[110px]"
              >
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Slot {idx + 1}
                </span>
                <span className="text-[11px] text-slate-700 mt-1">Empty</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Choice Stage */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* State A: Locked In / Waiting for Opponent */}
        {isLockedIn ? (
          <div className="w-full max-w-md bg-surface border border-emerald-500/40 rounded-2xl p-8 text-center shadow-2xl animate-fade-in my-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide uppercase">
              Pick Locked In!
            </h2>
            <p className="text-sm text-slate-300 mt-2 font-medium">
              Waiting for {opponent?.name || 'opponent'} to make their choice...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Both trainers advance to Round {roundNumber + 1} simultaneously once locked.
            </p>
            <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Awaiting opponent confirmation</span>
            </div>
          </div>
        ) : isTeamComplete ? (
          /* State B: Team Complete, waiting for other player in Independent mode */
          <div className="w-full max-w-md bg-surface border border-red-500/40 rounded-2xl p-8 text-center shadow-2xl animate-fade-in my-8">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl font-bold">
              ★
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide uppercase">
              Draft Complete!
            </h2>
            <p className="text-sm text-slate-300 mt-2 font-medium">
              You drafted all 6 Pokémon for your team.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Waiting for {opponent?.name || 'opponent'} to finish their picks...
            </p>
            <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Waiting for {opponent?.name || 'opponent'}</span>
            </div>
          </div>
        ) : myDraft.currentOptions.length === 0 ? (
          /* State C: Loading next options */
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-300">
              Preparing your Pokémon choices...
            </p>
          </div>
        ) : (
          /* State D: Choose 1 of 3 Pokémon Cards */
          <div className="w-full space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-black tracking-widest text-slate-300 uppercase">
                Choose 1 of 3 Pokémon
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select one Pokémon to add to your competitive battle roster.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {myDraft.currentOptions.map((pokemon) => {
                const isSelected = selectedId === pokemon.id;
                return (
                  <div
                    key={pokemon.id}
                    className={`bg-surface border rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-xl relative overflow-hidden group ${
                      isSelected
                        ? 'border-red-500 ring-2 ring-red-500/50 scale-[1.02]'
                        : 'border-surface-border hover:border-slate-500 hover:-translate-y-1'
                    }`}
                  >
                    {/* BST Header & Category badges */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="text-[11px] font-mono text-slate-500">
                          #{String(pokemon.speciesId || pokemon.id).padStart(3, '0')}
                        </span>
                        {pokemon.categories?.mega && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 uppercase">
                            Mega
                          </span>
                        )}
                        {pokemon.categories?.regional && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                            Regional
                          </span>
                        )}
                        {pokemon.categories?.paradox && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase">
                            Paradox
                          </span>
                        )}
                        {pokemon.categories?.ultraBeast && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase">
                            UB
                          </span>
                        )}
                        {pokemon.categories?.legendary && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                            Legendary
                          </span>
                        )}
                        {pokemon.categories?.mythical && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                            Mythical
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-slate-300">
                        BST {pokemon.bst}
                      </span>
                    </div>

                    {/* Sprite Display */}
                    <div className="w-full h-36 flex items-center justify-center my-2 relative">
                      <img
                        src={pokemon.sprite.animated || pokemon.sprite.front || ''}
                        alt={pokemon.displayName}
                        onError={(e) => {
                          if (pokemon.sprite.front && e.currentTarget.src !== pokemon.sprite.front) {
                            e.currentTarget.src = pokemon.sprite.front;
                          }
                        }}
                        className="max-h-32 max-w-32 object-contain filter drop-shadow-lg transition-transform group-hover:scale-110 duration-200"
                      />
                    </div>

                    {/* Name & Types */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-black text-white tracking-wide uppercase">
                        {pokemon.displayName}
                      </h3>
                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        {pokemon.types.map((type) => (
                          <span
                            key={type}
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${
                              TYPE_COLORS[type]?.bg || 'bg-slate-800'
                            } ${TYPE_COLORS[type]?.text || 'text-slate-300'} ${
                              TYPE_COLORS[type]?.border || 'border-slate-700'
                            }`}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Compact Base Stats Bar Grid */}
                    <div className="bg-surface-elevated/70 rounded-xl p-3 border border-surface-border/60 text-[11px] space-y-1.5 mb-5 font-mono">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-slate-500 text-[10px]">HP:</span>{' '}
                          <span className="font-bold text-slate-200">{pokemon.baseStats.hp}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">ATK:</span>{' '}
                          <span className="font-bold text-slate-200">{pokemon.baseStats.atk}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">DEF:</span>{' '}
                          <span className="font-bold text-slate-200">{pokemon.baseStats.def}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">SPA:</span>{' '}
                          <span className="font-bold text-slate-200">{pokemon.baseStats.spa}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">SPD:</span>{' '}
                          <span className="font-bold text-slate-200">{pokemon.baseStats.spd}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">SPE:</span>{' '}
                          <span className="font-bold text-slate-200">{pokemon.baseStats.spe}</span>
                        </div>
                      </div>
                    </div>

                    {/* Select Action Button */}
                    <button
                      onClick={() => handleSelect(pokemon.id)}
                      disabled={selectedId !== null}
                      className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-lg ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50 hover:shadow-red-950/80 active:translate-y-0.5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSelected ? '✓ Selected' : 'Select Pokémon'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
