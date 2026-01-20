/**
 * Input System
 * Handles keyboard input and converts it to game directions
 */

import type { KAPLAYCtx, Vec2 } from 'kaplay'
import {
  DIR_LEFT_FACTORY,
  DIR_RIGHT_FACTORY,
  DIR_UP_FACTORY,
  DIR_DOWN_FACTORY,
  VEC_ZERO_FACTORY
} from '../config/constants'

/**
 * Input System Class
 * Manages keyboard input for player movement
 */
export class InputSystem {
  private k: KAPLAYCtx
  private lastKeyDown: string = 'null'

  constructor(k: KAPLAYCtx) {
    this.k = k
  }

  /**
   * Get current movement direction based on keyboard input
   * Implements "sticky keys" - continues in last direction until key is released
   * @returns Direction vector based on current input
   */
  getDirectionByKey(): Vec2 {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    // If last key is no longer pressed, check for new key
    if (!this.k.isKeyDown(this.lastKeyDown)) {
      if (this.k.isKeyDown('left') || this.k.isKeyDown('a')) {
        this.lastKeyDown = 'left'
      } else if (this.k.isKeyDown('right') || this.k.isKeyDown('d')) {
        this.lastKeyDown = 'right'
      } else if (this.k.isKeyDown('up') || this.k.isKeyDown('w')) {
        this.lastKeyDown = 'up'
      } else if (this.k.isKeyDown('down') || this.k.isKeyDown('s')) {
        this.lastKeyDown = 'down'
      } else {
        this.lastKeyDown = 'null'
      }
    }

    return this.keyToDirection(this.lastKeyDown)
  }

  /**
   * Convert key name to direction vector
   * @param key - Key name ('left', 'right', 'up', 'down')
   * @returns Direction vector
   */
  private keyToDirection(key: string): Vec2 {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    switch (key) {
      case 'left':
        return DIR_LEFT_FACTORY()
      case 'right':
        return DIR_RIGHT_FACTORY()
      case 'up':
        return DIR_UP_FACTORY()
      case 'down':
        return DIR_DOWN_FACTORY()
      default:
        return VEC_ZERO
    }
  }

  /**
   * Reset input state
   * Useful when changing scenes or pausing
   */
  reset(): void {
    this.lastKeyDown = 'null'
  }
}
