import {
  MAX_PLAYER_NAME_LENGTH,
  MIN_PLAYER_NAME_LENGTH,
  MAX_PLAYERS_PER_ROOM,
} from '../constants/index.js';
import type { Player } from '../types/index.js';

const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a clean, readable room code like PKMN-X7K2
 */
export function generateRoomCode(): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_ALPHABET.length);
    suffix += SAFE_ALPHABET[randomIndex];
  }
  return `PKMN-${suffix}`;
}

/**
 * Normalizes input room code to the canonical PKMN-XXXX format.
 * Accepts: "X7K2", "x7k2", "pkmn-x7k2", "pkmn x7k2", "PKMN-X7K2"
 */
export function normalizeRoomCode(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]+/g, '');
  if (cleaned.startsWith('PKMN')) {
    const suffix = cleaned.slice(4);
    return suffix ? `PKMN-${suffix}` : 'PKMN';
  }
  return `PKMN-${cleaned}`;
}

/**
 * Validates player name
 */
export function validatePlayerName(rawName: string): { valid: boolean; name: string; error?: string } {
  const name = rawName.trim();
  if (name.length < MIN_PLAYER_NAME_LENGTH) {
    return { valid: false, name, error: 'Trainer name cannot be empty.' };
  }
  if (name.length > MAX_PLAYER_NAME_LENGTH) {
    return {
      valid: false,
      name,
      error: `Trainer name must be at most ${MAX_PLAYER_NAME_LENGTH} characters.`,
    };
  }
  // Basic alphanumeric + simple spaces/underscores
  if (!/^[\w\s-]+$/u.test(name)) {
    return {
      valid: false,
      name,
      error: 'Trainer name contains invalid characters.',
    };
  }
  return { valid: true, name };
}

/**
 * Checks if draft can be started (both players connected and ready)
 */
export function checkCanStartDraft(players: Player[]): boolean {
  return (
    players.length === MAX_PLAYERS_PER_ROOM &&
    players.every((p) => p.connected && p.ready)
  );
}
