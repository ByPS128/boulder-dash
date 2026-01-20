/**
 * Boulder Dash - Main Entry Point
 * JavaScript clone of the classic Boulder Dash game from Atari
 * Implemented using KaPlay 3000.x framework and TypeScript
 */

import kaplay from 'kaplay'
import { loadGameSprites } from './config/sprites'
import { GameScene } from './scenes/GameScene'
import { LEVELS } from './config/levels'
import {
  KABOOM_WIDTH,
  KABOOM_HEIGHT
} from './config/constants'

/**
 * Initialize KaPlay engine
 */
const k = kaplay({
  width: KABOOM_WIDTH,
  height: KABOOM_HEIGHT,
  letterbox: true,
  scale: 3,
  debug: false,
  background: [0, 0, 0]
})

/**
 * Load all game sprites
 */
loadGameSprites(k)

/**
 * Start game
 * Creates and initializes the game scene with Cave A
 */
async function startGame() {
  // Get first level (Cave A - Intro)
  const level = LEVELS[0]

  // Create and start game scene
  const gameScene = new GameScene(k, level.map, level.config)
  await gameScene.start()
}

// Wait for sprites to load, then start game
k.onLoad(startGame)

// Log game info
console.log('Boulder Dash - KaPlay 3000.x + TypeScript')
console.log('Controls: Arrow keys or WASD to move')
