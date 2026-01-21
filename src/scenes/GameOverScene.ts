import Phaser from "phaser";
import { AttemptResult } from "../core/SessionStats";

export interface GameOverData {
  result: AttemptResult;
  caveNumber: number;
  caveName: string;
  timeSpent: number;
  timeRemaining: number;
  timeLimit: number;
  diamondsCollected: number;
  diamondsNeeded: number;
  score: number;
  finalScore: number; // including time bonus
  timeBonus: number;
  deathReason?: string; // reason for death (only for death result)
}

/**
 * Game Over scene - displays results after cave completion/failure
 */
export class GameOverScene extends Phaser.Scene {
  private data!: GameOverData;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("GameOverScene");
  }

  init(data: GameOverData): void {
    this.data = data;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    let y = 30;

    // Result header
    if (this.data.result === "victory") {
      this.createVictoryScreen(width, y);
    } else if (this.data.result === "death") {
      this.createDeathScreen(width, y);
    } else {
      this.createQuitScreen(width, y);
    }

    // Setup keys
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.escKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );

    this.spaceKey.on("down", () => this.onRetryOrNext());
    this.escKey.on("down", () => this.onBackToMenu());
  }

  private createVictoryScreen(width: number, startY: number): void {
    let y = startY;

    // Title
    this.add
      .text(width / 2, y, "🏆 VICTORY! 🏆", {
        fontFamily: "Atari",
        fontSize: "24px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    y += 35;

    // Cave info
    this.add
      .text(
        width / 2,
        y,
        `Cave ${this.data.caveNumber}: "${this.data.caveName}"`,
        {
          fontFamily: "Atari",
          fontSize: "14px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5, 0);
    y += 30;

    // Stats
    this.add
      .text(width / 2, y, `Time: ${this.data.timeSpent}s / ${this.data.timeLimit}s`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 18;

    this.add
      .text(width / 2, y, `Time bonus: +${this.data.timeBonus} pts`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 18;

    this.add
      .text(
        width / 2,
        y,
        `Diamonds: ${this.data.diamondsCollected}/${this.data.diamondsNeeded}`,
        {
          fontFamily: "Atari",
          fontSize: "12px",
          color: "#cccccc",
        }
      )
      .setOrigin(0.5, 0);
    y += 18;

    this.add
      .text(width / 2, y, `Base score: ${this.data.score}`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 25;

    this.add
      .text(width / 2, y, `Final score: ${this.data.finalScore}`, {
        fontFamily: "Atari",
        fontSize: "16px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    y += 35;

    // Actions
    const nextCave = this.data.caveNumber < 20 ? this.data.caveNumber + 1 : 1;
    this.add
      .text(width / 2, y, `[SPACE] Next cave (${nextCave})`, {
        fontFamily: "Atari",
        fontSize: "13px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 20;

    this.add
      .text(width / 2, y, "[ESC] Return to menu", {
        fontFamily: "Atari",
        fontSize: "13px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
  }

  private createDeathScreen(width: number, startY: number): void {
    let y = startY;

    // Title
    this.add
      .text(width / 2, y, "💀 FAILED 💀", {
        fontFamily: "Atari",
        fontSize: "24px",
        color: "#ff0000",
      })
      .setOrigin(0.5, 0);
    y += 35;

    // Death reason
    if (this.data.deathReason) {
      this.add
        .text(width / 2, y, this.data.deathReason, {
          fontFamily: "Atari",
          fontSize: "14px",
          color: "#ff6666",
        })
        .setOrigin(0.5, 0);
      y += 28;
    }

    // Cave info
    this.add
      .text(
        width / 2,
        y,
        `Cave ${this.data.caveNumber}: "${this.data.caveName}"`,
        {
          fontFamily: "Atari",
          fontSize: "14px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5, 0);
    y += 30;

    // Stats
    this.add
      .text(width / 2, y, `Time played: ${this.data.timeSpent}s`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 18;

    const remaining = this.data.diamondsNeeded - this.data.diamondsCollected;
    this.add
      .text(
        width / 2,
        y,
        `Diamonds: ${this.data.diamondsCollected}/${this.data.diamondsNeeded} (needed ${remaining} more)`,
        {
          fontFamily: "Atari",
          fontSize: "12px",
          color: "#ff8888",
        }
      )
      .setOrigin(0.5, 0);
    y += 18;

    this.add
      .text(width / 2, y, `Score: ${this.data.score}`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 35;

    // Actions
    this.add
      .text(width / 2, y, "[SPACE] Retry", {
        fontFamily: "Atari",
        fontSize: "13px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 20;

    this.add
      .text(width / 2, y, "[ESC] Return to menu", {
        fontFamily: "Atari",
        fontSize: "13px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
  }

  private createQuitScreen(width: number, startY: number): void {
    let y = startY;

    // Title
    this.add
      .text(width / 2, y, "LEVEL QUIT", {
        fontFamily: "Atari",
        fontSize: "24px",
        color: "#ffaa00",
      })
      .setOrigin(0.5, 0);
    y += 35;

    // Quit reason
    if (this.data.deathReason) {
      this.add
        .text(width / 2, y, this.data.deathReason, {
          fontFamily: "Atari",
          fontSize: "14px",
          color: "#ffcc66",
        })
        .setOrigin(0.5, 0);
      y += 28;
    }

    // Cave info
    this.add
      .text(
        width / 2,
        y,
        `Cave ${this.data.caveNumber}: "${this.data.caveName}"`,
        {
          fontFamily: "Atari",
          fontSize: "14px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5, 0);
    y += 30;

    // Stats
    this.add
      .text(width / 2, y, `Time played: ${this.data.timeSpent}s`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 18;

    this.add
      .text(
        width / 2,
        y,
        `Diamonds: ${this.data.diamondsCollected}/${this.data.diamondsNeeded}`,
        {
          fontFamily: "Atari",
          fontSize: "12px",
          color: "#cccccc",
        }
      )
      .setOrigin(0.5, 0);
    y += 18;

    this.add
      .text(width / 2, y, `Score: ${this.data.score}`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 35;

    // Actions
    this.add
      .text(width / 2, y, "[SPACE] Retry", {
        fontFamily: "Atari",
        fontSize: "13px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 20;

    this.add
      .text(width / 2, y, "[ESC] Return to menu", {
        fontFamily: "Atari",
        fontSize: "13px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
  }

  private onRetryOrNext(): void {
    if (this.data.result === "victory") {
      // Go to next cave
      const nextCave = this.data.caveNumber < 20 ? this.data.caveNumber + 1 : 1;
      this.scene.start("GameScene", { caveNumber: nextCave });
    } else {
      // Retry same cave
      this.scene.start("GameScene", { caveNumber: this.data.caveNumber });
    }
  }

  private onBackToMenu(): void {
    this.scene.start("WelcomeScene", { lastCave: this.data.caveNumber });
  }
}
