import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ClientRoomView,
} from '@showup/shared';

const roomCode = process.argv[2];
if (!roomCode) {
  console.error('Please provide a room code.');
  process.exit(1);
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:4000');
const playerId = `bot-${Date.now()}`;
const playerName = 'Blue Rival';

console.log(`[Companion] Connecting to room ${roomCode} as ${playerName} (${playerId})...`);

socket.on('connect', () => {
  console.log('[Companion] Connected to server. Joining room...');
  socket.emit('room:join', {
    roomCode,
    playerName,
    playerId,
  });
});

socket.on('room:joined', ({ room }) => {
  console.log(`[Companion] Joined ${room.roomCode}. Setting ready...`);
  socket.emit('player:ready', {
    roomCode: room.roomCode,
    playerId,
    ready: true,
  });
});

socket.on('room:updated', async ({ room }) => {
  if (room.phase === 'lobby') {
    const me = room.players.find((p) => p.id === playerId);
    if (me && !me.ready) {
      socket.emit('player:ready', {
        roomCode: room.roomCode,
        playerId,
        ready: true,
      });
    }
  }

  // Draft phase
  if (room.phase === 'draft' && room.draft) {
    const myDraft = room.draft.myDraft;
    if (!myDraft.lockedIn && myDraft.currentOptions.length > 0) {
      const pick = myDraft.currentOptions[0];
      console.log(`[Companion] Drafting ${pick.displayName} (Round ${room.draft.roundNumber})...`);
      socket.emit('draft:selectPokemon', {
        roomCode: room.roomCode,
        playerId,
        pokemonId: pick.id,
      });
    }
  }

  // Team building phase
  if (room.phase === 'team-building' && room.teamBuilding) {
    const tb = room.teamBuilding;
    if (!tb.isReady) {
      console.log('[Companion] Entering team building. Auto-configuring all 6 Pokémon...');
      for (let i = 0; i < tb.pokemon.length; i++) {
        const options = tb.options[i];
        const ability = options.abilities[0]?.displayName || 'Pressure';
        const moves = options.moves.slice(0, 4).map((m) => m.displayName);
        
        socket.emit('team:updatePokemon', {
          roomCode: room.roomCode,
          playerId,
          pokemonIndex: i,
          build: {
            ability,
            item: 'Life Orb',
            moves,
            nature: 'Jolly',
            evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            teraType: 'Normal',
          },
        });
      }

      console.log('[Companion] Marking team as ready...');
      setTimeout(() => {
        socket.emit('team:ready', {
          roomCode: room.roomCode,
          playerId,
        });
      }, 1000);
    }
  }

  // Team reveal phase
  if (room.phase === 'team-reveal') {
    console.log('[Companion] Phase reached: team-reveal! Companion successfully done.');
  }
});

socket.on('room:error', ({ message }) => {
  console.error('[Companion Error]', message);
});

socket.on('team:error', ({ message }) => {
  console.error('[Companion Team Error]', message);
});
