import { Dex } from '@pkmn/dex';
import type {
  PokemonSummary,
  PokemonBuild,
  MoveSummary,
  AbilitySummary,
  ItemSummary,
  NatureSummary,
  PokemonType,
  SetBuilderRules,
} from '@showup/shared';
import {
  NATURES_LIST,
  TERA_TYPES,
  POPULAR_ITEMS,
} from '@showup/shared';

export class PokemonSetDataService {
  private learnsetCache = new Map<string, MoveSummary[]>();
  private globalMovesCache: MoveSummary[] | null = null;
  private globalAbilitiesCache: AbilitySummary[] | null = null;

  /**
   * Retrieves legal or chaos abilities for a Pokemon.
   */
  public getAbilitiesForPokemon(
    pokemon: PokemonSummary,
    abilityMode: 'legal' | 'random-global' = 'legal'
  ): AbilitySummary[] {
    if (abilityMode === 'random-global') {
      return this.getGlobalAbilities();
    }

    const species =
      Dex.species.get(pokemon.displayName) ||
      Dex.species.get(pokemon.name) ||
      Dex.species.get(pokemon.speciesName);

    if (!species || !species.exists || !species.abilities) {
      return [
        {
          id: 'none',
          displayName: 'No Ability',
          shortDesc: 'No standard ability found.',
        },
      ];
    }

    const results: AbilitySummary[] = [];
    const seen = new Set<string>();

    const slots: ('0' | '1' | 'H')[] = ['0', '1', 'H'];
    for (const slot of slots) {
      const abilityName = species.abilities[slot];
      if (abilityName && !seen.has(abilityName.toLowerCase())) {
        seen.add(abilityName.toLowerCase());
        const abData = Dex.abilities.get(abilityName);
        results.push({
          id: abData.id,
          displayName: abData.name,
          shortDesc: abData.shortDesc || abData.desc || '',
          isSlot: slot,
        });
      }
    }

    return results;
  }

  /**
   * Retrieves all learnable moves for a Pokemon (resolving prevo and base species).
   */
  public async getMovesForPokemon(
    pokemon: PokemonSummary,
    moveMode: 'legal' | 'random-global' = 'legal'
  ): Promise<MoveSummary[]> {
    if (moveMode === 'random-global') {
      return this.getGlobalMoves();
    }

    const cacheKey = (pokemon.name || pokemon.displayName).toLowerCase();
    if (this.learnsetCache.has(cacheKey)) {
      return this.learnsetCache.get(cacheKey)!;
    }

    const moveIds = new Set<string>();
    const visited = new Set<string>();

    const collectMoves = async (speciesIdentifier: string) => {
      const s = Dex.species.get(speciesIdentifier);
      if (!s || !s.exists) return;
      if (visited.has(s.id)) return;
      visited.add(s.id);

      // Direct learnset
      const ls = await Dex.learnsets.get(s.id);
      if (ls?.learnset) {
        for (const m of Object.keys(ls.learnset)) {
          moveIds.add(m);
        }
      }

      // Pre-evolution
      if (s.prevo) {
        await collectMoves(s.prevo);
      }
      // Base species (e.g. Rotom-Wash -> Rotom, Megas -> base)
      if (s.baseSpecies && s.baseSpecies !== s.name) {
        await collectMoves(s.baseSpecies);
      }
      if (s.changesFrom && s.changesFrom !== s.name) {
        await collectMoves(s.changesFrom);
      }
    };

    await collectMoves(pokemon.displayName);

    const summaries: MoveSummary[] = [];
    for (const moveId of moveIds) {
      const move = Dex.moves.get(moveId);
      if (!move || !move.exists) continue;
      // Filter out nonstandard, Z-moves, Max-moves
      if (move.isZ || move.isMax) continue;
      if (move.isNonstandard && move.isNonstandard !== 'Past') continue;

      summaries.push({
        id: move.id,
        displayName: move.name,
        type: move.type as PokemonType,
        category: (move.category as 'Physical' | 'Special' | 'Status') || 'Status',
        basePower: move.basePower || 0,
        accuracy: move.accuracy === true ? true : (move.accuracy || 100),
        priority: move.priority || 0,
        shortDesc: move.shortDesc || move.desc || '',
      });
    }

    summaries.sort((a, b) => a.displayName.localeCompare(b.displayName));
    this.learnsetCache.set(cacheKey, summaries);
    return summaries;
  }

  /**
   * Retrieves competitive items.
   */
  public getItems(): ItemSummary[] {
    return [...POPULAR_ITEMS];
  }

  /**
   * Retrieves nature definitions.
   */
  public getNatures(): NatureSummary[] {
    return [...NATURES_LIST];
  }

