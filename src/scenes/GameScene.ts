/**
 * Game Scene
 * Main game logic and level management
 *
 * This file contains the complete game loop, Rockford movement,
 * collision detection, camera system, and UI management.
 */

import type { KAPLAYCtx, Vec2 } from 'kaplay'
import type { GameObjRockford, GameObjWithPos, LevelConfig } from '../types'
import { EntityFactory } from '../entities/EntityFactory'
import { PhysicsSystem } from '../systems/PhysicsSystem'
import { ExplosionSystem } from '../systems/ExplosionSystem'
import { EnemySystem } from '../systems/EnemySystem'
import { InputSystem } from '../systems/InputSystem'
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BOARD_VISIBLE_WIDTH,
  BOARD_VISIBLE_HEIGHT,
  BLOCK_SIZE,
  KABOOM_WIDTH,
  KABOOM_HEIGHT,
  KABOOM_HALF_WIDTH,
  KABOOM_HALF_HEIGHT,
  SPEED,
  CAMERA_SCROLL_MARGIN,
  CAMERA_SPEED,
  ROCKFORD_TAG,
  FIREFLY_TAG,
  BUTTERFLY_TAG,
  DIRT_TAG,
  BOULDER_TAG,
  DIAMOND_TAG,
  EXIT_TAG,
  ENEMY_ROLE_TAG,
  AMOEBA_TAG,
  EXPLOSION_TAG,
  SPAWN_TAG,
  VEC_ZERO_FACTORY,
  DIR_LEFT_FACTORY,
  DIR_RIGHT_FACTORY,
  DIR_UP_FACTORY,
  DIR_DOWN_FACTORY,
  FIREFLY_INIT_DIRECTIONS_FACTORY,
  IDDLE_ANIMATION_1,
  IDDLE_ANIMATION_2,
  IDDLE_ANIMATION_3,
  RUN_LEFT_ANIMATION,
  RUN_RIGHT_ANIMATION,
  BORN_ANIMATION,
  SPAWN_ANIMATION,
  EXIT_OPENED_ANIMATION,
  EXPLOSION_ANIMATION
} from '../config/constants'
import { vecEquals, randomInteger } from '../utils/directions'

/**
 * Game Scene Class
 * Manages the entire game state, systems, and game loop
 */
export class GameScene {
  private k: KAPLAYCtx
  private entityFactory: EntityFactory
  private physicsSystem!: PhysicsSystem
  private explosionSystem!: ExplosionSystem
  private enemySystem!: EnemySystem
  private inputSystem: InputSystem

  private rockford!: GameObjRockford
  private spawn: any
  private exit: any

  private map: string[]
  private levelConfig: LevelConfig
  private mapWidth: number = 0
  private mapHeight: number = 0

  private initialized = false

  // Cached direction vectors (to avoid creating new objects every frame)
  private readonly VEC_ZERO: Vec2
  private readonly DIR_LEFT: Vec2
  private readonly DIR_RIGHT: Vec2
  private readonly DIR_UP: Vec2
  private readonly DIR_DOWN: Vec2
  private playing = false
  private cumulatedDelta = 0

  // Camera
  private camPosCurrent!: Vec2
  private camPosWanted!: Vec2
  private camOffset!: Vec2

  // UI
  private uiBackground: any
  private scoreLabel: any
  private diamondsNeededLabel: any
  private levelLabel: any
  private exitOpened = false

  constructor(k: KAPLAYCtx, map: string[], levelConfig: LevelConfig) {
    this.k = k
    this.map = map
    this.levelConfig = levelConfig
    this.entityFactory = new EntityFactory(k)
    this.inputSystem = new InputSystem(k)

    // Initialize cached vectors once
    this.VEC_ZERO = VEC_ZERO_FACTORY()
    this.DIR_LEFT = DIR_LEFT_FACTORY()
    this.DIR_RIGHT = DIR_RIGHT_FACTORY()
    this.DIR_UP = DIR_UP_FACTORY()
    this.DIR_DOWN = DIR_DOWN_FACTORY()
  }

