/**
 * Direction utility functions
 * Helper functions for working with direction vectors and strings
 */

import type { Vec2 } from 'kaplay'
import type { DirectionStr } from '../types'
import {
  STR_LEFT,
  STR_RIGHT,
  STR_UP,
  STR_DOWN,
  DIR_LEFT_FACTORY,
  DIR_RIGHT_FACTORY,
  DIR_UP_FACTORY,
  DIR_DOWN_FACTORY
} from '../config/constants'

/**
 * Convert direction vector to string representation
 * @param vector - Direction vector to convert
 * @returns String representation ('left', 'right', 'up', 'down') or undefined
 */
export function directionVecToStr(vector: Vec2): DirectionStr | undefined {
  const dirLeft = DIR_LEFT_FACTORY()
  const dirRight = DIR_RIGHT_FACTORY()
  const dirUp = DIR_UP_FACTORY()
  const dirDown = DIR_DOWN_FACTORY()

  if (vector.x === dirLeft.x && vector.y === dirLeft.y) {
    return STR_LEFT
  } else if (vector.x === dirRight.x && vector.y === dirRight.y) {
    return STR_RIGHT
  } else if (vector.x === dirUp.x && vector.y === dirUp.y) {
    return STR_UP
  } else if (vector.x === dirDown.x && vector.y === dirDown.y) {
    return STR_DOWN
  }
  return undefined
}

/**
 * Convert direction string to vector
 * @param direction - Direction string ('left', 'right', 'up', 'down')
 * @returns Direction vector
 */
export function directionStrToVec(direction: DirectionStr): Vec2 {
  const currentDirection: Record<DirectionStr, Vec2> = {
    [STR_LEFT]: DIR_LEFT_FACTORY(),
    [STR_DOWN]: DIR_DOWN_FACTORY(),
    [STR_RIGHT]: DIR_RIGHT_FACTORY(),
    [STR_UP]: DIR_UP_FACTORY()
  }

  return currentDirection[direction]
}

/**
 * Get next direction when turning left (clockwise navigation)
 * Used by Fireflies
 * @param currentDirection - Current direction string
 * @returns Next direction when turning left
 */
export function getNextDirectionToLeft(currentDirection: DirectionStr): Vec2 {
  const nextDirectionToLeft: Record<DirectionStr, Vec2> = {
    [STR_LEFT]: DIR_DOWN_FACTORY(),
    [STR_DOWN]: DIR_RIGHT_FACTORY(),
    [STR_RIGHT]: DIR_UP_FACTORY(),
    [STR_UP]: DIR_LEFT_FACTORY()
  }

  return nextDirectionToLeft[currentDirection]
}

/**
 * Get next direction when turning right (counterclockwise navigation)
 * Used by Butterflies
 * @param currentDirection - Current direction string
 * @returns Next direction when turning right
 */
export function getNextDirectionToRight(currentDirection: DirectionStr): Vec2 {
  const nextDirectionToRight: Record<DirectionStr, Vec2> = {
    [STR_LEFT]: DIR_UP_FACTORY(),
    [STR_UP]: DIR_RIGHT_FACTORY(),
    [STR_RIGHT]: DIR_DOWN_FACTORY(),
    [STR_DOWN]: DIR_LEFT_FACTORY()
  }

  return nextDirectionToRight[currentDirection]
}

/**
 * Check if two vectors are equal
 * @param v1 - First vector
 * @param v2 - Second vector
 * @returns True if vectors are equal
 */
export function vecEquals(v1: Vec2, v2: Vec2): boolean {
  return v1.x === v2.x && v1.y === v2.y
}

/**
 * Returns a new integer random number between min (included) and max (included)
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer
 */
export function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
