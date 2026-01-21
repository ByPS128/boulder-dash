import Phaser from "phaser";
import { WelcomeScene } from "./scenes/WelcomeScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { CaveLoader } from "./levels/CaveLoader";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  pixelArt: true,
  antialias: false,
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  parent: "app",
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 28 * 16,
    height: 16 * 16,
    zoom: 1, // důležité: měnit jen na CELÁ čísla (2,3,4…), nikdy 1.5 apod.
  },
  fps: { target: 60, forceSetTimeOut: true },
  scene: [WelcomeScene, GameScene, GameOverScene],
};

// Load caves before starting the game
CaveLoader.loadAll().then(() => {
  console.log("Caves loaded, starting game...");
  new Phaser.Game(config);
}).catch((error) => {
  console.error("Failed to load caves:", error);
  alert("Failed to load game levels. Please refresh the page.");
});
