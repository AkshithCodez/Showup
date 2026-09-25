import type { PokemonBuild, StatSpread } from '../types/index.js';

const STAT_ABBRS: Record<keyof StatSpread, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
};

/**
 * Formats a single PokemonBuild into standard Pokémon Showdown paste format.
 */
export function exportPokemonToShowdown(build: PokemonBuild): string {
  const lines: string[] = [];

  // Line 1: Species/Display Name [@ Item]
  const itemPart = build.item?.trim() ? ` @ ${build.item.trim()}` : '';
  lines.push(`${build.displayName}${itemPart}`);

  // Ability
  if (build.ability?.trim()) {
    lines.push(`Ability: ${build.ability.trim()}`);
  }

  // Level (Standard Showdown defaults to 100; only emit if non-100 or explicitly set)
  if (build.level && build.level !== 100) {
    lines.push(`Level: ${build.level}`);
  }

  // Shiny
  if (build.shiny) {
    lines.push('Shiny: Yes');
  }

  // Tera Type
  if (build.teraType) {
    lines.push(`Tera Type: ${build.teraType}`);
  }

  // EVs: Only list stats > 0
  const evEntries: string[] = [];
  const statKeys: (keyof StatSpread)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  for (const k of statKeys) {
    const val = build.evs?.[k] ?? 0;
    if (val > 0) {
      evEntries.push(`${val} ${STAT_ABBRS[k]}`);
    }
  }
  if (evEntries.length > 0) {
    lines.push(`EVs: ${evEntries.join(' / ')}`);
  }

  // Nature
  if (build.nature?.trim()) {
    lines.push(`${build.nature.trim()} Nature`);
  }

  // IVs: Standard Showdown omits IVs if all 31. Only emit non-31 stats (e.g. 0 Atk, 0 Spe).
  const ivEntries: string[] = [];
  for (const k of statKeys) {
    const val = build.ivs?.[k] ?? 31;
    if (val !== 31) {
      ivEntries.push(`${val} ${STAT_ABBRS[k]}`);
    }
  }
  if (ivEntries.length > 0) {
    lines.push(`IVs: ${ivEntries.join(' / ')}`);
  }

  // Moves: Exactly up to 4 moves prefixed with "- "
  const moves = (build.moves || []).filter((m) => Boolean(m?.trim()));
  for (const move of moves) {
    lines.push(`- ${move.trim()}`);
  }

  return lines.join('\n');
}

/**
 * Formats a 6-Pokémon team into Pokémon Showdown export paste format.
 */
export function exportTeamToShowdown(team: PokemonBuild[]): string {
  return team
    .map((pokemon) => exportPokemonToShowdown(pokemon))
    .join('\n\n');
}