  /**
   * Initialize and start the game scene
   */
  async start(): Promise<void> {
    // Using cached this.VEC_ZERO

    this.mapHeight = this.map.length
    this.mapWidth = this.map[0].length

    // Initialize physics system
    this.physicsSystem = new PhysicsSystem(this.mapWidth, this.mapHeight)

    // Initialize camera
    this.camPosCurrent = this.k.vec2(0, 0)
    this.camPosWanted = this.k.vec2(0, 0)
    this.camOffset = this.k.vec2(0, 0)

    // Create Rockford
    this.rockford = this.entityFactory.createRockford()

    // Create UI
    this.createUI()

    // Load level
    this.loadLevel()

    // Initialize explosion system
    this.explosionSystem = new ExplosionSystem(
      this.k,
      this.entityFactory,
      this.physicsSystem.getItems()
    )

    // Initialize enemy system (optimized with cached arrays)
    this.enemySystem = new EnemySystem(
      this.k,
      this.physicsSystem.getItems(),
      this.physicsSystem.getBouldersInMove(),
      this.mapWidth,
      this.mapHeight
    )

    // Initialize enemies (caches fireflies and butterflies arrays)
    this.enemySystem.initFireflies()
    this.enemySystem.initButterflies()

    // Initial physics calculations
    this.physicsSystem.markBouldersToMove()
    this.enemySystem.markFirefliesToMove()
    this.enemySystem.markButterFliesToMove()

    // Start spawn animation (onAnimEnd callback is set during spawn creation)
    this.spawn.play(SPAWN_ANIMATION)
    //
    // // Setup explosion animation cleanup
    // this.setupExplosionCleanup()

    this.initialized = true

    // Start game loop
    this.startGameLoop()
  }

  /**
   * Load level from map string array
   * Creates all game objects and places them on the grid
   */
  private loadLevel(): void {
    const items = this.physicsSystem.getItems()

    for (let y = 0; y < this.mapHeight; y++) {
      const row = this.map[y]
      for (let x = 0; x < this.mapWidth; x++) {
        const ch = row[x]
        const gridPos = this.k.vec2(x, y)

        switch (ch) {
          case '*': // Boulder
            {
              const boulder = this.entityFactory.createBoulder(gridPos)
              items[y][x] = boulder
            }
            break

          case '+': // Diamond
            {
              const diamond = this.entityFactory.createDiamond(gridPos)
              items[y][x] = diamond
            }
            break

          case 'O': // Firefly
            {
              const firefly = this.entityFactory.createFirefly(gridPos)
              items[y][x] = firefly
            }
            break

          case 'X': // Butterfly
            {
              const butterfly = this.entityFactory.createButterfly(gridPos)
              items[y][x] = butterfly
            }
            break

          case '.': // Dirt
            {
              const dirt = this.entityFactory.createDirt(gridPos)
              items[y][x] = dirt
            }
            break

          case '=': // Titanium Wall
            {
              const titanWall = this.entityFactory.createTitaniumWall(gridPos)
              items[y][x] = titanWall
            }
            break

          case '-': // Brick Wall
            {
              const wall = this.entityFactory.createWall(gridPos)
              items[y][x] = wall
            }
            break

          case 'S': // Spawn (Rockford start position)
            {
              this.rockford.position = this.k.vec2(x, y)
              this.rockford.pos = this.k.vec2(x * BLOCK_SIZE, y * BLOCK_SIZE)
              items[y][x] = this.rockford

              this.calculateWantedCamPos()
              this.camPosCurrent = this.k.vec2(this.camPosWanted.x, this.camPosWanted.y)

              // Create spawn with callback (registers onAnimEnd only once)
              this.spawn = this.entityFactory.createSpawn(
                gridPos,
                this.rockford,
                () => { this.playing = true }
              )
              this.spawn.position = this.rockford.position
              this.spawn.pos = this.k.vec2(this.rockford.pos.x, this.rockford.pos.y)
              // Animation speed is defined in sprites.ts
            }
            break

          case 'E': // Exit
            {
              this.exit = this.entityFactory.createExit(gridPos)
              items[y][x] = this.exit
            }
            break
        }
      }
    }
  }

