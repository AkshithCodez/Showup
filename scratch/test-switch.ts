import { BattleStreams } from '@pkmn/sim';
import { ShowdownTeamAdapter } from '../apps/server/src/battle/ShowdownTeamAdapter.js';
import type { PokemonBuild } from '../packages/shared/src/index.js';

function makeDummyBuild(species: string): PokemonBuild {
  return {
    speciesId: species.toLowerCase(),
    speciesName: species,
    displayName: species,
    showdownId: species.toLowerCase(),
    ability: 'Overgrow',
    item: 'Leftovers',
    moves: ['Tackle', 'Growl', 'Vine Whip', 'Synthesis'],
    nature: 'Hardy',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    teraType: 'Grass',
    level: 50,
  };
}

async function test() {
  const p1Team = ShowdownTeamAdapter.toPackedTeam([
    makeDummyBuild('Bulbasaur'),
    makeDummyBuild('Ivysaur'),
    makeDummyBuild('Venusaur'),
  ]);

  const p2Team = ShowdownTeamAdapter.toPackedTeam([
    makeDummyBuild('Charmander'),
    makeDummyBuild('Charmeleon'),
    makeDummyBuild('Charizard'),
  ]);

  const stream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(stream);
  const spec = { formatid: 'gen9customgame' };
  const p1spec = { name: 'P1', team: p1Team };
  const p2spec = { name: 'P2', team: p2Team };
  
  (async () => {
    for await (const chunk of streams.p1) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) {
          const req = JSON.parse(line.slice(9));
          if (req.teamPreview) {
            console.log('P1 Team Preview received, auto-responding default...');
            streams.p1.write('default');
          } else {
            console.log('\n--- P1 Request ---');
            console.log('Active:', req.active?.[0]?.moves?.map((m: any) => m.move));
            console.log('Side pokemon:', req.side?.pokemon?.map((p: any, i: number) => `Slot ${i+1}: ${p.ident} (active=${p.active}, hp=${p.condition})`));
          }
        } else if (line.startsWith('|error|')) {
          console.log('P1 Error:', line);
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
            console.log('P2 Team Preview received, auto-responding default...');
            streams.p2.write('default');
          }
        }
      }
    }
  })();

  streams.omniscient.write(`>start ${JSON.stringify(spec)}\n>player p1 ${JSON.stringify(p1spec)}\n>player p2 ${JSON.stringify(p2spec)}`);

  await new Promise(r => setTimeout(r, 400));
  console.log('\n>>> P1 switching to slot 2 (Ivysaur)...');
  streams.p1.write('switch 2');
  streams.p2.write('move 1');
  await new Promise(r => setTimeout(r, 400));

  console.log('\n>>> P1 switching to slot 3 (Venusaur)...');
  streams.p1.write('switch 3');
  streams.p2.write('move 1');
  await new Promise(r => setTimeout(r, 400));
}
test();
