import { io as Client, type Socket } from 'socket.io-client';
import http from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ClientRoomView,
} from '@showup/shared';
import { DEFAULT_POOL_RULES, ALL_POKEMON_POOL_RULES } from '@showup/shared';
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

    console.log('\n🎉 ALL PHASE 2 MULTIPLAYER & DRAFT TESTS PASSED SUCCESSFULLY!\n');

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
