import type { BattleAction, ClientBattleView } from '@showup/shared';

/**
 * Common interface for Showup battle engines.
 * Decouples room and multiplayer socket handlers from the underlying simulator implementation.
 */
export interface BattleEngine {
  readonly id: string;
  readonly player1Id: string;
  readonly player2Id: string;

  /**
   * Starts the battle simulator session.
   */
  start(): Promise<void>;

  /**
   * Submits a battle action (move, switch, or lead selection) for a player.
   */
  submitAction(playerId: string, action: BattleAction): Promise<void>;

  /**
   * Forfeits the battle on behalf of a player.
   */
  forfeit(playerId: string): Promise<void>;

  /**
   * Returns the player-specific, sanitized view of the battle.
   */
  getClientBattleView(playerId: string): ClientBattleView;

  /**
   * Checks whether the battle has finished.
   */
  isFinished(): boolean;

  /**
   * Returns the winner's player ID if the battle has concluded.
   */
  getWinnerId(): string | undefined;

  /**
   * Subscribes to battle updates.
   */
  onUpdate(callback: () => void): void;

  /**
   * Destroys simulator resources and streams to prevent memory leaks.
   */
  destroy(): void;
}
