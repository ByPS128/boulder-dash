import Phaser from "phaser";
import { CaveLoader } from "../levels/CaveLoader";
import { sessionStats } from "../core/SessionStats";
import {
  preloadAtariFonts,
  registerAtariFonts,
  DEFAULT_FONT,
} from "../ui/AtariFont";

const FONT = DEFAULT_FONT;

// Paleta A (hnědo-oranžová) – barvy hry pro tinty bitmapového textu.
const PAL = {
  title: 0xffd23f, // zlatožlutá (titulek)
  heading: 0xe0822a, // oranžová (nadpisy)
  name: 0xffffff, // bílá (název jeskyně)
  info: 0xd9c9a3, // krémová (info/ovládání)
  dim: 0x9a8a66, // ztlumená
  ok: 0x6cc04a, // zelená (start / dokončeno)
} as const;

/**
 * Welcome / menu scéna – výběr jeskyně a ovládání.
 * Text je vykreslen ostrým Atari bitmapovým fontem (Phaser RetroFont).
 */
export class WelcomeScene extends Phaser.Scene {
  private selectedCave = 1;
  // Pořadí jeskyní v menu (test scény vepředu) + aktuální index v něm.
  private menuOrder: number[] = [];
  private menuIndex = 0;

  private caveNameText!: Phaser.GameObjects.BitmapText;
  private caveInfoText!: Phaser.GameObjects.BitmapText;
  private bestScoreText!: Phaser.GameObjects.BitmapText;

  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  private rockfordLeftSprite!: Phaser.GameObjects.Sprite;
  private rockfordRightSprite!: Phaser.GameObjects.Sprite;
  private idleAnimIndex = 0;

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
    preloadAtariFonts(this);
  }

  create(): void {
    registerAtariFonts(this);
    this.createAnims();

    const cx = this.cameras.main.width / 2; // 224

    // --- Titulek + dva Rockfordi po stranách ---
    const title = this.add
      .bitmapText(cx, 14, FONT, "BOULDER DASH", 24)
      .setOrigin(0.5, 0)
      .setTint(PAL.title);

    const titleHalf = title.width / 2;
    this.rockfordLeftSprite = this.add
      .sprite(cx - titleHalf - 22, 26, "bd", 0)
      .setOrigin(0.5, 0.5)
      .setScale(1.5);
    this.rockfordRightSprite = this.add
      .sprite(cx + titleHalf + 22, 26, "bd", 0)
      .setOrigin(0.5, 0.5)
      .setScale(1.5);
    this.startIdleAnimationCycle();

    // --- Výběr jeskyně ---
    this.add
      .bitmapText(cx, 58, FONT, "< SELECT CAVE >", 8)
      .setOrigin(0.5, 0)
      .setTint(PAL.heading);

    this.caveNameText = this.add
      .bitmapText(cx, 72, FONT, "", 16)
      .setOrigin(0.5, 0)
      .setTint(PAL.name);

    this.caveInfoText = this.add
      .bitmapText(cx, 94, FONT, "", 8)
      .setOrigin(0.5, 0)
      .setTint(PAL.info);

    this.bestScoreText = this.add
      .bitmapText(cx, 108, FONT, "", 8)
      .setOrigin(0.5, 0)
      .setTint(PAL.ok);

    // --- Oddělovač ---
    this.add.rectangle(cx, 126, this.cameras.main.width - 48, 1, 0x6b5a33);

    // --- Ovládání ---
    this.add
      .bitmapText(cx, 134, FONT, "CONTROLS", 8)
      .setOrigin(0.5, 0)
      .setTint(PAL.heading);

    const controls: [string, string][] = [
      ["ARROWS", "MOVE ROCKFORD"],
      ["P", "PAUSE / RESUME"],
      ["R", "RESTART LEVEL"],
      ["ESC", "QUIT LEVEL"],
    ];
    const colKey = cx - 90;
    const colDesc = cx - 30;
    let cy = 148;
    for (const [key, desc] of controls) {
      this.add.bitmapText(colKey, cy, FONT, key, 8).setOrigin(0, 0).setTint(PAL.name);
      this.add.bitmapText(colDesc, cy, FONT, desc, 8).setOrigin(0, 0).setTint(PAL.info);
      cy += 13;
    }

    // --- Start ---
    this.add
      .bitmapText(cx, 212, FONT, "PRESS ENTER TO START", 16)
      .setOrigin(0.5, 0)
      .setTint(PAL.ok);

    // --- Vstup ---
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.leftKey.on("down", () => this.changeCave(-1));
    this.rightKey.on("down", () => this.changeCave(1));
    this.enterKey.on("down", () => this.startGame());

    // Pořadí menu z loaderu (test scény vepředu). Index nastavíme na aktuální výběr.
    this.menuOrder = CaveLoader.getMenuOrder();
    const idx = this.menuOrder.indexOf(this.selectedCave);
    this.menuIndex = idx >= 0 ? idx : 0;
    this.selectedCave = this.menuOrder[this.menuIndex]!;

    this.updateCaveDisplay();
  }

  private changeCave(delta: number): void {
    // Listujeme podle pořadí menu (s wraparoundem), ne podle čísla jeskyně –
    // díky tomu jsou test scény na začátku a čísla nemusí být souvislá.
    const n = this.menuOrder.length;
    this.menuIndex = (this.menuIndex + delta + n) % n;
    this.selectedCave = this.menuOrder[this.menuIndex]!;
    this.updateCaveDisplay();
  }

  private updateCaveDisplay(): void {
    const cave = CaveLoader.getCave(this.selectedCave);
    if (!cave) {
      this.caveNameText.setText("LOADING...");
      return;
    }

    this.caveNameText.setText(`CAVE ${this.selectedCave}: ${cave.name.toUpperCase()}`);
    this.caveInfoText.setText(
      `DIAMONDS ${cave.diamondsNeeded}   TIME ${cave.timeLimit}S`
    );

    const bestScore = sessionStats.getBestScoreForCave(this.selectedCave);
    const completed = sessionStats.wasCompleted(this.selectedCave);
    if (completed) {
      this.bestScoreText.setText(`COMPLETED! BEST ${bestScore} PTS`).setTint(PAL.ok);
    } else if (bestScore > 0) {
      this.bestScoreText.setText(`BEST ATTEMPT ${bestScore} PTS`).setTint(PAL.title);
    } else {
      this.bestScoreText.setText("NOT YET ATTEMPTED").setTint(PAL.dim);
    }
  }

  private startGame(): void {
    this.scene.start("GameScene", { caveNumber: this.selectedCave });
  }

  private createAnims() {
    const defs: [string, number, number][] = [
      ["iddle_anim_1", 0, 0],
      ["iddle_anim_2", 0, 2],
      ["iddle_anim_3", 3, 6],
    ];
    for (const [key, start, end] of defs) {
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("bd", { start, end }),
        frameRate: start === end ? 1 : 6,
        repeat: start === end ? 0 : -1,
      });
    }
  }

  private startIdleAnimationCycle(): void {
    const idleAnims = ["iddle_anim_1", "iddle_anim_2", "iddle_anim_3"];
    const playNextIdle = () => {
      const animKey = idleAnims[this.idleAnimIndex]!; // index vždy v rozsahu (modulo délky)
      this.rockfordLeftSprite.play(animKey);
      this.rockfordRightSprite.play(animKey);
      const delay = Phaser.Math.Between(3000, 5000);
      this.time.delayedCall(delay, () => {
        this.idleAnimIndex = (this.idleAnimIndex + 1) % idleAnims.length;
        playNextIdle();
      });
    };
    playNextIdle();
  }
}
