import type {
  BattleLogEntry,
  BattleLogType,
  PokemonType,
} from '@showup/shared';

export interface ParsedCondition {
  hp: number;
  maxHp: number;
  hpPercent: number;
  fainted: boolean;
  status?: string;
}

export function parseCondition(condition: string): ParsedCondition {
  if (!condition || condition === '0 fnt' || condition.startsWith('0/')) {
    return { hp: 0, maxHp: 100, hpPercent: 0, fainted: true };
  }

  const parts = condition.split(' ');
  const hpPart = parts[0];
  const statusPart = parts[1];

  const [currStr, maxStr] = hpPart.split('/');
  const curr = Number(currStr);
  const max = Number(maxStr);

  const hp = isNaN(curr) ? 0 : curr;
  const maxHp = isNaN(max) ? 100 : max;
  const hpPercent = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100))) : 0;

  return {
    hp,
    maxHp,
    hpPercent,
    fainted: hp <= 0,
    status: statusPart ? statusPart.toLowerCase() : undefined,
  };
}

export function cleanPokemonName(ident: string): { sideId: 'p1' | 'p2'; name: string } {
  // ident format: "p1a: Garchomp" or "p2: Eevee"
  const colonIdx = ident.indexOf(':');
  if (colonIdx === -1) {
    const side = ident.startsWith('p2') ? 'p2' : 'p1';
    return { sideId: side, name: ident.trim() };
  }

  const sidePrefix = ident.slice(0, colonIdx).trim();
  const sideId = sidePrefix.startsWith('p2') ? 'p2' : 'p1';
  const name = ident.slice(colonIdx + 1).trim();
  return { sideId, name };
}

const STAT_NAMES: Record<string, string> = {
  atk: 'Attack',
  def: 'Defense',
  spa: 'Sp. Atk',
  spd: 'Sp. Def',
  spe: 'Speed',
  accuracy: 'Accuracy',
  evasion: 'Evasion',
};

export class BattleProtocolParser {
  private logEntries: BattleLogEntry[] = [];
  private logIdCounter = 0;

  private p1Boosts: Record<string, number> = {};
  private p2Boosts: Record<string, number> = {};

  private sideHazards: { p1: string[]; p2: string[] } = { p1: [], p2: [] };
  private teraActivated: { p1?: string; p2?: string } = {};

  public parseChunk(
    chunk: string,
    playerNames: { p1: string; p2: string }
  ): {
    logs: BattleLogEntry[];
    turn?: number;
    winner?: 'p1' | 'p2' | 'tie';
    weather?: string;
    terrain?: string;
  } {
    const newLogs: BattleLogEntry[] = [];
    let turnNumber: number | undefined;
    let winner: 'p1' | 'p2' | 'tie' | undefined;
    let weatherUpdate: string | undefined;
    let terrainUpdate: string | undefined;

    const lines = chunk.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith('|')) continue;

      const parts = line.slice(1).split('|');
      const tag = parts[0];

