import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";

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
  scene: [GameScene],
};

new Phaser.Game(config);
