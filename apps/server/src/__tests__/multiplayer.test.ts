import { io as Client, type Socket } from 'socket.io-client';
import http from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ClientRoomView,
  PokemonBuild,
} from '@showup/shared';
import {
  DEFAULT_POOL_RULES,
  ALL_POKEMON_POOL_RULES,
  exportPokemonToShowdown,
  exportTeamToShowdown,
} from '@showup/shared';
import { RoomManager } from '../room/RoomManager.js';
import { setupSocketHandlers } from '../socket/setupSocketHandlers.js';
import { PokemonDataService } from '../services/PokemonDataService.js';

type TypedClient = Socket<ServerToClientEvents, ClientToServerEvents>;

function waitForRoomUpdate(
  client: TypedClient,
  predicate: (room: ClientRoomView) => boolean,
  timeoutMs = 12000
): Promise<ClientRoomView> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for room update`));
    }, timeoutMs);

    const errorHandler = ({ message }: { message: string }) => {
      cleanup();
      reject(new Error(`Draft error received: ${message}`));
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
      client.off('draft:error', errorHandler);
    };

    client.on('room:updated', handler);
    client.on('draft:error', errorHandler);
  });
}

function waitForTeamError(
  client: TypedClient,
  timeoutMs = 6000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for team:error`));
    }, timeoutMs);

    const handler = ({ message }: { message: string }) => {
      cleanup();
      resolve(message);
    };

    const cleanup = () => {
      clearTimeout(timer);
      client.off('team:error', handler);
    };

    client.on('team:error', handler);
  });
}



