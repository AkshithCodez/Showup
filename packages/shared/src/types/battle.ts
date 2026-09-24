export type BattleAction =
  | {
      type: 'move';
      moveSlot: number; // 0-3 or 1-4
      tera?: boolean;
    }
  | {
      type: 'switch';
      pokemonIndex: number;
    };

export interface BattleTurnChoice {
  playerId: string;
  action: BattleAction;
}
