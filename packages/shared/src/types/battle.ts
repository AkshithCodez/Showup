import type { PokemonType } from './pokemon.js';

export type BattleActionType = 'move' | 'switch' | 'team';

export type BattleAction =
  | {
      type: 'move';
      moveSlot: number; // 1-4
      tera?: boolean;
    }
  | {
      type: 'switch';
      pokemonIndex: number; // 0-5
    }
  | {
      type: 'team';
      pokemonIndex?: number;
      teamOrder?: number[]; // [0, 1, 2, 3, 4, 5]
    };

export interface BattleActivePokemonView {
  species: string;
  displayName: string;
  level: number;
  gender?: 'M' | 'F' | 'N';
  shiny?: boolean;
  hp?: number;
  maxHp?: number;
  hpPercent: number;
  status?: string; // 'brn' | 'par' | 'slp' | 'frz' | 'psn' | 'tox'
  types: PokemonType[];
  teraType?: PokemonType;
  terastallized?: boolean;
  spriteUrl: string;
  boosts?: Record<string, number>;
}

export interface BattleBenchPokemonView {
  index: number;
  species: string;
  displayName: string;
  level: number;
  hpPercent: number;
  hp?: number;
  maxHp?: number;
  fainted: boolean;
  active: boolean;
  status?: string;
  types: PokemonType[];
  teraType?: PokemonType;
  spriteUrl: string;
}

export interface BattleSideView {
  playerId: string;
  name: string;
  activePokemon?: BattleActivePokemonView;
  team: BattleBenchPokemonView[];
}

export interface BattleFieldView {
  weather?: string;
  terrain?: string;
  sideHazards: Record<string, string[]>;
}

export type BattleLogType =
  | 'move'
  | 'damage'
  | 'heal'
  | 'faint'
  | 'switch'
  | 'status'
  | 'weather'
  | 'terrain'
  | 'tera'
  | 'boost'
  | 'info'
  | 'error';

export interface BattleLogEntry {
  id: string;
  type: BattleLogType;
  message: string;
  timestamp: number;
}

export interface AvailableMoveAction {
  slot: number;
  name: string;
  type: PokemonType;
  category: 'Physical' | 'Special' | 'Status';
  basePower: number;
  accuracy: number | true;
  pp: number;
  maxpp: number;
  disabled: boolean;
}

export interface AvailableSwitchAction {
  index: number;
  name: string;
  disabled: boolean;
}

export interface AvailableBattleActions {
  type: 'move' | 'switch' | 'teampreview' | 'wait';
  moves?: AvailableMoveAction[];
  canTerastallize?: boolean;
  teraType?: PokemonType;
  switches?: AvailableSwitchAction[];
}

export interface ClientBattleView {
  battleId: string;
  turn: number;
  phase: 'active' | 'finished';
  mySide: BattleSideView;
  opponentSide: BattleSideView;
  field: BattleFieldView;
  availableActions?: AvailableBattleActions;
  waitingForOpponent: boolean;
  opponentLockedIn: boolean;
  winnerPlayerId?: string;
  winnerName?: string;
  log: BattleLogEntry[];
}
