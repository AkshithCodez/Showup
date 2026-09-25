import type { PokemonType, RoomConfig, NatureSummary, ItemSummary, StatSpread } from '../types/index.js';
import { DEFAULT_POOL_RULES, DEFAULT_SET_BUILDER_RULES } from '../types/index.js';

export const MAX_PLAYERS_PER_ROOM = 2;
export const DEFAULT_TEAM_SIZE = 6;
export const MAX_PLAYER_NAME_LENGTH = 18;
export const MIN_PLAYER_NAME_LENGTH = 1;

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  draftMode: 'independent',
  teamSize: DEFAULT_TEAM_SIZE,
  poolRules: DEFAULT_POOL_RULES,
  setBuilderRules: DEFAULT_SET_BUILDER_RULES,
  allowLegendaries: false,
};

export const POKEMON_TYPES: readonly PokemonType[] = [
  'Normal',
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Steel',
  'Dark',
  'Fairy',
  'Stellar',
] as const;

export const TERA_TYPES: readonly PokemonType[] = [
  'Normal',
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Steel',
  'Dark',
  'Fairy',
  'Stellar',
] as const;

export const DEFAULT_IVS: StatSpread = {
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
};

export const DEFAULT_EVS: StatSpread = {
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};

export const NATURES_LIST: readonly NatureSummary[] = [
  { id: 'adamant', displayName: 'Adamant', plus: 'atk', minus: 'spa', label: 'Adamant (+Atk, -SpA)' },
  { id: 'bashful', displayName: 'Bashful', label: 'Bashful (Neutral)' },
  { id: 'bold', displayName: 'Bold', plus: 'def', minus: 'atk', label: 'Bold (+Def, -Atk)' },
  { id: 'brave', displayName: 'Brave', plus: 'atk', minus: 'spe', label: 'Brave (+Atk, -Spe)' },
  { id: 'calm', displayName: 'Calm', plus: 'spd', minus: 'atk', label: 'Calm (+SpD, -Atk)' },
  { id: 'careful', displayName: 'Careful', plus: 'spd', minus: 'spa', label: 'Careful (+SpD, -SpA)' },
  { id: 'docile', displayName: 'Docile', label: 'Docile (Neutral)' },
  { id: 'gentle', displayName: 'Gentle', plus: 'spd', minus: 'def', label: 'Gentle (+SpD, -Def)' },
  { id: 'hardy', displayName: 'Hardy', label: 'Hardy (Neutral)' },
  { id: 'hasty', displayName: 'Hasty', plus: 'spe', minus: 'def', label: 'Hasty (+Spe, -Def)' },
  { id: 'impish', displayName: 'Impish', plus: 'def', minus: 'spa', label: 'Impish (+Def, -SpA)' },
  { id: 'jolly', displayName: 'Jolly', plus: 'spe', minus: 'spa', label: 'Jolly (+Spe, -SpA)' },
  { id: 'lax', displayName: 'Lax', plus: 'def', minus: 'spd', label: 'Lax (+Def, -SpD)' },
  { id: 'lonely', displayName: 'Lonely', plus: 'atk', minus: 'def', label: 'Lonely (+Atk, -Def)' },
  { id: 'mild', displayName: 'Mild', plus: 'spa', minus: 'def', label: 'Mild (+SpA, -Def)' },
  { id: 'modest', displayName: 'Modest', plus: 'spa', minus: 'atk', label: 'Modest (+SpA, -Atk)' },
  { id: 'naive', displayName: 'Naive', plus: 'spe', minus: 'spd', label: 'Naive (+Spe, -SpD)' },
  { id: 'naughty', displayName: 'Naughty', plus: 'atk', minus: 'spd', label: 'Naughty (+Atk, -SpD)' },
  { id: 'quiet', displayName: 'Quiet', plus: 'spa', minus: 'spe', label: 'Quiet (+SpA, -Spe)' },
  { id: 'quirky', displayName: 'Quirky', label: 'Quirky (Neutral)' },
  { id: 'rash', displayName: 'Rash', plus: 'spa', minus: 'spd', label: 'Rash (+SpA, -SpD)' },
  { id: 'relaxed', displayName: 'Relaxed', plus: 'def', minus: 'spe', label: 'Relaxed (+Def, -Spe)' },
  { id: 'sassy', displayName: 'Sassy', plus: 'spd', minus: 'spe', label: 'Sassy (+SpD, -Spe)' },
  { id: 'serious', displayName: 'Serious', label: 'Serious (Neutral)' },
  { id: 'timid', displayName: 'Timid', plus: 'spe', minus: 'atk', label: 'Timid (+Spe, -Atk)' },
] as const;

