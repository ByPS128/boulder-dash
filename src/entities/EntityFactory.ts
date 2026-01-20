/**
 * Entity Factory
 * Creates game objects (entities) with appropriate components and behavior
 */

import type { KAPLAYCtx, Vec2, GameObj } from 'kaplay'
import type { GameObjRockford, GameObjFalling, GameObjEnemy, GameObjWithPos } from '../types'
import {
  SPRITES_BOULDER_DASH,
  ROCKFORD_TAG,
  FIREFLY_TAG,
  BUTTERFLY_TAG,
  DIRT_TAG,
  BOULDER_TAG,
  DIAMOND_TAG,
  WALL_TAG,
  TITANIUM_WALL_TAG,
  EXIT_TAG,
  SPAWN_TAG,
  EXPLOSION_TAG,
  ENEMY_ROLE_TAG,
  MOVEABLE_ROLE_TAG,
  BLOCK_SIZE,
  DIRT_FRAME,
  BOULDER_FRAME,
  DIAMOND_FRAME,
  FIREFLY_FRAME,
  BUTTERFLY_FRAME,
  TITAN_WALL_FRAME,
  BRICKS_WALL_FRAME,
  SPAWN_FRAME,
  EXPLOSION_FRAME,
  FIREFLY_ANIMATION,
  BUTTERFLY_ANIMATION,
  DIAMOND_ANIMATION,
  EXPLOSION_ANIMATION,
  IDDLE_ANIMATION_1,
  RUN_RIGHT_ANIMATION,
  VEC_ZERO_FACTORY
} from '../config/constants'
import { ANIM_SPEEDS } from '../config/sprites'

/**
 * Entity Factory Class
 * Responsible for creating all game objects with proper components
 */
export class EntityFactory {
  private k: KAPLAYCtx

  constructor(k: KAPLAYCtx) {
    this.k = k
  }