  /**
   * Create UI elements (score, diamonds needed, level)
   */
  private createUI(): void {
    // Background bar
    this.uiBackground = this.k.add([
      this.k.rect(BOARD_WIDTH * BLOCK_SIZE, BLOCK_SIZE),
      this.k.color(0, 0, 0),
      this.k.pos(0, 0),
      this.k.z(100),
      {
        setPos: (currentCamPos: Vec2) => {
          // OPTIMIZED: Modify existing pos in place
          this.uiBackground.pos.x = currentCamPos.x - KABOOM_HALF_WIDTH
          this.uiBackground.pos.y = currentCamPos.y - KABOOM_HALF_HEIGHT
        }
      }
    ])

    // Score label
    this.scoreLabel = this.k.add([
      this.k.text('score: 0', { size: 8 }),
      this.k.pos(30, 6),
      this.k.color(255, 255, 255),
      this.k.z(101),
      {
        value: 0,
        inc: (amount: number = 1) => {
          this.scoreLabel.value += amount
          this.scoreLabel.text = `score: ${this.scoreLabel.value}`
        },
        set: (newValue: number) => {
          this.scoreLabel.value = newValue
          this.scoreLabel.text = `score: ${this.scoreLabel.value}`
        },
        setPos: (currentCamPos: Vec2) => {
          // OPTIMIZED: Modify existing pos in place
          this.scoreLabel.pos.x = currentCamPos.x - KABOOM_HALF_WIDTH + 30
          this.scoreLabel.pos.y = currentCamPos.y - KABOOM_HALF_HEIGHT + 6
        }
      }
    ])

    // Diamonds needed label
    this.diamondsNeededLabel = this.k.add([
      this.k.text('needed: 0', { size: 8 }),
      this.k.pos(130, 6),
      this.k.color(255, 255, 255),
      this.k.z(101),
      {
        value: 0,
        set: (newValue: number) => {
          this.diamondsNeededLabel.value = newValue
          this.diamondsNeededLabel.setText()
        },
        dec: () => {
          this.diamondsNeededLabel.value--
          this.diamondsNeededLabel.setText()
        },
        setText: () => {
          const displayValue = this.diamondsNeededLabel.value < 0 ? 0 : this.diamondsNeededLabel.value
          this.diamondsNeededLabel.text = `needed: ${displayValue}`
        },
        setPos: (currentCamPos: Vec2) => {
          // OPTIMIZED: Modify existing pos in place
          this.diamondsNeededLabel.pos.x = currentCamPos.x - KABOOM_HALF_WIDTH + 130
          this.diamondsNeededLabel.pos.y = currentCamPos.y - KABOOM_HALF_HEIGHT + 6
        }
      }
    ])

    // Level label
    this.levelLabel = this.k.add([
      this.k.text('level: 0', { size: 8 }),
      this.k.pos(240, 6),
      this.k.color(255, 255, 255),
      this.k.z(101),
      {
        value: 0,
        set: (newValue: number) => {
          this.levelLabel.value = newValue
          this.levelLabel.text = `level: ${this.levelLabel.value}`
        },
        setPos: (currentCamPos: Vec2) => {
          // OPTIMIZED: Modify existing pos in place
          this.levelLabel.pos.x = currentCamPos.x - KABOOM_HALF_WIDTH + 240
          this.levelLabel.pos.y = currentCamPos.y - KABOOM_HALF_HEIGHT + 6
        }
      }
    ])

    // Set initial values
    this.scoreLabel.set(0)
    this.levelLabel.set(1)
    this.diamondsNeededLabel.set(this.levelConfig.diamondsNeeded)
  }

  /**
   * Update UI positions to follow camera
   * @param currentCamPos - Current camera position
   */
  private UISetPos(currentCamPos: Vec2): void {
    this.uiBackground.setPos(currentCamPos)
    this.scoreLabel.setPos(currentCamPos)
    this.diamondsNeededLabel.setPos(currentCamPos)
    this.levelLabel.setPos(currentCamPos)
  }

  /**
   * Calculate wanted camera position based on Rockford's position
   */
  private calculateWantedCamPos(): void {
    this.camPosWanted = this.k.vec2(
      (this.camOffset.x + BOARD_VISIBLE_WIDTH / 2) * BLOCK_SIZE,
      (this.camOffset.y + BOARD_VISIBLE_HEIGHT / 2) * BLOCK_SIZE
    )
  }

