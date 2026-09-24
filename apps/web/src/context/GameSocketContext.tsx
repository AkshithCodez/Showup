'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  ClientRoomView,
  Player,
  RoomConfig,
} from '@showup/shared';
import { getSocket, type TypedClientSocket } from '../lib/socket';
import { getOrCreatePlayerId, savePlayerName } from '../lib/playerId';

interface GameSocketContextValue {
  isConnected: boolean;
  room: ClientRoomView | null;
  player: Player | null;
  error: string | null;
  isHost: boolean;
  clearError: () => void;
  createRoom: (playerName: string, config?: Partial<RoomConfig>) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  toggleReady: () => void;
  startDraft: () => void;
  selectPokemon: (pokemonId: number) => void;
  leaveRoom: () => void;
}

const GameSocketContext = createContext<GameSocketContextValue | null>(null);

export function GameSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<ClientRoomView | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    const socket: TypedClientSocket = getSocket();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomCreated({ room: newRoom, player: newPlayer }: { room: ClientRoomView; player: Player }) {
      setRoom(newRoom);
      setPlayer(newPlayer);
      savePlayerName(newPlayer.name);
      setError(null);
    }

    function onRoomJoined({ room: newRoom, player: newPlayer }: { room: ClientRoomView; player: Player }) {
      setRoom(newRoom);
      setPlayer(newPlayer);
      savePlayerName(newPlayer.name);
      setError(null);
    }

    function onRoomUpdated({ room: updatedRoom }: { room: ClientRoomView }) {
      setRoom(updatedRoom);
      setPlayer((prev) => {
        if (!prev) return null;
        const matching = updatedRoom.players.find((p) => p.id === prev.id);
        return matching || prev;
      });
    }

    function onRoomError({ message }: { message: string }) {
      setError(message);
    }

    function onDraftError({ message }: { message: string }) {
      setError(message);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:created', onRoomCreated);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:updated', onRoomUpdated);
    socket.on('room:error', onRoomError);
    socket.on('draft:error', onDraftError);

    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:created', onRoomCreated);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:updated', onRoomUpdated);
      socket.off('room:error', onRoomError);
      socket.off('draft:error', onDraftError);
    };
  }, []);

  const createRoom = useCallback((playerName: string, config?: Partial<RoomConfig>) => {
    const socket = getSocket();
    const playerId = getOrCreatePlayerId();
    setError(null);
    socket.emit('room:create', {
      playerName,
      playerId,
      config,
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const socket = getSocket();
    const playerId = getOrCreatePlayerId();
    setError(null);
    socket.emit('room:join', {
      roomCode,
      playerName,
      playerId,
    });
  }, []);

  const toggleReady = useCallback(() => {
    if (!room || !player) return;
    const socket = getSocket();
    socket.emit('player:ready', {
      roomCode: room.roomCode,
      playerId: player.id,
      ready: !player.ready,
    });
  }, [room, player]);

  const startDraft = useCallback(() => {
    if (!room || !player) return;
    const socket = getSocket();
    setError(null);
    socket.emit('draft:start', {
      roomCode: room.roomCode,
      playerId: player.id,
    });
  }, [room, player]);

  const selectPokemon = useCallback((pokemonId: number) => {
    if (!room || !player) return;
    const socket = getSocket();
    setError(null);
    socket.emit('draft:selectPokemon', {
      roomCode: room.roomCode,
      playerId: player.id,
      pokemonId,
    });
  }, [room, player]);

  const leaveRoom = useCallback(() => {
    if (!room || !player) return;
    const socket = getSocket();
    socket.emit('room:leave', {
      roomCode: room.roomCode,
      playerId: player.id,
    });
    setRoom(null);
    setPlayer(null);
    setError(null);
  }, [room, player]);

  const isHost = Boolean(room && player && room.hostId === player.id);

  return (
    <GameSocketContext.Provider
      value={{
        isConnected,
        room,
        player,
        error,
        isHost,
        clearError,
        createRoom,
        joinRoom,
        toggleReady,
        startDraft,
        selectPokemon,
        leaveRoom,
      }}
    >
      {children}
    </GameSocketContext.Provider>
  );
}

export function useGameSocket() {
  const context = useContext(GameSocketContext);
  if (!context) {
    throw new Error('useGameSocket must be used within a GameSocketProvider');
  }
  return context;
}
