/**
 * Type definitions for Boulder Dash game
 * Contains all shared interfaces and types used throughout the game
 */

import type { GameObj, Vec2 } from 'kaplay'

/**
 * Direction string representation
 * Used for mapping vector directions to string keys
 */
export type DirectionStr = 'left' | 'right' | 'up' | 'down'

/**
 * Type of explosion that occurs
 * - standard: Normal explosion (Firefly, Rockford) - creates empty spaces
 * - butterfly: Butterfly explosion - creates 9 diamonds (unless chain explosion)
 */
export type ExplosionType = 'standard' | 'butterfly'

/**
 * Component for objects with grid position
 * All game objects that exist on the grid must have this component
 */
export interface PositionComp {
  /** Grid position (not pixel position) */
  position: Vec2
}

/**
 * Component for moveable objects (Boulders, Diamonds, Enemies)
 * Tracks whether the object has been processed in current game tick
 */
export interface MoveableComp extends PositionComp {
  /** Current movement direction */
  direction: Vec2
  /** Has this object been moved in current tick? */
  moveProcessed: boolean
}

/**
 * Component for objects affected by gravity (Boulders, Diamonds)
 * These objects can fall and roll off surfaces
 */
export interface FallingComp extends MoveableComp {
  /** Is the object currently falling? */
  isFalling: boolean
  /** Scenario for falling (e.g., "set" when rolling off) */
  fallScenario: string | null
}

/**
 * Component for enemy characters (Firefly, Butterfly)
 * Enemies navigate through the cave following specific patterns
 */
export interface EnemyComp extends MoveableComp {
  /** Should the enemy pause this tick? */
  mustWait: boolean
  /** Flag for tracking if killed by chain explosion (for Butterfly) */
  killedByExplosion?: boolean
}

/**
 * Component for Rockford (player character)
 * Includes animation state and push mechanics
 */
export interface RockfordComp extends PositionComp {
  /** Current movement direction */
  direction: Vec2
  /** Last side animation played (runLeft or runRight) */
  lastSideAnim: string
  /** Current animation being played */
  currentAnim: string
  /** Is Rockford dead? */
  isDead: boolean
  /** Number of consecutive push attempts */
  pushAttempts: number
  /** Previous position (for grid updates) */
  lastPosition?: Vec2
}

/**
 * Component for explosion objects
 * Explosions are temporary visual effects that destroy nearby objects
 */
export interface ExplosionComp extends PositionComp {
  // Explosion-specific properties can be added here
}

/**
 * Game object with position component
 */
export type GameObjWithPos = GameObj & PositionComp

/**
 * Game object with moveable component
 */
export type GameObjMoveable = GameObj & MoveableComp

/**
 * Game object with falling component (Boulder/Diamond)
 */
export type GameObjFalling = GameObj & FallingComp

/**
 * Game object with enemy component (Firefly/Butterfly)
 */
export type GameObjEnemy = GameObj & EnemyComp

/**
 * Game object representing Rockford
 */
export type GameObjRockford = GameObj & RockfordComp

/**
 * Level configuration interface
 * Contains all settings for a game level
 */
export interface LevelConfig {
  /** Width of each tile in pixels */
  width: number
  /** Height of each tile in pixels */
  height: number
  /** Delay before level starts (in seconds) */
  caveDelay: number
  /** Time limit for level (0 = infinite, max 999) */
  caveTime: number
  /** Number of diamonds needed to open exit */
  diamondsNeeded: number
  /** Points awarded per diamond before exit opens */
  diamondValue: number
  /** Points awarded per diamond after exit opens */
  diamondBonusValue: number
  /** Slime permeability (0-100) */
  slimePermeability: number
  /** Amoeba growth time limit */
  AmoebaTimeOfGrowth: number
  /** Magic wall active duration */
  MagicWallMillingTime: number
}