  /**
   * Calculate camera position to follow Rockford
   * Camera scrolls when Rockford gets near the edges
   */
  private calculateCamPos(): void {
    const oldCamOffset = this.k.vec2(this.camOffset.x, this.camOffset.y)

    // Horizontal scrolling
    if (this.rockford.position.x - this.camOffset.x < CAMERA_SCROLL_MARGIN) {
      if (this.camOffset.x > 0) {
        this.camOffset.x--
      }
    }

    if (this.rockford.position.x - this.camOffset.x > BOARD_VISIBLE_WIDTH - CAMERA_SCROLL_MARGIN) {
      if (this.camOffset.x < BOARD_WIDTH - BOARD_VISIBLE_WIDTH) {
        this.camOffset.x++
      }
    }

    // Vertical scrolling
    if (this.rockford.position.y - this.camOffset.y < CAMERA_SCROLL_MARGIN) {
      if (this.camOffset.y > 0) {
        this.camOffset.y--
      }
    }

    if (this.rockford.position.y - this.camOffset.y > BOARD_VISIBLE_HEIGHT - CAMERA_SCROLL_MARGIN) {
      if (this.camOffset.y < BOARD_HEIGHT - BOARD_VISIBLE_HEIGHT) {
        this.camOffset.y++
      }
    }

    // Camera position changed?
    if (oldCamOffset.x !== this.camOffset.x || oldCamOffset.y !== this.camOffset.y) {
      this.calculateWantedCamPos()
    }
  }

  /**
   * Setup explosion animation cleanup
   * Destroys explosion objects when animation finishes
   */
  private setupExplosionCleanup(): void {
    // KaPlay 3000.x: Use onAnimEnd on explosion objects directly
    // This will be set up when explosions are created
  }

  // Continued in next part...
/**
 * Game Scene - Part 2: Rockford Movement and Collision Logic
 * (This will be merged into GameScene.ts)
 */

  /**
   * Remove dirt at specified position
   * @param mudPos - Grid position of dirt
   */
  private removeDirt(mudPos: Vec2): void {
    const items = this.physicsSystem.getItems()
    const mud = items[mudPos.y][mudPos.x]

    if (!mud) return

    if (mud.is(DIRT_TAG)) {
      items[mud.position.y][mud.position.x] = null
      this.k.destroy(mud)
    }
  }

  /**
   * Remove diamond at specified position and update score
   * Opens exit when enough diamonds collected
   * @param diamondPos - Grid position of diamond
   */
  private removeDiamond(diamondPos: Vec2): void {
    const items = this.physicsSystem.getItems()
    const diamond = items[diamondPos.y][diamondPos.x]

    if (!diamond) return

    if (diamond.is(DIAMOND_TAG)) {
      items[diamond.position.y][diamond.position.x] = null
      this.k.destroy(diamond)

      // Award points
      const points = this.exitOpened
        ? this.levelConfig.diamondBonusValue
        : this.levelConfig.diamondValue
      this.scoreLabel.inc(points)
      this.diamondsNeededLabel.dec()

      // Open exit when enough diamonds collected
      if (this.diamondsNeededLabel.value === 0) {
        // Flash effect
        const bgRect = this.k.add([
          this.k.rect(BOARD_WIDTH * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE),
          this.k.color(255, 255, 255),
          this.k.z(50)
        ])

        this.k.wait(0.2, () => {
          this.k.destroy(bgRect)

          // Play exit opening animation (KaPlay 3000.x)
          this.exit.play(EXIT_OPENED_ANIMATION)

          this.exitOpened = true
        })
      }
    }
  }

