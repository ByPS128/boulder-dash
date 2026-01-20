/**
 * Explosion System
 * Handles explosion creation and effects
 */

import type { KAPLAYCtx, Vec2, GameObj } from 'kaplay'
import type { ExplosionType, GameObjWithPos } from '../types'
import { EntityFactory } from '../entities/EntityFactory'
import {
  TITANIUM_WALL_TAG,
  EXIT_TAG,
  ENEMY_ROLE_TAG,
  ROCKFORD_TAG
} from '../config/constants'

/**
 * Explosion System Class
 * Creates explosions and manages their effects on nearby objects
 */
export class ExplosionSystem {
  private k: KAPLAYCtx
  private entityFactory: EntityFactory
  private items: (GameObjWithPos | null)[][]

  constructor(k: KAPLAYCtx, entityFactory: EntityFactory, items: (GameObjWithPos | null)[][]) {
    this.k = k
    this.entityFactory = entityFactory
    this.items = items
  }

  /**
   * Create explosion at specified position
   * Explosions affect 3x3 area centered on the position
   *
   * EXPLOSION RULES:
   * - Destroys everything except Titanium Walls and Exit
   * - Firefly explosion: creates 9 empty spaces
   * - Butterfly explosion (direct kill): creates 9 diamonds
   * - Butterfly explosion (chain): creates 9 empty spaces
   * - Chain explosions: enemies killed by explosion don't drop diamonds
   *
   * @param position - Center position of explosion (grid coordinates)
   * @param explosionType - Type of explosion ('standard' or 'butterfly')
   */
  createExplosion(position: Vec2, explosionType: ExplosionType = 'standard'): void {
    // Explosion affects 3x3 grid
    for (let x = position.x - 1; x <= position.x + 1; x++) {
      for (let y = position.y - 1; y <= position.y + 1; y++) {
        const obj = this.items[y][x]

        if (obj) {
          // Titanium walls and exits are indestructible
          if (obj.is(TITANIUM_WALL_TAG) || obj.is(EXIT_TAG)) {
            continue
          }

          // Mark enemies killed by explosion (for chain detection)
          if (obj.is(ENEMY_ROLE_TAG)) {
            (obj as any).killedByExplosion = true
          }

          // Destroy the object
          this.k.destroy(obj)
        }

        // Create explosion visual or diamond based on type
        if (explosionType === 'butterfly') {
          // Butterfly explosion: create diamond
          const diamond = this.entityFactory.createDiamond(this.k.vec2(x, y))
          this.items[y][x] = diamond
        } else {
          // Standard explosion: create explosion animation with cleanup callback
          const explosion = this.entityFactory.createExplosion(this.k.vec2(x, y), (exp) => {
            // Clean up explosion from grid when animation ends
            const expPos = (exp as any).position
            if (expPos) {
              this.items[expPos.y][expPos.x] = null
            }
            this.k.destroy(exp)
          })
          this.items[y][x] = explosion
        }
      }
    }
  }

  /**
   * Create explosion for Rockford (player death)
   * Always creates standard explosion
   * @param position - Rockford's position (grid coordinates)
   */
  createRockfordExplosion(position: Vec2): void {
    this.createExplosion(position, 'standard')
  }

  /**
   * Create explosion for Firefly
   * Always creates standard explosion (empty spaces)
   * @param position - Firefly's position (grid coordinates)
   */
  createFireflyExplosion(position: Vec2): void {
    this.createExplosion(position, 'standard')
  }

  /**
   * Create explosion for Butterfly
   * Creates 9 diamonds if direct kill, empty spaces if chain explosion
   * @param position - Butterfly's position (grid coordinates)
   * @param isChainExplosion - Was butterfly killed by another explosion?
   */
  createButterflyExplosion(position: Vec2, isChainExplosion: boolean): void {
    if (isChainExplosion) {
      // Chain explosion: no bonus diamonds
      this.createExplosion(position, 'standard')
    } else {
      // Direct kill (Boulder/Diamond/Amoeba): create 9 diamonds
      this.createExplosion(position, 'butterfly')
    }
  }
}
