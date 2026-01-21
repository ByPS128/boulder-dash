import Phaser from "phaser";
import { CaveLoader } from "../levels/CaveLoader";
import { sessionStats } from "../core/SessionStats";

/**
 * Welcome/Menu scene - cave selection and controls display
 */
export class WelcomeScene extends Phaser.Scene {
  private selectedCave = 1;
  private caveNumberText!: Phaser.GameObjects.Text;
  private caveInfoText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;

  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("WelcomeScene");
  }

  init(data?: { lastCave?: number }): void {
    if (data?.lastCave) {
      this.selectedCave = data.lastCave;
    }
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    let y = 20;

    // Title
    this.add
      .text(width / 2, y, "🎮 BOULDER DASH 🎮", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    y += 50;

    // Cave selector
    y += 20;
    this.add
      .text(width / 2, y, "← SELECT CAVE →", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5, 0);
    y += 30;

    this.caveNumberText = this.add
      .text(width / 2, y, "", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);
    y += 30;

    this.caveInfoText = this.add
      .text(width / 2, y, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 20;

    this.bestScoreText = this.add
      .text(width / 2, y, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 40;

    // Difficulty (disabled for now)
    this.add
      .text(width / 2, y, "Difficulty: Normal", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#888888",
      })
      .setOrigin(0.5, 0);
    y += 15;
    this.add
      .text(width / 2, y, "(Coming soon!)", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#666666",
      })
      .setOrigin(0.5, 0);
    y += 35;

    // Separator
    const sep1Y = y;
    this.add.rectangle(width / 2, sep1Y, width - 40, 1, 0x666666);
    y += 15;

    // Controls section
    this.add
      .text(width / 2, y, "CONTROLS", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    y += 25;

    const controlsX = width / 2 - 100;
    const lineHeight = 18;

    this.add
      .text(controlsX, y, "⬅️ ➡️ ⬆️ ⬇️", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    this.add
      .text(controlsX + 100, y, "Move Rockford", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0, 0);
    y += lineHeight;

    this.add
      .text(controlsX, y, "P", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    this.add
      .text(controlsX + 100, y, "Pause/Resume (Easy mode only)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0, 0);
    y += lineHeight;

    this.add
      .text(controlsX, y, "R", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    this.add
      .text(controlsX + 100, y, "Restart level (with confirmation)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0, 0);
    y += lineHeight;

    this.add
      .text(controlsX, y, "ESC", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    this.add
      .text(controlsX + 100, y, "Quit level (with confirmation)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0, 0);
    y += lineHeight + 10;

    // Separator
    const sep2Y = y;
    this.add.rectangle(width / 2, sep2Y, width - 40, 1, 0x666666);
    y += 20;

    // Start instruction
    this.add
      .text(width / 2, y, "Press ENTER to start", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);

    // Setup keys
    this.leftKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.LEFT
    );
    this.rightKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.RIGHT
    );
    this.enterKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );

    this.leftKey.on("down", () => this.changeCave(-1));
    this.rightKey.on("down", () => this.changeCave(1));
    this.enterKey.on("down", () => this.startGame());

    this.updateCaveDisplay();
  }

  private changeCave(delta: number): void {
    this.selectedCave += delta;
    if (this.selectedCave < 1) this.selectedCave = 20;
    if (this.selectedCave > 20) this.selectedCave = 1;
    this.updateCaveDisplay();
  }

  private updateCaveDisplay(): void {
    const cave = CaveLoader.getCave(this.selectedCave);
    if (!cave) {
      this.caveNumberText.setText(`Cave ${this.selectedCave}: Loading...`);
      return;
    }

    this.caveNumberText.setText(`Cave ${this.selectedCave}: "${cave.name}"`);
    this.caveInfoText.setText(
      `Diamonds: ${cave.diamondsNeeded}   Time: ${cave.timeLimit}s`
    );

    const bestScore = sessionStats.getBestScoreForCave(this.selectedCave);
    const completed = sessionStats.wasCompleted(this.selectedCave);

    if (completed) {
      this.bestScoreText.setText(
        `✓ Completed! Best: ${bestScore} pts`
      );
      this.bestScoreText.setColor("#00ff00");
    } else if (bestScore > 0) {
      this.bestScoreText.setText(`Best attempt: ${bestScore} pts`);
      this.bestScoreText.setColor("#ffff00");
    } else {
      this.bestScoreText.setText("Not yet attempted");
      this.bestScoreText.setColor("#888888");
    }
  }

  private startGame(): void {
    this.scene.start("GameScene", { caveNumber: this.selectedCave });
  }
}