export const POPULAR_ITEMS: readonly ItemSummary[] = [
  { id: 'leftovers', displayName: 'Leftovers', shortDesc: 'Restores 1/16 max HP at the end of each turn.' },
  { id: 'lifeorb', displayName: 'Life Orb', shortDesc: 'Boosts move damage by 1.3x; costs 10% max HP per attack.' },
  { id: 'choicescarf', displayName: 'Choice Scarf', shortDesc: 'Boosts Speed by 1.5x, but locks into one move.' },
  { id: 'choiceband', displayName: 'Choice Band', shortDesc: 'Boosts Attack by 1.5x, but locks into one move.' },
  { id: 'choicespecs', displayName: 'Choice Specs', shortDesc: 'Boosts Special Attack by 1.5x, but locks into one move.' },
  { id: 'focussash', displayName: 'Focus Sash', shortDesc: 'If holder has full HP, survives one lethal hit with 1 HP.' },
  { id: 'heavydutyboots', displayName: 'Heavy-Duty Boots', shortDesc: 'Immune to hazard damage and status effects on switch-in.' },
  { id: 'assaultvest', displayName: 'Assault Vest', shortDesc: 'Boosts Sp. Def by 1.5x, but prevents using status moves.' },
  { id: 'rockyhelmet', displayName: 'Rocky Helmet', shortDesc: 'Attacker loses 1/6 max HP when hitting with contact moves.' },
  { id: 'expertbelt', displayName: 'Expert Belt', shortDesc: 'Boosts super-effective attack damage by 1.2x.' },
  { id: 'lumberry', displayName: 'Lum Berry', shortDesc: 'Cures any primary status condition or confusion once.' },
  { id: 'sitrusberry', displayName: 'Sitrus Berry', shortDesc: 'Restores 25% max HP when HP drops below 50%.' },
  { id: 'eviolite', displayName: 'Eviolite', shortDesc: 'Boosts Defense and Sp. Def by 1.5x for not-fully-evolved Pokémon.' },
  { id: 'boosterenergy', displayName: 'Booster Energy', shortDesc: 'Activates Protosynthesis / Quark Drive for Paradox Pokémon.' },
  { id: 'loadeddice', displayName: 'Loaded Dice', shortDesc: 'Guarantees multi-hit moves hit 4-5 times.' },
  { id: 'airballoon', displayName: 'Air Balloon', shortDesc: 'Grants immunity to Ground moves until popped by an attack.' },
  { id: 'blacksludge', displayName: 'Black Sludge', shortDesc: 'Restores 1/16 HP for Poison types; damages other types.' },
  { id: 'lightclay', displayName: 'Light Clay', shortDesc: 'Extends Reflect, Light Screen, and Aurora Veil from 5 to 8 turns.' },
  { id: 'covertcloak', displayName: 'Covert Cloak', shortDesc: 'Protects holder from secondary effects of opponent moves.' },
  { id: 'clearamulet', displayName: 'Clear Amulet', shortDesc: 'Prevents opponent moves or abilities from lowering holder\'s stats.' },
  { id: 'punchingglove', displayName: 'Punching Glove', shortDesc: 'Boosts punching moves by 1.1x and prevents contact effects.' },
  { id: 'mirrorherb', displayName: 'Mirror Herb', shortDesc: 'Copies an opponent\'s stat boosts once per battle.' },
  { id: 'flameorb', displayName: 'Flame Orb', shortDesc: 'Inflicts Burn at end of turn (great with Guts/Facade).' },
  { id: 'toxicorb', displayName: 'Toxic Orb', shortDesc: 'Inflicts Bad Poison at end of turn (great with Poison Heal).' },
  { id: 'whiteherb', displayName: 'White Herb', shortDesc: 'Restores any lowered stat stage to 0 once.' },
  { id: 'weaknesspolicy', displayName: 'Weakness Policy', shortDesc: 'Boosts Attack and Sp. Atk by 2 stages when hit super-effectively.' },
  { id: 'redcard', displayName: 'Red Card', shortDesc: 'Forces attacker to switch out after hitting the holder.' },
  { id: 'ejectpack', displayName: 'Eject Pack', shortDesc: 'Immediately switches out holder if any stat is lowered.' },
  { id: 'throatspray', displayName: 'Throat Spray', shortDesc: 'Boosts Sp. Atk by 1 stage after using a sound move.' },
  { id: 'safetygoggles', displayName: 'Safety Goggles', shortDesc: 'Immune to weather damage and powder/spore moves.' },
  // Key Mega Stones for Megas in draft
  { id: 'charizarditex', displayName: 'Charizardite X', shortDesc: 'Mega Stone for Charizard.' },
  { id: 'charizarditey', displayName: 'Charizardite Y', shortDesc: 'Mega Stone for Charizard.' },
  { id: 'lucarionite', displayName: 'Lucarionite', shortDesc: 'Mega Stone for Lucario.' },
  { id: 'gengarite', displayName: 'Gengarite', shortDesc: 'Mega Stone for Gengar.' },
  { id: 'salamencite', displayName: 'Salamencite', shortDesc: 'Mega Stone for Salamence.' },
  { id: 'metagrossite', displayName: 'Metagrossite', shortDesc: 'Mega Stone for Metagross.' },
  { id: 'scizorite', displayName: 'Scizorite', shortDesc: 'Mega Stone for Scizor.' },
  { id: 'garchompite', displayName: 'Garchompite', shortDesc: 'Mega Stone for Garchomp.' },
  { id: 'venusaurite', displayName: 'Venusaurite', shortDesc: 'Mega Stone for Venusaur.' },
  { id: 'blastoisinite', displayName: 'Blastoisinite', shortDesc: 'Mega Stone for Blastoise.' },
  { id: 'kangaskhanite', displayName: 'Kangaskhanite', shortDesc: 'Mega Stone for Kangaskhan.' },
] as const;

export interface EVPreset {
  name: string;
  evs: StatSpread;
}

export const EV_PRESETS: readonly EVPreset[] = [
  {
    name: 'Physical Sweeper',
    evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
  },
  {
    name: 'Special Sweeper',
    evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
  },
  {
    name: 'Physical Wall',
    evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
  },
  {
    name: 'Special Wall',
    evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
  },
  {
    name: 'Bulky Attacker',
    evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 4, spe: 0 },
  },
  {
    name: 'Reset to 0',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  },
] as const;
