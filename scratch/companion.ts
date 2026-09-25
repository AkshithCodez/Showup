import { Dex, BattleStreams } from '@pkmn/sim';
import { ShowdownTeamAdapter } from '../apps/server/src/battle/ShowdownTeamAdapter.js';
import type { PokemonBuild } from '../packages/shared/src/index.js';

async function testChaos() {
  const garchompWithSpore: PokemonBuild = {
    speciesId: 445,
    speciesName: 'Garchomp',
    displayName: 'Garchomp',
    showdownId: 'garchomp',
    ability: 'Huge Power', // Normally illegal
    item: 'Choice Band',
    moves: ['Spore', 'V-create', 'Earthquake', 'Dragon Ascent'], // Normally illegal moves
    nature: 'Jolly',
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    teraType: 'Fire',
    level: 50,
  };

  const slakingWonderGuard: PokemonBuild = {
    speciesId: 289,
    speciesName: 'Slaking',
    displayName: 'Slaking',
    showdownId: 'slaking',
    ability: 'Wonder Guard', // Normally illegal
    item: 'Leftovers',
    moves: ['Spore', 'Belly Drum', 'Extreme Speed', 'Close Combat'],
    nature: 'Adamant',
    evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    teraType: 'Normal',
    level: 50,
  };

  const p1Team = ShowdownTeamAdapter.toPackedTeam([garchompWithSpore]);
  const p2Team = ShowdownTeamAdapter.toPackedTeam([slakingWonderGuard]);

  const stream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(stream);

  let p1Req: any = null;
  let error: string | null = null;

  (async () => {
    for await (const chunk of streams.p1) {
      if (chunk.includes('|error|')) {
        error = chunk;
      }
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) {
          const req = JSON.parse(line.slice(9));
          if (req.teamPreview) {
            streams.p1.write('default');
          } else {
            p1Req = req;
          }
        }
      }
    }
  })();

  (async () => {
    for await (const chunk of streams.p2) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) {
          const req = JSON.parse(line.slice(9));
          if (req.teamPreview) {
            streams.p2.write('default');
          }
        }
      }
    }
  })();

  (async () => {
    for await (const chunk of streams.omniscient) {
      if (chunk.includes('|move|') || chunk.includes('|-status|')) {
        console.log('Battle Protocol:', chunk.trim());
      }
    }
  })();

  await streams.omniscient.write(`>start {"formatid":"gen9customgame"}\n>player p1 {"name":"P1","team":"${p1Team}"}\n>player p2 {"name":"P2","team":"${p2Team}"}`);

  await new Promise(r => setTimeout(r, 400));

  if (error) {
    console.log('❌ Chaos mode rejected:', error);
    return;
  }

  console.log('✓ Chaos mode team accepted by gen9customgame!');
  console.log('P1 available moves:', p1Req?.active?.[0]?.moves?.map((m: any) => m.move));

  console.log('Turn 1: P1 uses Spore, P2 uses Belly Drum');
  await streams.p1.write('move 1');
  await streams.p2.write('move 2');

  await new Promise(r => setTimeout(r, 600));
}

testChaos().catch(console.error);
