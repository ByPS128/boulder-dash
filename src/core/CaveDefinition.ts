import { Difficulty, DIFFICULTY_CONFIG } from "./types";

/**
 * Cave Definition - metadata and map for a single cave/level
 */
export interface CaveDefinition {
  caveNumber: number; // 1-20
  name: string; // "Cave A", "Cave B", etc.
  width: number; // 40
  height: number; // 22
  map: string[]; // Array of map rows
  diamondsNeeded: number; // Base value (before difficulty multiplier)
  timeLimit: number; // Base value in seconds (before difficulty multiplier)
  diamondValue: number; // Points per diamond (10)
  diamondBonusValue: number; // Points per diamond after exit opens (15)
  timeBonus: number; // Bonus points per remaining second (5)
}

/**
 * Get adjusted diamonds needed based on difficulty
 */
export function getAdjustedDiamonds(
  cave: CaveDefinition,
  difficulty: Difficulty
): number {
  const config = DIFFICULTY_CONFIG[difficulty];
  return Math.ceil(cave.diamondsNeeded * config.diamondsMultiplier);
}

/**
 * Get adjusted time limit based on difficulty
 */
export function getAdjustedTime(
  cave: CaveDefinition,
  difficulty: Difficulty
): number {
  const config = DIFFICULTY_CONFIG[difficulty];
  return Math.ceil(cave.timeLimit * config.timeMultiplier);
}
