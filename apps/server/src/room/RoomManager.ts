import {
  type RoomState,
  type Player,
  type RoomConfig,
  type ClientRoomView,
  type ClientDraftView,
  type OpponentDraftView,
  DEFAULT_ROOM_CONFIG,
  DEFAULT_POOL_RULES,
  MAX_PLAYERS_PER_ROOM,
  generateRoomCode,
  normalizeRoomCode,
  validatePlayerName,
  checkCanStartDraft,
} from '@showup/shared';
import { PokemonDataService } from '../services/PokemonDataService.js';

interface SocketPlayerMapping {
  playerId: string;
  roomCode: string;
}

export class RoomManager {
  private rooms = new Map<string, RoomState>();
  private socketToPlayer = new Map<string, SocketPlayerMapping>();
  private playerToSocket = new Map<string, string>();
  private pokemonService: PokemonDataService;

  constructor(pokemonService?: PokemonDataService) {
    this.pokemonService = pokemonService || new PokemonDataService();
  }

  /**
   * Creates a new room with the calling player as host.
   */
  public createRoom(
    playerNameRaw: string,
    playerId: string,
    socketId: string,
    config?: Partial<RoomConfig>
  ): { room: RoomState; player: Player } {
    const nameCheck = validatePlayerName(playerNameRaw);
    if (!nameCheck.valid) {
      throw new Error(nameCheck.error ?? 'Invalid player name.');
    }

    // Generate unique room code
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (this.rooms.has(roomCode) && attempts < 100) {
      roomCode = generateRoomCode();
      attempts++;
    }

    const hostPlayer: Player = {
      id: playerId,
      name: nameCheck.name,
      connected: true,
      ready: false,
      isHost: true,
    };

    const newRoom: RoomState = {
      roomCode,
      hostId: playerId,
      players: [hostPlayer],
      phase: 'lobby',
      config: {
        ...DEFAULT_ROOM_CONFIG,
        ...config,
        poolRules: {
          ...DEFAULT_ROOM_CONFIG.poolRules,
          ...(config?.poolRules || {}),
        },
      },
      createdAt: Date.now(),
      canStartDraft: false,
    };

    this.rooms.set(roomCode, newRoom);
    this.bindSocket(socketId, playerId, roomCode);

    return { room: newRoom, player: hostPlayer };
  }

  /**
   * Joins an existing room if valid and not full.
   */
  public joinRoom(
    roomCodeRaw: string,
    playerNameRaw: string,
    playerId: string,
    socketId: string
  ): { room: RoomState; player: Player } {
    const roomCode = normalizeRoomCode(roomCodeRaw);
    const room = this.rooms.get(roomCode);

    if (!room) {
      throw new Error(`Room "${roomCode}" does not exist. Check your code.`);
    }

    if (room.phase !== 'lobby') {
      throw new Error(`Cannot join room "${roomCode}" because the battle has already started.`);
    }

    const nameCheck = validatePlayerName(playerNameRaw);
    if (!nameCheck.valid) {
      throw new Error(nameCheck.error ?? 'Invalid player name.');
    }

    // Check if player is already in this room (reconnection or existing session)
    const existingPlayer = room.players.find((p) => p.id === playerId);
    if (existingPlayer) {
      existingPlayer.connected = true;
      existingPlayer.name = nameCheck.name;
      room.canStartDraft = checkCanStartDraft(room.players);
      this.bindSocket(socketId, playerId, roomCode);
      return { room, player: existingPlayer };
    }

    // Max 2 players validation
    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      throw new Error(`Room "${roomCode}" is full (${MAX_PLAYERS_PER_ROOM}/${MAX_PLAYERS_PER_ROOM} players).`);
    }

    // Check if another player in the room is using this name
    const nameCollision = room.players.some(
      (p) => p.name.toLowerCase() === nameCheck.name.toLowerCase()
    );
    if (nameCollision) {
      throw new Error(`A trainer named "${nameCheck.name}" is already in this room.`);
    }

    const newPlayer: Player = {
      id: playerId,
      name: nameCheck.name,
      connected: true,
      ready: false,
      isHost: false,
    };

    room.players.push(newPlayer);
    room.canStartDraft = checkCanStartDraft(room.players);
    this.bindSocket(socketId, playerId, roomCode);

