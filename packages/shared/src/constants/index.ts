import type { PokemonType, RoomConfig } from '../types/index.js';

export const MAX_PLAYERS_PER_ROOM = 2;
export const DEFAULT_TEAM_SIZE = 6;
export const MAX_PLAYER_NAME_LENGTH = 18;
export const MIN_PLAYER_NAME_LENGTH = 1;

import { DEFAULT_POOL_RULES } from '../types/index.js';

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  draftMode: 'independent',
  teamSize: DEFAULT_TEAM_SIZE,
  poolRules: DEFAULT_POOL_RULES,
  allowLegendaries: false,
};


export const POKEMON_TYPES: readonly PokemonType[] = [
  'Normal',
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Steel',
  'Dark',
  'Fairy',
  'Stellar',
] as const;

export const DEFAULT_IVS = {
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
} as const;

export const DEFAULT_EVS = {
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
} as const;
