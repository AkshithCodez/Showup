'use client';

import React, { useState } from 'react';
import {
  type StatSpread,
  type PokemonType,
  NATURES_LIST,
  TERA_TYPES,
  POPULAR_ITEMS,
  EV_PRESETS,
  exportTeamToShowdown,
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

const STAT_LABELS: Record<keyof StatSpread, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
};

export function TeamBuilderView() {
  const { room, player, updatePokemonBuild, setTeamReady, error } = useGameSocket();

  const [activeIdx, setActiveIdx] = useState(0);
  const [moveModalSlot, setMoveModalSlot] = useState<number | null>(null);
  const [moveSearchQuery, setMoveSearchQuery] = useState('');
  const [moveCategoryFilter, setMoveCategoryFilter] = useState<'All' | 'Physical' | 'Special' | 'Status'>('All');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  if (!room || !player || !room.teamBuilding) return null;

  const tb = room.teamBuilding;
  const pokemonList = tb.pokemon || [];
  const optionsList = tb.options || [];

  const activePokemon = pokemonList[activeIdx] || pokemonList[0];
  const activeOptions = optionsList[activeIdx] || { abilities: [], moves: [] };

  if (!activePokemon) return null;

  const opponent = room.players.find((p) => p.id !== player.id);

  // Check completion for each pokemon
  const isPokemonComplete = (b: typeof activePokemon) => {
    const hasAbility = Boolean(b.ability?.trim());
    const validMoves = (b.moves || []).filter((m) => Boolean(m?.trim()));
    const has4Moves = validMoves.length === 4;
    const hasNature = Boolean(b.nature?.trim());
    const hasTera = Boolean(b.teraType);
    return hasAbility && has4Moves && hasNature && hasTera;
  };

  const totalComplete = pokemonList.filter(isPokemonComplete).length;
  const isAllComplete = totalComplete === 6 && pokemonList.length === 6;

  // EVs
  const totalEVs = (['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as (keyof StatSpread)[]).reduce(
    (sum, k) => sum + (activePokemon.evs[k] || 0),
    0
  );

  const handleEVChange = (stat: keyof StatSpread, val: number) => {
    const clamped = Math.max(0, Math.min(252, isNaN(val) ? 0 : val));
    const newEVs = { ...activePokemon.evs, [stat]: clamped };
    const newSum = (['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as (keyof StatSpread)[]).reduce(
      (sum, k) => sum + (newEVs[k] || 0),
      0
    );
    if (newSum <= 510) {
      updatePokemonBuild(activeIdx, { evs: newEVs });
    }
  };

  const handleIVChange = (stat: keyof StatSpread, val: number) => {
    const clamped = Math.max(0, Math.min(31, isNaN(val) ? 0 : val));
    updatePokemonBuild(activeIdx, { ivs: { ...activePokemon.ivs, [stat]: clamped } });
  };

  const applyEVPreset = (preset: (typeof EV_PRESETS)[number]) => {
    updatePokemonBuild(activeIdx, { evs: { ...preset.evs } });
  };

  const setAllIVs = (val: number) => {
    updatePokemonBuild(activeIdx, {
      ivs: { hp: val, atk: val, def: val, spa: val, spd: val, spe: val },
    });
  };

  const handleSelectMove = (moveName: string) => {
    if (moveModalSlot === null) return;
    const currentMoves = [...(activePokemon.moves || [])];
    currentMoves[moveModalSlot] = moveName;
    updatePokemonBuild(activeIdx, { moves: currentMoves });
    setMoveModalSlot(null);
    setMoveSearchQuery('');
  };

  const handleRemoveMove = (slotIdx: number) => {
    const currentMoves = [...(activePokemon.moves || [])];
    currentMoves.splice(slotIdx, 1);
    updatePokemonBuild(activeIdx, { moves: currentMoves });
  };

  const copyShowdownExport = () => {
    const text = exportTeamToShowdown(pokemonList);
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  // Filter moves in move modal
  const filteredMoves = (activeOptions.moves || []).filter((m) => {
    const matchesSearch =
      m.displayName.toLowerCase().includes(moveSearchQuery.toLowerCase()) ||
      m.type.toLowerCase().includes(moveSearchQuery.toLowerCase());
    const matchesCat =
      moveCategoryFilter === 'All' || m.category === moveCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Filter items
  const filteredItems = POPULAR_ITEMS.filter((i) =>
    i.displayName.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 flex-1 flex flex-col space-y-6">
      {/* Top Banner / Navigation Bar */}
      <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-xl font-black uppercase text-white tracking-wider">
              Competitive Set Builder
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated text-slate-400 font-mono border border-surface-border">
              Phase 3
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure abilities, moves, items, EVs, IVs, and Tera types for your 6 drafted Pokémon.
          </p>
        </div>

        {/* Global Progress & Actions */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Progress Counters */}
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Your Team: <span className={totalComplete === 6 ? 'text-emerald-400' : 'text-amber-400'}>{totalComplete} / 6 Complete</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Opponent ({opponent?.name || 'Trainer'}): {tb.opponent.completedCount} / 6 {tb.opponent.ready && '• Ready!'}
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-surface-elevated border border-surface-border hover:border-slate-500 text-slate-200 hover:text-white transition-all shadow-md flex items-center gap-1.5"
          >
            <span>📋</span>
            <span>Export Showdown</span>
          </button>

          {/* Lock In / Ready Button */}
          <button
            onClick={setTeamReady}
            disabled={!isAllComplete || tb.isReady}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
              tb.isReady
                ? 'bg-emerald-600 text-white cursor-default'
                : isAllComplete
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50 active:translate-y-0.5'
                : 'bg-surface-elevated text-slate-500 border border-surface-border cursor-not-allowed'
            }`}
          >
            {tb.isReady ? '✓ Locked In — Awaiting Opponent' : 'Ready For Battle →'}
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* 6-Pokemon Selector Tray */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {pokemonList.map((pkmn, idx) => {
          const isSelected = idx === activeIdx;
          const complete = isPokemonComplete(pkmn);

          return (
            <button
              key={`${pkmn.id}-${idx}`}
              onClick={() => setActiveIdx(idx)}
              className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col items-center group ${
                isSelected
                  ? 'bg-surface border-red-500 shadow-lg ring-2 ring-red-500/30 -translate-y-0.5'
                  : 'bg-surface/60 border-surface-border hover:border-slate-600 hover:bg-surface'
              }`}
            >
              {/* Status indicator badge */}
              <div className="w-full flex items-center justify-between text-[10px] font-mono mb-1">
                <span className="text-slate-500">Slot {idx + 1}</span>
                <span
                  className={`font-black ${
                    complete ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {complete ? '✓ Complete' : '● In Progress'}
                </span>
              </div>

              {/* Sprite preview */}
              <div className="w-14 h-14 flex items-center justify-center my-1">
                <img
                  src={`https://play.pokemonshowdown.com/sprites/ani/${pkmn.showdownId}.gif`}
                  onError={(e) => {
                    e.currentTarget.src = `https://play.pokemonshowdown.com/sprites/dex/${pkmn.showdownId}.png`;
                  }}
                  alt={pkmn.displayName}
                  className="max-h-14 max-w-14 object-contain filter drop-shadow group-hover:scale-110 transition-transform"
                />
              </div>

              {/* Name */}
              <div className="text-xs font-bold text-white uppercase tracking-wider truncate w-full text-center mt-1">
                {pkmn.displayName}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Pokémon Configuration Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pokémon Hero Card & Core Setup (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-surface-border rounded-2xl p-6 shadow-xl space-y-5">
          {/* Header Card */}
          <div className="flex items-center space-x-4 border-b border-surface-border pb-5">
            <div className="w-24 h-24 bg-surface-elevated/70 border border-surface-border rounded-2xl p-2 flex items-center justify-center relative shadow-inner">
              <img
                src={`https://play.pokemonshowdown.com/sprites/ani/${activePokemon.showdownId}.gif`}
                onError={(e) => {
                  e.currentTarget.src = `https://play.pokemonshowdown.com/sprites/dex/${activePokemon.showdownId}.png`;
                }}
                alt={activePokemon.displayName}
                className="max-h-20 max-w-20 object-contain filter drop-shadow-md"
              />
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
                National Dex #{String(activePokemon.speciesId).padStart(3, '0')}
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                {activePokemon.displayName}
              </h2>
              {/* Tera selection badge */}
              <div className="flex items-center space-x-2 mt-1.5">
                <span className="text-[11px] font-semibold text-slate-400">Tera Type:</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md border uppercase ${
                    TYPE_COLORS[activePokemon.teraType || 'Normal']?.bg
                  } ${TYPE_COLORS[activePokemon.teraType || 'Normal']?.text} ${
                    TYPE_COLORS[activePokemon.teraType || 'Normal']?.border
                  }`}
                >
                  {activePokemon.teraType || 'Normal'}
                </span>
              </div>
            </div>
          </div>

          {/* Ability Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Ability
            </label>
            <select
              value={activePokemon.ability}
              onChange={(e) => updatePokemonBuild(activeIdx, { ability: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-xl text-white focus:outline-none focus:border-red-500 text-sm font-semibold transition-colors cursor-pointer"
            >
              {activeOptions.abilities.map((ab) => (
                <option key={ab.id} value={ab.displayName} className="bg-surface text-white">
                  {ab.displayName} {ab.isSlot === 'H' ? '(Hidden)' : ''} — {ab.shortDesc}
                </option>
              ))}
            </select>
          </div>

          {/* Held Item Selector with Search */}
          <div className="relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Held Item
            </label>
            <div className="relative">
              <input
                type="text"
                value={activePokemon.item}
                placeholder="Search or enter held item (e.g. Life Orb, Leftovers)"
                onFocus={() => setIsItemDropdownOpen(true)}
                onChange={(e) => {
                  updatePokemonBuild(activeIdx, { item: e.target.value });
                  setItemSearchQuery(e.target.value);
                  setIsItemDropdownOpen(true);
                }}
                className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm font-semibold transition-colors"
              />
              {activePokemon.item && (
                <button
                  type="button"
                  onClick={() => updatePokemonBuild(activeIdx, { item: '' })}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Item Autocomplete List */}
            {isItemDropdownOpen && (
              <div
                className="absolute z-30 left-0 right-0 mt-1 max-h-56 bg-surface border border-surface-border rounded-xl shadow-2xl overflow-y-auto divide-y divide-surface-border"
                onMouseLeave={() => setIsItemDropdownOpen(false)}
              >
                {filteredItems.slice(0, 15).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      updatePokemonBuild(activeIdx, { item: item.displayName });
                      setIsItemDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-surface-elevated transition-colors flex flex-col"
                  >
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {item.displayName}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      {item.shortDesc}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nature Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Nature
            </label>
            <select
              value={activePokemon.nature}
              onChange={(e) => updatePokemonBuild(activeIdx, { nature: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-xl text-white focus:outline-none focus:border-red-500 text-sm font-semibold transition-colors cursor-pointer"
            >
              {NATURES_LIST.map((nat) => (
                <option key={nat.id} value={nat.displayName} className="bg-surface text-white">
                  {nat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tera Type Selection Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Tera Type
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {TERA_TYPES.map((t) => {
                const isSelected = activePokemon.teraType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updatePokemonBuild(activeIdx, { teraType: t })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all text-center ${
                      isSelected
                        ? `${TYPE_COLORS[t]?.bg} ${TYPE_COLORS[t]?.text} ${TYPE_COLORS[t]?.border} ring-2 ring-red-500`
                        : 'bg-surface-elevated border-surface-border text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Moves, EVs & IVs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Moves Stage */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Move Set (4 Required)
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {(activePokemon.moves || []).filter(Boolean).length} / 4 Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((slotIdx) => {
                const moveName = activePokemon.moves?.[slotIdx];
                const moveDetail = (activeOptions.moves || []).find(
                  (m) => m.displayName.toLowerCase() === moveName?.toLowerCase()
                );

                return (
                  <div
                    key={slotIdx}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[92px] transition-all relative ${
                      moveName
                        ? 'bg-surface-elevated border-surface-border'
                        : 'bg-surface-elevated/40 border-dashed border-surface-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                      <span>Slot {slotIdx + 1}</span>
                      {moveName && (
                        <button
                          onClick={() => handleRemoveMove(slotIdx)}
                          className="text-slate-400 hover:text-red-400 text-xs px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {moveName ? (
                      <div>
                        <div className="text-sm font-black text-white uppercase tracking-wider">
                          {moveName}
                        </div>
                        {moveDetail && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                TYPE_COLORS[moveDetail.type]?.bg
                              } ${TYPE_COLORS[moveDetail.type]?.text} ${
                                TYPE_COLORS[moveDetail.type]?.border
                              }`}
                            >
                              {moveDetail.type}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {moveDetail.category} • {moveDetail.basePower > 0 ? `${moveDetail.basePower} BP` : 'Status'} • {moveDetail.accuracy === true ? '—' : `${moveDetail.accuracy}%`}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setMoveModalSlot(slotIdx);
                          setMoveSearchQuery('');
                        }}
                        className="w-full py-2.5 text-center text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-surface/50 border border-surface-border rounded-lg hover:border-slate-500 transition-colors"
                      >
                        + Choose Move
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Effort Values (EVs) Stage */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Effort Values (EVs)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Max 252 per stat, 510 total pool.
                </span>
              </div>
              <div
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                  totalEVs <= 508
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : totalEVs <= 510
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                Total: {totalEVs} / 510
              </div>
            </div>

            {/* Quick EV Presets */}
            <div className="flex flex-wrap gap-1.5 pb-2">
              {EV_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyEVPreset(preset)}
                  className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-surface-border hover:border-slate-500 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Stat Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              {(['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as (keyof StatSpread)[]).map((stat) => {
                const val = activePokemon.evs[stat] || 0;
                return (
                  <div
                    key={stat}
                    className="p-2.5 rounded-xl bg-surface-elevated/60 border border-surface-border/70 flex items-center justify-between gap-3"
                  >
                    <span className="font-bold text-slate-300 w-8">{STAT_LABELS[stat]}:</span>
                    <input
                      type="range"
                      min={0}
                      max={252}
                      step={4}
                      value={val}
                      onChange={(e) => handleEVChange(stat, parseInt(e.target.value, 10))}
                      className="flex-1 accent-red-500 h-1.5 bg-background rounded cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={252}
                      value={val}
                      onChange={(e) => handleEVChange(stat, parseInt(e.target.value, 10))}
                      className="w-14 px-1.5 py-1 bg-background border border-surface-border rounded text-center text-xs text-white font-bold"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Values (IVs) Stage */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Individual Values (IVs)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Range 0 to 31. Standard default is all 31.
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAllIVs(31)}
                  className="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border hover:border-slate-500 text-[10px] font-bold text-slate-300"
                >
                  All 31
                </button>
                <button
                  type="button"
                  onClick={() => handleIVChange('atk', 0)}
                  className="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border hover:border-slate-500 text-[10px] font-bold text-slate-300"
                >
                  0 Atk
                </button>
                <button
                  type="button"
                  onClick={() => handleIVChange('spe', 0)}
                  className="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border hover:border-slate-500 text-[10px] font-bold text-slate-300"
                >
                  0 Spe
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs font-mono">
              {(['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as (keyof StatSpread)[]).map((stat) => {
                const val = activePokemon.ivs[stat] ?? 31;
                return (
                  <div
                    key={stat}
                    className="p-2 rounded-xl bg-surface-elevated/60 border border-surface-border/70 flex flex-col items-center justify-center text-center"
                  >
                    <span className="font-bold text-slate-400 text-[10px] mb-1">{STAT_LABELS[stat]}</span>
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={val}
                      onChange={(e) => handleIVChange(stat, parseInt(e.target.value, 10))}
                      className="w-full py-1 bg-background border border-surface-border rounded text-center text-xs text-white font-bold"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Move Selection Modal */}
      {moveModalSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-surface-border bg-surface-elevated flex items-center justify-between shrink-0">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Select Move (Slot {moveModalSlot + 1})
              </h3>
              <button
                onClick={() => setMoveModalSlot(null)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-surface-border bg-surface-elevated/50 space-y-3 shrink-0">
              <input
                type="text"
                autoFocus
                placeholder="Search by move name or type (e.g. Earthquake, Fire, Dragon)..."
                value={moveSearchQuery}
                onChange={(e) => setMoveSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm font-semibold"
              />

              <div className="flex gap-2">
                {(['All', 'Physical', 'Special', 'Status'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMoveCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                      moveCategoryFilter === cat
                        ? 'bg-red-600 text-white'
                        : 'bg-surface border border-surface-border text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Move List */}
            <div className="p-4 overflow-y-auto divide-y divide-surface-border/50 flex-1 space-y-1">
              {filteredMoves.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                  No moves match your search query.
                </div>
              ) : (
                filteredMoves.map((m) => {
                  const alreadyUsed = (activePokemon.moves || []).includes(m.displayName);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={alreadyUsed}
                      onClick={() => handleSelectMove(m.displayName)}
                      className={`w-full py-2.5 px-3 rounded-xl text-left transition-colors flex items-center justify-between ${
                        alreadyUsed
                          ? 'opacity-40 cursor-not-allowed bg-transparent'
                          : 'hover:bg-surface-elevated cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white uppercase tracking-wider">
                            {m.displayName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                              TYPE_COLORS[m.type]?.bg
                            } ${TYPE_COLORS[m.type]?.text} ${
                              TYPE_COLORS[m.type]?.border
                            }`}
                          >
                            {m.type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {m.category}
                          </span>
                        </div>
                        {m.shortDesc && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {m.shortDesc}
                          </div>
                        )}
                      </div>

                      <div className="text-right text-xs font-mono font-bold text-slate-300 pl-4 shrink-0">
                        {m.basePower > 0 ? `${m.basePower} BP` : 'Status'} • {m.accuracy === true ? '—' : `${m.accuracy}%`}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Showdown Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-surface-border bg-surface-elevated flex items-center justify-between shrink-0">
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>📋</span>
                <span>Export Team to Pokémon Showdown</span>
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-xs text-slate-400">
                Paste this text directly into Pokémon Showdown's Teambuilder (Import from text):
              </p>
              <textarea
                readOnly
                rows={16}
                value={exportTeamToShowdown(pokemonList)}
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
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={copyShowdownExport}
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
