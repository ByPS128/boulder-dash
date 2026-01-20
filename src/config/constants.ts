/**
 * Game constants and configuration values
 * Contains all static values used throughout the Boulder Dash game
 */

import type { Vec2 } from 'kaplay'

// ============================================================================
// BOARD DIMENSIONS
// ============================================================================

/** Total width of the game board in tiles */
export const BOARD_WIDTH = 40

/** Total height of the game board in tiles */
export const BOARD_HEIGHT = 24

/** Visible width of the viewport in tiles */
export const BOARD_VISIBLE_WIDTH = 28 // Original: 20

/** Visible height of the viewport in tiles */
export const BOARD_VISIBLE_HEIGHT = 16 // Original: 13

/** Size of each tile/block in pixels */
export const BLOCK_SIZE = 16

// ============================================================================
// KAPLAY WINDOW DIMENSIONS
// ============================================================================

/** Canvas width in pixels (visible board width × block size) */
export const KABOOM_WIDTH = BOARD_VISIBLE_WIDTH * BLOCK_SIZE

/** Canvas height in pixels (visible board height × block size) */
export const KABOOM_HEIGHT = BOARD_VISIBLE_HEIGHT * BLOCK_SIZE

/** Half of canvas width (for camera calculations) */
export const KABOOM_HALF_WIDTH = KABOOM_WIDTH / 2

/** Half of canvas height (for camera calculations) */
export const KABOOM_HALF_HEIGHT = KABOOM_HEIGHT / 2

// ============================================================================
// GAME SPEED
// ============================================================================

/**
 * Time interval between game ticks (in seconds)
 * Lower value = faster game
 * 0.4 = ~2.5 ticks per second
 */
export const SPEED = 0.04

// ============================================================================
// DIRECTION VECTORS
// ============================================================================

/** Zero vector (no movement) - created at runtime */
export const VEC_ZERO_FACTORY = (): Vec2 => ({ x: 0, y: 0 } as Vec2)

/** Left direction vector */
export const DIR_LEFT_FACTORY = (): Vec2 => ({ x: -1, y: 0 } as Vec2)

/** Right direction vector */
export const DIR_RIGHT_FACTORY = (): Vec2 => ({ x: 1, y: 0 } as Vec2)

/** Up direction vector */
export const DIR_UP_FACTORY = (): Vec2 => ({ x: 0, y: -1 } as Vec2)

/** Down direction vector */
export const DIR_DOWN_FACTORY = (): Vec2 => ({ x: 0, y: 1 } as Vec2)

// ============================================================================
// DIRECTION STRINGS
// ============================================================================

/** String representation of left direction */
export const STR_LEFT = 'left'

/** String representation of right direction */
export const STR_RIGHT = 'right'

/** String representation of up direction */
export const STR_UP = 'up'

/** String representation of down direction */
export const STR_DOWN = 'down'

// ============================================================================
// SPRITE AND TAG NAMES
// ============================================================================

/** Main spritesheet identifier */
export const SPRITES_BOULDER_DASH = 'bd'

/** Filename of the spritesheet */
export const SPRITE_FILENAME = 'spritesheet_A.png'

// ============================================================================
// CHARACTER TAGS
// ============================================================================

/** Tag for Rockford (player) */
export const ROCKFORD_TAG = 'rockford'

/** Tag for Firefly enemy */
export const FIREFLY_TAG = 'firefly'

/** Tag for Butterfly enemy */
export const BUTTERFLY_TAG = 'butterfly'

// ============================================================================
// ITEM/SPRITE TAGS
// ============================================================================

/** Tag for dirt blocks */
export const DIRT_TAG = 'dirt'

/** Tag for boulders (also used for diamonds since they share physics) */
export const BOULDER_TAG = 'boulder'

/** Tag for diamonds */
export const DIAMOND_TAG = 'diamond'

/** Tag for destructible walls */
export const WALL_TAG = 'wall'

/** Tag for titanium walls (indestructible) */
export const TITANIUM_WALL_TAG = 'titan'

/** Tag for magic walls */
export const MAGIC_WALL_TAG = 'magicWall'

/** Tag for amoeba */
export const AMOEBA_TAG = 'amoeba'

