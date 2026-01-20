/**
 * Enemy System
 * Handles AI and movement for Fireflies and Butterflies
 */

import type { KAPLAYCtx, Vec2 } from 'kaplay'
import type { GameObjEnemy, GameObjWithPos, GameObjFalling, DirectionStr } from '../types'
import {
  FIREFLY_TAG,
  BUTTERFLY_TAG,
  BLOCK_SIZE,
  VEC_ZERO_FACTORY,
  FIREFLY_INIT_DIRECTIONS_FACTORY,
  BUTTERFLY_INIT_DIRECTIONS_FACTORY
} from '../config/constants'
import { directionVecToStr, getNextDirectionToLeft, getNextDirectionToRight, directionStrToVec, vecEquals } from '../utils/directions'

/**
 * Enemy System Class
 * Manages Firefly and Butterfly behavior, navigation, and movement
 * OPTIMIZED: Uses k.every() instead of nested loops for better performance
 */
export class EnemySystem {
  private k: KAPLAYCtx
  private items: (GameObjWithPos | null)[][]
  private bouldersInMove: (GameObjFalling | null)[][]
  private mapWidth: number
  private mapHeight: number

  constructor(k: KAPLAYCtx, items: (GameObjWithPos | null)[][], bouldersInMove: (GameObjFalling | null)[][], mapWidth: number, mapHeight: number) {
    this.k = k
    this.items = items
    this.bouldersInMove = bouldersInMove
    this.mapWidth = mapWidth
    this.mapHeight = mapHeight
  }

  /**
   * Initialize all Fireflies with their starting directions
   * Fireflies navigate CLOCKWISE (prefer LEFT)
   * OPTIMIZED: Uses k.every() instead of nested loops
   */
  initFireflies(): void {
    this.k.get(FIREFLY_TAG).forEach((obj) => {
      const firefly = obj as GameObjEnemy
      firefly.direction = this.getFirstAvailableFireflyDirection(firefly)
    })
  }

  /**
   * Initialize all Butterflies with their starting directions
   * Butterflies navigate COUNTERCLOCKWISE (prefer RIGHT)
   * OPTIMIZED: Uses k.every() instead of nested loops
   */
  initButterflies(): void {
    this.k.get(BUTTERFLY_TAG).forEach((obj) => {
      const butterfly = obj as GameObjEnemy
      butterfly.direction = this.getFirstAvailableButterflyDirection(butterfly)
    })
  }

  /**
   * Find first available direction for trapped/spawning Firefly
   * @param firefly - Firefly object
   * @returns First available direction or zero vector if trapped
   */
  private getFirstAvailableFireflyDirection(firefly: GameObjEnemy): Vec2 {
    const VEC_ZERO = VEC_ZERO_FACTORY()
    const directions = FIREFLY_INIT_DIRECTIONS_FACTORY()

    for (const dir of directions) {
      const nextTo = this.items[firefly.position.y + dir.y][firefly.position.x + dir.x]
      if (!nextTo) {
        return dir
      }
    }
    return VEC_ZERO
  }

  /**
   * Find first available direction for trapped/spawning Butterfly
   * @param butterfly - Butterfly object
   * @returns First available direction or zero vector if trapped
   */
  private getFirstAvailableButterflyDirection(butterfly: GameObjEnemy): Vec2 {
    const VEC_ZERO = VEC_ZERO_FACTORY()
    const directions = BUTTERFLY_INIT_DIRECTIONS_FACTORY()

    for (const dir of directions) {
      const nextTo = this.items[butterfly.position.y + dir.y][butterfly.position.x + dir.x]
      if (!nextTo) {
        return dir
      }
    }
    return VEC_ZERO
  }

  /**
   * Mark Fireflies with their next movement direction
   * Fireflies follow the LEFT WALL (clockwise navigation)
   *
   * FIREFLY NAVIGATION:
   * 1. Try turning LEFT (preferred direction)
   * 2. If blocked, try STRAIGHT
   * 3. If blocked, turn RIGHT
   * 4. Pause if no LEFT space available
   *
   * OPTIMIZED: Uses k.every() instead of nested loops
   */
  markFirefliesToMove(): void {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    this.k.get(FIREFLY_TAG).forEach((obj) => {
      const firefly = obj as GameObjEnemy
      firefly.mustWait = false

      // Trapped or paused? Try to find exit
      if (vecEquals(firefly.direction, VEC_ZERO)) {
        firefly.direction = this.getFirstAvailableFireflyDirection(firefly)
        if (vecEquals(firefly.direction, VEC_ZERO)) {
          return // Still trapped
        }
      }

      // Try turning LEFT (clockwise preference)
      const directionStr = directionVecToStr(firefly.direction) as DirectionStr
      let nextDirection = getNextDirectionToLeft(directionStr)
      let nextObj = this.items[firefly.position.y + nextDirection.y][firefly.position.x + nextDirection.x]

      if (!nextObj || (nextObj && nextObj.is(FIREFLY_TAG))) {
        firefly.direction = nextDirection
        return
      }

      // Try going STRAIGHT
      nextDirection = directionStrToVec(directionStr)
      nextObj = this.items[firefly.position.y + nextDirection.y][firefly.position.x + nextDirection.x]

      if (!nextObj || (nextObj && nextObj.is(FIREFLY_TAG))) {
        firefly.direction = nextDirection
        return
      }

      // Turn RIGHT (forced turn)
      firefly.direction = getNextDirectionToRight(directionStr)

      // Pause if no left space available
      firefly.mustWait = true
    })
  }

