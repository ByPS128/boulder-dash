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

  private rockfordLeftSprite!: Phaser.GameObjects.Sprite;
  private rockfordRightSprite!: Phaser.GameObjects.Sprite;
  private idleAnimIndex = 0;
  private idleAnimTimer = 0;

  constructor() {
    super("WelcomeScene");
  }

  init(data?: { lastCave?: number }): void {
    if (data?.lastCave) {
      this.selectedCave = data.lastCave;
    }
  }

  preload() {
    this.load.spritesheet("bd", "resources/spritesheet_A.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    this.createAnims();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    let y = 20;

    // Title with Rockford sprites
    const titleY = y + 12; // center vertically with text
    
    // Left Rockford
    this.rockfordLeftSprite = this.add
      .sprite(width / 2 - 110, titleY, "bd", 0)
      .setOrigin(0.5, 0.5)
      .setScale(1.5);
    
    // Title text
    this.add
      .text(width / 2, y, "BOULDER DASH", {
        fontFamily: "Atari",
        fontSize: "24px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    
    // Right Rockford
    this.rockfordRightSprite = this.add
      .sprite(width / 2 + 110, titleY, "bd", 0)
      .setOrigin(0.5, 0.5)
      .setScale(1.5);
    
    // Start idle animation cycle
    this.startIdleAnimationCycle();
    
    y += 50;

    // Cave selector
    y += 20;
    this.add
      .text(width / 2, y, "← SELECT CAVE →", {
        fontFamily: "Atari",
        fontSize: "14px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5, 0);
    y += 30;

    this.caveNumberText = this.add
      .text(width / 2, y, "", {
        fontFamily: "Atari",
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);
    y += 30;

    this.caveInfoText = this.add
      .text(width / 2, y, "", {
        fontFamily: "Atari",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    y += 20;

    this.bestScoreText = this.add
      .text(width / 2, y, "", {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#00ff00",
      })
      .setOrigin(0.5, 0);
    y += 40;

    // Difficulty (disabled for now)
    this.add
      .text(width / 2, y, "Difficulty: Normal", {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#888888",
      })
      .setOrigin(0.5, 0);
    y += 15;
    this.add
      .text(width / 2, y, "(Coming soon!)", {
        fontFamily: "Atari",
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
        fontFamily: "Atari",
        fontSize: "14px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    y += 25;

    const controlsX = width / 2 - 100;
    const lineHeight = 18;

    this.add
      .text(controlsX, y, "⬅️ ➡️ ⬆️ ⬇️", {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    this.add
      .text(controlsX + 100, y, "Move Rockford", {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0, 0);
    y += lineHeight;

    this.add
      .text(controlsX, y, "P", {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    this.add
      .text(controlsX + 100, y, "Pause/Resume (Easy mode only)", {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0, 0);
    y += lineHeight;

    this.add
      .text(controlsX, y, "R", {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    this.add
      .text(controlsX + 100, y, "Restart level (with confirmation)", {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0, 0);
    y += lineHeight;

    this.add
      .text(controlsX, y, "ESC", {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    this.add
      .text(controlsX + 100, y, "Quit level (with confirmation)", {
        fontFamily: "Atari",
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
        fontFamily: "Atari",
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

  private createAnims() {
    // Idle animations for Rockford (3 variants)
    if (!this.anims.exists("iddle_anim_1")) {
      this.anims.create({
        key: "iddle_anim_1",
        frames: [{ key: "bd", frame: 0 }],
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!this.anims.exists("iddle_anim_2")) {
      this.anims.create({
        key: "iddle_anim_2",
        frames: this.anims.generateFrameNumbers("bd", { start: 0, end: 2 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!this.anims.exists("iddle_anim_3")) {
      this.anims.create({
        key: "iddle_anim_3",
        frames: this.anims.generateFrameNumbers("bd", { start: 3, end: 6 }),
        frameRate: 6,
        repeat: -1,
      });
    }
  }

  private startIdleAnimationCycle(): void {
    const idleAnims = ["iddle_anim_1", "iddle_anim_2", "iddle_anim_3"];
    
    const playNextIdle = () => {
      const animKey = idleAnims[this.idleAnimIndex];
      this.rockfordLeftSprite.play(animKey);
      this.rockfordRightSprite.play(animKey);
      
      // Cycle to next animation after 3-5 seconds
      const delay = Phaser.Math.Between(3000, 5000);
      this.time.delayedCall(delay, () => {
        this.idleAnimIndex = (this.idleAnimIndex + 1) % idleAnims.length;
        playNextIdle();
      });
    };
    
    playNextIdle();
  }
}