async function runMultiplayerAndDraftVerification() {
  console.log('🧪 Starting Showup Phase 2 Full Verification...\n');

  // Setup test server
  const httpServer = http.createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*' },
  });
  const pokemonService = new PokemonDataService();
  const roomManager = new RoomManager(pokemonService);
  setupSocketHandlers(io, roomManager);

  // ─────────────────────────────────────────────────────────────
  // TEST SECTION 0: COMPLETE POKÉMON POOL & REPRESENTATIVE VALIDATION
  // ─────────────────────────────────────────────────────────────
  console.log('--- SECTION 0: Complete Pokémon Pool & Category Validation ---');
  const poolStats = pokemonService.getPoolStats();
  console.log(`Base species discovered: ${poolStats.baseSpeciesDiscovered}`);
  console.log(`Battle-relevant entries generated: ${poolStats.battleRelevantEntriesGenerated}`);
  console.log(`Legendary entries: ${poolStats.legendaryEntries}`);
  console.log(`Mythical entries: ${poolStats.mythicalEntries}`);
  console.log(`Mega entries: ${poolStats.megaEntries}`);
  console.log(`Regional entries: ${poolStats.regionalEntries}`);
  console.log(`Alternate form entries: ${poolStats.alternateFormEntries}`);
  console.log(`Paradox entries: ${poolStats.paradoxEntries}`);
  console.log(`Ultra Beast entries: ${poolStats.ultraBeastEntries}`);

  if (poolStats.baseSpeciesDiscovered < 1000) {
    throw new Error(`Expected at least 1000 base species, found ${poolStats.baseSpeciesDiscovered}`);
  }
  if (poolStats.battleRelevantEntriesGenerated < 1200) {
    throw new Error(`Expected at least 1200 battle-relevant entries, found ${poolStats.battleRelevantEntriesGenerated}`);
  }

  // Verify representative Pokémon from every requested category
  const testCases = [
    { name: 'Bulbasaur', test: (p: any) => p && p.speciesId === 1 && !p.categories.legendary, desc: 'Early-stage' },
    { name: 'Caterpie', test: (p: any) => p && p.speciesId === 10, desc: 'Early-stage' },
    { name: 'Magikarp', test: (p: any) => p && p.speciesId === 129, desc: 'Early-stage' },
    { name: 'Garchomp', test: (p: any) => p && p.speciesId === 445 && p.bst === 600, desc: 'Fully evolved' },
    { name: 'Charizard', test: (p: any) => p && p.speciesId === 6, desc: 'Fully evolved' },
    { name: 'Pichu', test: (p: any) => p && p.speciesId === 172, desc: 'Baby' },
    { name: 'Togepi', test: (p: any) => p && p.speciesId === 175, desc: 'Baby' },
    { name: 'Mewtwo', test: (p: any) => p && p.categories.legendary, desc: 'Legendary' },
    { name: 'Rayquaza', test: (p: any) => p && p.categories.legendary, desc: 'Legendary' },
    { name: 'Mew', test: (p: any) => p && p.categories.mythical, desc: 'Mythical' },
    { name: 'Celebi', test: (p: any) => p && p.categories.mythical, desc: 'Mythical' },
    { name: 'Charizard-Mega-X', test: (p: any) => p && p.categories.mega, desc: 'Mega Evolution' },
    { name: 'Lucario-Mega', test: (p: any) => p && p.categories.mega, desc: 'Mega Evolution' },
    { name: 'Raichu-Alola', test: (p: any) => p && p.categories.regional, desc: 'Regional form' },
    { name: 'Weezing-Galar', test: (p: any) => p && p.categories.regional, desc: 'Regional form' },
    { name: 'Zoroark-Hisui', test: (p: any) => p && p.categories.regional, desc: 'Regional form' },
    { name: 'Rotom-Wash', test: (p: any) => p && p.categories.alternateForm, desc: 'Alternate form' },
    { name: 'Deoxys-Attack', test: (p: any) => p && p.categories.alternateForm, desc: 'Alternate form' },
    { name: 'Giratina-Origin', test: (p: any) => p && p.categories.alternateForm, desc: 'Alternate form' },
    { name: 'Great Tusk', test: (p: any) => p && p.categories.paradox, desc: 'Paradox' },
    { name: 'Iron Valiant', test: (p: any) => p && p.categories.paradox, desc: 'Paradox' },
    { name: 'Nihilego', test: (p: any) => p && p.categories.ultraBeast, desc: 'Ultra Beast' },
    { name: 'Buzzwole', test: (p: any) => p && p.categories.ultraBeast, desc: 'Ultra Beast' },
  ];

  for (const tc of testCases) {
    const p = pokemonService.getPokemonByName(tc.name);
    if (!p) throw new Error(`Could not find representative Pokémon: ${tc.name}`);
    if (!tc.test(p)) throw new Error(`Representative test failed for: ${tc.name}`);
    console.log(`✓ Verified representative (${tc.desc}): ${p.displayName} [BST: ${p.bst}, Types: ${p.types.join('/')}]`);
  }

  // Category Filtering verification
  const charizardMega = pokemonService.getPokemonByName('Charizard-Mega-X')!;
  const mewtwo = pokemonService.getPokemonByName('Mewtwo')!;
  const bulbasaur = pokemonService.getPokemonByName('Bulbasaur')!;

  if (pokemonService.isEligible(charizardMega, DEFAULT_POOL_RULES)) {
    throw new Error('Default rules should exclude Megas');
  }
  if (pokemonService.isEligible(mewtwo, DEFAULT_POOL_RULES)) {
    throw new Error('Default rules should exclude Legendaries');
  }
  if (!pokemonService.isEligible(bulbasaur, DEFAULT_POOL_RULES)) {
    throw new Error('Default rules must include regular Pokémon');
  }
  if (!pokemonService.isEligible(charizardMega, ALL_POKEMON_POOL_RULES)) {
    throw new Error('All Pokémon preset must include Megas');
  }
  if (!pokemonService.isEligible(mewtwo, ALL_POKEMON_POOL_RULES)) {
    throw new Error('All Pokémon preset must include Legendaries');
  }
  console.log('✓ Verified category filtering and "All Pokémon" preset eligibility\n');

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  const serverUrl = `http://localhost:${port}`;

  const createClient = (): TypedClient => {
    return Client(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      autoConnect: true,
    });
  };

  const client1 = createClient();
  const client2 = createClient();
  const client3 = createClient();

  try {
    await Promise.all([
      new Promise<void>((res) => client1.on('connect', res)),
      new Promise<void>((res) => client2.on('connect', res)),
      new Promise<void>((res) => client3.on('connect', res)),
    ]);
    console.log('✓ All 3 test clients connected via WebSocket');

    // ─────────────────────────────────────────────────────────────
    // TEST SECTION A: LOBBY & SAME-POOL DRAFT FLOW
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION A: Same-Pool Draft & Privacy Verification ---');

    // 1. Create Room with Same Pool mode
    let samePoolRoomCode = '';
    const createPromise = new Promise<ClientRoomView>((resolve) => {
      client1.on('room:created', ({ room, player }) => {
        if (!player.isHost) throw new Error('Player 1 should be host');
        samePoolRoomCode = room.roomCode;
        resolve(room);
      });
    });

    client1.emit('room:create', {
      playerName: 'Red',
      playerId: 'trainer-red',
      config: { draftMode: 'same-pool', teamSize: 6, poolRules: DEFAULT_POOL_RULES },
    });

    await createPromise;
    console.log(`✓ Room created (${samePoolRoomCode}) in Same-Pool mode`);

    // 2. Player 2 Joins
    const p1JoinUpdate = waitForRoomUpdate(
      client1,
      (r) => r.players.length === 2 && r.phase === 'lobby'
    );

    client2.emit('room:join', {
      roomCode: samePoolRoomCode,
      playerName: 'Blue',
      playerId: 'trainer-blue',
    });

    await p1JoinUpdate;
    console.log('✓ Blue joined room');

    // 3. Ready up both players
    const bothReady = waitForRoomUpdate(client1, (r) => r.canStartDraft);

    client1.emit('player:ready', { roomCode: samePoolRoomCode, playerId: 'trainer-red', ready: true });
    client2.emit('player:ready', { roomCode: samePoolRoomCode, playerId: 'trainer-blue', ready: true });
    await bothReady;
    console.log('✓ Both players ready (canStartDraft: true)');

    // 4. Host starts draft
    const p1DraftViewPromise = waitForRoomUpdate(client1, (r) => r.phase === 'draft');
    const p2DraftViewPromise = waitForRoomUpdate(client2, (r) => r.phase === 'draft');

    client1.emit('draft:start', { roomCode: samePoolRoomCode, playerId: 'trainer-red' });

    const [p1View, p2View] = await Promise.all([p1DraftViewPromise, p2DraftViewPromise]);

    if (!p1View.draft || !p2View.draft) throw new Error('Draft view missing on clients');
    if (p1View.draft.myDraft.currentOptions.length !== 3) throw new Error('Expected 3 options for P1');
    if (p2View.draft.myDraft.currentOptions.length !== 3) throw new Error('Expected 3 options for P2');

    // Verify same pool received identical 3 options
    const p1OptionIds = p1View.draft.myDraft.currentOptions.map((p) => p.id).sort();
    const p2OptionIds = p2View.draft.myDraft.currentOptions.map((p) => p.id).sort();
    if (JSON.stringify(p1OptionIds) !== JSON.stringify(p2OptionIds)) {
      throw new Error('Same-pool options did not match between players');
    }
    console.log(`✓ Draft started in Same-Pool mode! Both players received identical options: [${p1OptionIds.join(', ')}]`);

    // 5. Test Invalid Selection (Security)
    const invalidSelectionPromise = new Promise<string>((resolve) => {
      client1.once('draft:error', ({ message }) => resolve(message));
    });
    client1.emit('draft:selectPokemon', {
      roomCode: samePoolRoomCode,
      playerId: 'trainer-red',
      pokemonId: 999999,
    });
    const errMessage = await invalidSelectionPromise;
    console.log(`✓ Invalid Pokémon selection rejected: "${errMessage}"`);

    // 6. Player 1 locks in pick
    const p1Pick = p1View.draft.myDraft.currentOptions[0];
    const p1LockedPromise = waitForRoomUpdate(
      client1,
      (r) => Boolean(r.draft?.myDraft.lockedIn)
    );
    const p2SeesP1LockedPromise = waitForRoomUpdate(
      client2,
      (r) => Boolean(r.draft?.opponentDraft?.lockedIn)
    );

    client1.emit('draft:selectPokemon', {
      roomCode: samePoolRoomCode,
      playerId: 'trainer-red',
      pokemonId: p1Pick.id,
    });

    const [, p2SeesP1View] = await Promise.all([p1LockedPromise, p2SeesP1LockedPromise]);

    // PRIVACY VERIFICATION:
    if ((p2SeesP1View.draft as any)?.opponentDraft?.team) {
      throw new Error('PRIVACY LEAK: Opponent team array was sent to client!');
    }
    if (p2SeesP1View.draft?.opponentDraft?.teamCount !== 1) {
      throw new Error('Opponent draft teamCount mismatch');
    }
    console.log(`✓ Player 1 picked ${p1Pick.displayName} and locked in. Opponent sees status lockedIn: true without revealing choice.`);

    // 7. Test Duplicate Selection in Same Round (Security)
    const duplicateSubmissionPromise = new Promise<string>((resolve) => {
      client1.once('draft:error', ({ message }) => resolve(message));
    });
    client1.emit('draft:selectPokemon', {
      roomCode: samePoolRoomCode,
      playerId: 'trainer-red',
      pokemonId: p1Pick.id,
    });
    const dupErr = await duplicateSubmissionPromise;
    console.log(`✓ Duplicate submission while locked in rejected: "${dupErr}"`);

    // 8. Player 2 locks in pick
    const p2Pick = p2View.draft.myDraft.currentOptions[0];
    const advanceToRound2Promise = waitForRoomUpdate(
      client1,
      (r) => Boolean(r.draft && r.draft.roundNumber === 2 && !r.draft.myDraft.lockedIn)
    );

    client2.emit('draft:selectPokemon', {
      roomCode: samePoolRoomCode,
      playerId: 'trainer-blue',
      pokemonId: p2Pick.id,
    });

    const round2View = await advanceToRound2Promise;
    console.log(`✓ Player 2 selected. Both advanced simultaneously to Round ${round2View.draft?.roundNumber} with 3 new options!`);

    // ─────────────────────────────────────────────────────────────
    // TEST SECTION B: INDEPENDENT DRAFT & FULL COMPLETION (6 ROUNDS)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION B: Independent Mode & 6-Pick Completion ---');

    let indRoomCode = '';
    const createIndPromise = new Promise<ClientRoomView>((resolve) => {
      client1.once('room:created', ({ room }) => {
        indRoomCode = room.roomCode;
        resolve(room);
      });
    });

    client1.emit('room:create', {
      playerName: 'Ash',
      playerId: 'trainer-ash-2',
      config: { draftMode: 'independent', teamSize: 6, poolRules: ALL_POKEMON_POOL_RULES },
    });
    await createIndPromise;

    const indJoinPromise = waitForRoomUpdate(
      client1,
      (r) => r.roomCode === indRoomCode && r.players.length === 2
    );

    client2.emit('room:join', {
      roomCode: indRoomCode,
      playerName: 'Gary',
      playerId: 'trainer-gary-2',
    });
    await indJoinPromise;

    const indBothReady = waitForRoomUpdate(
      client1,
      (r) => r.roomCode === indRoomCode && r.canStartDraft
    );

    client1.emit('player:ready', { roomCode: indRoomCode, playerId: 'trainer-ash-2', ready: true });
    client2.emit('player:ready', { roomCode: indRoomCode, playerId: 'trainer-gary-2', ready: true });
    await indBothReady;

    // Start draft
    const p1IndDraftStarted = waitForRoomUpdate(
      client1,
      (r) => r.roomCode === indRoomCode && r.phase === 'draft'
    );
    const p2IndDraftStarted = waitForRoomUpdate(
      client2,
      (r) => r.roomCode === indRoomCode && r.phase === 'draft'
    );

    client1.emit('draft:start', { roomCode: indRoomCode, playerId: 'trainer-ash-2' });
    let [p1CurrentRoom, p2CurrentRoom] = await Promise.all([p1IndDraftStarted, p2IndDraftStarted]);
    console.log(`✓ Independent draft started for ${indRoomCode}`);

    const onUpdateP1 = ({ room }: { room: ClientRoomView }) => {
      if (room.roomCode === indRoomCode) p1CurrentRoom = room;
    };
    const onUpdateP2 = ({ room }: { room: ClientRoomView }) => {
      if (room.roomCode === indRoomCode) p2CurrentRoom = room;
    };

    client1.on('room:updated', onUpdateP1);
    client2.on('room:updated', onUpdateP2);

    // Verify option independence
    const p1StartIds = p1CurrentRoom.draft!.myDraft.currentOptions.map((p) => p.id);
    console.log(`✓ P1 Initial Options: [${p1StartIds.join(', ')}]`);

    // Progressively draft all 6 picks for both players
    for (let pick = 1; pick <= 6; pick++) {
      // Player 1 pick
      const p1Options = p1CurrentRoom.draft!.myDraft.currentOptions;
      if (!p1Options || p1Options.length === 0) {
        throw new Error(`P1 has no options available on pick ${pick}`);
      }
      const p1Chosen = p1Options[0];

      const p1NextPromise = waitForRoomUpdate(
        client1,
        (r) =>
          r.roomCode === indRoomCode &&
          (r.draft?.myDraft.team.length === pick || r.phase === 'team-building')
      );

      client1.emit('draft:selectPokemon', {
        roomCode: indRoomCode,
        playerId: 'trainer-ash-2',
        pokemonId: p1Chosen.id,
      });

      await p1NextPromise;

      // Player 2 pick
      const p2Options = p2CurrentRoom.draft!.myDraft.currentOptions;
      if (!p2Options || p2Options.length === 0) {
        throw new Error(`P2 has no options available on pick ${pick}`);
      }
      const p2Chosen = p2Options[0];

      const p2NextPromise = waitForRoomUpdate(
        client2,
        (r) =>
          r.roomCode === indRoomCode &&
          (r.draft?.myDraft.team.length === pick || r.phase === 'team-building')
      );

      client2.emit('draft:selectPokemon', {
        roomCode: indRoomCode,
        playerId: 'trainer-gary-2',
        pokemonId: p2Chosen.id,
      });

      await p2NextPromise;
    }

    client1.off('room:updated', onUpdateP1);
    client2.off('room:updated', onUpdateP2);


    if (p1CurrentRoom.draft?.myDraft.team.length !== 6) {
      throw new Error(`Expected 6 drafted Pokémon for P1, got ${p1CurrentRoom.draft?.myDraft.team.length}`);
    }
    if (p2CurrentRoom.draft?.myDraft.team.length !== 6) {
      throw new Error(`Expected 6 drafted Pokémon for P2, got ${p2CurrentRoom.draft?.myDraft.team.length}`);
    }

    // Both reached team-building!
    if (p1CurrentRoom.phase !== 'team-building') {
      p1CurrentRoom = await waitForRoomUpdate(
        client1,
        (r) => r.roomCode === indRoomCode && r.phase === 'team-building'
      );
    }

    console.log(`✓ Both trainers completed 6/6 picks!`);
    console.log(`✓ Room phase successfully transitioned to: "${p1CurrentRoom.phase}"`);
    console.log(`✓ Drafted squad for Ash: ${p1CurrentRoom.draft?.myDraft.team.map((p) => p.displayName).join(', ') ?? 'N/A'}`);

    // ─────────────────────────────────────────────────────────────
    // TEST SECTION 4: PHASE 3 - TEAM BUILDING, VALIDATION & REVEAL
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 4: Phase 3 Team Building, Security, Privacy & Showdown Export ---');

    if (p2CurrentRoom.phase !== 'team-building') {
      p2CurrentRoom = await waitForRoomUpdate(
        client2,
        (r) => r.roomCode === indRoomCode && r.phase === 'team-building'
      );
    }

    // 1. Initial State Checks
    if (!p1CurrentRoom.teamBuilding || !p2CurrentRoom.teamBuilding) {
      throw new Error('Expected teamBuilding view to be present on both clients');
    }

    const p1TB = p1CurrentRoom.teamBuilding;
    const p2TB = p2CurrentRoom.teamBuilding;

    if (p1TB.pokemon.length !== 6 || p1TB.options.length !== 6) {
      throw new Error(`Expected 6 builds & 6 option sets for P1, got ${p1TB.pokemon.length}/${p1TB.options.length}`);
    }
    if (p2TB.pokemon.length !== 6 || p2TB.options.length !== 6) {
      throw new Error(`Expected 6 builds & 6 option sets for P2, got ${p2TB.pokemon.length}/${p2TB.options.length}`);
    }

    // Check defaults on P1 slot 0
    const slot0 = p1TB.pokemon[0];
    if (slot0.level !== 100) throw new Error(`Expected default level 100, got ${slot0.level}`);
    if (slot0.moves.length !== 0) throw new Error(`Expected 0 initial moves, got ${slot0.moves.length}`);
    if (slot0.nature !== 'Hardy') throw new Error(`Expected default nature Hardy, got ${slot0.nature}`);
    if (!slot0.ability) throw new Error('Expected default ability to be set');
    if (!slot0.teraType) throw new Error('Expected default teraType to be set');
    if (slot0.ivs.hp !== 31 || slot0.ivs.atk !== 31 || slot0.ivs.spe !== 31) {
      throw new Error('Expected default IVs to be all 31');
    }
    if (slot0.evs.hp !== 0 || slot0.evs.atk !== 0 || slot0.evs.spe !== 0) {
      throw new Error('Expected default EVs to be all 0');
    }

    console.log('✓ Initial team building state initialized with sensible competitive defaults');

    // 2. Strict Privacy Verification
    if ((p1CurrentRoom as any).revealedTeams) {
      throw new Error('revealedTeams must NOT be exposed during team-building phase');
    }
    if ((p1TB as any).opponent?.pokemon) {
      throw new Error('Opponent pokemon builds must NOT be exposed to Client 1 during team building');
    }
    if ((p2TB as any).opponent?.pokemon) {
      throw new Error('Opponent pokemon builds must NOT be exposed to Client 2 during team building');
    }
    if (p1TB.opponent.completedCount !== 0 || p1TB.opponent.ready !== false) {
      throw new Error('Opponent progress view mismatch');
    }

    console.log('✓ Strict privacy verified: neither player receives opponent abilities, moves, EVs, or items');

    // 3. Security & Authoritative Server Validation Rejection Tests
    console.log('--- Testing Authoritative Security & Validation Rejections ---');

    // A. EV > 252
    const errPromiseA = waitForTeamError(client1);
    client1.emit('team:updatePokemon', {
      roomCode: indRoomCode,
      playerId: 'trainer-ash-2',
      pokemonIndex: 0,
      build: { evs: { hp: 255, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
    });
    const errA = await errPromiseA;
    if (!errA.includes('between 0 and 252')) {
      throw new Error(`Expected EV range error, got: ${errA}`);
    }
    console.log(`✓ Security: EV > 252 rejected ("${errA}")`);

    // B. Total EVs > 510
    const errPromiseB = waitForTeamError(client1);
    client1.emit('team:updatePokemon', {
      roomCode: indRoomCode,
      playerId: 'trainer-ash-2',
      pokemonIndex: 0,
      build: { evs: { hp: 252, atk: 252, def: 10, spa: 0, spd: 0, spe: 0 } },
    });
    const errB = await errPromiseB;
    if (!errB.includes('cannot exceed 510')) {
      throw new Error(`Expected total EV error, got: ${errB}`);
    }
    console.log(`✓ Security: Total EVs > 510 rejected ("${errB}")`);

    // C. IV > 31
    const errPromiseC = waitForTeamError(client1);
    client1.emit('team:updatePokemon', {
      roomCode: indRoomCode,
      playerId: 'trainer-ash-2',
      pokemonIndex: 0,
      build: { ivs: { hp: 35, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } },
    });
    const errC = await errPromiseC;
    if (!errC.includes('between 0 and 31')) {
      throw new Error(`Expected IV range error, got: ${errC}`);
    }
    console.log(`✓ Security: IV > 31 rejected ("${errC}")`);

    // D. Duplicate Moves on same Pokemon
    const errPromiseD = waitForTeamError(client1);
    client1.emit('team:updatePokemon', {
      roomCode: indRoomCode,
      playerId: 'trainer-ash-2',
      pokemonIndex: 0,
      build: { moves: ['Earthquake', 'Earthquake', 'Swords Dance', 'Protect'] },
    });
    const errD = await errPromiseD;
    if (!errD.includes('Duplicate moves')) {
      throw new Error(`Expected duplicate move error, got: ${errD}`);
    }
    console.log(`✓ Security: Duplicate moves rejected ("${errD}")`);

    // E. More than 4 moves
    const errPromiseE = waitForTeamError(client1);
    client1.emit('team:updatePokemon', {
      roomCode: indRoomCode,
      playerId: 'trainer-ash-2',
      pokemonIndex: 0,
      build: { moves: ['M1', 'M2', 'M3', 'M4', 'M5'] },
    });
    const errE = await errPromiseE;
    if (!errE.includes('at most 4 moves')) {
      throw new Error(`Expected >4 moves error, got: ${errE}`);
    }
    console.log(`✓ Security: More than 4 moves rejected ("${errE}")`);

    // F. Unauthorized edit of opponent Pokemon
    const errPromiseF = waitForTeamError(client1);
    client1.emit('team:updatePokemon', {
      roomCode: indRoomCode,
      playerId: 'trainer-gary-2', // Ash tries to modify Gary's Pokemon
      pokemonIndex: 0,
      build: { nature: 'Modest' },
    });
    const errF = await errPromiseF;
    if (!errF.includes('Unauthorized')) {
      throw new Error(`Expected unauthorized error, got: ${errF}`);
    }
    console.log(`✓ Security: Modifying opponent Pokemon blocked ("${errF}")`);

    // G. Readying with incomplete team (< 4 moves)
    const errPromiseG = waitForTeamError(client1);
    client1.emit('team:ready', { roomCode: indRoomCode, playerId: 'trainer-ash-2' });
    const errG = await errPromiseG;
    if (!errG.includes('Validation failed')) {
      throw new Error(`Expected ready validation failure for incomplete sets, got: ${errG}`);
    }
    console.log(`✓ Security: Incomplete team ready rejected ("${errG}")`);

    // 4. Showdown Exporter Unit Tests
    console.log('--- Testing Pokémon Showdown Exporter Output ---');

    // Test Standard Garchomp
    const exportStandard = exportPokemonToShowdown({
      id: 'test-1',
      speciesId: 445,
      speciesName: 'garchomp',
      showdownId: 'garchomp',
      displayName: 'Garchomp',
      ability: 'Rough Skin',
      item: 'Life Orb',
      moves: ['Earthquake', 'Dragon Claw', 'Swords Dance', 'Fire Fang'],
      nature: 'Jolly',
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      teraType: 'Steel',
      level: 100,
    });

    if (!exportStandard.includes('Garchomp @ Life Orb')) throw new Error('Exporter missing item header');
    if (!exportStandard.includes('Ability: Rough Skin')) throw new Error('Exporter missing ability');
    if (!exportStandard.includes('Tera Type: Steel')) throw new Error('Exporter missing tera type');
    if (!exportStandard.includes('EVs: 4 HP / 252 Atk / 252 Spe')) throw new Error('Exporter EV format incorrect');
    if (!exportStandard.includes('Jolly Nature')) throw new Error('Exporter nature incorrect');
    if (!exportStandard.includes('- Earthquake')) throw new Error('Exporter move format incorrect');
    if (exportStandard.includes('IVs:')) throw new Error('Exporter should omit default 31 IVs');

    // Test 0 Atk IV
    const export0Atk = exportPokemonToShowdown({
      id: 'test-2',
      speciesId: 94,
      speciesName: 'gengar',
      showdownId: 'gengar',
      displayName: 'Gengar',
      ability: 'Cursed Body',
      item: 'Focus Sash',
      moves: ['Shadow Ball', 'Sludge Bomb', 'Focus Blast', 'Destiny Bond'],
      nature: 'Timid',
      evs: { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 },
      ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
      teraType: 'Ghost',
      level: 100,
    });
    if (!export0Atk.includes('IVs: 0 Atk')) throw new Error('Exporter missing 0 Atk IV');

    // Test 0 Spe IV
    const export0Spe = exportPokemonToShowdown({
      id: 'test-3',
      speciesId: 356,
      speciesName: 'dusclops',
      showdownId: 'dusclops',
      displayName: 'Dusclops',
      ability: 'Pressure',
      item: 'Eviolite',
      moves: ['Trick Room', 'Night Shade', 'Will-O-Wisp', 'Pain Split'],
      nature: 'Relaxed',
      evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 0 },
      teraType: 'Water',
      level: 100,
    });
    if (!export0Spe.includes('IVs: 0 Spe')) throw new Error('Exporter missing 0 Spe IV');

    // Test Mega Evolution
    const exportMega = exportPokemonToShowdown({
      id: 'test-4',
      speciesId: 6,
      speciesName: 'charizardmegax',
      showdownId: 'charizardmegax',
      displayName: 'Charizard-Mega-X',
      ability: 'Tough Claws',
      item: 'Charizardite X',
      moves: ['Flare Blitz', 'Dragon Claw', 'Roost', 'Dragon Dance'],
      nature: 'Jolly',
      evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      teraType: 'Dragon',
      level: 100,
    });
    if (!exportMega.includes('Charizard-Mega-X @ Charizardite X')) throw new Error('Mega export name mismatch');

    // Test Regional Form
    const exportRegional = exportPokemonToShowdown({
      id: 'test-5',
      speciesId: 26,
      speciesName: 'raichualola',
      showdownId: 'raichualola',
      displayName: 'Raichu-Alola',
      ability: 'Surge Surfer',
      item: 'Life Orb',
      moves: ['Thunderbolt', 'Psychic', 'Nasty Plot', 'Focus Blast'],
      nature: 'Timid',
      evs: { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      teraType: 'Electric',
      level: 100,
    });
    if (!exportRegional.includes('Raichu-Alola @ Life Orb')) throw new Error('Regional export name mismatch');

    console.log('✓ Showdown export output matches standard formatting across all test cases');

    // 5. Complete Valid Configuration for Player 1 (Ash)
    console.log('--- Configuring Ash\'s 6 Pokémon with Legal Sets ---');
    for (let i = 0; i < 6; i++) {
      const options = p1TB.options[i];
      const ability = options.abilities[0]?.displayName || 'Pressure';
      const moves = options.moves.slice(0, 4).map((m) => m.displayName);
      if (moves.length < 4) {
        throw new Error(`Drafted Pokémon ${p1TB.pokemon[i].displayName} has fewer than 4 moves available (${moves.length})`);
      }

      const updatePromise = waitForRoomUpdate(
        client1,
        (r) => r.teamBuilding?.pokemon[i].moves.length === 4
      );

      client1.emit('team:updatePokemon', {
        roomCode: indRoomCode,
        playerId: 'trainer-ash-2',
        pokemonIndex: i,
        build: {
          ability,
          item: 'Leftovers',
          moves,
          nature: 'Jolly',
          evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          teraType: 'Steel',
        },
      });

      p1CurrentRoom = await updatePromise;
    }

    if (p1CurrentRoom.teamBuilding?.completedCount !== 6) {
      throw new Error(`Expected Ash completedCount to be 6, got ${p1CurrentRoom.teamBuilding?.completedCount}`);
    }

    // Verify Gary sees Ash's progress count without seeing set details
    p2CurrentRoom = await waitForRoomUpdate(
      client2,
      (r) => r.teamBuilding?.opponent.completedCount === 6
    );
    if ((p2CurrentRoom.teamBuilding as any).opponent.pokemon) {
      throw new Error('Privacy violation: Gary received Ash\'s pokemon array');
    }
    console.log('✓ Ash configured all 6 Pokémon. Opponent progress updated to 6/6 (sets remain hidden)');

    // 6. Ash Locks In Ready
    const p1ReadyPromise = waitForRoomUpdate(
      client1,
      (r) => r.teamBuilding?.isReady === true
    );
    client1.emit('team:ready', { roomCode: indRoomCode, playerId: 'trainer-ash-2' });
    p1CurrentRoom = await p1ReadyPromise;

    if (p1CurrentRoom.phase !== 'team-building') {
      throw new Error('Room should remain in team-building until both players are ready');
    }

    // Attempting edit after ready should fail
    const errPromiseLocked = waitForTeamError(client1);
    client1.emit('team:updatePokemon', {
      roomCode: indRoomCode,
      playerId: 'trainer-ash-2',
      pokemonIndex: 0,
      build: { nature: 'Adamant' },
    });
    const errLocked = await errPromiseLocked;
    if (!errLocked.includes('already locked in')) {
      throw new Error(`Expected locked in error, got: ${errLocked}`);
    }
    console.log(`✓ Ash locked in ready. Post-ready mutations blocked ("${errLocked}")`);

    // 7. Gary Configures All 6 Pokémon
    console.log('--- Configuring Gary\'s 6 Pokémon with Legal Sets ---');
    for (let i = 0; i < 6; i++) {
      const options = p2TB.options[i];
      const ability = options.abilities[0]?.displayName || 'Blaze';
      const moves = options.moves.slice(0, 4).map((m) => m.displayName);
      if (moves.length < 4) {
        throw new Error(`Gary's Pokémon ${p2TB.pokemon[i].displayName} has fewer than 4 moves (${moves.length})`);
      }

      const updatePromise = waitForRoomUpdate(
        client2,
        (r) => r.teamBuilding?.pokemon[i].moves.length === 4
      );

      client2.emit('team:updatePokemon', {
        roomCode: indRoomCode,
        playerId: 'trainer-gary-2',
        pokemonIndex: i,
        build: {
          ability,
          item: 'Choice Scarf',
          moves,
          nature: 'Timid',
          evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
          ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
          teraType: 'Fairy',
        },
      });

      p2CurrentRoom = await updatePromise;
    }

    // 8. Gary Locks In Ready -> Triggers Transition to team-reveal!
    console.log('--- Gary Locks In Ready -> Transitioning to Team Reveal ---');
    const p1RevealPromise = waitForRoomUpdate(
      client1,
      (r) => r.phase === 'team-reveal'
    );
    const p2RevealPromise = waitForRoomUpdate(
      client2,
      (r) => r.phase === 'team-reveal'
    );

    client2.emit('team:ready', { roomCode: indRoomCode, playerId: 'trainer-gary-2' });

    p1CurrentRoom = await p1RevealPromise;
    p2CurrentRoom = await p2RevealPromise;

    console.log(`✓ Room phase successfully transitioned to: "${p1CurrentRoom.phase}"!`);

    // 9. Team Reveal Verification
    if (!p1CurrentRoom.revealedTeams || !p2CurrentRoom.revealedTeams) {
      throw new Error('revealedTeams should be populated for both clients on team-reveal');
    }

    const ashRevealed = p1CurrentRoom.revealedTeams['trainer-ash-2'];
    const garyRevealed = p1CurrentRoom.revealedTeams['trainer-gary-2'];

    if (!ashRevealed || ashRevealed.team.length !== 6) {
      throw new Error('Expected 6 revealed Pokémon for Ash');
    }
    if (!garyRevealed || garyRevealed.team.length !== 6) {
      throw new Error('Expected 6 revealed Pokémon for Gary');
    }

    // Ash can now inspect Gary's team
    const garySlot0 = garyRevealed.team[0];
    if (garySlot0.moves.length !== 4) throw new Error('Revealed moves count mismatch');
    if (garySlot0.item !== 'Choice Scarf') throw new Error('Revealed item mismatch');
    if (garySlot0.teraType !== 'Fairy') throw new Error('Revealed teraType mismatch');
    if (garySlot0.nature !== 'Timid') throw new Error('Revealed nature mismatch');

    console.log(`✓ Both rosters cleanly revealed:`);
    console.log(`  Ash squad:  ${ashRevealed.team.map((p) => p.displayName).join(', ')}`);
    console.log(`  Gary squad: ${garyRevealed.team.map((p) => p.displayName).join(', ')}`);

    // Export Ash's full team to Showdown
    const ashShowdownPaste = exportTeamToShowdown(ashRevealed.team);
    console.log('\n--- Generated Showdown Export (Ash\'s Team) ---');
    console.log(ashShowdownPaste);

    console.log('\n🎉 ALL PHASE 1 + PHASE 2 + PHASE 3 INTEGRATION TESTS PASSED SUCCESSFULLY!\n');

  } finally {
    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
    await new Promise<void>((res) => io.close(() => res()));
    await new Promise<void>((res) => httpServer.close(() => res()));
  }
}

runMultiplayerAndDraftVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
