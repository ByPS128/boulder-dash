/**
 * Level definitions for Boulder Dash
 * Contains all cave layouts and their configurations
 */

import { BLOCK_SIZE } from './constants'
import type { LevelConfig } from '../types'

/**
 * Cave A - Intro
 * The first cave from the original Boulder Dash
 */
export const CAVE_A_INTRO: string[] = [
  '                                        ',
  '========================================',
  '=...... ..+.* .....*.*....... ....*....=',
  '=.*S*...... .........*+..*.... ..... ..=',
  '=.......... ..*.....*.*..*........*....=',
  '=*.**.........*......*..*....*...*.....=',
  '=*. *......... *..*........*......*.**.=',
  '=... ..*........*.....*. *........*.**.=',
  '=------------------------------...*..*.=',
  '=. ...*..+. ..*.*..........+.*+...... .=',
  '=..+.....*..... ........** *..*....*...=',
  '=...*..*.*..............* .*..*........=',
  '=.*.....*........***.......*.. .+....*.=',
  '=.+.. ..*.  .....*.*+..+....*...*..+. .=',
  '=. *..............* *..*........+.....*=',
  '=........------------------------------=',
  '= *.........*...+....*.....*...*.......=',
  '= *......... *..*........*......*.**..E=',
  '=. ..*........*.....*.  ....+...*.**...=',
  '=....*+..*........*......*.*+......*...=',
  '=... ..*. ..*.**.........*.*+...... ..*=',
  '=.+.... ..... ......... .*..*........*.=',
  '========================================',
]

/**
 * Default level configuration
 */
export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
  width: BLOCK_SIZE,
  height: BLOCK_SIZE,
  caveDelay: 15,              // Delay before level starts (seconds)
  caveTime: 150,              // Time limit (0 = infinite, max 999)
  diamondsNeeded: 12,         // Diamonds required to open exit
  diamondValue: 10,           // Points per diamond (before exit opens)
  diamondBonusValue: 15,      // Points per diamond (after exit opens)
  slimePermeability: 0,       // Slime permeability (0-100)
  AmoebaTimeOfGrowth: 0,      // Amoeba growth time limit
  MagicWallMillingTime: 0     // Magic wall active duration
}

/**
 * All available levels
 */
export const LEVELS = [
  {
    name: 'Cave A - Intro',
    map: CAVE_A_INTRO,
    config: DEFAULT_LEVEL_CONFIG
  }
]