  /**
   * Retrieves all global competitive moves for chaos mode.
   */
  public getGlobalMoves(): MoveSummary[] {
    if (this.globalMovesCache) return this.globalMovesCache;

    const moves: MoveSummary[] = [];
    for (const m of Dex.moves.all()) {
      if (m.isZ || m.isMax) continue;
      if (m.isNonstandard && m.isNonstandard !== 'Past') continue;
      if (m.num <= 0) continue;

      moves.push({
        id: m.id,
        displayName: m.name,
        type: m.type as PokemonType,
        category: (m.category as 'Physical' | 'Special' | 'Status') || 'Status',
        basePower: m.basePower || 0,
        accuracy: m.accuracy === true ? true : (m.accuracy || 100),
        priority: m.priority || 0,
        shortDesc: m.shortDesc || m.desc || '',
      });
    }

    moves.sort((a, b) => a.displayName.localeCompare(b.displayName));
    this.globalMovesCache = moves;
    return moves;
  }

  /**
   * Retrieves global abilities for chaos mode.
   */
  public getGlobalAbilities(): AbilitySummary[] {
    if (this.globalAbilitiesCache) return this.globalAbilitiesCache;

    const abilities: AbilitySummary[] = [];
    for (const a of Dex.abilities.all()) {
      if (a.isNonstandard && a.isNonstandard !== 'Past') continue;
      if (a.num <= 0) continue;

      abilities.push({
        id: a.id,
        displayName: a.name,
        shortDesc: a.shortDesc || a.desc || '',
      });
    }

    abilities.sort((a, b) => a.displayName.localeCompare(b.displayName));
    this.globalAbilitiesCache = abilities;
    return abilities;
  }

  /**
   * Validates a PokemonBuild against server rules and drafted species identity.
   */
  public async validatePokemonBuild(
    build: PokemonBuild,
    draftedPokemon: PokemonSummary,
    rules: SetBuilderRules
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Identity validation: speciesId must match drafted Pokémon
    if (build.speciesId !== draftedPokemon.speciesId) {
      errors.push(
        `Species mismatch: drafted ${draftedPokemon.displayName} (#${draftedPokemon.speciesId}), but build had speciesId ${build.speciesId}.`
      );
    }

    // 2. Ability validation
    if (!build.ability || !build.ability.trim()) {
      errors.push('An ability must be selected.');
    } else if (rules.abilityMode === 'legal') {
      const legalAbilities = this.getAbilitiesForPokemon(draftedPokemon, 'legal');
      const isLegal = legalAbilities.some(
        (a) =>
          a.displayName.toLowerCase() === build.ability.trim().toLowerCase() ||
          a.id.toLowerCase() === build.ability.trim().toLowerCase()
      );
      if (!isLegal) {
        errors.push(
          `Ability "${build.ability}" is not legal for ${draftedPokemon.displayName}.`
        );
      }
    }

    // 3. Moves validation: exactly 4 moves, no duplicates
    const moves = (build.moves || []).filter((m) => Boolean(m?.trim()));
    if (moves.length !== 4) {
      errors.push(`A Pokémon must have exactly 4 moves (received ${moves.length}).`);
    }

    const uniqueMoves = new Set(moves.map((m) => m.toLowerCase().replace(/[\s-]+/g, '')));
    if (uniqueMoves.size !== moves.length) {
      errors.push('Duplicate moves are not permitted on the same Pokémon.');
    }

    if (rules.moveMode === 'legal' && moves.length > 0) {
      const legalMoves = await this.getMovesForPokemon(draftedPokemon, 'legal');
      const legalMoveSet = new Set(
        legalMoves.map((m) => m.displayName.toLowerCase().replace(/[\s-]+/g, ''))
      );
      for (const move of moves) {
        const clean = move.toLowerCase().replace(/[\s-]+/g, '');
        if (!legalMoveSet.has(clean)) {
          errors.push(`Move "${move}" is not learnable by ${draftedPokemon.displayName}.`);
        }
      }
    }

    // 4. EV validation: 0-252 each, sum <= 510
    const stats: (keyof typeof build.evs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    let totalEVs = 0;
    for (const stat of stats) {
      const val = build.evs?.[stat] ?? 0;
      if (typeof val !== 'number' || isNaN(val) || val < 0 || val > 252) {
        errors.push(`EV for ${stat.toUpperCase()} must be between 0 and 252 (received ${val}).`);
      }
      totalEVs += val;
    }
    if (totalEVs > 510) {
      errors.push(`Total EVs cannot exceed 510 (received ${totalEVs}).`);
    }

    // 5. IV validation: 0-31 each
    for (const stat of stats) {
      const val = build.ivs?.[stat] ?? 31;
      if (typeof val !== 'number' || isNaN(val) || val < 0 || val > 31) {
        errors.push(`IV for ${stat.toUpperCase()} must be between 0 and 31 (received ${val}).`);
      }
    }

    // 6. Nature validation
    if (!build.nature || !build.nature.trim()) {
      errors.push('A nature must be selected.');
    } else {
      const validNature = NATURES_LIST.some(
        (n) => n.displayName.toLowerCase() === build.nature.trim().toLowerCase()
      );
      if (!validNature) {
        errors.push(`Invalid nature: "${build.nature}".`);
      }
    }

    // 7. Tera Type validation
    if (build.teraType && !TERA_TYPES.includes(build.teraType)) {
      errors.push(`Invalid Tera Type: "${build.teraType}".`);
    }

    // 8. Level validation: 1-100
    if (build.level && (build.level < 1 || build.level > 100)) {
      errors.push(`Level must be between 1 and 100 (received ${build.level}).`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
