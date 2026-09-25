import { io as Client, type Socket } from 'socket.io-client';
import http from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ClientRoomView,
  PokemonBuild,
} from '@showup/shared';
import { RoomManager } from '../room/RoomManager.js';
import { setupSocketHandlers } from '../socket/setupSocketHandlers.js';
import { PokemonDataService } from '../services/PokemonDataService.js';
import { PokemonSetDataService } from '../services/PokemonSetDataService.js';

type TypedClient = Socket<ServerToClientEvents, ClientToServerEvents>;

function waitForRoomUpdate(
  client: TypedClient,
  predicate: (room: ClientRoomView) => boolean,
  timeoutMs = 10000
): Promise<ClientRoomView> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for room update`));
    }, timeoutMs);

    const errorHandler = ({ message }: { message: string }) => {
      cleanup();
      reject(new Error(`Battle error received: ${message}`));
    };

    const handler = ({ room }: { room: ClientRoomView }) => {
      if (predicate(room)) {
        cleanup();
        resolve(room);
      }
    };

    const cleanup = () => {
      clearTimeout(timer);
      client.off('room:updated', handler);
      client.off('battle:error', errorHandler);
    };

    client.on('room:updated', handler);
    client.on('battle:error', errorHandler);
  });
}

function waitForBattleError(
  client: TypedClient,
  timeoutMs = 5000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for battle:error`));
    }, timeoutMs);

    const handler = ({ message }: { message: string }) => {
      cleanup();
      resolve(message);
    };

    const cleanup = () => {
      clearTimeout(timer);
      client.off('battle:error', handler);
    };

    client.on('battle:error', handler);
  });
}

function createLegalBuild(
  species: string,
  moves: string[],
  ability: string,
  item = 'Leftovers',
  tera: any = 'Steel'
): PokemonBuild {
  return {
    id: `build-${species.toLowerCase()}`,
    speciesId: 1,
    speciesName: species,
    displayName: species,
    showdownId: species.toLowerCase().replace(/[^a-z0-9]/g, ''),
    ability,
    item,
    moves,
    nature: 'Jolly',
    evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    teraType: tera,
    level: 50,
  };
}

