import { Dex } from '@pkmn/dex';
import type {
  PokemonSummary,
  PokemonType,
  PokemonPoolRules,
  PokemonCategories,
} from '@showup/shared';
import { DEFAULT_POOL_RULES } from '@showup/shared';

export interface PoolStats {
  baseSpeciesDiscovered: number;
  battleRelevantEntriesGenerated: number;
  legendaryEntries: number;
  mythicalEntries: number;
  megaEntries: number;
  regionalEntries: number;
  alternateFormEntries: number;
  paradoxEntries: number;
  ultraBeastEntries: number;
  intentionallyUnsupported: string[];
}

export class PokemonDataService {
  private pool: PokemonSummary[] = [];
  private poolById = new Map<number, PokemonSummary>();
  private poolByName = new Map<string, PokemonSummary>();

  constructor() {
    this.buildPool();
  }

  /**
   * Initializes the complete normalized Pokémon pool (Gens 1-9) from @pkmn/dex.
   */
  private buildPool(): void {
    let formCounter = 1;

    for (const s of Dex.species.all()) {
      // 1. Exclude nonstandard (CAP / custom fakemon)
      if (s.isNonstandard && s.isNonstandard !== 'Past') continue;

      // 2. Exclude Gigantamax battle-mechanic forms
      if (s.name.endsWith('-Gmax') || s.forme === 'Gmax') continue;

      // 3. Exclude Totem variant forms
      if (s.name.includes('-Totem') || s.forme?.includes('Totem')) continue;

      // 4. Exclude pure cosmetic forms (Vivillon patterns, Alcremie decorations, Furfrou trims, etc.)
      if (s.isCosmeticForme) continue;

      // 5. Exclude costume / cosplay Pikachus
      if (s.name.startsWith('Pikachu-') && s.name !== 'Pikachu') continue;

      // 6. Exclude LGPE starter forms
      if (s.forme === 'Starter') continue;

      // 7. Exclude unplayable boss forms
      if (s.name === 'Eternatus-Eternamax') continue;

      // 8. Exclude in-battle only transformations (Aegislash-Blade, Zen Mode, Wishiwashi-School, etc.)
      // Note: Megas & Primals have battleOnly set in Showdown but are intentionally supported pool forms!
      if (s.battleOnly && !s.isMega && !s.isPrimal) continue;

      const isMega = !!s.isMega || !!s.isPrimal;
      const isRegional = ['Alola', 'Galar', 'Hisui', 'Paldea'].some(
        (r) => s.forme?.startsWith(r) || s.name.endsWith('-' + r)
      );
      const isParadox = !!s.tags?.includes('Paradox');
      const isUB = !!s.tags?.includes('Ultra Beast');
      const isMythical = !!s.tags?.includes('Mythical');
      const isLegendary =
        (!!s.tags?.includes('Restricted Legendary') || !!s.tags?.includes('Sub-Legendary')) &&
        !isUB &&
        !isParadox;
      const isAlt = !!s.forme && !isMega && !isRegional;

      // Unique positive integer ID:
      // Base forms without a forme string use their National Pokédex number (1..1025).
      // Variants/alternate forms use 10000 + sequential counter.
      const id = s.forme ? 10000 + formCounter++ : s.num;

      const categories: PokemonCategories = {
        legendary: isLegendary,
        mythical: isMythical,
        mega: isMega,
        regional: isRegional,
        alternateForm: isAlt,
        paradox: isParadox,
        ultraBeast: isUB,
      };

      const summary: PokemonSummary = {
        id,
        speciesId: s.num,
        speciesName: s.baseSpecies || s.name,
        formName: s.forme || undefined,
        name: s.id,
        displayName: s.name,
        types: [...s.types] as PokemonType[],
        sprite: {
          animated: `https://play.pokemonshowdown.com/sprites/ani/${s.id}.gif`,
          front: `https://play.pokemonshowdown.com/sprites/dex/${s.id}.png`,
        },
        baseStats: {
          hp: s.baseStats.hp,
          atk: s.baseStats.atk,
          def: s.baseStats.def,
          spa: s.baseStats.spa,
          spd: s.baseStats.spd,
          spe: s.baseStats.spe,
        },
        bst: s.bst,
        categories,
        isLegendary,
        isMythical,
      };

      this.pool.push(summary);
      this.poolById.set(summary.id, summary);
      this.poolByName.set(s.id.toLowerCase(), summary);
      this.poolByName.set(s.name.toLowerCase(), summary);
    }
  }

