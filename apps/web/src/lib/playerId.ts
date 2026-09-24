const STORAGE_KEY = 'showup_player_id';
const NAME_KEY = 'showup_player_name';

/**
 * Returns a persistent player ID for this browser tab/device.
 */
export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') {
    return 'temp-ssr-id';
  }

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `p_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/**
 * Gets cached trainer name if any.
 */
export function getSavedPlayerName(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(NAME_KEY) || '';
}

/**
 * Saves trainer name for convenience.
 */
export function savePlayerName(name: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NAME_KEY, name.trim());
}