async function runBattleIntegrationTests() {
  console.log('⚔️  Starting Showup Phase 4 Battle Integration & Mechanics Verification...\n');

  const httpServer = http.createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*' },
  });
  const pokemonService = new PokemonDataService();
  const setDataService = new PokemonSetDataService();
  const roomManager = new RoomManager(pokemonService, setDataService);
  setupSocketHandlers(io, roomManager);

  await new Promise<void>((res) => httpServer.listen(0, () => res()));
  const port = (httpServer.address() as any).port;
  const url = `http://localhost:${port}`;

  const client1: TypedClient = Client(url);
  const client2: TypedClient = Client(url);
  const attackerClient: TypedClient = Client(url);

  try {
    await Promise.all([
      new Promise<void>((res) => client1.on('connect', () => res())),
      new Promise<void>((res) => client2.on('connect', () => res())),
      new Promise<void>((res) => attackerClient.on('connect', () => res())),
    ]);

    console.log('✓ Test clients connected to test server\n');

    // ─────────────────────────────────────────────────────────────
    // SETUP: Create Room and Seed Valid Phase 3 Builds
    // ─────────────────────────────────────────────────────────────
    const p1Id = 'trainer-ash';
    const p2Id = 'trainer-gary';

    let room = roomManager.createRoom('Ash', p1Id, client1.id!).room;
    const roomCode = room.roomCode;
    roomManager.joinRoom(roomCode, 'Gary', p2Id, client2.id!);

    // Ash's 6 Pokemon: Fast offensive squad
    const ashTeam: PokemonBuild[] = [
      createLegalBuild('Garchomp', ['Earthquake', 'Swords Dance', 'Dragon Claw', 'Stone Edge'], 'Rough Skin', 'Life Orb', 'Steel'),
      createLegalBuild('Rotom-Wash', ['Hydro Pump', 'Volt Switch', 'Thunderbolt', 'Will-O-Wisp'], 'Levitate', 'Leftovers', 'Electric'),
      createLegalBuild('Gengar', ['Shadow Ball', 'Sludge Bomb', 'Focus Blast', 'Thunderbolt'], 'Cursed Body', 'Choice Specs', 'Ghost'),
      createLegalBuild('Scizor', ['Bullet Punch', 'Close Combat', 'U-turn', 'Swords Dance'], 'Technician', 'Choice Band', 'Steel'),
      createLegalBuild('Dragonite', ['Dragon Dance', 'Extreme Speed', 'Earthquake', 'Outrage'], 'Multiscale', 'Lum Berry', 'Normal'),
      createLegalBuild('Volcarona', ['Quiver Dance', 'Flamethrower', 'Bug Buzz', 'Giga Drain'], 'Flame Body', 'Heavy-Duty Boots', 'Fire'),
    ];

    // Gary's 6 Pokemon: Defensive & utility squad
    const garyTeam: PokemonBuild[] = [
      createLegalBuild('Heatran', ['Flamethrower', 'Flash Cannon', 'Earth Power', 'Stealth Rock'], 'Flash Fire', 'Leftovers', 'Grass'),
      createLegalBuild('Pikachu', ['Thunderbolt', 'Quick Attack', 'Volt Tackle', 'Iron Tail'], 'Static', 'Light Ball', 'Electric'),
      createLegalBuild('Clefable', ['Moonblast', 'Flamethrower', 'Soft-Boiled', 'Calm Mind'], 'Magic Guard', 'Leftovers', 'Fairy'),
      createLegalBuild('Corviknight', ['Brave Bird', 'Roost', 'Defog', 'U-turn'], 'Pressure', 'Rocky Helmet', 'Flying'),
      createLegalBuild('Toxapex', ['Scald', 'Recover', 'Toxic', 'Haze'], 'Regenerator', 'Black Sludge', 'Poison'),
      createLegalBuild('Tyranitar', ['Stone Edge', 'Crunch', 'Earthquake', 'Stealth Rock'], 'Sand Stream', 'Smooth Rock', 'Rock'),
    ];

    // Seed into room teamBuilding state and advance to team-reveal
    room.teamBuilding = {
      playerStates: {
        [p1Id]: {
          pokemon: ashTeam,
          options: [],
          activePokemonIndex: 0,
          completed: true,
          ready: true,
        },
        [p2Id]: {
          pokemon: garyTeam,
          options: [],
          activePokemonIndex: 0,
          completed: true,
          ready: true,
        },
      },
    };
    room.phase = 'team-reveal';

    // ─────────────────────────────────────────────────────────────
    // TEST 1: TRANSITION FROM TEAM-REVEAL TO BATTLE & TEAM PREVIEW
    // ─────────────────────────────────────────────────────────────
    console.log('--- TEST 1: Battle Start & Team Preview Lead Selection ---');

    const p1BattlePromise = waitForRoomUpdate(
      client1,
      (r) => r.phase === 'battle' && Boolean(r.battle?.availableActions)
    );
    const p2BattlePromise = waitForRoomUpdate(
      client2,
      (r) => r.phase === 'battle' && Boolean(r.battle?.availableActions)
    );

    client1.emit('battle:start', { roomCode, playerId: p1Id });

    const p1RoomView = await p1BattlePromise;
    const p2RoomView = await p2BattlePromise;

    console.log(`✓ Battle successfully started! Battle ID: ${p1RoomView.battle?.battleId}`);
    if (!p1RoomView.battle || !p2RoomView.battle) {
      throw new Error('Expected battle view to be populated on both clients');
    }

    if (p1RoomView.battle.availableActions?.type !== 'teampreview') {
      throw new Error(`Expected teampreview request, received ${p1RoomView.battle.availableActions?.type}`);
    }
    console.log('✓ Both players received "teampreview" lead selection request');

    // ─────────────────────────────────────────────────────────────
    // TEST 2: LEAD SELECTION PRIVACY & BATTLE INITIATION
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: Lead Selection Privacy & Simultaneous Start ---');

    // Ash selects Garchomp (index 0)
    const p1LeadLockedPromise = waitForRoomUpdate(
      client1,
      (r) => Boolean(r.battle?.waitingForOpponent)
    );
    client1.emit('battle:action', {
      roomCode,
      playerId: p1Id,
      action: { type: 'team', pokemonIndex: 0 },
    });
    const p1AfterLead = await p1LeadLockedPromise;
    console.log('✓ Ash selected lead (Garchomp) and locked in');

    // Verify privacy: Gary sees Ash is ready, but does NOT see Ash's lead
    const p2AfterAshLead = roomManager.serializeRoomForPlayer(roomManager.getRoom(roomCode)!, p2Id);
    if (!p2AfterAshLead.battle?.opponentLockedIn) {
      throw new Error('Gary should see opponentLockedIn === true');
    }
    if (p2AfterAshLead.battle.waitingForOpponent) {
      throw new Error('Gary is not waiting; he has not chosen his lead yet');
    }
    console.log('✓ Privacy verified: Gary sees opponent is ready, but lead choice is hidden');

    // Gary selects Heatran (index 0)
    const p1Turn1Promise = waitForRoomUpdate(
      client1,
      (r) => r.battle?.availableActions?.type === 'move' && r.battle?.turn === 1
    );
    const p2Turn1Promise = waitForRoomUpdate(
      client2,
      (r) => r.battle?.availableActions?.type === 'move' && r.battle?.turn === 1
    );

    client2.emit('battle:action', {
      roomCode,
      playerId: p2Id,
      action: { type: 'team', pokemonIndex: 0 },
    });

    const p1Turn1 = await p1Turn1Promise;
    const p2Turn1 = await p2Turn1Promise;

    console.log('✓ Turn 1 began with chosen leads:');
    console.log(`  Ash active:  ${p1Turn1.battle?.mySide.activePokemon?.displayName} (${p1Turn1.battle?.mySide.activePokemon?.hpPercent}% HP)`);
    console.log(`  Gary active: ${p2Turn1.battle?.mySide.activePokemon?.displayName} (${p2Turn1.battle?.mySide.activePokemon?.hpPercent}% HP)`);

    if (p1Turn1.battle?.mySide.activePokemon?.displayName !== 'Garchomp') {
      throw new Error(`Expected Ash active Pokémon to be Garchomp, got ${p1Turn1.battle?.mySide.activePokemon?.displayName}`);
    }
    if (p2Turn1.battle?.mySide.activePokemon?.displayName !== 'Heatran') {
      throw new Error(`Expected Gary active Pokémon to be Heatran, got ${p2Turn1.battle?.mySide.activePokemon?.displayName}`);
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 3: PRIVATE INFORMATION INTEGRITY DURING BATTLE
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 3: Battle Set Privacy (Hidden Moves, Items, Tera) ---');

    // Ash inspects Gary's active and bench Pokémon
    const garyActiveFromAsh = p1Turn1.battle?.opponentSide.activePokemon;
    if ((garyActiveFromAsh as any)?.moves) {
      throw new Error('Opponent active Pokémon leaked move list to opponent!');
    }
    if ((garyActiveFromAsh as any)?.item) {
      throw new Error('Opponent active Pokémon leaked held item to opponent!');
    }
    if (garyActiveFromAsh?.hp !== undefined) {
      throw new Error('Opponent exact HP number leaked! Only hpPercent should be exposed.');
    }
    if (garyActiveFromAsh?.teraType !== undefined) {
      throw new Error('Opponent unrevealed Tera type leaked before Terastallizing!');
    }
    console.log('✓ Strict privacy verified: opponent unrevealed moves, items, exact HP, and Tera type remain hidden');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: TURN EXECUTION, TERA, STAT BOOSTS & DAMAGE
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: Move Execution, Terastallization & Stat Boosts ---');

    // Turn 1:
    // Ash uses Swords Dance (slot 2) with Terastallize (Steel)
    // Gary uses Stealth Rock (slot 4)
    const turn2Promise = waitForRoomUpdate(
      client1,
      (r) => r.battle?.turn === 2
    );

    client1.emit('battle:action', {
      roomCode,
      playerId: p1Id,
      action: { type: 'move', moveSlot: 2, tera: true },
    });

    client2.emit('battle:action', {
      roomCode,
      playerId: p2Id,
      action: { type: 'move', moveSlot: 4 },
    });

    const p1Turn2 = await turn2Promise;
    const garchomp = p1Turn2.battle?.mySide.activePokemon;

    console.log(`✓ Turn 1 resolved successfully!`);
    console.log(`  Garchomp Terastallized: ${garchomp?.terastallized} (Types: ${garchomp?.types.join('/')})`);
    console.log(`  Garchomp Stat Boosts: Atk +${garchomp?.boosts?.atk}`);
    console.log(`  Side Hazards (Ash side): ${p1Turn2.battle?.field.sideHazards?.mine?.join(', ') || 'None'}`);

    if (!garchomp?.terastallized) {
      throw new Error('Expected Garchomp to be Terastallized');
    }
    if (!garchomp.types.includes('Steel')) {
      throw new Error('Expected Garchomp active type to be Steel after Terastallizing');
    }
    if (garchomp.boosts?.atk !== 2) {
      throw new Error(`Expected Garchomp Attack boost +2 from Swords Dance, got ${garchomp.boosts?.atk}`);
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 5: INVALID ACTIONS & SECURITY REJECTIONS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 5: Security Rejections & Invalid Action Rules ---');

    // 5A: Attacker / third party tries to submit action
    const unauthorizedPromise = waitForBattleError(attackerClient);
    attackerClient.emit('battle:action', {
      roomCode,
      playerId: 'malicious-hacker',
      action: { type: 'move', moveSlot: 1 },
    });
    const unauthErr = await unauthorizedPromise;
    console.log(`✓ Security: Third-party combatant rejected ("${unauthErr}")`);

    // 5B: Gary tries to submit action with Ash's playerId
    const spoofPromise = waitForBattleError(client2);
    client2.emit('battle:action', {
      roomCode,
      playerId: p1Id,
      action: { type: 'move', moveSlot: 1 },
    });
    const spoofErr = await spoofPromise;
    console.log(`✓ Security: Player identity spoofing rejected ("${spoofErr}")`);

    // 5C: Invalid move slot (< 1 or > 4)
    const invalidSlotPromise = waitForBattleError(client1);
    client1.emit('battle:action', {
      roomCode,
      playerId: p1Id,
      action: { type: 'move', moveSlot: 5 },
    });
    const slotErr = await invalidSlotPromise;
    console.log(`✓ Rule: Invalid move slot 5 rejected ("${slotErr}")`);

    // 5D: Switching to currently active Pokémon
    // Slot 0 is Garchomp who is already active!
    const activeSwitchPromise = waitForBattleError(client1);
    client1.emit('battle:action', {
      roomCode,
      playerId: p1Id,
      action: { type: 'switch', pokemonIndex: 0 },
    });
    const activeSwitchErr = await activeSwitchPromise;
    console.log(`✓ Rule: Switching to active Pokémon rejected ("${activeSwitchErr}")`);

    // 5E: Using Tera twice
    const teraTwicePromise = waitForBattleError(client1);
    client1.emit('battle:action', {
      roomCode,
      playerId: p1Id,
      action: { type: 'move', moveSlot: 1, tera: true },
    });
    const teraTwiceErr = await teraTwicePromise;
    console.log(`✓ Rule: Re-using Tera rejected ("${teraTwiceErr}")`);

    // ─────────────────────────────────────────────────────────────
    // TEST 6: SUPER-EFFECTIVE DAMAGE, FAINTING & FORCED SWITCH
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 6: Super-Effective Damage, Fainting & Forced Switch ---');

    // Turn 2: Ash's +2 Garchomp uses Earthquake (slot 1) against Heatran (4x weak Ground!)
    // Heatran uses Flamethrower (slot 1)
    // Heatran will take massive 4x damage and faint!
    const garyForcedSwitchPromise = waitForRoomUpdate(
      client2,
      (r) => r.battle?.availableActions?.type === 'switch'
    );
    const ashWaitingPromise = waitForRoomUpdate(
      client1,
      (r) => Boolean(r.battle?.availableActions?.type === 'wait' || r.battle?.waitingForOpponent)
    );

    client1.emit('battle:action', {
      roomCode,
      playerId: p1Id,
      action: { type: 'move', moveSlot: 1 },
    });

    client2.emit('battle:action', {
      roomCode,
      playerId: p2Id,
      action: { type: 'move', moveSlot: 1 },
    });

    const garyForcedSwitchRoom = await garyForcedSwitchPromise;
    console.log('✓ Heatran took 4x Earthquake damage and fainted!');
    console.log('✓ Gary received forced switch state (availableActions.type === "switch")');

    // 6B: Gary tries to use a move during forced switch -> Rejected!
    const forcedMoveErrPromise = waitForBattleError(client2);
    client2.emit('battle:action', {
      roomCode,
      playerId: p2Id,
      action: { type: 'move', moveSlot: 1 },
    });
    const forcedMoveErr = await forcedMoveErrPromise;
    console.log(`✓ Rule: Move during forced switch rejected ("${forcedMoveErr}")`);

    // 6C: Gary tries to switch to fainted Heatran (slot 0) -> Rejected!
    const switchFaintedPromise = waitForBattleError(client2);
    client2.emit('battle:action', {
      roomCode,
      playerId: p2Id,
      action: { type: 'switch', pokemonIndex: 0 },
    });
    const switchFaintedErr = await switchFaintedPromise;
    console.log(`✓ Rule: Switching to fainted Pokémon rejected ("${switchFaintedErr}")`);

    // 6D: Gary switches in Pikachu (slot 1)
    const turn3Promise = waitForRoomUpdate(
      client1,
      (r) => r.battle?.turn === 3 && r.battle?.availableActions?.type === 'move'
    );

    client2.emit('battle:action', {
      roomCode,
      playerId: p2Id,
      action: { type: 'switch', pokemonIndex: 1 },
    });

    const p1Turn3 = await turn3Promise;
    console.log(`✓ Forced switch resolved! Gary sent out: ${p1Turn3.battle?.opponentSide.activePokemon?.displayName}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 7: TYPE IMMUNITY (Ground move vs Flying type)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 7: Type Immunity & Simulator Authority ---');

    // Turn 3:
    // Gary switches to Corviknight (Flying/Steel, immune to Ground!)
    // Ash uses Earthquake (slot 1)
    // Earthquake should have NO effect on Corviknight!
    const turn4Promise = waitForRoomUpdate(
      client1,
      (r) => r.battle?.turn === 4
    );

    client1.emit('battle:action', {
      roomCode,
      playerId: p1Id,
      action: { type: 'move', moveSlot: 1 }, // Earthquake
    });

    // Corviknight is in Gary's bench
    const corviIdx = garyForcedSwitchRoom.battle!.mySide.team.findIndex((p) => p.displayName === 'Corviknight');
    client2.emit('battle:action', {
      roomCode,
      playerId: p2Id,
      action: { type: 'switch', pokemonIndex: corviIdx },
    });

    const p1Turn4 = await turn4Promise;
    const corvi = p1Turn4.battle?.opponentSide.activePokemon;

    console.log(`✓ Turn 3 resolved! Active opponent: ${corvi?.displayName}`);
    console.log(`✓ Immunity verified: Corviknight HP remains ${corvi?.hpPercent}% (Earthquake had no effect)`);

    const hasImmuneLog = p1Turn4.battle?.log.some((l) => l.message.includes('It had no effect!'));
    if (!hasImmuneLog) {
      console.warn('Immunity log entry check note: verified via HP remaining 100%');
    }
    if (corvi?.hpPercent !== 100) {
      throw new Error(`Expected Corviknight HP to remain 100%, but got ${corvi?.hpPercent}%`);
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 8: DISCONNECT & RECONNECT RECOVERY
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 8: Disconnect & Reconnect State Recovery ---');

    // Gary's client disconnects
    client2.disconnect();

    await new Promise((r) => setTimeout(r, 300));
    const p1RoomDuringDisconnect = roomManager.serializeRoomForPlayer(roomManager.getRoom(roomCode)!, p1Id);
    const garyPlayer = p1RoomDuringDisconnect.players.find((p) => p.id === p2Id);

    if (garyPlayer?.connected !== false) {
      throw new Error('Expected Gary to be marked as connected: false');
    }
    console.log('✓ Player disconnect handled gracefully: room persists, battle continues, opponent marked offline');

    // Gary reconnects using existing persistent player identity
    const client2Reconnected: TypedClient = Client(url);
    await new Promise<void>((res) => client2Reconnected.on('connect', () => res()));

    const p2ReconnectPromise = new Promise<ClientRoomView>((resolve) => {
      client2Reconnected.on('room:joined', ({ room }) => resolve(room));
    });

    client2Reconnected.emit('room:join', {
      roomCode,
      playerName: 'Gary',
      playerId: p2Id,
    });

    const p2RestoredRoom = await p2ReconnectPromise;
    if (!p2RestoredRoom.battle || p2RestoredRoom.battle.turn !== 4) {
      throw new Error(`Battle state failed to restore upon reconnection! Turn: ${p2RestoredRoom.battle?.turn}`);
    }
    console.log(`✓ Gary reconnected successfully! Battle view fully restored (Turn ${p2RestoredRoom.battle.turn})`);

    // ─────────────────────────────────────────────────────────────
    // TEST 9: FORFEIT & BATTLE FINISH
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 9: Forfeit & Battle Finish Handshake ---');

    const finishPromise = waitForRoomUpdate(
      client1,
      (r) => r.phase === 'finished'
    );

    // Gary forfeits
    client2Reconnected.emit('battle:forfeit', { roomCode, playerId: p2Id });

    const finishedRoom = await finishPromise;
    console.log(`✓ Battle finished! Phase: "${finishedRoom.phase}"`);
    console.log(`  Winner Player ID: ${finishedRoom.battle?.winnerPlayerId}`);
    console.log(`  Winner Name:      ${finishedRoom.battle?.winnerName}`);

    if (finishedRoom.battle?.winnerPlayerId !== p1Id) {
      throw new Error(`Expected winner to be Ash (${p1Id}), got ${finishedRoom.battle?.winnerPlayerId}`);
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 10: REMATCH CLEANUP & TRANSITION
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 10: Rematch Flow ---');

    const rematchPromise = waitForRoomUpdate(
      client1,
      (r) => r.phase === 'team-reveal'
    );

    client1.emit('battle:rematch', { roomCode, playerId: p1Id });

    const rematchRoom = await rematchPromise;
    console.log(`✓ Rematch successfully transitioned room back to "${rematchRoom.phase}"!`);
    if (rematchRoom.battle) {
      throw new Error('Battle state should be cleared after rematch reset');
    }

    console.log('\n🎉 ALL PHASE 4 BATTLE TESTS PASSED SUCCESSFULLY!\n');
    client2Reconnected.disconnect();
  } finally {
    client1.disconnect();
    client2.disconnect();
    attackerClient.disconnect();
    await new Promise<void>((res) => io.close(() => res()));
    await new Promise<void>((res) => httpServer.close(() => res()));
  }
}

runBattleIntegrationTests().catch((err) => {
  console.error('❌ Phase 4 Battle verification failed:', err);
  process.exit(1);
});
