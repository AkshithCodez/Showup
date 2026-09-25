import { BattleStreams, Dex } from '@pkmn/sim';
import type {
  BattleAction,
  ClientBattleView,
  BattleSideView,
  BattleBenchPokemonView,
  BattleActivePokemonView,
  AvailableBattleActions,
  AvailableMoveAction,
  AvailableSwitchAction,
  PokemonType,
  PokemonBuild,
} from '@showup/shared';
import type { BattleEngine } from './BattleEngine.js';
import { ShowdownTeamAdapter } from './ShowdownTeamAdapter.js';
import { BattleProtocolParser, parseCondition } from './BattleProtocolParser.js';
import type { PokemonSetDataService } from '../services/PokemonSetDataService.js';

export interface BattlePlayerInfo {
  id: string;
  name: string;
  team: PokemonBuild[];
}

export class ShowdownBattleEngine implements BattleEngine {
  public readonly id: string;
  public readonly player1Id: string;
  public readonly player2Id: string;

  private player1: BattlePlayerInfo;
  private player2: BattlePlayerInfo;

  private battleStream: any;
  private streams: any;

  private p1Request: any = null;
  private p2Request: any = null;

  private p1PendingChoice: string | null = null;
  private p2PendingChoice: string | null = null;

  private p1PendingLead: number | null = null;
  private p2PendingLead: number | null = null;

  private p1LockedIn = false;
  private p2LockedIn = false;

  private finished = false;
  private winnerId?: string;
  private winnerName?: string;

  private turnNumber = 1;
  private weather?: string;
  private terrain?: string;

  private parser: BattleProtocolParser;
  private updateListeners: (() => void)[] = [];

