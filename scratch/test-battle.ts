import { BattleStreams, Teams } from '@pkmn/sim';
import { ShowdownTeamAdapter } from '../apps/server/src/battle/ShowdownTeamAdapter.js';
import type { PokemonBuild } from '../packages/shared/src/index.js';

function makeDummyBuild(species: string, moves: string[], ability = 'Overgrow', item = 'Leftovers', tera: any = 'Grass'): PokemonBuild {
  return {
    speciesId: 1,
    speciesName: species,
    displayName: species,
    showdownId: species.toLowerCase().replace(/[^a-z0-9]/g, ''),
    ability,
    item,
    moves,
    nature: 'Hardy',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    teraType: tera,
    level: 50,
  };
}

async function run() {
  const p1Team = ShowdownTeamAdapter.toPackedTeam([
    makeDummyBuild('Garchomp', ['Earthquake', 'Swords Dance', 'Dragon Claw', 'Stone Edge'], 'Rough Skin', 'Life Orb', 'Steel'),
    makeDummyBuild('Pikachu', ['Thunderbolt', 'Quick Attack', 'Volt Tackle', 'Iron Tail'], 'Static', 'Light Ball', 'Electric'),
  ]);

  const p2Team = ShowdownTeamAdapter.toPackedTeam([
    makeDummyBuild('Heatran', ['Flamethrower', 'Flash Cannon', 'Earth Power', 'Stealth Rock'], 'Flash Fire', 'Leftovers', 'Grass'),
    makeDummyBuild('Torkoal', ['Lava Plume', 'Solar Beam', 'Rapid Spin', 'Yawn'], 'Drought', 'Heat Rock', 'Fire'),
  ]);

  const stream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(stream);

  (async () => {
    for await (const chunk of streams.omniscient) {
      console.log('=== OMNISCIENT PROTOCOL CHUNK ===\n' + chunk);
    }
  })();

  (async () => {
    for await (const chunk of streams.p1) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) {
          const req = JSON.parse(line.slice(9));
          if (req.teamPreview) {
            streams.p1.write('default');
          } else {
            console.log('--- P1 REQUEST ACTIVE ---', JSON.stringify(req.active, null, 2));
            console.log('--- P1 REQUEST SIDE POKEMON ---', JSON.stringify(req.side?.pokemon, null, 2));
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

  await streams.omniscient.write(`>start {"formatid":"gen9customgame"}\n>player p1 {"name":"Alice","team":"${p1Team}"}\n>player p2 {"name":"Bob","team":"${p2Team}"}`);

  await new Promise(r => setTimeout(r, 500));

  console.log('\n>>> TURN 1: P1 uses Swords Dance with Tera, P2 uses Stealth Rock');
  await streams.p1.write('move 2 terastallize');
  await streams.p2.write('move 4');

  await new Promise(r => setTimeout(r, 600));

  console.log('\n>>> TURN 2: P1 uses Earthquake, P2 uses Flamethrower');
  await streams.p1.write('move 1');
  await streams.p2.write('move 1');

  await new Promise(r => setTimeout(r, 600));
}

run().catch(console.error);