    return { room, player: newPlayer };
  }

  /**
   * Toggles or sets player ready status.
   */
  public setPlayerReady(
    roomCodeRaw: string,
    playerId: string,
    ready: boolean
  ): RoomState {
    const roomCode = normalizeRoomCode(roomCodeRaw);
    const room = this.rooms.get(roomCode);

    if (!room) {
      throw new Error(`Room "${roomCode}" not found.`);
    }

    if (room.phase !== 'lobby') {
      throw new Error('Cannot change ready state after draft has begun.');
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found in this room.');
    }

    player.ready = ready;
    room.canStartDraft = checkCanStartDraft(room.players);

    return room;
  }

  /**
   * Starts the Pokemon draft for the room. Only host can trigger.
   */
  public async startDraft(roomCodeRaw: string, playerId: string): Promise<RoomState> {
    const roomCode = normalizeRoomCode(roomCodeRaw);
    const room = this.rooms.get(roomCode);

    if (!room) {
      throw new Error(`Room "${roomCode}" not found.`);
    }

    if (room.phase !== 'lobby') {
      throw new Error('Draft has already started or room is not in lobby.');
    }

    if (room.hostId !== playerId) {
      throw new Error('Only the room host can start the Pokémon draft.');
    }

    if (room.players.length !== MAX_PLAYERS_PER_ROOM) {
      throw new Error(`Need exactly ${MAX_PLAYERS_PER_ROOM} players to start the draft.`);
    }

    if (!checkCanStartDraft(room.players)) {
      throw new Error('All players must be connected and ready to start the draft.');
    }

    room.phase = 'draft';
    const targetTeamSize = room.config.teamSize || 6;
    const draftMode = room.config.draftMode;
    const poolRules = room.config.poolRules || DEFAULT_POOL_RULES;

    room.draft = {
      targetTeamSize,
      currentRound: 1,
      playerStates: {},
    };

    if (draftMode === 'same-pool') {
      const sharedOptions = await this.pokemonService.generatePokemonOptions({
        count: 3,
        excludedPokemonIds: [],
        excludedSpeciesIds: [],
        poolRules,
      });

      room.draft.sharedRoundOptions = sharedOptions;

      for (const player of room.players) {
        room.draft.playerStates[player.id] = {
          team: [],
          currentOptions: [...sharedOptions],
          pickNumber: 0,
          completed: false,
          lockedIn: false,
        };
      }
    } else {
      // Independent mode: each player gets unique options
      for (const player of room.players) {
        const options = await this.pokemonService.generatePokemonOptions({
          count: 3,
          excludedPokemonIds: [],
          excludedSpeciesIds: [],
          poolRules,
        });

        room.draft.playerStates[player.id] = {
          team: [],
          currentOptions: options,
          pickNumber: 0,
          completed: false,
          lockedIn: false,
        };
      }
    }

    return room;
  }

  /**
   * Processes a player's choice-of-3 Pokemon selection.
   */
  public async selectPokemon(
    roomCodeRaw: string,
    playerId: string,
    pokemonId: number
  ): Promise<RoomState> {
    const roomCode = normalizeRoomCode(roomCodeRaw);
    const room = this.rooms.get(roomCode);

    if (!room) {
      throw new Error(`Room "${roomCode}" not found.`);
    }

    if (room.phase !== 'draft' || !room.draft) {
      throw new Error('Room is not currently in the draft phase.');
    }

    const playerState = room.draft.playerStates[playerId];
    if (!playerState) {
      throw new Error('Player draft state not found.');
    }

    if (playerState.completed) {
      throw new Error('You have already completed drafting your team.');
    }

    if (room.config.draftMode === 'same-pool' && playerState.lockedIn) {
      throw new Error('You have already locked in your pick for this round. Waiting for opponent.');
    }

    const selectedPokemon = playerState.currentOptions.find((p) => p.id === pokemonId);
    if (!selectedPokemon) {
      throw new Error('Invalid Pokémon selection. Must select one of your current 3 options.');
    }

    // Prevent duplicate species on player's team (e.g. Charizard and Charizard-Mega-X share speciesId)
    const isDuplicateSpecies = playerState.team.some(
      (p) => p.speciesId === selectedPokemon.speciesId
    );
    if (isDuplicateSpecies) {
      throw new Error(`You already have ${selectedPokemon.speciesName} on your team.`);
    }

    playerState.team.push(selectedPokemon);
    playerState.pickNumber++;

    const targetTeamSize = room.draft.targetTeamSize;
    const poolRules = room.config.poolRules || DEFAULT_POOL_RULES;

    if (room.config.draftMode === 'independent') {
      if (playerState.team.length >= targetTeamSize) {
        playerState.completed = true;
        playerState.currentOptions = [];
      } else {
        const excludedIds = playerState.team.map((p) => p.id);
        const excludedSpeciesIds = playerState.team.map((p) => p.speciesId);
        playerState.currentOptions = await this.pokemonService.generatePokemonOptions({
          count: 3,
          excludedPokemonIds: excludedIds,
          excludedSpeciesIds,
          poolRules,
        });
      }

      // Check if both players finished
      const allCompleted = room.players.every(
        (p) => room.draft?.playerStates[p.id]?.completed
      );

      if (allCompleted) {
        room.phase = 'team-building';
      }
    } else {
      // Same-pool mode: lock this player in for the round
      playerState.lockedIn = true;

      // Check if all players have locked in
      const allLocked = room.players.every(
        (p) => room.draft?.playerStates[p.id]?.lockedIn
      );

      if (allLocked) {
        if (playerState.team.length >= targetTeamSize) {
          for (const player of room.players) {
            const ps = room.draft.playerStates[player.id];
            if (ps) {
              ps.completed = true;
              ps.currentOptions = [];
            }
          }
          room.phase = 'team-building';
        } else {
          room.draft.currentRound++;
          for (const player of room.players) {
            const ps = room.draft.playerStates[player.id];
            if (ps) {
              ps.lockedIn = false;
            }
          }

          // Exclude any Pokémon or species drafted by either player
          const allDraftedIds = Object.values(room.draft.playerStates).flatMap((ps) =>
            ps.team.map((p) => p.id)
          );
          const allDraftedSpeciesIds = Object.values(room.draft.playerStates).flatMap((ps) =>
            ps.team.map((p) => p.speciesId)
          );

          const newSharedOptions = await this.pokemonService.generatePokemonOptions({
            count: 3,
            excludedPokemonIds: allDraftedIds,
            excludedSpeciesIds: allDraftedSpeciesIds,
            poolRules,
          });

          room.draft.sharedRoundOptions = newSharedOptions;
          for (const player of room.players) {
            const ps = room.draft.playerStates[player.id];
            if (ps) {
              ps.currentOptions = [...newSharedOptions];
            }
          }
        }
      }
    }

    return room;
  }

  /**
   * Serializes room state specifically for a player, omitting opponent's private draft picks.
   */
  public serializeRoomForPlayer(room: RoomState, playerId: string): ClientRoomView {
    let draftView: ClientDraftView | undefined = undefined;

    if (room.draft) {
      const myDraftState = room.draft.playerStates[playerId] || {
        team: [],
        currentOptions: [],
        pickNumber: 0,
        completed: false,
        lockedIn: false,
      };

      const opponent = room.players.find((p) => p.id !== playerId);
      const opponentState = opponent ? room.draft.playerStates[opponent.id] : undefined;

      const opponentDraft: OpponentDraftView | undefined = opponentState
        ? {
            teamCount: opponentState.team.length,
            completed: opponentState.completed,
            lockedIn: opponentState.lockedIn,
          }
        : undefined;

      draftView = {
        myDraft: myDraftState,
        opponentDraft,
        targetTeamSize: room.draft.targetTeamSize,
        roundNumber: room.draft.currentRound,
      };
    }

    return {
      roomCode: room.roomCode,
      hostId: room.hostId,
      players: room.players,
      phase: room.phase,
      config: room.config,
      createdAt: room.createdAt,
      canStartDraft: room.canStartDraft,
      draft: draftView,
    };
  }

  /**
   * Removes player from room.
   */
  public leaveRoom(
    roomCodeRaw: string,
    playerId: string
  ): { room?: RoomState; player?: Player } {
    const roomCode = normalizeRoomCode(roomCodeRaw);
    const room = this.rooms.get(roomCode);

    if (!room) {
      return {};
    }

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      return { room };
    }

    const [removedPlayer] = room.players.splice(playerIndex, 1);

    // If room is empty, clean it up
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      this.unbindPlayer(playerId);
      return { player: removedPlayer };
    }

    // If host left, assign host to the other player
    if (removedPlayer.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
    }

    room.canStartDraft = checkCanStartDraft(room.players);
    this.unbindPlayer(playerId);

    return { room, player: removedPlayer };
  }

  /**
   * Handles a socket disconnection event.
   * Marks player as disconnected without instantly deleting the room.
   */
  public handleSocketDisconnect(socketId: string): {
    room?: RoomState;
    player?: Player;
  } | null {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) {
      return null;
    }

    const { playerId, roomCode } = mapping;
    this.socketToPlayer.delete(socketId);

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.unbindPlayer(playerId);
      return null;
    }

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = false;
      // In lobby, reset ready state; during draft, preserve ready
      if (room.phase === 'lobby') {
        player.ready = false;
      }
      room.canStartDraft = checkCanStartDraft(room.players);
      return { room, player };
    }

    return null;
  }

  public getPokemonService(): PokemonDataService {
    return this.pokemonService;
  }

  public getRoom(roomCodeRaw: string): RoomState | undefined {
    return this.rooms.get(normalizeRoomCode(roomCodeRaw));
  }

  public getPlayerMapping(socketId: string): SocketPlayerMapping | undefined {
    return this.socketToPlayer.get(socketId);
  }

  public getSocketIdForPlayer(playerId: string): string | undefined {
    return this.playerToSocket.get(playerId);
  }

  private bindSocket(socketId: string, playerId: string, roomCode: string): void {
    const prevSocketId = this.playerToSocket.get(playerId);
    if (prevSocketId && prevSocketId !== socketId) {
      this.socketToPlayer.delete(prevSocketId);
    }

    this.socketToPlayer.set(socketId, { playerId, roomCode });
    this.playerToSocket.set(playerId, socketId);
  }

  private unbindPlayer(playerId: string): void {
    const socketId = this.playerToSocket.get(playerId);
    if (socketId) {
      this.socketToPlayer.delete(socketId);
    }
    this.playerToSocket.delete(playerId);
  }
}