  constructor(
    player1: BattlePlayerInfo,
    player2: BattlePlayerInfo,
    private setDataService: PokemonSetDataService,
    private formatId = 'gen9customgame'
  ) {
    this.id = `BTL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    this.player1 = player1;
    this.player2 = player2;
    this.player1Id = player1.id;
    this.player2Id = player2.id;
    this.parser = new BattleProtocolParser();

    this.battleStream = new BattleStreams.BattleStream();
    this.streams = BattleStreams.getPlayerStreams(this.battleStream);

    this.setupStreamListeners();
  }

  public async start(): Promise<void> {
    try {
      const p1Packed = ShowdownTeamAdapter.toPackedTeam(this.player1.team);
      const p2Packed = ShowdownTeamAdapter.toPackedTeam(this.player2.team);

      const readyPromise = new Promise<void>((resolve) => {
        let resolved = false;
        const check = () => {
          if (this.p1Request && this.p2Request) {
            if (!resolved) {
              resolved = true;
              resolve();
            }
            return true;
          }
          return false;
        };

        if (check()) return;

        const interval = setInterval(() => {
          if (check()) {
            clearInterval(interval);
          }
        }, 5);

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            clearInterval(interval);
            resolve();
          }
        }, 3000);
      });

      await this.streams.omniscient.write(`>start {"formatid":"${this.formatId}"}`);
      await this.streams.omniscient.write(
        `>player p1 {"name":"${this.player1.name}","team":"${p1Packed}"}`
      );
      await this.streams.omniscient.write(
        `>player p2 {"name":"${this.player2.name}","team":"${p2Packed}"}`
      );

      await readyPromise;
    } catch (err) {
      console.error(`[ShowdownBattleEngine ${this.id}] Error starting battle simulator:`, err);
      throw err;
    }
  }

  public async submitAction(playerId: string, action: BattleAction): Promise<void> {
    if (this.finished) {
      throw new Error('Battle is already finished.');
    }

    const isP1 = playerId === this.player1Id;
    const isP2 = playerId === this.player2Id;
    if (!isP1 && !isP2) {
      throw new Error('Unauthorized: You are not a combatant in this battle.');
    }

    const request = isP1 ? this.p1Request : this.p2Request;
    if (!request) {
      throw new Error('No action requested from battle simulator yet.');
    }

    if (request.wait) {
      throw new Error('Waiting for opponent to take their action.');
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 1: TEAM PREVIEW / LEAD SELECTION
    // ─────────────────────────────────────────────────────────────
    if (request.teamPreview) {
      if (isP1 && this.p1LockedIn) {
        throw new Error('Lead Pokémon already selected. Waiting for opponent.');
      }
      if (isP2 && this.p2LockedIn) {
        throw new Error('Lead Pokémon already selected. Waiting for opponent.');
      }

      let leadSlot = 1;
      if (action.type === 'switch' || action.type === 'team') {
        const idx = (action as any).pokemonIndex !== undefined
          ? (action as any).pokemonIndex
          : (action as any).teamOrder?.[0] !== undefined
          ? (action as any).teamOrder[0]
          : 0;

        if (idx < 0 || idx >= 6) {
          throw new Error(`Invalid lead Pokémon index: ${idx}. Must be 0-5.`);
        }
        leadSlot = idx + 1; // 1-based index for Showdown
      } else {
        throw new Error('Must select a lead Pokémon during team preview.');
      }

      if (isP1) {
        this.p1PendingLead = leadSlot;
        this.p1LockedIn = true;
      } else {
        this.p2PendingLead = leadSlot;
        this.p2LockedIn = true;
      }

      // If both players have selected their lead, send to simulator simultaneously
      if (this.p1LockedIn && this.p2LockedIn) {
        const lead1 = this.p1PendingLead || 1;
        const lead2 = this.p2PendingLead || 1;

        this.p1PendingLead = null;
        this.p2PendingLead = null;
        this.p1LockedIn = false;
        this.p2LockedIn = false;

        const turn1Promise = new Promise<void>((resolve) => {
          let resolved = false;
          const check = () => {
            if (
              this.p1Request &&
              !this.p1Request.teamPreview &&
              this.p2Request &&
              !this.p2Request.teamPreview
            ) {
              if (!resolved) {
                resolved = true;
                resolve();
              }
              return true;
            }
            return false;
          };

          const interval = setInterval(() => {
            if (check()) {
              clearInterval(interval);
            }
          }, 5);

          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              clearInterval(interval);
              resolve();
            }
          }, 3000);
        });

        await this.streams.p1.write(`team ${lead1}`);
        await this.streams.p2.write(`team ${lead2}`);

        await turn1Promise;
      }

      this.notifyUpdate();
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 2: FORCED SWITCH REQUEST (e.g. active Pokémon fainted)
    // ─────────────────────────────────────────────────────────────
    const isForceSwitch = Boolean(request.forceSwitch && request.forceSwitch[0]);
    if (isForceSwitch) {
      if (action.type !== 'switch') {
        throw new Error('You must select a replacement Pokémon to switch in.');
      }

      const pokes = request.side?.pokemon || [];
      if (action.pokemonIndex < 0 || action.pokemonIndex >= pokes.length) {
        throw new Error(`Invalid switch index: ${action.pokemonIndex}.`);
      }

      const targetPoke = pokes[action.pokemonIndex];
      if (!targetPoke) {
        throw new Error('Target Pokémon not found.');
      }

      if (targetPoke.active) {
        throw new Error('Cannot switch to a Pokémon that is already active.');
      }

      const cond = parseCondition(targetPoke.condition);
      if (cond.fainted) {
        throw new Error('Cannot switch to a fainted Pokémon.');
      }

      const choiceStr = `switch ${action.pokemonIndex + 1}`;
      if (isP1) {
        await this.streams.p1.write(choiceStr);
      } else {
        await this.streams.p2.write(choiceStr);
      }

      this.notifyUpdate();
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 3: NORMAL SIMULTANEOUS TURN (Move or Switch)
    // ─────────────────────────────────────────────────────────────
    if (isP1 && this.p1LockedIn) {
      throw new Error('Action already locked in for this turn.');
    }
    if (isP2 && this.p2LockedIn) {
      throw new Error('Action already locked in for this turn.');
    }

    let choiceStr = '';

    if (action.type === 'move') {
      if (action.moveSlot < 1 || action.moveSlot > 4) {
        throw new Error(`Invalid move slot: ${action.moveSlot}. Must be 1-4.`);
      }

      const activeObj = request.active?.[0];
      const availableMoves = activeObj?.moves || [];
      const selectedMove = availableMoves[action.moveSlot - 1];

      if (!selectedMove) {
        throw new Error(`Move slot ${action.moveSlot} does not exist on active Pokémon.`);
      }

      if (selectedMove.disabled) {
        throw new Error(`Move "${selectedMove.move}" is disabled and cannot be used.`);
      }

      if (action.tera) {
        if (!activeObj?.canTerastallize) {
          throw new Error('Terastallization is not available or has already been used.');
        }
        choiceStr = `move ${action.moveSlot} terastallize`;
      } else {
        choiceStr = `move ${action.moveSlot}`;
      }
    } else if (action.type === 'switch') {
      const pokes = request.side?.pokemon || [];
      if (action.pokemonIndex < 0 || action.pokemonIndex >= pokes.length) {
        throw new Error(`Invalid switch index: ${action.pokemonIndex}.`);
      }

      const targetPoke = pokes[action.pokemonIndex];
      if (!targetPoke) {
        throw new Error('Target Pokémon not found.');
      }

      if (targetPoke.active) {
        throw new Error('Cannot switch to a Pokémon that is already active.');
      }

      const cond = parseCondition(targetPoke.condition);
      if (cond.fainted) {
        throw new Error('Cannot switch to a fainted Pokémon.');
      }

      choiceStr = `switch ${action.pokemonIndex + 1}`;
    } else {
      throw new Error(`Unsupported action type "${(action as any).type}".`);
    }

    // Lock in the action for this player
    if (isP1) {
      this.p1PendingChoice = choiceStr;
      this.p1LockedIn = true;
    } else {
      this.p2PendingChoice = choiceStr;
      this.p2LockedIn = true;
    }

    // When both combatants have locked in: dispatch both simultaneously to Showdown!
    if (this.p1LockedIn && this.p2LockedIn) {
      const p1Choice = this.p1PendingChoice!;
      const p2Choice = this.p2PendingChoice!;

      this.p1PendingChoice = null;
      this.p2PendingChoice = null;
      this.p1LockedIn = false;
      this.p2LockedIn = false;

      const currentTurn = this.turnNumber;
      const turnResolvePromise = new Promise<void>((resolve) => {
        let resolved = false;
        const check = () => {
          if (
            this.finished ||
            this.turnNumber > currentTurn ||
            Boolean(this.p1Request?.forceSwitch?.[0]) ||
            Boolean(this.p2Request?.forceSwitch?.[0])
          ) {
            if (!resolved) {
              resolved = true;
              resolve();
            }
            return true;
          }
          return false;
        };

        const interval = setInterval(() => {
          if (check()) {
            clearInterval(interval);
          }
        }, 5);

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            clearInterval(interval);
            resolve();
          }
        }, 3000);
      });

      await this.streams.p1.write(p1Choice);
      await this.streams.p2.write(p2Choice);

      await turnResolvePromise;
    }

    this.notifyUpdate();
  }

  public async forfeit(playerId: string): Promise<void> {
    if (this.finished) return;

    this.finished = true;
    const forfeiterName = playerId === this.player1Id ? this.player1.name : this.player2.name;

    if (playerId === this.player1Id) {
      this.winnerId = this.player2Id;
      this.winnerName = this.player2.name;
    } else {
      this.winnerId = this.player1Id;
      this.winnerName = this.player1.name;
    }

    this.parser.parseChunk(
      `|c|~|${forfeiterName} forfeited the battle!\n|win|${this.winnerName}`,
      {
        p1: this.player1.name,
        p2: this.player2.name,
      }
    );

    this.notifyUpdate();
  }

  public getClientBattleView(playerId: string): ClientBattleView {
    const isP1 = playerId === this.player1Id;
    const myInfo = isP1 ? this.player1 : this.player2;
    const oppInfo = isP1 ? this.player2 : this.player1;
    const myRequest = isP1 ? this.p1Request : this.p2Request;
    const oppRequest = isP1 ? this.p2Request : this.p1Request;
    const myLockedIn = isP1 ? this.p1LockedIn : this.p2LockedIn;
    const oppLockedIn = isP1 ? this.p2LockedIn : this.p1LockedIn;

    const mySideId: 'p1' | 'p2' = isP1 ? 'p1' : 'p2';
    const oppSideId: 'p1' | 'p2' = isP1 ? 'p2' : 'p1';

    // Build side views (strict privacy: opponent private set data is never leaked)
    const mySide = this.buildSideView(myInfo, myRequest, mySideId, true);
    const oppSide = this.buildSideView(oppInfo, oppRequest, oppSideId, false);

    // Build available actions for this player
    const availableActions = this.extractAvailableActions(myRequest, mySide);

    const hazards = this.parser.getSideHazards();

    return {
      battleId: this.id,
      turn: this.turnNumber,
      phase: this.finished ? 'finished' : 'active',
      mySide,
      opponentSide: oppSide,
      field: {
        weather: this.weather,
        terrain: this.terrain,
        sideHazards: {
          mine: hazards[mySideId] || [],
          opponent: hazards[oppSideId] || [],
        },
      },
      availableActions,
      waitingForOpponent: myLockedIn && !oppLockedIn,
      opponentLockedIn: oppLockedIn,
      winnerPlayerId: this.winnerId,
      winnerName: this.winnerName,
      log: this.parser.getAllLogs(),
    };
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public getWinnerId(): string | undefined {
    return this.winnerId;
  }

  public onUpdate(callback: () => void): void {
    this.updateListeners.push(callback);
  }

  public destroy(): void {
    try {
      this.battleStream.destroy?.();
    } catch {
      // Ignore cleanup error
    }
  }

  private notifyUpdate(): void {
    for (const listener of this.updateListeners) {
      try {
        listener();
      } catch (err) {
        console.error(`[ShowdownBattleEngine ${this.id}] Error in update listener:`, err);
      }
    }
  }

  private setupStreamListeners(): void {
    // P1 stream listener
    (async () => {
      try {
        for await (const chunk of this.streams.p1) {
          this.handlePlayerChunk(chunk, 'p1');
        }
      } catch (err) {
        console.error(`[ShowdownBattleEngine ${this.id}] P1 Stream error:`, err);
      }
    })();

    // P2 stream listener
    (async () => {
      try {
        for await (const chunk of this.streams.p2) {
          this.handlePlayerChunk(chunk, 'p2');
        }
      } catch (err) {
        console.error(`[ShowdownBattleEngine ${this.id}] P2 Stream error:`, err);
      }
    })();

    // Omniscient battle stream listener (authoritative protocol source)
    (async () => {
      try {
        for await (const chunk of this.streams.omniscient) {
          this.handleOmniscientChunk(chunk);
        }
      } catch (err) {
        console.error(`[ShowdownBattleEngine ${this.id}] Omniscient Stream error:`, err);
      }
    })();
  }

  private handlePlayerChunk(chunk: string, side: 'p1' | 'p2'): void {
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('|request|')) {
        const jsonStr = line.slice('|request|'.length);
        if (!jsonStr.trim()) continue;
        try {
          const req = JSON.parse(jsonStr);
          if (side === 'p1') {
            this.p1Request = req;
          } else {
            this.p2Request = req;
          }
        } catch (e) {
          console.error(`[ShowdownBattleEngine ${this.id}] Failed to parse request JSON:`, e);
        }
      } else if (line.startsWith('|error|')) {
        console.warn(`[ShowdownBattleEngine ${this.id}] ${side} simulator warning:`, line);
      }
    }
    this.notifyUpdate();
  }

  private handleOmniscientChunk(chunk: string): void {
    const parsed = this.parser.parseChunk(chunk, {
      p1: this.player1.name,
      p2: this.player2.name,
    });

    if (parsed.turn !== undefined) {
      this.turnNumber = parsed.turn;
    }
    if (parsed.weather !== undefined) {
      this.weather = parsed.weather;
    }
    if (parsed.terrain !== undefined) {
      this.terrain = parsed.terrain;
    }
    if (parsed.winner) {
      this.finished = true;
      if (parsed.winner === 'p1') {
        this.winnerId = this.player1Id;
        this.winnerName = this.player1.name;
      } else if (parsed.winner === 'p2') {
        this.winnerId = this.player2Id;
        this.winnerName = this.player2.name;
      } else {
        this.winnerName = 'Tie';
      }
    }

    this.notifyUpdate();
  }

  private buildSideView(
    playerInfo: BattlePlayerInfo,
    request: any,
    sideId: 'p1' | 'p2',
    isOwner: boolean
  ): BattleSideView {
    const team: BattleBenchPokemonView[] = [];
    let activePokemon: BattleActivePokemonView | undefined;

    const requestPokes = request?.side?.pokemon || [];
    const count = requestPokes.length > 0 ? requestPokes.length : playerInfo.team.length;

    const activeBoosts = this.parser.getActiveBoosts(sideId);
    const terastallizedMap = this.parser.getTerastallized();
    const sideTeraType = terastallizedMap[sideId];

    for (let i = 0; i < count; i++) {
      const reqPoke = requestPokes[i];

      // Match request Pokémon to original playerInfo team build
      let build: PokemonBuild | undefined;
      if (reqPoke) {
        const detailsSpecies = reqPoke.details ? reqPoke.details.split(',')[0].trim() : '';
        const identName = reqPoke.ident ? reqPoke.ident.replace(/^p[12][a-z]?: /, '').trim() : '';

        build = playerInfo.team.find((b) => {
          const sName = b.speciesName.toLowerCase();
          const dName = b.displayName.toLowerCase();
          const sId = b.showdownId.toLowerCase();
          return (
            (detailsSpecies && sName === detailsSpecies.toLowerCase()) ||
            (identName && (dName === identName.toLowerCase() || sName === identName.toLowerCase())) ||
            (detailsSpecies && sId === detailsSpecies.toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
        });
      }

      if (!build) {
        build = playerInfo.team[i] || playerInfo.team[0];
      }

      // Query true species types from Dex
      const dexSpecies = Dex.species.get(build.speciesName);
      const baseTypes = (dexSpecies?.types?.length ? dexSpecies.types : ['Normal']) as PokemonType[];

      const conditionParsed = parseCondition(reqPoke?.condition || '100/100');
      const isActive = Boolean(reqPoke?.active);
      const isFainted = conditionParsed.fainted;

      const isTerastallized = Boolean(reqPoke?.terastallized) || (isActive && Boolean(sideTeraType));
      const effectiveTeraType = (reqPoke?.terastallized as PokemonType) || (sideTeraType as PokemonType) || build.teraType;

      const displayTypes = isTerastallized && effectiveTeraType ? [effectiveTeraType] : baseTypes;

      const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${build.showdownId}.png`;

      const benchItem: BattleBenchPokemonView = {
        index: i,
        species: build.speciesName,
        displayName: build.displayName,
        level: build.level || 50,
        hpPercent: conditionParsed.hpPercent,
        // Only owner sees exact HP numbers; opponent only sees percentage
        hp: isOwner ? conditionParsed.hp : undefined,
        maxHp: isOwner ? conditionParsed.maxHp : undefined,
        fainted: isFainted,
        active: isActive,
        status: conditionParsed.status,
        types: baseTypes,
        // For opponent, do not leak unrevealed Tera type before terastallizing
        teraType: isOwner || isTerastallized ? build.teraType : undefined,
        spriteUrl,
      };

      team.push(benchItem);

      if (isActive && !activePokemon) {
        activePokemon = {
          species: build.speciesName,
          displayName: build.displayName,
          level: build.level || 50,
          gender: build.gender,
          shiny: build.shiny,
          hp: isOwner ? conditionParsed.hp : undefined,
          maxHp: isOwner ? conditionParsed.maxHp : undefined,
          hpPercent: conditionParsed.hpPercent,
          status: conditionParsed.status,
          types: displayTypes,
          teraType: isOwner || isTerastallized ? build.teraType : undefined,
          terastallized: isTerastallized,
          spriteUrl,
          boosts: activeBoosts,
        };
      }
    }