/** Tag for exit */
export const EXIT_TAG = 'exit'

/** Tag for spawn point */
export const SPAWN_TAG = 'spawn'

/** Tag for explosion objects */
export const EXPLOSION_TAG = 'explosion'

// ============================================================================
// ROLE TAGS
// ============================================================================

/** Role tag for enemy characters (Firefly, Butterfly) */
export const ENEMY_ROLE_TAG = 'enemy'

/** Role tag for moveable objects (Boulders, Diamonds, Enemies) */
export const MOVEABLE_ROLE_TAG = 'moveable'

// ============================================================================
// SPRITE FRAME INDICES
// ============================================================================

/** Frame index for titanium wall sprite */
export const TITAN_WALL_FRAME = 30

/** Frame index for dirt sprite */
export const DIRT_FRAME = 33

/** Frame index for spawn point sprite */
export const SPAWN_FRAME = 31

/** Frame index for brick wall sprite */
export const BRICKS_WALL_FRAME = 32

/** Frame index for boulder sprite */
export const BOULDER_FRAME = 35

/** Frame index for diamond sprite (first frame of animation) */
export const DIAMOND_FRAME = 40

/** Frame index for firefly sprite (first frame of animation) */
export const FIREFLY_FRAME = 80

/** Frame index for butterfly sprite (first frame of animation) */
export const BUTTERFLY_FRAME = 90

/** Frame index for explosion sprite (first frame of animation) */
export const EXPLOSION_FRAME = 100

// ============================================================================
// ANIMATION NAMES
// ============================================================================

/** Firefly animation identifier */
export const FIREFLY_ANIMATION = 'firefly_anim'

/** Butterfly animation identifier */
export const BUTTERFLY_ANIMATION = 'butterfly_anim'

/** Diamond animation identifier */
export const DIAMOND_ANIMATION = 'diamond_anim'

/** Explosion animation identifier */
export const EXPLOSION_ANIMATION = 'explosion_anim'

/** Idle animation variant 1 (simple) */
export const IDDLE_ANIMATION_1 = 'iddle_anim_1'

/** Idle animation variant 2 (blinking) */
export const IDDLE_ANIMATION_2 = 'iddle_anim_2'

/** Idle animation variant 3 (tapping foot) */
export const IDDLE_ANIMATION_3 = 'iddle_anim_3'

/** Run left animation */
export const RUN_LEFT_ANIMATION = 'runLeft_anim'

/** Run right animation */
export const RUN_RIGHT_ANIMATION = 'runRight_anim'

/** Birth/spawn animation for Rockford */
export const BORN_ANIMATION = 'born_anim'

/** Spawn point animation */
export const SPAWN_ANIMATION = 'spawn_anim'

/** Exit opening animation */
export const EXIT_OPENED_ANIMATION = 'exitOpened_anim'

// ============================================================================
// ENEMY INITIAL DIRECTION PRIORITIES
// ============================================================================

/**
 * Firefly initial direction search order
 * Fireflies navigate CLOCKWISE (prefer LEFT)
 * Order: LEFT → DOWN → RIGHT → UP
 */
export const FIREFLY_INIT_DIRECTIONS_FACTORY = (): Vec2[] => [
  DIR_LEFT_FACTORY(),
  DIR_DOWN_FACTORY(),
  DIR_RIGHT_FACTORY(),
  DIR_UP_FACTORY()
]

/**
 * Butterfly initial direction search order
 * Butterflies navigate COUNTERCLOCKWISE (prefer RIGHT)
 * Order: LEFT → UP → RIGHT → DOWN
 */
export const BUTTERFLY_INIT_DIRECTIONS_FACTORY = (): Vec2[] => [
  DIR_LEFT_FACTORY(),
  DIR_UP_FACTORY(),
  DIR_RIGHT_FACTORY(),
  DIR_DOWN_FACTORY()
]

// ============================================================================
// CAMERA CONFIGURATION
// ============================================================================

/** Margin from edge before camera starts scrolling (in tiles) */
export const CAMERA_SCROLL_MARGIN = 5

/** Camera movement speed multiplier */
export const CAMERA_SPEED = 4
