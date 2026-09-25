import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomState,
} from '@showup/shared';
import type { RoomManager } from '../room/RoomManager.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Sends a customized, privacy-preserving view of the room to each connected player.
 */
function broadcastRoomUpdate(
  io: TypedServer,
  roomManager: RoomManager,
  room: RoomState
): void {
  for (const p of room.players) {
    const socketId = roomManager.getSocketIdForPlayer(p.id);
    if (socketId) {
      const clientView = roomManager.serializeRoomForPlayer(room, p.id);
      const targetSocket = io.sockets.sockets.get(socketId);
      if (targetSocket) {
        targetSocket.emit('room:updated', { room: clientView });
      } else {
        io.to(socketId).emit('room:updated', { room: clientView });
      }
    }
  }
}


export function setupSocketHandlers(
  io: TypedServer,
  roomManager: RoomManager
): void {
  io.on('connection', (socket: TypedSocket) => {
    // 1. Create Room
    socket.on('room:create', ({ playerName, playerId, config }) => {
      try {
        const { room, player } = roomManager.createRoom(
          playerName,
          playerId,
          socket.id,
          config
        );

        socket.join(room.roomCode);

        // Notify creator with their serialized view
        const clientView = roomManager.serializeRoomForPlayer(room, player.id);
        socket.emit('room:created', { room: clientView, player });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create room.';
        socket.emit('room:error', { message });
      }
    });

    // 2. Join Room
    socket.on('room:join', ({ roomCode, playerName, playerId }) => {
      try {
        const { room, player } = roomManager.joinRoom(
          roomCode,
          playerName,
          playerId,
          socket.id
        );

        socket.join(room.roomCode);

        // Notify joiner with their view
        const clientView = roomManager.serializeRoomForPlayer(room, player.id);
        socket.emit('room:joined', { room: clientView, player });

        // Broadcast player-specific updates to all players
        broadcastRoomUpdate(io, roomManager, room);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to join room.';
        socket.emit('room:error', { message });
      }
    });

    // 3. Player Ready Toggle
    socket.on('player:ready', ({ roomCode, playerId, ready }) => {
      try {
        const updatedRoom = roomManager.setPlayerReady(roomCode, playerId, ready);
        broadcastRoomUpdate(io, roomManager, updatedRoom);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update ready state.';
        socket.emit('room:error', { message });
      }
    });

    // 4. Start Pokemon Draft (Host only)
    socket.on('draft:start', async ({ roomCode, playerId }) => {
      try {
        const updatedRoom = await roomManager.startDraft(roomCode, playerId);
        broadcastRoomUpdate(io, roomManager, updatedRoom);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to start Pokémon draft.';
        socket.emit('draft:error', { message });
      }
    });

    // 5. Select Pokemon (Pick 1 of 3)
    socket.on('draft:selectPokemon', async ({ roomCode, playerId, pokemonId }) => {
      try {
        const updatedRoom = await roomManager.selectPokemon(roomCode, playerId, pokemonId);
        broadcastRoomUpdate(io, roomManager, updatedRoom);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to select Pokémon.';
        console.error(`[draft:selectPokemon error] ${playerId} in ${roomCode}:`, message);
        socket.emit('draft:error', { message });
      }
    });


    // 6. Update Pokemon Build in Team Building Phase
    socket.on('team:updatePokemon', ({ roomCode, playerId, pokemonIndex, build }) => {
      try {
        const mapping = roomManager.getPlayerMapping(socket.id);
        if (mapping && mapping.playerId !== playerId) {
          throw new Error('Unauthorized: You cannot modify another trainer\'s Pokémon.');
        }
        const updatedRoom = roomManager.updatePokemonBuild(roomCode, playerId, pokemonIndex, build);
        broadcastRoomUpdate(io, roomManager, updatedRoom);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update Pokémon build.';
        socket.emit('team:error', { message });
      }
    });

    // 7. Player Marks Team as Ready
    socket.on('team:ready', async ({ roomCode, playerId }) => {
      try {
        const mapping = roomManager.getPlayerMapping(socket.id);
        if (mapping && mapping.playerId !== playerId) {
          throw new Error('Unauthorized: You cannot lock in another trainer\'s team.');
        }
        const updatedRoom = await roomManager.setPlayerTeamReady(roomCode, playerId);
        broadcastRoomUpdate(io, roomManager, updatedRoom);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to lock in team ready.';
        socket.emit('team:error', { message });
      }
    });

    // 8. Leave Room
    socket.on('room:leave', ({ roomCode, playerId }) => {
      try {
        const { room } = roomManager.leaveRoom(roomCode, playerId);
        socket.leave(roomCode);

        if (room) {
          broadcastRoomUpdate(io, roomManager, room);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to leave room.';
        socket.emit('room:error', { message });
      }
    });

    // 7. Disconnect
    socket.on('disconnect', () => {
      const result = roomManager.handleSocketDisconnect(socket.id);
      if (result && result.room && result.player) {
        const { room, player } = result;
        io.to(room.roomCode).emit('player:disconnected', {
          playerId: player.id,
          playerName: player.name,
        });
        broadcastRoomUpdate(io, roomManager, room);
      }
    });
  });
}
