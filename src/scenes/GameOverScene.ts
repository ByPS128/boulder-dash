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
}

/**
 * Game Over scene - displays results after cave completion/failure
 */
export class GameOverScene extends Phaser.Scene {
  private data!: GameOverData;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

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
    this.enterKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );

    this.spaceKey.on("down", () => this.onRetryOrNext());
    this.enterKey.on("down", () => this.onBackToMenu());
  }

  private createVictoryScreen(width: number, startY: number): void {
    let y = startY;

    // Title
    this.add
      .text(width / 2, y, "🏆 VICTORY! 🏆", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    y += 50;

    // Cave info
    this.add
      .text(
        width / 2,
        y,
        `Cave ${this.data.caveNumber}: "${this.data.caveName}"`,
        {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5, 0);
    y += 40;

    // Stats
    this.add
      .text(width / 2, y, `Time: ${this.data.timeSpent}s / ${this.data.timeLimit}s`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 22;

    this.add
      .text(width / 2, y, `Time bonus: +${this.data.timeBonus} pts`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 22;

    this.add
      .text(
        width / 2,
        y,
        `Diamonds: ${this.data.diamondsCollected}/${this.data.diamondsNeeded}`,
        {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#cccccc",
        }
      )
      .setOrigin(0.5, 0);
    y += 22;

    this.add
      .text(width / 2, y, `Base score: ${this.data.score}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 30;

    this.add
      .text(width / 2, y, `Final score: ${this.data.finalScore}`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    y += 50;

    // Actions
    const nextCave = this.data.caveNumber < 20 ? this.data.caveNumber + 1 : 1;
    this.add
      .text(width / 2, y, `[SPACE] Next cave (${nextCave})`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 22;

    this.add
      .text(width / 2, y, "[ENTER] Level select", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
  }

  private createDeathScreen(width: number, startY: number): void {
    let y = startY;

    // Title
    this.add
      .text(width / 2, y, "💀 FAILED 💀", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#ff0000",
      })
      .setOrigin(0.5, 0);
    y += 50;

    // Cave info
    this.add
      .text(
        width / 2,
        y,
        `Cave ${this.data.caveNumber}: "${this.data.caveName}"`,
        {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5, 0);
    y += 40;

    // Stats
    this.add
      .text(width / 2, y, `Time played: ${this.data.timeSpent}s`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 22;

    const remaining = this.data.diamondsNeeded - this.data.diamondsCollected;
    this.add
      .text(
        width / 2,
        y,
        `Diamonds: ${this.data.diamondsCollected}/${this.data.diamondsNeeded} (needed ${remaining} more)`,
        {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#ff8888",
        }
      )
      .setOrigin(0.5, 0);
    y += 22;

    this.add
      .text(width / 2, y, `Score: ${this.data.score}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 50;

    // Actions
    this.add
      .text(width / 2, y, "[SPACE] Retry", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 22;

    this.add
      .text(width / 2, y, "[ENTER] Level select", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
  }

  private createQuitScreen(width: number, startY: number): void {
    let y = startY;

    // Title
    this.add
      .text(width / 2, y, "LEVEL QUIT", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#ffaa00",
      })
      .setOrigin(0.5, 0);
    y += 50;

    // Cave info
    this.add
      .text(
        width / 2,
        y,
        `Cave ${this.data.caveNumber}: "${this.data.caveName}"`,
        {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5, 0);
    y += 40;

    // Stats
    this.add
      .text(width / 2, y, `Time played: ${this.data.timeSpent}s`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 22;

    this.add
      .text(
        width / 2,
        y,
        `Diamonds: ${this.data.diamondsCollected}/${this.data.diamondsNeeded}`,
        {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#cccccc",
        }
      )
      .setOrigin(0.5, 0);
    y += 22;

    this.add
      .text(width / 2, y, `Score: ${this.data.score}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 50;

    // Actions
    this.add
      .text(width / 2, y, "[SPACE] Retry", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 22;

    this.add
      .text(width / 2, y, "[ENTER] Level select", {
        fontFamily: "monospace",
        fontSize: "14px",
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
