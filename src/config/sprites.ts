/**
 * Sprite loading and animation configuration
 * Defines all sprite animations for the Boulder Dash game
 */

import type { KAPLAYCtx, LoadSpriteSrc, LoadSpriteOpt } from 'kaplay'
import {
  SPRITES_BOULDER_DASH,
  SPRITE_FILENAME,
  TITAN_WALL_FRAME,
  SPAWN_FRAME,
  EXPLOSION_FRAME,
  FIREFLY_FRAME,
  BUTTERFLY_FRAME,
  DIAMOND_FRAME
} from './constants'

/**
 * Load all game sprites and define animations
 * @param k - KaPlay context instance
 */
export function loadGameSprites(k: KAPLAYCtx): void {
  // Set the root directory for resource loading
  k.loadRoot('/resources/')

  // Load the main spritesheet with all game graphics
  // Spritesheet is 10 columns × 13 rows grid
  // NOTE: In KaPlay 3000.x, animation speed is controlled by animSpeed property on sprite component,
  // NOT by speed in animation definition!
  k.loadSprite(SPRITES_BOULDER_DASH, SPRITE_FILENAME, {
    sliceX: 10,  // 10 sprites per row
    sliceY: 13,  // 13 sprites per column
    animSpeed: 1.0,
    anims: {
      /**
       * ROCKFORD ANIMATIONS
       */

      // Idle animation variant 1: Static frame
      iddle_anim_1: {
        from: 0,
        to: 0
      },

      // Idle animation variant 2: Blinking eyes (3 frames)
      // 3 frames / 0.6s = 5 FPS (slow blink)
      iddle_anim_2: {
        from: 0,
        to: 2,
        speed: 5,
        loop: true
      },

      // Idle animation variant 3: Tapping foot (4 frames)
      // 4 frames / 0.8s = 5 FPS (slow tap)
      iddle_anim_3: {
        from: 3,
        to: 6,
        speed: 5,
        loop: true
      },

      // Run left animation (7 frames)
      // 7 frames / 0.4s = 18 FPS
      runLeft_anim: {
        from: 10,
        to: 16,
        speed: 18,
        loop: true
      },

      // Run right animation (7 frames)
      // 7 frames / 0.4s = 18 FPS
      runRight_anim: {
        from: 20,
        to: 26,
        speed: 18,
        loop: true
      },

      // Birth/spawn animation (5 frames)
      // Plays when Rockford emerges from spawn point
      // 5 frames / 0.5s = 10 FPS
      born_anim: {
        from: 100,
        to: 104,
        speed: 10
      },

      /**
       * SPAWN POINT ANIMATION
       */

      // Spawn point pulsing animation
      // Alternates between titanium wall frame and spawn frame
      // NOTE: No loop - we manually restart in onAnimEnd callback
      // 2 frames / 0.3s = 7 FPS
      spawn_anim: {
        from: TITAN_WALL_FRAME,
        to: SPAWN_FRAME,
        speed: 7
      },

      /**
       * EXIT ANIMATIONS
       */

      // Exit opening animation
      // Reveals the exit when enough diamonds are collected
      exitOpened_anim: {
        from: TITAN_WALL_FRAME,
        to: SPAWN_FRAME
      },

      /**
       * EXPLOSION ANIMATION
       */

      // Explosion effect (3 frames)
      // Plays in 3x3 grid when objects explode
      // 3 frames / 0.2s = 15 FPS
      explosion_anim: {
        from: EXPLOSION_FRAME,
        to: EXPLOSION_FRAME + 2,
        speed: 15
      },

      /**
       * ENEMY ANIMATIONS
       */

      // Firefly animation (4 frames)
      // Fireflies navigate clockwise
      // 4 frames / 0.3s = 13 FPS
      firefly_anim: {
        from: FIREFLY_FRAME,
        to: FIREFLY_FRAME + 3,
        speed: 13,
        loop: true
      },

      // Butterfly animation (4 frames)
      // Butterflies navigate counterclockwise
      // 4 frames / 0.3s = 13 FPS
      butterfly_anim: {
        from: BUTTERFLY_FRAME,
        to: BUTTERFLY_FRAME + 3,
        speed: 13,
        loop: true
      },

      /**
       * DIAMOND ANIMATION
       */

      // Diamond sparkle animation (8 frames)
      // Continuously animates when diamond is on screen
      diamond_anim: {
        from: DIAMOND_FRAME,
        to: DIAMOND_FRAME + 7,
        loop: true,
        speed: 16
      }
    }
  } as LoadSpriteOpt)
}

/**
 * Animation speed constants for different objects
 * These are used with KaPlay's animSpeed property
 */
export const ANIM_SPEEDS = {
  /** Rockford's idle animation speed */
  ROCKFORD_IDLE: 0.2,

  /** Rockford's running animation speed */
  ROCKFORD_RUN: 0.05,

  /** Rockford's spawn animation speed */
  ROCKFORD_SPAWN: 0.3,

  /** Diamond sparkle animation speed */
  DIAMOND: 0.05,

  /** Firefly animation speed */
  FIREFLY: 0.1,

  /** Butterfly animation speed */
  BUTTERFLY: 0.1,

  /** Explosion animation speed */
  EXPLOSION: 0.2,

  /** Spawn point animation speed */
  SPAWN: 0.1,

  /** Exit opening animation speed */
  EXIT: 0.2
} as const