  /**
   * Create Rockford (player character)
   * @returns Rockford game object
   */
  createRockford(): GameObjRockford {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    const rockford = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, {
        frame: 0
      }),
      this.k.scale(1),
      this.k.z(10), // Ensure Rockford is drawn on top
      ROCKFORD_TAG,
      {
        position: VEC_ZERO,
        direction: VEC_ZERO,
        lastSideAnim: RUN_RIGHT_ANIMATION,
        currentAnim: IDDLE_ANIMATION_1,
        isDead: false,
        pushAttempts: 0
      }
    ]) as GameObjRockford

    // Start hidden (will be revealed after spawn animation)
    rockford.hidden = true

    return rockford
  }

  /**
   * Create Boulder
   * Falls downward, rolls off surfaces, can be pushed by Rockford
   * @param gridPos - Grid position (not pixel position)
   * @returns Boulder game object
   */
  createBoulder(gridPos: Vec2): GameObjFalling {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    const boulder = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: BOULDER_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.area(),
      this.k.z(1),
      BOULDER_TAG,
      MOVEABLE_ROLE_TAG,
      {
        position: this.k.vec2(gridPos.x, gridPos.y),
        isFalling: false,
        direction: VEC_ZERO,
        fallScenario: null,
        moveProcessed: false
      }
    ]) as GameObjFalling

    return boulder
  }

  /**
   * Create Diamond
   * Same physics as Boulder (falls, rolls), collectible by Rockford
   * @param gridPos - Grid position
   * @returns Diamond game object
   */
  createDiamond(gridPos: Vec2): GameObjFalling {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    const diamond = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: DIAMOND_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.area(),
      this.k.z(1),
      BOULDER_TAG,  // Shares physics with Boulder
      DIAMOND_TAG,
      MOVEABLE_ROLE_TAG,
      {
        position: this.k.vec2(gridPos.x, gridPos.y),
        isFalling: false,
        direction: VEC_ZERO,
        fallScenario: null,
        moveProcessed: false
      }
    ]) as GameObjFalling

    // Play diamond sparkle animation (speed defined in sprites.ts)
    diamond.play(DIAMOND_ANIMATION)

    return diamond
  }

  /**
   * Create Firefly (enemy)
   * Navigates clockwise (prefers left), explodes on death
   * Death conditions: falling Boulder/Diamond, Amoeba touch
   * @param gridPos - Grid position
   * @returns Firefly game object
   */
  createFirefly(gridPos: Vec2): GameObjEnemy {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    const firefly = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: FIREFLY_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.area(),
      this.k.z(5),
      FIREFLY_TAG,
      MOVEABLE_ROLE_TAG,
      ENEMY_ROLE_TAG,
      {
        position: this.k.vec2(gridPos.x, gridPos.y),
        direction: VEC_ZERO,
        moveProcessed: false,
        mustWait: false
      }
    ]) as GameObjEnemy

    // Play firefly animation (speed defined in sprites.ts)
    firefly.play(FIREFLY_ANIMATION)

    return firefly
  }

  /**
   * Create Butterfly (enemy)
   * Navigates counterclockwise (prefers right), explodes into 9 diamonds on direct kill
   * Death conditions: falling Boulder/Diamond, Amoeba touch
   * Note: Chain explosions don't create diamonds
   * @param gridPos - Grid position
   * @returns Butterfly game object
   */
  createButterfly(gridPos: Vec2): GameObjEnemy {
    const VEC_ZERO = VEC_ZERO_FACTORY()

    const butterfly = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: BUTTERFLY_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.area(),
      this.k.z(5),
      BUTTERFLY_TAG,
      MOVEABLE_ROLE_TAG,
      ENEMY_ROLE_TAG,
      {
        position: this.k.vec2(gridPos.x, gridPos.y),
        direction: VEC_ZERO,
        moveProcessed: false,
        mustWait: false
      }
    ]) as GameObjEnemy

    // Play butterfly animation (speed defined in sprites.ts)
    butterfly.play(BUTTERFLY_ANIMATION)

    return butterfly
  }

  /**
   * Create Dirt
   * Can be dug by Rockford, destroyed by explosions
   * @param gridPos - Grid position
   * @returns Dirt game object
   */
  createDirt(gridPos: Vec2): GameObjWithPos {
    const dirt = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: DIRT_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.area(),
      this.k.z(0),
      DIRT_TAG,
      {
        position: this.k.vec2(gridPos.x, gridPos.y)
      }
    ]) as GameObjWithPos

    return dirt
  }

  /**
   * Create Brick Wall
   * Destroyable by explosions, boulders roll off it
   * @param gridPos - Grid position
   * @returns Wall game object
   */
  createWall(gridPos: Vec2): GameObjWithPos {
    const wall = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: BRICKS_WALL_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.area(),
      this.k.z(0),
      WALL_TAG,
      {
        position: this.k.vec2(gridPos.x, gridPos.y)
      }
    ]) as GameObjWithPos

    return wall
  }

  /**
   * Create Titanium Wall
   * Indestructible, boulders don't roll off it
   * @param gridPos - Grid position
   * @returns Titanium wall game object
   */
  createTitaniumWall(gridPos: Vec2): GameObjWithPos {
    const titanWall = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: TITAN_WALL_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.area(),
      this.k.z(0),
      TITANIUM_WALL_TAG,
      {
        position: this.k.vec2(gridPos.x, gridPos.y)
      }
    ]) as GameObjWithPos

    return titanWall
  }

  /**
   * Create Exit
   * Opens when required diamonds are collected
   * @param gridPos - Grid position
   * @returns Exit game object
   */
  createExit(gridPos: Vec2): GameObjWithPos {
    const exit = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: TITAN_WALL_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.area(),
      this.k.z(0),
      EXIT_TAG,
      {
        position: this.k.vec2(gridPos.x, gridPos.y)
      }
    ]) as GameObjWithPos

    return exit
  }

  /**
   * Create Spawn Point
   * Animates before Rockford appears
   * @param gridPos - Grid position
   * @param rockford - Rockford object to show after spawn
   * @param onComplete - Callback when spawn sequence finishes
   * @returns Spawn point game object
   */
  createSpawn(gridPos: Vec2, rockford?: GameObjRockford, onComplete?: () => void): GameObj {
    const spawn = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: SPAWN_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.z(15),
      SPAWN_TAG,
      {
        spawnAnimated: 0
      }
    ])

    // Setup animation sequence callback (only once during creation)
    if (rockford && onComplete) {
      spawn.onAnimEnd((anim: string) => {
        if (anim === 'spawn_anim') {
          (spawn as any).spawnAnimated++
          if ((spawn as any).spawnAnimated === 5) {
            spawn.play('born_anim')
          } else {
            spawn.play('spawn_anim')
          }
        }

        if (anim === 'born_anim') {
          this.k.destroy(spawn)
          rockford.hidden = false
          rockford.play('iddle_anim_1')
          onComplete()
        }
      })
    }

    return spawn
  }

  /**
   * Create Explosion
   * Temporary effect that destroys nearby objects
   * @param gridPos - Grid position
   * @param onAnimEnd - Callback when animation ends (for cleanup)
   * @returns Explosion game object
   */
  createExplosion(gridPos: Vec2, onAnimEnd?: (explosion: GameObj) => void): GameObj {
    const explosion = this.k.add([
      this.k.sprite(SPRITES_BOULDER_DASH, { frame: EXPLOSION_FRAME }),
      this.k.pos(gridPos.x * BLOCK_SIZE, gridPos.y * BLOCK_SIZE),
      this.k.area(),
      this.k.z(20),
      EXPLOSION_TAG,
      {
        position: this.k.vec2(gridPos.x, gridPos.y)
      }
    ])

    // Play explosion animation (speed defined in sprites.ts, doesn't loop)
    explosion.play(EXPLOSION_ANIMATION)

    // Setup cleanup callback if provided
    if (onAnimEnd) {
      explosion.onAnimEnd(() => {
        onAnimEnd(explosion)
      })
    }

    return explosion
  }
}
