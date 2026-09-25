export type PokemonType =
  | 'Normal'
  | 'Fire'
  | 'Water'
  | 'Grass'
  | 'Electric'
  | 'Ice'
  | 'Fighting'
  | 'Poison'
  | 'Ground'
  | 'Flying'
  | 'Psychic'
  | 'Bug'
  | 'Rock'
  | 'Ghost'
  | 'Dragon'
  | 'Steel'
  | 'Dark'
  | 'Fairy'
  | 'Stellar';

export interface StatSpread {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type PokemonBaseStats = StatSpread;

export interface PokemonSprite {
  front: string | null;
  animated?: string | null;
}

export interface PokemonCategories {
  legendary: boolean;
  mythical: boolean;
  mega: boolean;
  regional: boolean;
  alternateForm: boolean;
  paradox: boolean;
  ultraBeast: boolean;
}

export interface PokemonSummary {
  id: number;
  speciesId: number;
  speciesName: string;
  formName?: string;
  name: string;
  displayName: string;
  types: PokemonType[];
  sprite: PokemonSprite;
  baseStats: PokemonBaseStats;
  bst: number;
  categories: PokemonCategories;
  isLegendary?: boolean;
  isMythical?: boolean;
}

export interface MoveSummary {
  id: string;
  displayName: string;
  type: PokemonType;
  category: 'Physical' | 'Special' | 'Status';
  basePower: number;
  accuracy: number | true;
  priority: number;
  shortDesc?: string;
}

export interface AbilitySummary {
  id: string;
  displayName: string;
  shortDesc?: string;
  isSlot?: '0' | '1' | 'H';
}

export interface ItemSummary {
  id: string;
  displayName: string;
  shortDesc?: string;
}

export interface NatureSummary {
  id: string;
  displayName: string;
  plus?: keyof StatSpread;
  minus?: keyof StatSpread;
  label: string;
}

export interface BuildOptionSet {
  abilities: AbilitySummary[];
  moves: MoveSummary[];
}

export interface PokemonBuild {
  id: string;
  speciesId: number;
  speciesName: string;
  showdownId: string;
  displayName: string;

  ability: string;
  item: string;

  moves: string[]; // exactly 4 moves

  nature: string;

  evs: StatSpread;
  ivs: StatSpread;

  teraType?: PokemonType;

  level: number;

  gender?: 'M' | 'F' | 'N';
  shiny?: boolean;
}

