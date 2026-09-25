'use client';

import React, { useState } from 'react';
import {
  exportTeamToShowdown,
  type StatSpread,
  type PokemonBuild,
} from '@showup/shared';
import { useGameSocket } from '../context/GameSocketContext';

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Normal: { bg: 'bg-stone-500/20', text: 'text-stone-300', border: 'border-stone-500/40' },
  Fire: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  Water: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  Grass: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  Electric: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  Ice: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  Fighting: { bg: 'bg-orange-700/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  Poison: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  Ground: { bg: 'bg-amber-600/20', text: 'text-amber-400', border: 'border-amber-600/40' },
  Flying: { bg: 'bg-indigo-400/20', text: 'text-indigo-300', border: 'border-indigo-400/40' },
  Psychic: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/40' },
  Bug: { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/40' },
  Rock: { bg: 'bg-yellow-700/20', text: 'text-yellow-500', border: 'border-yellow-700/40' },
  Ghost: { bg: 'bg-violet-700/20', text: 'text-violet-400', border: 'border-violet-600/40' },
  Dragon: { bg: 'bg-indigo-600/20', text: 'text-indigo-400', border: 'border-indigo-500/40' },
  Steel: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400/40' },
  Dark: { bg: 'bg-neutral-800', text: 'text-neutral-300', border: 'border-neutral-600' },
  Fairy: { bg: 'bg-pink-400/20', text: 'text-pink-300', border: 'border-pink-400/40' },
  Stellar: { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/40' },
};

function formatEVSpread(evs: StatSpread): string {
  const parts: string[] = [];
  if (evs.hp) parts.push(`${evs.hp} HP`);
  if (evs.atk) parts.push(`${evs.atk} Atk`);
  if (evs.def) parts.push(`${evs.def} Def`);
  if (evs.spa) parts.push(`${evs.spa} SpA`);
  if (evs.spd) parts.push(`${evs.spd} SpD`);
  if (evs.spe) parts.push(`${evs.spe} Spe`);
  return parts.length > 0 ? parts.join(' / ') : 'None';
}

function formatNonStandardIVs(ivs: StatSpread): string | null {
  const special: string[] = [];
  if (ivs.hp !== 31) special.push(`${ivs.hp} HP`);
  if (ivs.atk !== 31) special.push(`${ivs.atk} Atk`);
  if (ivs.def !== 31) special.push(`${ivs.def} Def`);
  if (ivs.spa !== 31) special.push(`${ivs.spa} SpA`);
  if (ivs.spd !== 31) special.push(`${ivs.spd} SpD`);
  if (ivs.spe !== 31) special.push(`${ivs.spe} Spe`);
  return special.length > 0 ? `IVs: ${special.join(' / ')}` : null;
}

export function TeamRevealView() {
  const { room, player } = useGameSocket();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [exportModalContent, setExportModalContent] = useState<{ title: string; text: string } | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  if (!room || !player) return null;

  const revealed = room.revealedTeams || {};
  const playerIds = room.players.map((p) => p.id);
  const opponentId = playerIds.find((id) => id !== player.id);

  // Default active tab to current player if not selected
  const activeTabId = selectedPlayerId || player.id;
  const activeTeamData = revealed[activeTabId];

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      // Fallback
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col space-y-8 animate-fade-in">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface border border-surface-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 text-center md:text-left z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Phase 3 Complete • Ready For Battle</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-wide">
            Team Reveal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Both trainers have built and locked their competitive battle rosters. Inspect your opponent's sets, export Showdown teams, or await Phase 4 battle engine integration.
          </p>
        </div>

        {/* Global Export Options */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          {revealed[player.id] && (
            <button
              onClick={() => {
                const text = exportTeamToShowdown(revealed[player.id].team);
                setExportModalContent({
                  title: `Your Showdown Team (${player.name})`,
                  text,
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-slate-700 border border-surface-border text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5"
            >
              <span>📋</span>
              <span>Export My Team</span>
            </button>
          )}

          {opponentId && revealed[opponentId] && (
            <button
              onClick={() => {
                const opponentName = room.players.find((p) => p.id === opponentId)?.name || 'Opponent';
                const text = exportTeamToShowdown(revealed[opponentId].team);
                setExportModalContent({
                  title: `${opponentName}'s Showdown Team`,
                  text,
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-slate-700 border border-surface-border text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5"
            >
              <span>📋</span>
              <span>Export Opponent</span>
            </button>
          )}
        </div>
      </div>

      {/* Player Tabs */}
      <div className="flex border-b border-surface-border gap-2">
        {room.players.map((p) => {
          const isMe = p.id === player.id;
          const isActive = p.id === activeTabId;
          const teamCount = revealed[p.id]?.team?.length || 0;

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlayerId(p.id)}
              className={`px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-t-xl transition-all border-t border-x ${
                isActive
                  ? 'bg-surface border-surface-border text-white border-b-transparent shadow-lg'
                  : 'bg-surface-elevated/40 border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{p.name} {isMe && '(You)'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {teamCount} Pokémon
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Roster Grid */}
      {activeTeamData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeTeamData.team.map((pkmn: PokemonBuild, idx: number) => {
            const teraColor = pkmn.teraType ? TYPE_COLORS[pkmn.teraType] : undefined;
            const nonStandardIVs = formatNonStandardIVs(pkmn.ivs);

            return (
              <div
                key={pkmn.id || `${pkmn.speciesId}-${idx}`}
                className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-600 transition-all group"
              >
                {/* Header: Name, Item, Sprite */}
                <div className="flex items-start justify-between border-b border-surface-border/60 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        #{idx + 1}
                      </span>
                      <h3 className="text-base font-black text-white uppercase tracking-wider group-hover:text-red-400 transition-colors">
                        {pkmn.displayName}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                      <span>Lv. {pkmn.level || 100}</span>
                      <span>•</span>
                      <span className="text-yellow-400 font-semibold">
                        {pkmn.item || 'No Item'}
                      </span>
                    </div>

                    {pkmn.teraType && (
                      <div className="flex items-center space-x-1.5 pt-1">
                        <span className="text-[10px] uppercase font-mono text-slate-400">Tera:</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                            teraColor?.bg || 'bg-slate-800'
                          } ${teraColor?.text || 'text-slate-200'} ${teraColor?.border || 'border-slate-700'}`}
                        >
                          {pkmn.teraType}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-surface-elevated/40 rounded-xl p-1 border border-surface-border/50">
                    <img
                      src={`https://play.pokemonshowdown.com/sprites/gen5/${pkmn.showdownId}.png`}
                      alt={pkmn.displayName}
                      onError={(e) => {
                        e.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmn.speciesId}.png`;
                      }}
                      className="max-h-14 max-w-14 object-contain drop-shadow"
                    />
                  </div>
                </div>

                {/* Ability & Nature */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-surface-elevated/60 p-2.5 rounded-xl border border-surface-border/40">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-500">Ability</div>
                    <div className="font-bold text-slate-200 truncate">{pkmn.ability || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-500">Nature</div>
                    <div className="font-bold text-slate-200 truncate">{pkmn.nature || 'Hardy'}</div>
                  </div>
                </div>

                {/* 4 Moves */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-mono text-slate-500 font-bold tracking-wider">
                    Moves
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {pkmn.moves.map((move, mIdx) => (
                      <div
                        key={mIdx}
                        className="px-2.5 py-1.5 bg-surface-elevated/40 border border-surface-border/60 rounded-lg text-xs font-semibold text-slate-200 truncate"
                      >
                        {move || <span className="text-slate-600 italic">—</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* EVs and IVs */}
                <div className="text-[11px] font-mono text-slate-400 bg-background/50 p-2.5 rounded-xl border border-surface-border/40 space-y-1">
                  <div>
                    <span className="text-slate-500 uppercase font-semibold">EVs: </span>
                    <span className="text-slate-300">{formatEVSpread(pkmn.evs)}</span>
                  </div>
                  {nonStandardIVs && (
                    <div>
                      <span className="text-slate-500 uppercase font-semibold">IVs: </span>
                      <span className="text-amber-400/90">{nonStandardIVs}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phase 4 Waiting Banner */}
      <div className="w-full bg-surface-elevated/70 border border-surface-border rounded-2xl p-6 text-center space-y-3 shadow-xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
          <span>Upcoming: Phase 4</span>
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider">
          Multiplayer Battle Engine Integration
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Both trainers' teams have passed authoritative server validation and are completely prepared. Showdown battle simulation, active turn choices, switching, and damage calculations will unlock in Phase 4.
        </p>
      </div>

      {/* Export Modal */}
      {exportModalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-surface-border bg-surface-elevated flex items-center justify-between shrink-0">
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>📋</span>
                <span>{exportModalContent.title}</span>
              </h3>
              <button
                onClick={() => setExportModalContent(null)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-xs text-slate-400">
                You can import this team into Pokémon Showdown Teambuilder:
              </p>
              <textarea
                readOnly
                rows={16}
                value={exportModalContent.text}
                className="w-full p-4 bg-background border border-surface-border rounded-xl text-white font-mono text-xs focus:outline-none resize-none selection:bg-red-500/30"
              />
            </div>

            <div className="px-6 py-4 border-t border-surface-border bg-surface-elevated flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-emerald-400">
                {copiedToast ? '✓ Copied to clipboard!' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExportModalContent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(exportModalContent.text)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 transition-all"
                >
                  Copy Showdown Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