  /**
   * Move Rockford based on current direction
   * Handles digging, collecting, pushing boulders, and entering exit
   */
  private moveRockford(): void {
    // Using cached this.VEC_ZERO
    // Using cached this.DIR_LEFT
    // Using cached this.DIR_RIGHT
    // Using cached this.DIR_UP
    // Using cached this.DIR_DOWN
    const items = this.physicsSystem.getItems()

    // Is Rockford idle?
    if (vecEquals(this.rockford.direction, this.VEC_ZERO)) {
      const isIdleAnim = this.rockford.lastSideAnim === IDDLE_ANIMATION_1 ||
                         this.rockford.lastSideAnim === IDDLE_ANIMATION_2 ||
                         this.rockford.lastSideAnim === IDDLE_ANIMATION_3

      if (!isIdleAnim) {
        this.setRockfordIddle()
      }

      return
    }

    // Update animation based on direction
    this.playRockfordAnimByDirection()

    const directedPosition = this.k.vec2(
      this.rockford.position.x + this.rockford.direction.x,
      this.rockford.position.y + this.rockford.direction.y
    )
    const obj = items[directedPosition.y][directedPosition.x]

    // Check for exit
    if (obj && obj.is(EXIT_TAG)) {
      this.k.destroy(obj)
      this.moveRockfordTo(directedPosition)
      this.playing = false
      // Win scenario - would normally go to win scene
      console.log('Level complete! Score:', this.scoreLabel.value)
      return
    }

    // Check for diamond
    if (obj && obj.is(DIAMOND_TAG)) {
      this.removeDiamond(directedPosition)
      this.moveRockfordTo(directedPosition)
      return
    }

    // Check for dirt
    if (obj && obj.is(DIRT_TAG)) {
      this.removeDirt(directedPosition)
      this.moveRockfordTo(directedPosition)
      return
    }

    // Check for empty space
    if (!obj) {
      this.moveRockfordTo(directedPosition)
      return
    }

    // Check for boulder pushing (only horizontal)
    if (vecEquals(this.rockford.direction, this.DIR_LEFT)) {
      this.tryPushBoulderLeft(obj, items)
    } else if (vecEquals(this.rockford.direction, this.DIR_RIGHT)) {
      this.tryPushBoulderRight(obj, items)
    }
  }

  /**
   * Try to push boulder to the left
   * @param boulder - Boulder object
   * @param items - Items grid
   */
  private tryPushBoulderLeft(boulder: any, items: (GameObjWithPos | null)[][]): void {
    // Using cached this.DIR_LEFT
    // Using cached this.DIR_DOWN

    if (!boulder.is(BOULDER_TAG)) return

    const nextToBoulder = items[this.rockford.position.y][this.rockford.position.x - 2]
    if (nextToBoulder) return

    if (!this.canPush()) return

    const belowBoulder = items[this.rockford.position.y + 1][this.rockford.position.x - 1]
    const newFallingState = !belowBoulder

    if (newFallingState) {
      // Boulder falls down-left
      boulder.position.y++
      boulder.position.x--
      boulder.pos.y = boulder.position.y * BLOCK_SIZE
      boulder.pos.x = boulder.position.x * BLOCK_SIZE
      items[this.rockford.position.y][this.rockford.position.x - 1] = null
      items[this.rockford.position.y + 1][this.rockford.position.x - 1] = boulder
    } else {
      // Boulder slides left
      boulder.position.x--
      boulder.pos.x = boulder.position.x * BLOCK_SIZE
      items[this.rockford.position.y][this.rockford.position.x - 1] = null
      items[this.rockford.position.y][this.rockford.position.x - 2] = boulder
    }

    boulder.isFalling = newFallingState
    this.moveRockfordTo(this.k.vec2(this.rockford.position.x - 1, this.rockford.position.y))
  }

  /**
   * Try to push boulder to the right
   * @param boulder - Boulder object
   * @param items - Items grid
   */
  private tryPushBoulderRight(boulder: any, items: (GameObjWithPos | null)[][]): void {
    // Using cached this.DIR_RIGHT
    // Using cached this.DIR_DOWN

    if (!boulder.is(BOULDER_TAG)) return

    const nextToBoulder = items[this.rockford.position.y][this.rockford.position.x + 2]
    if (nextToBoulder) return

    if (!this.canPush()) return

    const belowBoulder = items[this.rockford.position.y + 1][this.rockford.position.x + 1]
    const newFallingState = !belowBoulder

    if (newFallingState) {
      // Boulder falls down-right
      boulder.position.y++
      boulder.position.x++
      boulder.pos.y = boulder.position.y * BLOCK_SIZE
      boulder.pos.x = boulder.position.x * BLOCK_SIZE
      items[this.rockford.position.y][this.rockford.position.x + 1] = null
      items[this.rockford.position.y + 1][this.rockford.position.x + 1] = boulder
    } else {
      // Boulder slides right
      boulder.position.x++
      boulder.pos.x = boulder.position.x * BLOCK_SIZE
      items[this.rockford.position.y][this.rockford.position.x + 1] = null
      items[this.rockford.position.y][this.rockford.position.x + 2] = boulder
    }

    boulder.isFalling = newFallingState
    this.moveRockfordTo(this.k.vec2(this.rockford.position.x + 1, this.rockford.position.y))
  }

