import type { RoomConfig, ClientRoomView, Player } from './room.js';

export interface CreateRoomPayload {
  playerName: string;
  playerId: string;
  config?: Partial<RoomConfig>;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
  playerId: string;
}

export interface LeaveRoomPayload {
  roomCode: string;
  playerId: string;
}

export interface PlayerReadyPayload {
  roomCode: string;
  playerId: string;
  ready: boolean;
}

export interface DraftStartPayload {
  roomCode: string;
  playerId: string;
}

import type { PokemonBuild } from './pokemon.js';

export interface DraftSelectPokemonPayload {
  roomCode: string;
  playerId: string;
  pokemonId: number;
}

export interface TeamUpdatePokemonPayload {
  roomCode: string;
  playerId: string;
  pokemonIndex: number;
  build: Partial<PokemonBuild>;
}

export interface TeamReadyPayload {
  roomCode: string;
  playerId: string;
}

export interface RoomErrorPayload {
  message: string;
  code?: string;
}

import type { BattleAction } from './battle.js';

export interface BattleStartPayload {
  roomCode: string;
  playerId: string;
}

export interface BattleActionPayload {
  roomCode: string;
  playerId: string;
  action: BattleAction;
}

export interface BattleForfeitPayload {
  roomCode: string;
  playerId: string;
}

export interface BattleRematchPayload {
  roomCode: string;
  playerId: string;
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload) => void;
  'room:join': (payload: JoinRoomPayload) => void;
  'room:leave': (payload: LeaveRoomPayload) => void;
  'player:ready': (payload: PlayerReadyPayload) => void;
  'draft:start': (payload: DraftStartPayload) => void;
  'draft:selectPokemon': (payload: DraftSelectPokemonPayload) => void;
  'team:updatePokemon': (payload: TeamUpdatePokemonPayload) => void;
  'team:ready': (payload: TeamReadyPayload) => void;
  'battle:start': (payload: BattleStartPayload) => void;
  'battle:action': (payload: BattleActionPayload) => void;
  'battle:forfeit': (payload: BattleForfeitPayload) => void;
  'battle:rematch': (payload: BattleRematchPayload) => void;
}

export interface ServerToClientEvents {
  'room:created': (payload: { room: ClientRoomView; player: Player }) => void;
  'room:joined': (payload: { room: ClientRoomView; player: Player }) => void;
  'room:updated': (payload: { room: ClientRoomView }) => void;
  'room:error': (payload: RoomErrorPayload) => void;
  'draft:error': (payload: { message: string }) => void;
  'team:error': (payload: { message: string }) => void;
  'battle:error': (payload: { message: string }) => void;
  'battle:finished': (payload: { winnerPlayerId: string; winnerName: string }) => void;
  'player:disconnected': (payload: { playerId: string; playerName: string }) => void;
}

