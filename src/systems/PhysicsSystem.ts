/**
 * Physics System
 * Handles gravity, falling, and rolling mechanics for Boulders and Diamonds
 */

import type { Vec2 } from 'kaplay'
import type { GameObjFalling, GameObjWithPos } from '../types'
import {
  BOULDER_TAG,
  ROCKFORD_TAG,
  ENEMY_ROLE_TAG,
  BLOCK_SIZE,
  DIR_DOWN_FACTORY,
  DIR_LEFT_FACTORY,
  DIR_RIGHT_FACTORY,
  VEC_ZERO_FACTORY
} from '../config/constants'
import { vecEquals } from '../utils/directions'

/**
 * Physics System Class
 * Manages falling and rolling physics for boulders and diamonds
 */
export class PhysicsSystem {
  private items: (GameObjWithPos | null)[][]
  private bouldersInMove: (GameObjFalling | null)[][]
  private mapWidth: number
  private mapHeight: number

  constructor(mapWidth: number, mapHeight: number) {
    this.mapWidth = mapWidth
    this.mapHeight = mapHeight
    this.items = []
    this.bouldersInMove = []

    // Initialize 2D arrays
    for (let y = 0; y < mapHeight; y++) {
      this.items[y] = []
      this.bouldersInMove[y] = []
      for (let x = 0; x < mapWidth; x++) {
        this.items[y][x] = null
        this.bouldersInMove[y][x] = null
      }
    }
  }

  /**
   * Get the items grid
   * @returns 2D array of game objects
   */
  getItems(): (GameObjWithPos | null)[][] {
    return this.items
  }

  /**
   * Set an item at a specific grid position
   * @param x - Grid X coordinate
   * @param y - Grid Y coordinate
   * @param obj - Game object to place (or null to clear)
   */
  setItem(x: number, y: number, obj: GameObjWithPos | null): void {
    if (y >= 0 && y < this.mapHeight && x >= 0 && x < this.mapWidth) {
      this.items[y][x] = obj
    }
  }

  /**
   * Get an item at a specific grid position
   * @param x - Grid X coordinate
   * @param y - Grid Y coordinate
   * @returns Game object at position or null
   */
  getItem(x: number, y: number): GameObjWithPos | null {
    if (y >= 0 && y < this.mapHeight && x >= 0 && x < this.mapWidth) {
      return this.items[y][x]
    }
    return null
  }

  /**
   * Reset movement processing flags for all moveable objects
   * Called at the beginning of each game tick
   */
  resetMovingFlags(): void {
    for (let y = this.mapHeight - 1; y >= 0; y--) {
      for (let x = 0; x < this.mapWidth; x++) {
        this.bouldersInMove[y][x] = null
        const obj = this.items[y][x]
        if (obj && 'moveProcessed' in obj) {
          obj.moveProcessed = false
        }
      }
    }
  }

