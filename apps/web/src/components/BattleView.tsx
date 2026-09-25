'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameSocket } from '../context/GameSocketContext';
import {
  type BattleAction,
  type PokemonType,
  exportTeamToShowdown,
} from '@showup/shared';

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

function getHPColor(percent: number): string {
  if (percent > 50) return 'bg-emerald-500';
  if (percent > 20) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getStatusBadge(status?: string) {
  if (!status) return null;
  const s = status.toUpperCase();
  const colors: Record<string, string> = {
    BRN: 'bg-red-600 text-white',
    PSN: 'bg-purple-600 text-white',
    TOX: 'bg-purple-700 text-white',
    PAR: 'bg-yellow-500 text-black',
    SLP: 'bg-slate-500 text-white',
    FRZ: 'bg-cyan-400 text-black',
  };
  return (
    <span
      className={`text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm ${
        colors[s] || 'bg-slate-700 text-white'
      }`}
    >
      {s}
    </span>
  );
}

export function BattleView() {
  const {
    room,
    player,
    submitBattleAction,
    forfeitBattle,
    rematchBattle,
    leaveRoom,
  } = useGameSocket();

  const [activeTab, setActiveTab] = useState<'fight' | 'switch'>('fight');
  const [teraSelected, setTeraSelected] = useState(false);
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  const battle = room?.battle;

  // Auto-scroll log when new entries arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battle?.log?.length]);

  if (!room || !player || !battle) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
        <div className="space-y-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">Connecting to battle simulator...</p>
        </div>
      </div>
    );
  }

  const mySide = battle.mySide;
  const oppSide = battle.opponentSide;
  const activePoke = mySide.activePokemon;
  const oppPoke = oppSide.activePokemon;

  const opponent = room.players.find((p) => p.id !== player.id);
  const isOpponentDisconnected = Boolean(opponent && !opponent.connected);

  const actions = battle.availableActions;
  const isTeamPreview = actions?.type === 'teampreview';
  const isForcedSwitch = actions?.type === 'switch';
  const canFight = actions?.type === 'move' && !battle.waitingForOpponent;
  const isFinished = battle.phase === 'finished';
  const isWinner = battle.winnerPlayerId === player.id;

  const handleMoveClick = (slot: number) => {
    submitBattleAction({
      type: 'move',
      moveSlot: slot,
      tera: teraSelected,
    });
    setTeraSelected(false);
  };

  const handleSwitchClick = (index: number) => {
    submitBattleAction({
      type: 'switch',
      pokemonIndex: index,
    });
  };

  const handleLeadClick = (index: number) => {
    submitBattleAction({
      type: 'team',
      pokemonIndex: index,
    });
  };

  const handleCopyShowdownTeam = async () => {
    if (!room.teamBuilding?.pokemon) return;
    const text = exportTeamToShowdown(room.teamBuilding.pokemon);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col space-y-5 animate-fade-in">
      {/* Disconnect Banner if Opponent Drops */}
      {isOpponentDisconnected && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between text-amber-300 text-xs font-bold shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="text-base">⚠️</span>
            <span>Opponent disconnected. Waiting for reconnection...</span>
          </div>
        </div>
      )}

      {/* Top Header: Battle ID, Turn Counter, Weather/Terrain, Forfeit */}
      <div className="flex items-center justify-between bg-surface border border-surface-border rounded-2xl px-6 py-3.5 shadow-xl">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-surface-elevated text-slate-400 border border-surface-border">
            {battle.battleId}
          </span>
          <div className="text-sm font-black uppercase text-white tracking-wider flex items-center space-x-2">
            <span>Turn {battle.turn}</span>
            {battle.field.weather && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                🌧️ {battle.field.weather}
              </span>
            )}
            {battle.field.terrain && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                ⚡ {battle.field.terrain}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {battle.opponentLockedIn && !battle.waitingForOpponent && (
            <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full animate-pulse">
              Opponent ready
            </span>
          )}

          {!isFinished && (
            <button
              onClick={() => setShowForfeitModal(true)}
              className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
            >
              Forfeit
            </button>
          )}
        </div>
      </div>

      {/* Main Battlefield Showcase */}
      <div className="relative w-full bg-gradient-to-b from-slate-900 via-surface to-background border border-surface-border rounded-3xl p-6 shadow-2xl overflow-hidden min-h-[400px] flex flex-col justify-between">
        {/* Opponent Showcase (Top Right) */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
          {/* Opponent Roster Balls & Hazards */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-1.5 bg-surface/80 backdrop-blur px-3 py-1.5 rounded-full border border-surface-border/60">
              <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">
                {oppSide.name}:
              </span>
              {oppSide.team.map((p, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    p.fainted
                      ? 'bg-slate-700 border-slate-600 opacity-30'
                      : p.active
                      ? 'bg-red-500 border-white scale-125 shadow-sm'
                      : 'bg-emerald-400 border-emerald-300'
                  }`}
                  title={`${p.displayName} (${p.hpPercent}%)`}
                />
              ))}
            </div>

            {/* Opponent Hazards */}
            {battle.field.sideHazards?.opponent && battle.field.sideHazards.opponent.length > 0 && (
              <div className="flex items-center space-x-1 px-2">
                {battle.field.sideHazards.opponent.map((h, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    ⚠️ {h}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Opponent Active Card */}
          {oppPoke && (
            <div className="bg-surface/90 backdrop-blur border border-surface-border/80 rounded-2xl p-4 shadow-xl flex items-center space-x-4 min-w-[300px]">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                      {oppPoke.displayName}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Lv.{oppPoke.level}
                    </span>
                  </div>
                  {getStatusBadge(oppPoke.status)}
                </div>

                {/* Opponent Types & Tera */}
                <div className="flex items-center gap-1.5">
                  {oppPoke.types.map((t) => {
                    const color = TYPE_COLORS[t];
                    return (
                      <span
                        key={t}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          color?.bg || 'bg-slate-800'
                        } ${color?.text || 'text-slate-300'} ${color?.border || 'border-slate-700'}`}
                      >
                        {t}
                      </span>
                    );
                  })}
                  {oppPoke.terastallized && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-yellow-300 border border-yellow-400/40">
                      💎 TERA
                    </span>
                  )}
                </div>

                {/* HP Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/60 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getHPColor(
                        oppPoke.hpPercent
                      )}`}
                      style={{ width: `${oppPoke.hpPercent}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-400 font-bold">
                    {oppPoke.hpPercent}%
                  </div>
                </div>

                {/* Opponent Boosts */}
                {oppPoke.boosts && Object.keys(oppPoke.boosts).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {Object.entries(oppPoke.boosts).map(([stat, val]) => (
                      <span
                        key={stat}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          val > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {val > 0 ? `+${val}` : val} {stat.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Opponent Sprite */}
              <div className="w-20 h-20 shrink-0 flex items-center justify-center bg-slate-800/40 rounded-xl p-1 border border-surface-border/40">
                <img
                  src={`https://play.pokemonshowdown.com/sprites/gen5/${oppPoke.species.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                  alt={oppPoke.displayName}
                  onError={(e) => {
                    e.currentTarget.src = oppPoke.spriteUrl;
                  }}
                  className="max-h-16 max-w-16 object-contain drop-shadow"
                />
              </div>
            </div>
          )}
        </div>

        {/* Center Field Accents */}
        <div className="my-2 flex justify-center">
          <div className="w-64 h-1 bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
        </div>

        {/* Player Active Showcase (Bottom Left) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Player Active Card */}
          {activePoke && (
            <div className="bg-surface/90 backdrop-blur border border-surface-border/80 rounded-2xl p-4 shadow-xl flex items-center space-x-4 min-w-[320px]">
              {/* Player Sprite */}
              <div className="w-24 h-24 shrink-0 flex items-center justify-center bg-slate-800/40 rounded-2xl p-1 border border-surface-border/40">
                <img
                  src={`https://play.pokemonshowdown.com/sprites/gen5/${activePoke.species.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                  alt={activePoke.displayName}
                  onError={(e) => {
                    e.currentTarget.src = activePoke.spriteUrl;
                  }}
                  className="max-h-20 max-w-20 object-contain drop-shadow"
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                      {activePoke.displayName}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Lv.{activePoke.level}
                    </span>
                  </div>
                  {getStatusBadge(activePoke.status)}
                </div>

                {/* Player Types & Tera */}
                <div className="flex items-center gap-1.5">
                  {activePoke.types.map((t) => {
                    const color = TYPE_COLORS[t];
                    return (
                      <span
                        key={t}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          color?.bg || 'bg-slate-800'
                        } ${color?.text || 'text-slate-300'} ${color?.border || 'border-slate-700'}`}
                      >
                        {t}
                      </span>
                    );
                  })}
                  {activePoke.teraType && !activePoke.terastallized && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-elevated text-slate-400 border border-surface-border">
                      Tera: {activePoke.teraType}
                    </span>
                  )}
                  {activePoke.terastallized && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-yellow-300 border border-yellow-400/40">
                      💎 TERA ACTIVE
                    </span>
                  )}
                </div>

                {/* HP Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/60 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getHPColor(
                        activePoke.hpPercent
                      )}`}
                      style={{ width: `${activePoke.hpPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 font-bold">
                    <span>HP</span>
                    <span>
                      {activePoke.hp} / {activePoke.maxHp} ({activePoke.hpPercent}%)
                    </span>
                  </div>
                </div>

                {/* Player Boosts */}
                {activePoke.boosts && Object.keys(activePoke.boosts).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {Object.entries(activePoke.boosts).map(([stat, val]) => (
                      <span
                        key={stat}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          val > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {val > 0 ? `+${val}` : val} {stat.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Player Roster Balls & Hazards */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-1.5 bg-surface/80 backdrop-blur px-3 py-1.5 rounded-full border border-surface-border/60">
              <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">
                You:
              </span>
              {mySide.team.map((p, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    p.fainted
                      ? 'bg-slate-700 border-slate-600 opacity-30'
                      : p.active
                      ? 'bg-red-500 border-white scale-125 shadow-sm'
                      : 'bg-emerald-400 border-emerald-300'
                  }`}
                  title={`${p.displayName} (${p.hpPercent}%)`}
                />
              ))}
            </div>

            {/* My Hazards */}
            {battle.field.sideHazards?.mine && battle.field.sideHazards.mine.length > 0 && (
              <div className="flex items-center space-x-1 px-2">
                {battle.field.sideHazards.mine.map((h, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    ⚠️ {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Deck & Battle Log Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Command Center (7 cols) */}
        <div className="lg:col-span-7 bg-surface border border-surface-border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          {/* 1. Team Preview Lead Selection */}
          {isTeamPreview && !battle.waitingForOpponent && (
            <div className="space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                <span className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center justify-center gap-1.5">
                  <span>⭐</span>
                  <span>Choose Your Lead Pokémon</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select which Pokémon to send out to start the battle.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mySide.team.map((pkmn, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLeadClick(idx)}
                    className="p-3.5 rounded-xl border border-surface-border hover:border-red-500 bg-surface-elevated hover:bg-slate-700/80 transition-all flex items-center space-x-3 text-left shadow-md group cursor-pointer"
                  >
                    <img
                      src={`https://play.pokemonshowdown.com/sprites/gen5/${pkmn.species.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                      alt={pkmn.displayName}
                      onError={(e) => (e.currentTarget.src = pkmn.spriteUrl)}
                      className="w-12 h-12 object-contain group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 truncate">
                      <div className="text-xs font-black text-white uppercase truncate group-hover:text-red-400 transition-colors">
                        {pkmn.displayName}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {pkmn.types.map((t) => {
                          const color = TYPE_COLORS[t];
                          return (
                            <span
                              key={t}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                color?.bg || 'bg-slate-800'
                              } ${color?.text || 'text-slate-300'} ${color?.border || 'border-slate-700'}`}
                            >
                              {t}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Forced Switch State */}
          {isForcedSwitch && (
            <div className="space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                <span className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center justify-center gap-1.5">
                  <span>💀</span>
                  <span>Active Pokémon Fainted! Select a replacement:</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mySide.team.map((pkmn, idx) => {
                  const isDisabled = pkmn.fainted || pkmn.active;
                  return (
                    <button
                      key={idx}
                      disabled={isDisabled}
                      onClick={() => handleSwitchClick(idx)}
                      className={`p-3 rounded-xl border flex items-center space-x-3 transition-all text-left ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed border-surface-border/40 bg-background/30'
                          : 'border-surface-border hover:border-red-500 bg-surface-elevated hover:bg-slate-700/80 cursor-pointer shadow-md'
                      }`}
                    >
                      <img
                        src={`https://play.pokemonshowdown.com/sprites/gen5/${pkmn.species.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                        alt={pkmn.displayName}
                        onError={(e) => (e.currentTarget.src = pkmn.spriteUrl)}
                        className="w-12 h-12 object-contain"
                      />
                      <div className="flex-1 truncate">
                        <div className="text-xs font-black text-white uppercase truncate">
                          {pkmn.displayName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 font-semibold mt-0.5">
                          {pkmn.fainted ? 'Fainted' : `${pkmn.hpPercent}% HP`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Normal Turn Options */}
          {!isTeamPreview && !isForcedSwitch && !battle.waitingForOpponent && canFight && (
            <div className="space-y-4">
              {/* Tab Selector: Fight vs Switch */}
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('fight')}
                    className={`px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'fight'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                        : 'bg-surface-elevated text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚔️ Fight
                  </button>
                  <button
                    onClick={() => setActiveTab('switch')}
                    className={`px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'switch'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                        : 'bg-surface-elevated text-slate-400 hover:text-white'
                    }`}
                  >
                    🔄 Switch
                  </button>
                </div>

                {/* Terastallize Toggle */}
                {actions?.canTerastallize && (
                  <button
                    onClick={() => setTeraSelected(!teraSelected)}
                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider border transition-all flex items-center gap-1.5 cursor-pointer ${
                      teraSelected
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-300 shadow-lg shadow-amber-950/60 animate-pulse'
                        : 'bg-surface-elevated text-yellow-400 border-yellow-400/40 hover:border-yellow-400'
                    }`}
                  >
                    <span>💎</span>
                    <span>{teraSelected ? 'Tera Selected!' : 'Terastallize'}</span>
                  </button>
                )}
              </div>

              {/* Fight Tab: 4 Moves */}
              {activeTab === 'fight' && actions?.moves && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {actions.moves.map((move) => {
                    const typeColor = TYPE_COLORS[move.type];
                    return (
                      <button
                        key={move.slot}
                        disabled={move.disabled}
                        onClick={() => handleMoveClick(move.slot)}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between text-left transition-all ${
                          move.disabled
                            ? 'opacity-40 cursor-not-allowed border-surface-border bg-background'
                            : 'border-surface-border/80 hover:border-red-500 bg-surface-elevated hover:bg-slate-700/80 shadow-md group cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="text-sm font-black text-white uppercase tracking-wider group-hover:text-red-400 transition-colors">
                            {move.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                              typeColor?.bg || 'bg-slate-800'
                            } ${typeColor?.text || 'text-slate-300'} ${
                              typeColor?.border || 'border-slate-700'
                            }`}
                          >
                            {move.type}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                          <span>
                            {move.basePower > 0 ? `${move.basePower} BP` : 'Status'} •{' '}
                            {move.accuracy === true ? '—' : `${move.accuracy}%`}
                          </span>
                          <span className="font-bold text-slate-300">
                            {move.pp}/{move.maxpp} PP
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Switch Tab: Bench Pokemon */}
              {activeTab === 'switch' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mySide.team.map((pkmn, idx) => {
                    const isDisabled = pkmn.fainted || pkmn.active;
                    return (
                      <button
                        key={idx}
                        disabled={isDisabled}
                        onClick={() => handleSwitchClick(idx)}
                        className={`p-3 rounded-xl border flex items-center space-x-3 transition-all text-left ${
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed border-surface-border/40 bg-background/30'
                            : 'border-surface-border hover:border-red-500 bg-surface-elevated hover:bg-slate-700/80 cursor-pointer shadow-md'
                        }`}
                      >
                        <img
                          src={`https://play.pokemonshowdown.com/sprites/gen5/${pkmn.species.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                          alt={pkmn.displayName}
                          onError={(e) => (e.currentTarget.src = pkmn.spriteUrl)}
                          className="w-12 h-12 object-contain"
                        />
                        <div className="flex-1 truncate">
                          <div className="text-xs font-black text-white uppercase truncate">
                            {pkmn.displayName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 font-semibold mt-0.5">
                            {pkmn.fainted
                              ? 'Fainted'
                              : pkmn.active
                              ? 'Active'
                              : `${pkmn.hpPercent}% HP`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Waiting for Opponent Banner */}
          {battle.waitingForOpponent && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-black uppercase text-white tracking-wider">
                {isTeamPreview ? 'Lead Pokémon Selected!' : 'Action Locked In!'}
              </div>
              <p className="text-xs text-slate-400 max-w-xs">
                Waiting for opponent to make their choice. Turn will resolve automatically...
              </p>
            </div>
          )}

          {/* Waiting State (No Request Yet) */}
          {!canFight && !isForcedSwitch && !isTeamPreview && !battle.waitingForOpponent && !isFinished && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm font-black uppercase text-slate-300 tracking-wider">
                Simulating turn...
              </div>
              <p className="text-xs text-slate-500">Processing battle events.</p>
            </div>
          )}
        </div>

        {/* Right Column: Live Battle Log (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-surface-border rounded-2xl p-5 shadow-xl flex flex-col h-[400px]">
          <div className="flex items-center justify-between border-b border-surface-border pb-2.5 mb-3 shrink-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>📜</span>
              <span>Battle Log</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              {battle.log.length} events
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs text-slate-300">
            {battle.log.length === 0 ? (
              <div className="text-slate-500 italic text-center py-10">
                Battle starting...
              </div>
            ) : (
              battle.log.map((entry) => (
                <div
                  key={entry.id}
                  className={`py-1 border-b border-surface-border/40 ${
                    entry.type === 'faint'
                      ? 'text-red-400 font-bold'
                      : entry.type === 'move'
                      ? 'text-white'
                      : entry.type === 'tera'
                      ? 'text-yellow-400 font-bold'
                      : entry.type === 'boost'
                      ? 'text-emerald-400'
                      : entry.type === 'status'
                      ? 'text-purple-400 font-semibold'
                      : entry.type === 'info'
                      ? 'text-slate-400 italic'
                      : 'text-slate-300'
                  }`}
                >
                  {entry.message}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Forfeit Confirmation Modal */}
      {showForfeitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              Forfeit Battle?
            </h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to forfeit? Your opponent will be awarded victory.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForfeitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForfeitModal(false);
                  forfeitBattle();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 cursor-pointer"
              >
                Confirm Forfeit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Battle Finished / Victory Modal */}
      {isFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-surface-border rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="space-y-2">
              <div
                className={`text-4xl sm:text-5xl font-black uppercase tracking-widest ${
                  isWinner ? 'text-emerald-400 drop-shadow' : 'text-red-500 drop-shadow'
                }`}
              >
                {isWinner ? '🏆 VICTORY!' : '💀 DEFEAT'}
              </div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">
                {battle.winnerName} won the battle!
              </p>
            </div>

            <div className="p-4 bg-surface-elevated border border-surface-border rounded-2xl space-y-2 text-xs text-slate-400">
              <div>Total Turns: {battle.turn}</div>
              <div>6v6 Singles Showdown Engine</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={rematchBattle}
                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950/60 transition-all transform active:scale-95 cursor-pointer"
              >
                ⚔️ Rematch
              </button>
              <button
                onClick={handleCopyShowdownTeam}
                className="px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-surface-elevated hover:bg-slate-700 text-slate-300 hover:text-white border border-surface-border transition-all cursor-pointer"
              >
                {copiedToast ? '✓ Copied!' : '📋 Copy Team'}
              </button>
              <button
                onClick={leaveRoom}
                className="px-5 py-3 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
