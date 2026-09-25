import { Teams } from '@pkmn/sim';
import { exportTeamToShowdown, type PokemonBuild } from '@showup/shared';

/**
 * Adapter for converting Showup PokemonBuild arrays into Showdown simulator packed team strings.
 */
export class ShowdownTeamAdapter {
  /**
   * Converts an array of PokemonBuild objects into a Showdown packed team string.
   */
  public static toPackedTeam(builds: PokemonBuild[]): string {
    const textFormat = exportTeamToShowdown(builds);
    const imported = Teams.import(textFormat);
    if (!imported || imported.length === 0) {
      throw new Error('Failed to import team into Showdown simulator format.');
    }
    return Teams.pack(imported);
  }
}