  /**
   * Move Rockford to new position and update grid
   * @param newPosition - New grid position
   */
  private moveRockfordTo(newPosition: Vec2): void {
    const items = this.physicsSystem.getItems()

    // OPTIMIZED: Store old position without creating vec2
    const lastX = this.rockford.position.x
    const lastY = this.rockford.position.y

    this.rockford.position = newPosition
    // OPTIMIZED: Modify existing pos in place
    this.rockford.pos.x = newPosition.x * BLOCK_SIZE
    this.rockford.pos.y = newPosition.y * BLOCK_SIZE

    items[lastY][lastX] = null
    items[this.rockford.position.y][this.rockford.position.x] = this.rockford
  }

  /**
   * Set Rockford to idle animation
   */
  private setRockfordIddle(): void {
    // KaPlay 3000.x: call play() directly on object
    this.rockford.play(IDDLE_ANIMATION_1)
    this.rockford.currentAnim = IDDLE_ANIMATION_1
  }

  /**
   * Play Rockford animation based on current direction
   */
  private playRockfordAnimByDirection(): void {
    // Using cached this.DIR_LEFT
    // Using cached this.DIR_RIGHT
    // Using cached this.DIR_UP
    // Using cached this.DIR_DOWN

    if (vecEquals(this.rockford.direction, this.DIR_LEFT)) {
      this.playRockfordAnimIfDifferent(RUN_LEFT_ANIMATION)
    } else if (vecEquals(this.rockford.direction, this.DIR_RIGHT)) {
      this.playRockfordAnimIfDifferent(RUN_RIGHT_ANIMATION)
    } else if (vecEquals(this.rockford.direction, this.DIR_UP) || vecEquals(this.rockford.direction, this.DIR_DOWN)) {
      // KaPlay 3000.x
      this.rockford.play(this.rockford.lastSideAnim)
      this.rockford.currentAnim = this.rockford.lastSideAnim
    }
  }

  /**
   * Play animation if it's different from current
   * @param animationName - Animation to play
   */
  private playRockfordAnimIfDifferent(animationName: string): void {
    if (this.rockford.currentAnim !== animationName) {
      this.rockford.lastSideAnim = animationName
      this.rockford.currentAnim = animationName

      // KaPlay 3000.x: call play() directly on object
      this.rockford.play(animationName)
    }
  }

  /**
   * Check if Rockford can push boulder
   * Uses randomized "effort" system
   * @returns True if push succeeds
   */
  private canPush(): boolean {
    if (randomInteger(0, 5) > 1 || this.rockford.pushAttempts < 2) {
      this.rockford.pushAttempts++
      return false
    }
    this.rockford.pushAttempts = 0
    return true
  }

  /**
   * Process collisions between Rockford and enemies
   * Kills Rockford if touching enemy
   */
  private processRockfordCollisionsWithEnemies(): void {
    const items = this.physicsSystem.getItems()
    const directions = FIREFLY_INIT_DIRECTIONS_FACTORY()

    // Check all 4 directions around Rockford
    for (const dir of directions) {
      const nextTo = items[this.rockford.position.y + dir.y][this.rockford.position.x + dir.x]
      if (nextTo && nextTo.is(ENEMY_ROLE_TAG)) {
        this.killRockford()
        break
      }
    }
  }