      switch (tag) {
        case 'turn': {
          turnNumber = Number(parts[1]);
          newLogs.push(this.createLog('info', `--- Turn ${parts[1]} ---`));
          break;
        }

        case 'move': {
          // |move|p1a: Garchomp|Earthquake|p2a: Heatran
          const { name: user } = cleanPokemonName(parts[1]);
          const moveName = parts[2];
          newLogs.push(this.createLog('move', `${user} used ${moveName}!`));
          break;
        }

        case 'switch':
        case 'drag': {
          // |switch|p1a: Garchomp|Garchomp, L50, M|183/183
          const { sideId, name } = cleanPokemonName(parts[1]);
          const trainerName = sideId === 'p1' ? playerNames.p1 : playerNames.p2;

          // Switching clears stat boosts for that active slot
          if (sideId === 'p1') {
            this.p1Boosts = {};
          } else {
            this.p2Boosts = {};
          }

          newLogs.push(this.createLog('switch', `${trainerName} sent out ${name}!`));
          break;
        }

        case '-damage': {
          // |-damage|p2a: Heatran|0 fnt
          // |-damage|p1a: Garchomp|165/183|[from] item: Life Orb
          const { name } = cleanPokemonName(parts[1]);
          const fromPart = parts.find((p) => p.startsWith('[from]'));
          let fromText = '';
          if (fromPart) {
            const reason = fromPart.replace('[from] ', '');
            fromText = ` from ${reason}`;
          }
          if (parts[2]?.includes('0 fnt')) {
            newLogs.push(this.createLog('damage', `${name} lost all of its HP!`));
          } else {
            newLogs.push(this.createLog('damage', `${name} took damage${fromText}!`));
          }
          break;
        }

        case '-heal': {
          const { name } = cleanPokemonName(parts[1]);
          const fromPart = parts.find((p) => p.startsWith('[from]'));
          const fromText = fromPart ? ` via ${fromPart.replace('[from] ', '')}` : '';
          newLogs.push(this.createLog('heal', `${name} restored HP${fromText}!`));
          break;
        }

        case 'faint': {
          // |faint|p1a: Pikachu
          const { sideId, name } = cleanPokemonName(parts[1]);
          if (sideId === 'p1') {
            this.p1Boosts = {};
          } else {
            this.p2Boosts = {};
          }
          newLogs.push(this.createLog('faint', `${name} fainted!`));
          break;
        }

        case '-status': {
          // |-status|p1a: Pikachu|brn
          const { name } = cleanPokemonName(parts[1]);
          const status = parts[2]?.toLowerCase();
          const statusMap: Record<string, string> = {
            brn: 'burned',
            par: 'paralyzed',
            slp: 'put to sleep',
            frz: 'frozen solid',
            psn: 'poisoned',
            tox: 'badly poisoned',
          };
          const readable = statusMap[status] || `inflicted with ${status.toUpperCase()}`;
          newLogs.push(this.createLog('status', `${name} was ${readable}!`));
          break;
        }

        case '-curestatus': {
          const { name } = cleanPokemonName(parts[1]);
          newLogs.push(this.createLog('status', `${name} was cured of its status condition!`));
          break;
        }

        case '-terastallize': {
          // |-terastallize|p1a: Garchomp|Steel
          const { sideId, name } = cleanPokemonName(parts[1]);
          const teraType = parts[2];
          this.teraActivated[sideId] = teraType;
          newLogs.push(this.createLog('tera', `${name} terastallized into the ${teraType}-type!`));
          break;
        }

        case '-boost': {
          // |-boost|p1a: Garchomp|atk|2
          const { sideId, name } = cleanPokemonName(parts[1]);
          const statKey = parts[2]?.toLowerCase();
          const statLabel = STAT_NAMES[statKey] || statKey?.toUpperCase();
          const amount = Number(parts[3]) || 1;

          const currentBoosts = sideId === 'p1' ? this.p1Boosts : this.p2Boosts;
          currentBoosts[statKey] = Math.min(6, (currentBoosts[statKey] || 0) + amount);

          let sharpness = 'rose!';
          if (amount === 2) sharpness = 'rose sharply!';
          else if (amount >= 3) sharpness = 'rose drastically!';

          newLogs.push(this.createLog('boost', `${name}'s ${statLabel} ${sharpness} (+${amount})`));
          break;
        }

        case '-unboost': {
          // |-unboost|p1a: Garchomp|atk|1
          const { sideId, name } = cleanPokemonName(parts[1]);
          const statKey = parts[2]?.toLowerCase();
          const statLabel = STAT_NAMES[statKey] || statKey?.toUpperCase();
          const amount = Number(parts[3]) || 1;

          const currentBoosts = sideId === 'p1' ? this.p1Boosts : this.p2Boosts;
          currentBoosts[statKey] = Math.max(-6, (currentBoosts[statKey] || 0) - amount);

          let harshness = 'fell!';
          if (amount === 2) harshness = 'fell harshly!';
          else if (amount >= 3) harshness = 'severely fell!';

          newLogs.push(this.createLog('boost', `${name}'s ${statLabel} ${harshness} (-${amount})`));
          break;
        }

        case '-clearboost': {
          const { sideId, name } = cleanPokemonName(parts[1]);
          if (sideId === 'p1') this.p1Boosts = {};
          else this.p2Boosts = {};
          newLogs.push(this.createLog('boost', `${name}'s stat changes were eliminated!`));
          break;
        }

        case '-clearallboost': {
          this.p1Boosts = {};
          this.p2Boosts = {};
          newLogs.push(this.createLog('boost', `All stat changes across the field were cleared!`));
          break;
        }

        case '-weather': {
          // |-weather|RainDance
          const rawWeather = parts[1];
          if (rawWeather === 'none' || !rawWeather) {
            weatherUpdate = undefined;
            newLogs.push(this.createLog('weather', 'The weather cleared.'));
          } else {
            weatherUpdate = rawWeather;
            newLogs.push(this.createLog('weather', `The weather became ${rawWeather}!`));
          }
          break;
        }

        case '-fieldstart': {
          // |-fieldstart|move: Electric Terrain
          const terrain = parts[1]?.replace('move: ', '');
          terrainUpdate = terrain;
          newLogs.push(this.createLog('terrain', `An ${terrain} covered the battlefield!`));
          break;
        }

        case '-fieldend': {
          terrainUpdate = undefined;
          newLogs.push(this.createLog('terrain', 'The battlefield terrain subsided.'));
          break;
        }

        case '-sidestart': {
          // |-sidestart|p1: Alice|move: Stealth Rock
          const sidePrefix = parts[1]?.startsWith('p2') ? 'p2' : 'p1';
          const hazard = parts[2]?.replace('move: ', '');
          if (!this.sideHazards[sidePrefix].includes(hazard)) {
            this.sideHazards[sidePrefix].push(hazard);
          }
          const trainerName = sidePrefix === 'p1' ? playerNames.p1 : playerNames.p2;
          newLogs.push(this.createLog('info', `${hazard} was set around ${trainerName}'s team!`));
          break;
        }

        case '-sideend': {
          // |-sideend|p1: Alice|move: Stealth Rock
          const sidePrefix = parts[1]?.startsWith('p2') ? 'p2' : 'p1';
          const hazard = parts[2]?.replace('move: ', '');
          this.sideHazards[sidePrefix] = this.sideHazards[sidePrefix].filter((h) => h !== hazard);
          const trainerName = sidePrefix === 'p1' ? playerNames.p1 : playerNames.p2;
          newLogs.push(this.createLog('info', `${hazard} was removed from ${trainerName}'s side!`));
          break;
        }

        case '-supereffective': {
          newLogs.push(this.createLog('info', "It's super effective!"));
          break;
        }

        case '-resisted': {
          newLogs.push(this.createLog('info', "It's not very effective..."));
          break;
        }

        case '-crit': {
          newLogs.push(this.createLog('info', 'A critical hit!'));
          break;
        }

        case '-immune': {
          newLogs.push(this.createLog('info', 'It had no effect!'));
          break;
        }

        case '-miss': {
          const { name } = cleanPokemonName(parts[1]);
          newLogs.push(this.createLog('info', `${name} avoided the attack!`));
          break;
        }

        case 'cant': {
          // |cant|p2a: Slaking|slp
          // |cant|p2a: Slaking|par
          // |cant|p2a: Slaking|flinch
          const { name } = cleanPokemonName(parts[1]);
          const reason = parts[2];
          let reasonText = `couldn't move!`;
          if (reason === 'slp') reasonText = `is fast asleep!`;
          else if (reason === 'par') reasonText = `is fully paralyzed!`;
          else if (reason === 'frz') reasonText = `is frozen solid!`;
          else if (reason === 'flinch') reasonText = `flinched and couldn't move!`;
          newLogs.push(this.createLog('info', `${name} ${reasonText}`));
          break;
        }

        case 'win': {
          // |win|Alice
          const winnerName = parts[1];
          if (winnerName === playerNames.p1) {
            winner = 'p1';
          } else if (winnerName === playerNames.p2) {
            winner = 'p2';
          }
          newLogs.push(this.createLog('info', `🏆 ${winnerName} won the battle!`));
          break;
        }

        case 'tie': {
          winner = 'tie';
          newLogs.push(this.createLog('info', 'The battle ended in a tie!'));
          break;
        }

        default:
          break;
      }
    }

    this.logEntries.push(...newLogs);
    return {
      logs: newLogs,
      turn: turnNumber,
      winner,
      weather: weatherUpdate,
      terrain: terrainUpdate,
    };
  }

  public getActiveBoosts(sideId: 'p1' | 'p2'): Record<string, number> {
    const raw = sideId === 'p1' ? this.p1Boosts : this.p2Boosts;
    const filtered: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== 0) filtered[k] = v;
    }
    return filtered;
  }

  public getSideHazards(): { p1: string[]; p2: string[] } {
    return {
      p1: [...this.sideHazards.p1],
      p2: [...this.sideHazards.p2],
    };
  }

  public getTerastallized(): { p1?: string; p2?: string } {
    return { ...this.teraActivated };
  }

  public getAllLogs(): BattleLogEntry[] {
    return [...this.logEntries];
  }

  private createLog(type: BattleLogType, message: string): BattleLogEntry {
    this.logIdCounter += 1;
    return {
      id: `log-${Date.now()}-${this.logIdCounter}`,
      type,
      message,
      timestamp: Date.now(),
    };
  }
}