  /**
   * Mark Butterflies with their next movement direction
   * Butterflies follow the RIGHT WALL (counterclockwise navigation)
   *
   * BUTTERFLY NAVIGATION:
   * 1. Try turning RIGHT (preferred direction)
   * 2. If blocked, try STRAIGHT
   * 3. If blocked, turn LEFT
   * 4. Pause if no RIGHT space available
   *
   * OPTIMIZED: Uses k.every() instead of nested loops
   */
  markButterFliesToMove(): void {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    this.k.get(BUTTERFLY_TAG).forEach((obj) => {
      const butterfly = obj as GameObjEnemy
      butterfly.mustWait = false

      // Trapped or paused? Try to find exit
      if (vecEquals(butterfly.direction, VEC_ZERO)) {
        butterfly.direction = this.getFirstAvailableButterflyDirection(butterfly)
        if (vecEquals(butterfly.direction, VEC_ZERO)) {
          return // Still trapped
        }
      }

      // Try turning RIGHT (counterclockwise preference)
      const directionStr = directionVecToStr(butterfly.direction) as DirectionStr
      let nextDirection = getNextDirectionToRight(directionStr)
      let nextObj = this.items[butterfly.position.y + nextDirection.y][butterfly.position.x + nextDirection.x]

      if (!nextObj || (nextObj && nextObj.is(BUTTERFLY_TAG))) {
        butterfly.direction = nextDirection
        return
      }

      // Try going STRAIGHT
      nextDirection = directionStrToVec(directionStr)
      nextObj = this.items[butterfly.position.y + nextDirection.y][butterfly.position.x + nextDirection.x]

      if (!nextObj || (nextObj && nextObj.is(BUTTERFLY_TAG))) {
        butterfly.direction = nextDirection
        return
      }

      // Turn LEFT (forced turn)
      butterfly.direction = getNextDirectionToLeft(directionStr)

      // Pause if no right space available
      butterfly.mustWait = true
    })
  }

  /**
   * Move all Fireflies
   * Handles collision with other fireflies and boulder avoidance
   * OPTIMIZED: Uses k.every() instead of nested loops
   */
  moveFireflies(): void {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    this.k.get(FIREFLY_TAG).forEach((obj) => {
      const firefly = obj as GameObjEnemy
      if (firefly.moveProcessed || firefly.mustWait || vecEquals(firefly.direction, VEC_ZERO)) {
        return
      }

      const oldPosition = { x: firefly.position.x, y: firefly.position.y }
      const newPosition = {
        x: firefly.position.x + firefly.direction.x,
        y: firefly.position.y + firefly.direction.y
      }

      // Avoid moving into falling boulder path
      if (this.bouldersInMove[newPosition.y][newPosition.x]) {
        return
      }

      // Check for crossing firefly
      const crossingObj = this.items[newPosition.y][newPosition.x]
      if (crossingObj && crossingObj.is(FIREFLY_TAG) && (crossingObj as GameObjEnemy).moveProcessed) {
        return
      }

      // Move firefly
      firefly.position.x = newPosition.x
      firefly.position.y = newPosition.y
      firefly.pos.x = firefly.position.x * BLOCK_SIZE
      firefly.pos.y = firefly.position.y * BLOCK_SIZE
      firefly.moveProcessed = true

      // Update grid
      this.items[oldPosition.y][oldPosition.x] = null
      this.items[firefly.position.y][firefly.position.x] = firefly

      // Handle crossing firefly
      if (crossingObj) {
        const crossing = crossingObj as GameObjEnemy
        crossing.position.x += crossing.direction.x
        crossing.position.y += crossing.direction.y
        crossing.pos.x = crossing.position.x * BLOCK_SIZE
        crossing.pos.y = crossing.position.y * BLOCK_SIZE
        this.items[crossing.position.y][crossing.position.x] = crossing
        crossing.moveProcessed = true
      }
    })
  }

  /**
   * Move all Butterflies
   * Handles collision with other butterflies and boulder avoidance
   * OPTIMIZED: Uses k.every() instead of nested loops
   */
  moveButterflies(): void {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    this.k.get(BUTTERFLY_TAG).forEach((obj) => {
      const butterfly = obj as GameObjEnemy
      if (butterfly.moveProcessed || butterfly.mustWait || vecEquals(butterfly.direction, VEC_ZERO)) {
        return
      }

      const oldPosition = { x: butterfly.position.x, y: butterfly.position.y }
      const newPosition = {
        x: butterfly.position.x + butterfly.direction.x,
        y: butterfly.position.y + butterfly.direction.y
      }

      // Avoid moving into falling boulder path
      if (this.bouldersInMove[newPosition.y][newPosition.x]) {
        return
      }

      // Check for crossing butterfly
      const crossingObj = this.items[newPosition.y][newPosition.x]
      if (crossingObj && crossingObj.is(BUTTERFLY_TAG) && (crossingObj as GameObjEnemy).moveProcessed) {
        return
      }

      // Move butterfly
      butterfly.position.x = newPosition.x
      butterfly.position.y = newPosition.y
      butterfly.pos.x = butterfly.position.x * BLOCK_SIZE
      butterfly.pos.y = butterfly.position.y * BLOCK_SIZE
      butterfly.moveProcessed = true

      // Update grid
      this.items[oldPosition.y][oldPosition.x] = null
      this.items[butterfly.position.y][butterfly.position.x] = butterfly

      // Handle crossing butterfly
      if (crossingObj) {
        const crossing = crossingObj as GameObjEnemy
        crossing.position.x += crossing.direction.x
        crossing.position.y += crossing.direction.y
        crossing.pos.x = crossing.position.x * BLOCK_SIZE
        crossing.pos.y = crossing.position.y * BLOCK_SIZE
        this.items[crossing.position.y][crossing.position.x] = crossing
        crossing.moveProcessed = true
      }
    })
  }
}