  /**
   * Process collisions between enemies and amoeba
   * Kills enemies on amoeba touch
   */
  private processEnemyCollisionsWithAmoeba(): void {
    const items = this.physicsSystem.getItems()
    const directions = FIREFLY_INIT_DIRECTIONS_FACTORY()

    for (let y = this.mapHeight - 1; y >= 0; y--) {
      for (let x = 0; x < this.mapWidth; x++) {
        const obj = items[y][x]
        if (!obj || !obj.is(ENEMY_ROLE_TAG)) continue

        const enemy = obj as any

        // Check all 4 directions for amoeba
        for (const dir of directions) {
          const checkY = enemy.position.y + dir.y
          const checkX = enemy.position.x + dir.x
          const nextTo = items[checkY][checkX]

          if (nextTo && nextTo.is(AMOEBA_TAG)) {
            // Amoeba touch detected! Kill enemy
            if (enemy.is(FIREFLY_TAG)) {
              this.explosionSystem.createFireflyExplosion(enemy.position)
              this.k.destroy(enemy)
              items[enemy.position.y][enemy.position.x] = null
            } else if (enemy.is(BUTTERFLY_TAG)) {
              // Direct kill by Amoeba -> 9 diamonds
              this.explosionSystem.createButterflyExplosion(enemy.position, false)
              this.k.destroy(enemy)
              items[enemy.position.y][enemy.position.x] = null
            }
            break
          }
        }
      }
    }
  }

  /**
   * Handle falling object impact
   * @param obj - Object that was hit by falling boulder/diamond
   */
  private fallingObjectImpactedOn(obj: GameObjWithPos | null): void {
    if (!obj) return

    if (obj.is(ROCKFORD_TAG)) {
      this.killRockford()
    } else if (obj.is(FIREFLY_TAG)) {
      this.explosionSystem.createFireflyExplosion(obj.position)
      this.k.destroy(obj)
    } else if (obj.is(BUTTERFLY_TAG)) {
      // Check if killed by chain explosion
      const isChainExplosion = (obj as any).killedByExplosion === true
      this.explosionSystem.createButterflyExplosion(obj.position, isChainExplosion)
      this.k.destroy(obj)
    }
  }

  /**
   * Kill Rockford and create explosion
   */
  private killRockford(): void {
    this.playing = false
    const position = this.k.vec2(this.rockford.position.x, this.rockford.position.y)

    this.k.destroy(this.rockford)
    this.rockford = this.entityFactory.createRockford()
    this.rockford.isDead = true

    this.explosionSystem.createRockfordExplosion(position)
  }

  /**
   * Start main game loop
   */
  private startGameLoop(): void {
    this.k.onUpdate(() => {
      
      if (!this.initialized) return

      // Get input
      if (this.playing) {
        this.rockford.direction = this.inputSystem.getDirectionByKey()
      }

      // Update camera position based on Rockford position
      this.calculateCamPos()

      // Camera movement (smooth lerp)
      const distance = this.camPosCurrent.dist(this.camPosWanted)
      if (distance !== 0) {
        // OPTIMIZED: Don't create new vec2, modify existing camPosCurrent directly
        const diffX = this.camPosWanted.x - this.camPosCurrent.x
        const diffY = this.camPosWanted.y - this.camPosCurrent.y
        this.camPosCurrent.x += diffX * this.k.dt() * CAMERA_SPEED
        this.camPosCurrent.y += diffY * this.k.dt() * CAMERA_SPEED

        if (distance < 1) {
          // OPTIMIZED: Modify in place instead of creating new vec2
          this.camPosCurrent.x = this.camPosWanted.x
          this.camPosCurrent.y = this.camPosWanted.y
        }

        this.k.camPos(this.camPosCurrent)
        this.UISetPos(this.camPosCurrent)
      }

      // Game tick (move objects)
      if (this.cumulatedDelta > SPEED) {
        this.physicsSystem.resetMovingFlags()
        this.moveRockford()
        this.physicsSystem.moveBoulders((obj) => this.fallingObjectImpactedOn(obj))
        this.enemySystem.moveFireflies()
        this.enemySystem.moveButterflies()

        if (this.playing) {
          this.processRockfordCollisionsWithEnemies()
          // TODO: Enable when Amoeba is implemented
          // this.processEnemyCollisionsWithAmoeba()
        }

        this.physicsSystem.markBouldersToMove()
        this.enemySystem.markFirefliesToMove()
        this.enemySystem.markButterFliesToMove()

        this.cumulatedDelta = 0
      }

      this.cumulatedDelta += this.k.dt()
    })
  }
}
