import Phaser from "phaser";
import { AttemptResult } from "../core/SessionStats";
import { CaveLoader } from "../levels/CaveLoader";
import { SchemeLoader } from "../levels/SchemeLoader";
import { preloadSprites, applyCaveScheme } from "../core/SpritePalette";
import { preloadAtariFonts, registerAtariFonts, DEFAULT_FONT } from "../ui/AtariFont";

const FONT = DEFAULT_FONT;

// Barvy (tinty bitmap textu) – ve stylu zbytku hry.
const COL = {
  victory: 0xffd23f, // zlatá
  death: 0xff4030, // červená
  quit: 0xe0822a, // oranžová
  name: 0xffffff,
  info: 0xd9c9a3, // krémová
  ok: 0x6cc04a, // zelená
  bad: 0xff6a6a, // světle červená (důvod smrti)
  score: 0xffd23f,
} as const;

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

type Line = { text: string; color: number };

/**
 * Game Over scéna – výsledek po dohrání/nezdaru. Atari bitmap font, ve stylu menu:
 * outlinovaný nadpis, rotující diamanty po stranách, blikající výzva, u výhry
 * počítadlo skóre, které se natočí nahoru.
 */
export class GameOverScene extends Phaser.Scene {
  // Pozor: pole NESMÍ být `data` – Phaser.Scene má vlastní `data` (DataManager).
  private gameOverData!: GameOverData;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("GameOverScene");
  }

  init(data: GameOverData): void {
    this.gameOverData = data;
  }

  preload() {
    preloadSprites(this);
    preloadAtariFonts(this);
  }

  create(): void {
    registerAtariFonts(this);
    // Diamanty obarvíme schématem dohrané jeskyně (fallback classic).
    const scheme = CaveLoader.getCave(this.gameOverData.caveNumber)?.scheme;
    applyCaveScheme(this, SchemeLoader.get(scheme ?? "classic"));
    if (!this.anims.exists("diamond_anim")) {
      this.anims.create({
        key: "diamond_anim",
        frames: this.anims.generateFrameNumbers("bd", { start: 40, end: 47 }),
        frameRate: 12,
        repeat: -1,
      });
    }

    const d = this.gameOverData;
    const cave = `CAVE ${d.caveNumber}: ${d.caveName.toUpperCase()}`;

    if (d.result === "victory") {
      const nextCave = d.caveNumber < 20 ? d.caveNumber + 1 : 1;
      this.build({
        header: "VICTORY",
        headerColor: COL.victory,
        cave,
        lines: [
          { text: `TIME ${d.timeSpent}/${d.timeLimit}S`, color: COL.info },
          { text: `TIME BONUS +${d.timeBonus}`, color: COL.ok },
          { text: `DIAMONDS ${d.diamondsCollected}/${d.diamondsNeeded}`, color: COL.info },
        ],
        finalScore: d.finalScore,
        primary: `SPACE - NEXT CAVE (${nextCave})`,
      });
    } else if (d.result === "death") {
      const more = Math.max(0, d.diamondsNeeded - d.diamondsCollected);
      this.build({
        header: "GAME OVER",
        headerColor: COL.death,
        cave,
        lines: [
          { text: (d.deathReason ?? "CRUSHED").toUpperCase(), color: COL.bad },
          { text: `DIAMONDS ${d.diamondsCollected}/${d.diamondsNeeded}  (NEED ${more} MORE)`, color: COL.info },
          { text: `TIME PLAYED ${d.timeSpent}S`, color: COL.info },
          { text: `SCORE ${d.score}`, color: COL.info },
        ],
        primary: "SPACE - RETRY",
      });
    } else {
      this.build({
        header: "QUIT",
        headerColor: COL.quit,
        cave,
        lines: [
          { text: `DIAMONDS ${d.diamondsCollected}/${d.diamondsNeeded}`, color: COL.info },
          { text: `TIME PLAYED ${d.timeSpent}S`, color: COL.info },
          { text: `SCORE ${d.score}`, color: COL.info },
        ],
        primary: "SPACE - RETRY",
      });
    }

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.spaceKey.on("down", () => this.onRetryOrNext());
    this.escKey.on("down", () => this.onBackToMenu());
  }

  /** Vykreslí celou obrazovku z dat (sjednoceno pro victory/death/quit). */
  private build(opts: {
    header: string;
    headerColor: number;
    cave: string;
    lines: Line[];
    finalScore?: number;
    primary: string;
  }): void {
    const cx = this.cameras.main.width / 2;
    let y = 18;

    // Nadpis s černým obrysem (jako title card).
    this.outlinedHeader(cx, y, opts.header, 24, opts.headerColor);
    // Rotující diamanty po stranách nadpisu (jako Rockfordi v menu).
    for (const dx of [-132, 132]) {
      this.add.sprite(cx + dx, y + 12, "bd", 40).setScale(1.25).play("diamond_anim");
    }
    y += 46;

    this.bmp(cx, y, opts.cave, 16, COL.name);
    y += 28;

    for (const ln of opts.lines) {
      this.bmp(cx, y, ln.text, 8, ln.color);
      y += 15;
    }

    if (opts.finalScore !== undefined) {
      y += 8;
      const st = this.bmp(cx, y, "SCORE 0", 16, COL.score);
      const counter = { v: 0 };
      const target = opts.finalScore;
      this.tweens.add({
        targets: counter,
        v: target,
        duration: 800,
        ease: "Cubic.easeOut",
        onUpdate: () => st.setText(`SCORE ${Math.floor(counter.v)}`),
        onComplete: () => st.setText(`SCORE ${target}`),
      });
      y += 26;
    }

    y += 12;
    // Primární výzva bliká (alfa), ESC do menu staticky.
    const prompt = this.bmp(cx, y, opts.primary, 16, COL.ok);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    y += 24;
    this.bmp(cx, y, "ESC - MENU", 16, COL.ok);
  }

  /** Bitmap text vycentrovaný na x, originX 0.5. */
  private bmp(cx: number, y: number, text: string, size: number, tint: number): Phaser.GameObjects.BitmapText {
    return this.add.bitmapText(cx, y, FONT, text, size).setOrigin(0.5, 0).setTint(tint);
  }

  /** Nadpis s 8-směrným černým obrysem (bílé/barevné písmo navrch). */
  private outlinedHeader(cx: number, y: number, text: string, size: number, fill: number): void {
    const O = 2;
    const offs = [[-O, -O], [0, -O], [O, -O], [-O, 0], [O, 0], [-O, O], [0, O], [O, O]];
    for (const [ox, oy] of offs) {
      this.add.bitmapText(cx + ox!, y + oy!, FONT, text, size).setOrigin(0.5, 0).setTint(0x000000);
    }
    this.add.bitmapText(cx, y, FONT, text, size).setOrigin(0.5, 0).setTint(fill);
  }

  private onRetryOrNext(): void {
    if (this.gameOverData.result === "victory") {
      const nextCave = this.gameOverData.caveNumber < 20 ? this.gameOverData.caveNumber + 1 : 1;
      this.scene.start("GameScene", { caveNumber: nextCave });
    } else {
      this.scene.start("GameScene", { caveNumber: this.gameOverData.caveNumber });
    }
  }

  private onBackToMenu(): void {
    this.scene.start("WelcomeScene", { lastCave: this.gameOverData.caveNumber });
  }
}