  /**
   * Mark boulders/diamonds that should move this tick
   * Determines falling direction (down, or rolling left/right)
   *
   * BOULDER/DIAMOND PHYSICS RULES:
   * 1. Falls downward if space below is empty
   * 2. Kills Rockford/Enemies if falling
   * 3. Rolls off: Walls, Boulders, Diamonds (priority: left > right)
   * 4. Stops on: Dirt, or when blocked
   */
  markBouldersToMove(): void {
    const VEC_ZERO = VEC_ZERO_FACTORY()
    const DIR_DOWN = DIR_DOWN_FACTORY()
    const DIR_LEFT = DIR_LEFT_FACTORY()
    const DIR_RIGHT = DIR_RIGHT_FACTORY()

    for (let y = this.mapHeight - 1; y >= 0; y--) {
      for (let x = 0; x < this.mapWidth; x++) {
        const obj = this.items[y][x]
        if (!obj) continue

        // Check if object has Boulder tag (includes Diamonds)
        if (!obj.is(BOULDER_TAG)) continue

        const boulder = obj as GameObjFalling

        // Check space below
        const below = this.items[boulder.position.y + 1][boulder.position.x]

        // Can fall straight down?
        if (!below || (below && (below.is(ROCKFORD_TAG) || below.is(ENEMY_ROLE_TAG)) && boulder.isFalling)) {
          const isTargetReserved = this.bouldersInMove[boulder.position.y + 1][boulder.position.x] != null
          if (!isTargetReserved) {
            boulder.isFalling = true
            boulder.direction = DIR_DOWN
            boulder.fallScenario = null
            this.bouldersInMove[boulder.position.y + 1][boulder.position.x] = boulder
          }
          continue
        }

        // Boulder is resting on something - check if it can roll off
        if (below.is(BOULDER_TAG)) {
          // Check if there's a boulder above (prevents rolling)
          const above = this.items[boulder.position.y - 1][boulder.position.x]
          let isBoulderAbove = above != null && above.is(BOULDER_TAG)
          isBoulderAbove = false // Original code disables this check

          // Try rolling LEFT first (priority)
          const aboveLeft = this.items[boulder.position.y - 1][boulder.position.x - 1]
          const isBoulderAboveLeft = aboveLeft != null && aboveLeft.is(BOULDER_TAG)
          const belowLeft = this.items[boulder.position.y + 1][boulder.position.x - 1]
          const nextToLeft = this.items[boulder.position.y][boulder.position.x - 1]
          const isLeftTargetReserved = this.bouldersInMove[boulder.position.y][boulder.position.x - 1] != null

          if (!isBoulderAbove && !isBoulderAboveLeft && !nextToLeft && !belowLeft && !boulder.fallScenario && !isLeftTargetReserved) {
            boulder.isFalling = true
            boulder.direction = DIR_LEFT
            boulder.fallScenario = 'set'
            this.bouldersInMove[boulder.position.y][boulder.position.x - 1] = boulder
            continue
          }

          // Try rolling RIGHT (secondary priority)
          const aboveRight = this.items[boulder.position.y - 1][boulder.position.x + 1]
          const isBoulderAboveRight = aboveRight != null && aboveRight.is(BOULDER_TAG)
          const belowRight = this.items[boulder.position.y + 1][boulder.position.x + 1]
          const nextToRight = this.items[boulder.position.y][boulder.position.x + 1]
          const isRightTargetReserved = this.bouldersInMove[boulder.position.y][boulder.position.x + 1] != null

          if (!isBoulderAbove && !isBoulderAboveRight && !nextToRight && !belowRight && !boulder.fallScenario && !isRightTargetReserved) {
            boulder.isFalling = true
            boulder.direction = DIR_RIGHT
            boulder.fallScenario = 'set'
            this.bouldersInMove[boulder.position.y][boulder.position.x + 1] = boulder
            continue
          }
        }

        // Boulder can't move - set to resting state
        boulder.isFalling = false
        boulder.direction = VEC_ZERO
        boulder.fallScenario = null
      }
    }
  }

  /**
   * Move all marked boulders/diamonds
   * Updates grid positions and triggers impact effects
   * @param onImpact - Callback when falling object hits something
   */
  moveBoulders(onImpact: (obj: GameObjWithPos | null) => void): void {
    for (let y = this.mapHeight - 1; y >= 0; y--) {
      for (let x = 0; x < this.mapWidth; x++) {
        const obj = this.items[y][x]
        if (!obj) continue

        // Check if it's a falling boulder that hasn't moved yet
        if (obj.is(BOULDER_TAG) && 'isFalling' in obj) {
          const boulder = obj as GameObjFalling
          if (boulder.isFalling && !boulder.moveProcessed) {
            boulder.moveProcessed = true
            const boulderPositionClone = { x: boulder.position.x, y: boulder.position.y }

            // Move boulder
            boulder.position.x += boulder.direction.x
            boulder.position.y += boulder.direction.y
            boulder.pos.x = boulder.position.x * BLOCK_SIZE
            boulder.pos.y = boulder.position.y * BLOCK_SIZE

            // Update grid
            this.items[boulderPositionClone.y][boulderPositionClone.x] = null
            const impactedObj = this.items[boulder.position.y][boulder.position.x]
            this.items[boulder.position.y][boulder.position.x] = boulder

            // Trigger impact callback
            onImpact(impactedObj)
          }
        }
      }
    }
  }

  /**
   * Get the boulders-in-move tracking grid
   * Used by enemies to avoid moving into falling boulder paths
   * @returns 2D array of boulders that will move this tick
   */
  getBouldersInMove(): (GameObjFalling | null)[][] {
    return this.bouldersInMove
  }
}
