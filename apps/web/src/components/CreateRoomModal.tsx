'use client';

import React, { useState, useEffect } from 'react';
import type { DraftMode, PokemonPoolRules } from '@showup/shared';
import { DEFAULT_POOL_RULES, ALL_POKEMON_POOL_RULES } from '@showup/shared';
import { useGameSocket } from '../context/GameSocketContext';
import { getSavedPlayerName } from '../lib/playerId';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const { createRoom, isConnected } = useGameSocket();
  const [playerName, setPlayerName] = useState('');
  const [draftMode, setDraftMode] = useState<DraftMode>('independent');
  const [poolRules, setPoolRules] = useState<PokemonPoolRules>({ ...DEFAULT_POOL_RULES });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPlayerName(getSavedPlayerName());
      setPoolRules({ ...DEFAULT_POOL_RULES });
      setLocalError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed) {
      setLocalError('Please enter a Trainer name.');
      return;
    }
    if (trimmed.length > 18) {
      setLocalError('Trainer name must be at most 18 characters.');
      return;
    }

    // Verify at least one category is enabled
    const hasAnyCategory = Object.values(poolRules).some((val) => val === true);
    if (!hasAnyCategory) {
      setLocalError('Please select at least one Pokémon category for the pool.');
      return;
    }

    createRoom(trimmed, { draftMode, teamSize: 6, poolRules });
  };

  const toggleCategory = (key: keyof PokemonPoolRules) => {
    setPoolRules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setAllPokemon = () => {
    setPoolRules({ ...ALL_POKEMON_POOL_RULES });
  };

  const resetDefaults = () => {
    setPoolRules({ ...DEFAULT_POOL_RULES });
  };

  const isAllEnabled = Object.values(poolRules).every((v) => v === true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border bg-surface-elevated flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Create Battle Room
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
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
              placeholder="e.g. Red, Cynthia, Ash"
              maxLength={18}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Draft Pool Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDraftMode('independent')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  draftMode === 'independent'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-surface-border bg-surface-elevated/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">Independent</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Each trainer receives different random choices.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDraftMode('same-pool')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  draftMode === 'same-pool'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-surface-border bg-surface-elevated/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">Same Pool</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Both trainers see the same 3 options each pick.
                </div>
              </button>
            </div>
          </div>

          {/* Pokémon Pool Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pokémon Pool Rules
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={setAllPokemon}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                    isAllEnabled
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-surface-elevated border border-surface-border text-slate-300 hover:text-white hover:border-slate-500'
                  }`}
                >
                  ⚡ All Pokémon
                </button>
                <button
                  type="button"
                  onClick={resetDefaults}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Defaults
                </button>
              </div>
            </div>

            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3.5 space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Regular */}
                <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-surface/50 border border-surface-border/60 hover:border-slate-600 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={poolRules.includeRegular}
                    onChange={() => toggleCategory('includeRegular')}
                    className="w-4 h-4 rounded text-red-600 bg-background border-surface-border focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-200">Regular Pokémon</span>
                </label>

                {/* Legendaries */}
                <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-surface/50 border border-surface-border/60 hover:border-slate-600 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={poolRules.includeLegendaries}
                    onChange={() => toggleCategory('includeLegendaries')}
                    className="w-4 h-4 rounded text-red-600 bg-background border-surface-border focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-200">Legendaries</span>
                </label>

                {/* Mythicals */}
                <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-surface/50 border border-surface-border/60 hover:border-slate-600 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={poolRules.includeMythicals}
                    onChange={() => toggleCategory('includeMythicals')}
                    className="w-4 h-4 rounded text-red-600 bg-background border-surface-border focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-200">Mythicals</span>
                </label>

                {/* Mega Evolutions */}
                <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-surface/50 border border-surface-border/60 hover:border-slate-600 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={poolRules.includeMegas}
                    onChange={() => toggleCategory('includeMegas')}
                    className="w-4 h-4 rounded text-red-600 bg-background border-surface-border focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-200">Mega Evolutions</span>
                </label>

                {/* Regional Forms */}
                <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-surface/50 border border-surface-border/60 hover:border-slate-600 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={poolRules.includeRegionalForms}
                    onChange={() => toggleCategory('includeRegionalForms')}
                    className="w-4 h-4 rounded text-red-600 bg-background border-surface-border focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-200">Regional Forms</span>
                </label>

                {/* Alternate Forms */}
                <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-surface/50 border border-surface-border/60 hover:border-slate-600 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={poolRules.includeAlternateForms}
                    onChange={() => toggleCategory('includeAlternateForms')}
                    className="w-4 h-4 rounded text-red-600 bg-background border-surface-border focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-200">Alternate Forms</span>
                </label>

                {/* Paradox Pokémon */}
                <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-surface/50 border border-surface-border/60 hover:border-slate-600 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={poolRules.includeParadox}
                    onChange={() => toggleCategory('includeParadox')}
                    className="w-4 h-4 rounded text-red-600 bg-background border-surface-border focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-200">Paradox Pokémon</span>
                </label>

                {/* Ultra Beasts */}
                <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-surface/50 border border-surface-border/60 hover:border-slate-600 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={poolRules.includeUltraBeasts}
                    onChange={() => toggleCategory('includeUltraBeasts')}
                    className="w-4 h-4 rounded text-red-600 bg-background border-surface-border focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-200">Ultra Beasts</span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 shrink-0">
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
              className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-950/50"
            >
              Generate Battle Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