    // Fallback if simulator hasn't sent first active state yet (Turn 0)
    if (!activePokemon && team.length > 0) {
      const b0 = playerInfo.team[0];
      const dex0 = Dex.species.get(b0.speciesName);
      const base0 = (dex0?.types?.length ? dex0.types : ['Normal']) as PokemonType[];

      activePokemon = {
        species: b0.speciesName,
        displayName: b0.displayName,
        level: b0.level || 50,
        gender: b0.gender,
        shiny: b0.shiny,
        hp: isOwner ? 100 : undefined,
        maxHp: isOwner ? 100 : undefined,
        hpPercent: 100,
        types: base0,
        teraType: isOwner ? b0.teraType : undefined,
        spriteUrl: `https://play.pokemonshowdown.com/sprites/gen5/${b0.showdownId}.png`,
        boosts: {},
      };
    }

    return {
      playerId: playerInfo.id,
      name: playerInfo.name,
      activePokemon,
      team,
    };
  }

  private extractAvailableActions(request: any, side: BattleSideView): AvailableBattleActions | undefined {
    if (!request) return undefined;

    // 1. Forced switch request
    if (request.forceSwitch && request.forceSwitch[0]) {
      const switches: AvailableSwitchAction[] = side.team
        .map((p) => ({
          index: p.index,
          name: p.displayName,
          disabled: p.fainted || p.active,
        }))
        .filter((s) => !s.disabled);

      return {
        type: 'switch',
        switches,
      };
    }

    // 2. Normal move & switch request
    if (request.active && request.active[0]) {
      const activeObj = request.active[0];
      const rawMoves = activeObj.moves || [];
      const moves: AvailableMoveAction[] = rawMoves.map((m: any, idx: number) => {
        const info = this.setDataService.getMoveSummary(m.move);
        return {
          slot: idx + 1,
          name: m.move,
          type: info?.type || 'Normal',
          category: info?.category || 'Physical',
          basePower: info?.basePower || 0,
          accuracy: info?.accuracy ?? 100,
          pp: m.pp ?? 20,
          maxpp: m.maxpp ?? 20,
          disabled: Boolean(m.disabled),
        };
      });

      const switches: AvailableSwitchAction[] = side.team.map((p) => ({
        index: p.index,
        name: p.displayName,
        disabled: p.fainted || p.active,
      }));

      return {
        type: 'move',
        moves,
        canTerastallize: Boolean(activeObj.canTerastallize),
        teraType: activeObj.canTerastallize as PokemonType,
        switches,
      };
    }

    // 3. Team preview request (Lead selection)
    if (request.teamPreview) {
      const switches: AvailableSwitchAction[] = side.team.map((p) => ({
        index: p.index,
        name: p.displayName,
        disabled: false,
      }));

      return {
        type: 'teampreview',
        switches,
      };
    }

    return {
      type: 'wait',
    };
  }
}