  /**
   * Retrieves a Pokémon summary by its unique numeric ID.
   */
  public async getPokemonById(id: number): Promise<PokemonSummary | null> {
    const cached = this.poolById.get(id);
    if (cached) return cached;

    // Optional PokéAPI fallback for arbitrary external IDs
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = (await res.json()) as any;
      return {
        id: data.id,
        speciesId: data.id,
        speciesName: data.name,
        name: data.name,
        displayName: data.name.toUpperCase(),
        types: data.types.map((t: any) => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)) as PokemonType[],
        sprite: {
          front: data.sprites.front_default,
          animated: data.sprites.other?.showdown?.front_default || data.sprites.front_default,
        },
        baseStats: {
          hp: data.stats[0]?.base_stat || 50,
          atk: data.stats[1]?.base_stat || 50,
          def: data.stats[2]?.base_stat || 50,
          spa: data.stats[3]?.base_stat || 50,
          spd: data.stats[4]?.base_stat || 50,
          spe: data.stats[5]?.base_stat || 50,
        },
        bst: data.stats.reduce((acc: number, s: any) => acc + s.base_stat, 0),
        categories: {
          legendary: false,
          mythical: false,
          mega: false,
          regional: false,
          alternateForm: false,
          paradox: false,
          ultraBeast: false,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Retrieves a Pokémon summary by name or Showdown ID.
   */
  public getPokemonByName(name: string): PokemonSummary | null {
    return this.poolByName.get(name.toLowerCase()) || null;
  }

  /**
   * Retrieves all entries in the loaded pool.
   */
  public getAllPoolEntries(): PokemonSummary[] {
    return this.pool;
  }

  /**
   * Returns verification stats of the loaded Pokémon pool.
   */
  public getPoolStats(): PoolStats {
    const baseSpecies = new Set(this.pool.map((p) => p.speciesId)).size;
    return {
      baseSpeciesDiscovered: baseSpecies,
      battleRelevantEntriesGenerated: this.pool.length,
      legendaryEntries: this.pool.filter((p) => p.categories.legendary).length,
      mythicalEntries: this.pool.filter((p) => p.categories.mythical).length,
      megaEntries: this.pool.filter((p) => p.categories.mega).length,
      regionalEntries: this.pool.filter((p) => p.categories.regional).length,
      alternateFormEntries: this.pool.filter((p) => p.categories.alternateForm).length,
      paradoxEntries: this.pool.filter((p) => p.categories.paradox).length,
      ultraBeastEntries: this.pool.filter((p) => p.categories.ultraBeast).length,
      intentionallyUnsupported: [
        'Gigantamax forms (battle-only mechanic)',
        'Totem variants (story-only boss stats)',
        'Pikachu costume & cosplay variants',
        'LGPE starter forms (Let\'s Go partner mechanics)',
        'Eternatus-Eternamax (unplayable boss form)',
        'In-battle only transformations (Aegislash-Blade, Zen Mode, Wishiwashi-School, Palafin-Hero)',
        'Purely cosmetic forms (Vivillon patterns, Furfrou trims, Alcremie decorations, Minior core colors)',
        'CAP / Smogon Create-A-Pokémon non-standard fakemon',
      ],
    };
  }

  /**
   * Evaluates if a Pokémon summary satisfies the configured pool rules.
   */
  public isEligible(pokemon: PokemonSummary, rules: PokemonPoolRules): boolean {
    const c = pokemon.categories;

    // Explicit category filters
    if (c.legendary && !rules.includeLegendaries) return false;
    if (c.mythical && !rules.includeMythicals) return false;
    if (c.mega && !rules.includeMegas) return false;
    if (c.regional && !rules.includeRegionalForms) return false;
    if (c.alternateForm && !rules.includeAlternateForms) return false;
    if (c.paradox && !rules.includeParadox) return false;
    if (c.ultraBeast && !rules.includeUltraBeasts) return false;

    // If it is a regular Pokémon (none of the special categories)
    const isSpecial =
      c.legendary ||
      c.mythical ||
      c.mega ||
      c.regional ||
      c.alternateForm ||
      c.paradox ||
      c.ultraBeast;

    if (!isSpecial && !rules.includeRegular) return false;

    return true;
  }

  /**
   * Generates `count` unique Pokémon options from the full pool respecting rules and exclusions.
   */
  public async generatePokemonOptions({
    count = 3,
    excludedPokemonIds = [],
    excludedSpeciesIds = [],
    poolRules = DEFAULT_POOL_RULES,
    allowLegendaries,
  }: {
    count?: number;
    excludedPokemonIds?: number[];
    excludedSpeciesIds?: number[];
    poolRules?: PokemonPoolRules;
    allowLegendaries?: boolean;
  }): Promise<PokemonSummary[]> {
    // Resolve rules with backward-compatibility for allowLegendaries
    const effectiveRules: PokemonPoolRules = {
      ...poolRules,
      includeLegendaries:
        allowLegendaries !== undefined ? allowLegendaries : poolRules.includeLegendaries,
    };

    const excludedIdSet = new Set(excludedPokemonIds);
    const excludedSpeciesSet = new Set(excludedSpeciesIds);

    // Filter all eligible Pokémon from the complete pool
    const eligiblePool = this.pool.filter((p) => {
      if (excludedIdSet.has(p.id)) return false;
      if (excludedSpeciesSet.has(p.speciesId)) return false;
      return this.isEligible(p, effectiveRules);
    });

    if (eligiblePool.length === 0) {
      // Fallback: If exclusions exhausted the filtered pool, relax to all eligible
      return this.pool.slice(0, count);
    }

    // Shuffle and pick `count` options with unique speciesId
    const shuffled = [...eligiblePool].sort(() => Math.random() - 0.5);
    const selected: PokemonSummary[] = [];
    const selectedSpecies = new Set<number>();

    for (const candidate of shuffled) {
      if (selected.length >= count) break;
      if (selectedSpecies.has(candidate.speciesId)) continue;

      selected.push(candidate);
      selectedSpecies.add(candidate.speciesId);
    }

    return selected;
  }
}
