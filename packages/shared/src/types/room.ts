import type { PokemonSummary } from './pokemon.js';

export type RoomPhase =
  | 'lobby'
  | 'draft'
  | 'team-building'
  | 'team-reveal'
  | 'battle'
  | 'finished';

export type DraftMode = 'independent' | 'same-pool';

export interface PokemonPoolRules {
  includeRegular: boolean;
  includeLegendaries: boolean;
  includeMythicals: boolean;
  includeMegas: boolean;
  includeRegionalForms: boolean;
  includeAlternateForms: boolean;
  includeParadox: boolean;
  includeUltraBeasts: boolean;
}

export const DEFAULT_POOL_RULES: PokemonPoolRules = {
  includeRegular: true,
  includeLegendaries: false,
  includeMythicals: false,
  includeMegas: false,
  includeRegionalForms: true,
  includeAlternateForms: true,
  includeParadox: true,
  includeUltraBeasts: true,
};

export const ALL_POKEMON_POOL_RULES: PokemonPoolRules = {
  includeRegular: true,
  includeLegendaries: true,
  includeMythicals: true,
  includeMegas: true,
  includeRegionalForms: true,
  includeAlternateForms: true,
  includeParadox: true,
  includeUltraBeasts: true,
};

export interface RoomConfig {
  draftMode: DraftMode;
  teamSize: number;
  poolRules: PokemonPoolRules;
  setBuilderRules?: SetBuilderRules;
  allowLegendaries?: boolean;
}

export type SetRulesMode = 'legal' | 'chaos';

export interface SetBuilderRules {
  mode: SetRulesMode;
  abilityMode: 'legal' | 'random-global';
  moveMode: 'legal' | 'random-global';
  itemMode: 'free' | 'random';
  teraMode: 'free' | 'random';
}

export const DEFAULT_SET_BUILDER_RULES: SetBuilderRules = {
  mode: 'legal',
  abilityMode: 'legal',
  moveMode: 'legal',
  itemMode: 'free',
  teraMode: 'free',
};

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
  isHost?: boolean;
}

export interface PlayerDraftState {
  team: PokemonSummary[];
  currentOptions: PokemonSummary[];
  pickNumber: number;
  completed: boolean;
  lockedIn: boolean;
}

export interface OpponentDraftView {
  teamCount: number;
  completed: boolean;
  lockedIn: boolean;
}

export interface ClientDraftView {
  myDraft: PlayerDraftState;
  opponentDraft?: OpponentDraftView;
  targetTeamSize: number;
  roundNumber: number;
}

export interface InternalDraftState {
  targetTeamSize: number;
  currentRound: number;
  sharedRoundOptions?: PokemonSummary[];
  playerStates: Record<string, PlayerDraftState>;
}

// ─────────────────────────────────────────────────────────────
// TEAM BUILDING TYPES (PHASE 3)
// ─────────────────────────────────────────────────────────────

import type { PokemonBuild, BuildOptionSet } from './pokemon.js';

export interface PlayerTeamBuildingState {
  pokemon: PokemonBuild[];
  options: BuildOptionSet[];
  activePokemonIndex: number;
  completed: boolean;
  ready: boolean;
}

export interface OpponentTeamBuildingView {
  completedCount: number;
  ready: boolean;
}

export interface ClientTeamBuildingView {
  pokemon: PokemonBuild[];
  options: BuildOptionSet[];
  activePokemonIndex: number;
  isReady: boolean;
  completedCount: number;
  opponent: OpponentTeamBuildingView;
}

export interface InternalTeamBuildingState {
  playerStates: Record<string, PlayerTeamBuildingState>;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  players: Player[];
  phase: RoomPhase;
  config: RoomConfig;
  createdAt: number;
  canStartDraft: boolean;
  draft?: InternalDraftState;
  teamBuilding?: InternalTeamBuildingState;
}

export interface RevealedPlayerTeam {
  playerId: string;
  playerName: string;
  team: PokemonBuild[];
}

import type { ClientBattleView } from './battle.js';

export interface ClientRoomView {
  roomCode: string;
  hostId: string;
  players: Player[];
  phase: RoomPhase;
  config: RoomConfig;
  createdAt: number;
  canStartDraft: boolean;
  draft?: ClientDraftView;
  teamBuilding?: ClientTeamBuildingView;
  revealedTeams?: Record<string, RevealedPlayerTeam>;
  battle?: ClientBattleView;
}

