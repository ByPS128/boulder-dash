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
  title: 0xffd23f,
  heading: 0xe0822a,
  name: 0xffffff,
  info: 0xd9c9a3,
  dim: 0x9a8a66,
  ok: 0x6cc04a,
} as const;

const TITLE = "BOULDER DASH";
const TITLE_SIZE = 24; // 8px glyf × scale 3
const TITLE_Y = 14;
const GLYPH_ADV = (TITLE_SIZE / 8) * 8; // = 24 px na znak (font je pevných 8px)

/** HSV → RGB (h,s,v v rozsahu 0–1). Pro generování duhové textury. */
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Welcome / menu scéna – výběr jeskyně a ovládání.
 * Text je ostrý Atari bitmapový font (RetroFont). Titulek se na úvod „nanosí"
 * Rockfordy (homage na Bounty Bob); animace je přerušitelná libovolnou klávesou.
 */
export class WelcomeScene extends Phaser.Scene {
  private selectedCave = 1;
  private menuOrder: number[] = [];
  private menuIndex = 0;

  private caveNameText!: Phaser.GameObjects.BitmapText;
  private caveInfoText!: Phaser.GameObjects.BitmapText;
  private bestScoreText!: Phaser.GameObjects.BitmapText;

  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  private rockfordLeftSprite?: Phaser.GameObjects.Sprite;
  private rockfordRightSprite?: Phaser.GameObjects.Sprite;
  private idleAnimIndex = 0;

  // Úvodní animace (nanášení titulku)
  private introDone = false;
  private titleLetters: { obj: Phaser.GameObjects.BitmapText; slotX: number }[] = [];
  private carriers: Phaser.GameObjects.Sprite[] = [];
  private introTweens: Phaser.Tweens.Tween[] = [];
  private introTimer?: Phaser.Time.TimerEvent;
  private introFade: Phaser.GameObjects.GameObject[] = [];
  private rainbow?: Phaser.GameObjects.TileSprite; // rolovací duha v titulku

  constructor() {
    super("WelcomeScene");
  }

  init(data?: { lastCave?: number }): void {
    this.introDone = false;
    this.titleLetters = [];
    this.carriers = [];
    this.introTweens = [];
    this.introFade = [];
    if (data?.lastCave) this.selectedCave = data.lastCave;
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
    this.ensureRainbowTexture();

    this.buildMenu();
    this.buildTitleIntro();

    // Vstup
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.leftKey.on("down", () => this.changeCave(-1));
    this.rightKey.on("down", () => this.changeCave(1));
    this.enterKey.on("down", () => this.startGame());
    // Jakákoli klávesa přeruší úvodní animaci a zobrazí scénu celou.
    this.input.keyboard!.on("keydown", () => this.completeIntro());

    // Pořadí menu z loaderu (test scény vepředu).
    this.menuOrder = CaveLoader.getMenuOrder();
    const idx = this.menuOrder.indexOf(this.selectedCave);
    this.menuIndex = idx >= 0 ? idx : 0;
    this.selectedCave = this.menuOrder[this.menuIndex]!;
    this.updateCaveDisplay();
  }

  /** Postaví menu (výběr jeskyně, ovládání, start). Vše skryté (alpha 0) – nafejduje se po úvodu. */
  private buildMenu(): void {
    const cx = this.cameras.main.width / 2;

    const sel = this.add
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

    const sep = this.add.rectangle(cx, 126, this.cameras.main.width - 48, 1, 0x6b5a33);
    const ctrlHead = this.add
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
    const ctrlLines: Phaser.GameObjects.GameObject[] = [];
    for (const [key, desc] of controls) {
      ctrlLines.push(
        this.add.bitmapText(colKey, cy, FONT, key, 8).setOrigin(0, 0).setTint(PAL.name)
      );
      ctrlLines.push(
        this.add.bitmapText(colDesc, cy, FONT, desc, 8).setOrigin(0, 0).setTint(PAL.info)
      );
      cy += 13;
    }

    const start = this.add
      .bitmapText(cx, 212, FONT, "PRESS ENTER TO START", 16)
      .setOrigin(0.5, 0)
      .setTint(PAL.ok);

    this.introFade = [
      sel,
      this.caveNameText,
      this.caveInfoText,
      this.bestScoreText,
      sep,
      ctrlHead,
      ...ctrlLines,
      start,
    ];
    for (const o of this.introFade) (o as any).setAlpha(0);
  }

  /** Vytvoří písmena titulku a spustí jejich „nanášení" Rockfordy z boků. */
  private buildTitleIntro(): void {
    const cx = this.cameras.main.width / 2;
    const W = this.cameras.main.width;
    const left = cx - (TITLE.length * GLYPH_ADV) / 2;

    let k = 0; // pořadové číslo neprázdného znaku (kvůli stagger + střídání stran)
    for (let i = 0; i < TITLE.length; i++) {
      const ch = TITLE[i]!;
      if (ch === " ") continue;
      const slotX = left + i * GLYPH_ADV;
      const fromLeft = k % 2 === 0;
      const startX = fromLeft ? -GLYPH_ADV : W + GLYPH_ADV;
      const delay = k * 160;

      const letter = this.add
        .bitmapText(startX, TITLE_Y, FONT, ch, TITLE_SIZE)
        .setOrigin(0, 0)
        .setTint(PAL.title);
      this.titleLetters.push({ obj: letter, slotX });

      const carrier = this.add
        .sprite(startX + (fromLeft ? -10 : 26), TITLE_Y + 8, "bd", 0)
        .setScale(1.25);
      carrier.play(fromLeft ? "run_r" : "run_l");
      this.carriers.push(carrier);

      // Písmeno dojede na slot.
      this.introTweens.push(
        this.tweens.add({ targets: letter, x: slotX, delay, duration: 480, ease: "Back.easeOut" })
      );
      // Rockford veze písmeno, pak pokračuje a odběhne z obrazovky.
      this.introTweens.push(
        this.tweens.add({
          targets: carrier,
          x: slotX + (fromLeft ? -10 : 26),
          delay,
          duration: 480,
          ease: "Cubic.easeOut",
          onComplete: () => {
            this.tweens.add({
              targets: carrier,
              x: fromLeft ? W + GLYPH_ADV : -GLYPH_ADV,
              duration: 520,
              ease: "Cubic.easeIn",
              onComplete: () => carrier.destroy(),
            });
          },
        })
      );
      k++;
    }

    // Po dopadu posledního písmene dokončit úvod.
    const lastLand = (k - 1) * 160 + 480 + 60;
    this.introTimer = this.time.delayedCall(lastLand, () => this.completeIntro());
  }

  /** Dokončí/přeskočí úvod: písmena na místo, Rockfordi po stranách, menu se objeví. */
  private completeIntro(): void {
    if (this.introDone) return;
    this.introDone = true;

    this.introTimer?.remove();
    for (const t of this.introTweens) t.stop();
    this.introTweens = [];
    for (const c of this.carriers) c.destroy();
    this.carriers = [];

    this.createRainbowTitle();
    this.createFlankingRockfords();

    for (const o of this.introFade) {
      this.tweens.add({ targets: o, alpha: 1, duration: 250 });
    }
  }

  /** Posun rolovací duhy v titulku každý snímek. */
  update(_time: number, delta: number): void {
    if (this.rainbow) this.rainbow.tilePositionY -= delta * 0.03;
  }

  /** Vygeneruje texturu svislé duhy (pruhy odstínů s vnitřním leskem). Jen jednou. */
  private ensureRainbowTexture(): void {
    if (this.textures.exists("rainbow")) return;
    // Odstíny shora dolů (jako Atari raster bars): fialová → modrá → zelená →
    // žlutozelená → oranžová → červenooranžová. Cyklus se svisle opakuje.
    const hues = [275, 220, 150, 90, 45, 20];
    const bandH = 4;
    const wpx = 4;
    const cycle = hues.length * bandH;
    const canvas = document.createElement("canvas");
    canvas.width = wpx;
    canvas.height = cycle;
    const ctx = canvas.getContext("2d")!;
    for (let bi = 0; bi < hues.length; bi++) {
      for (let yy = 0; yy < bandH; yy++) {
        const shine = Math.sin((Math.PI * (yy + 0.5)) / bandH); // 0→1→0 (lesk uprostřed)
        const v = 0.4 + 0.6 * shine;
        const [r, g, b] = hsvToRgb(hues[bi]! / 360, 0.85, v);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, bi * bandH + yy, wpx, 1);
      }
    }
    this.textures.addCanvas("rainbow", canvas);
  }

  /** Nahradí jednotlivá písmena titulku duhovou výplní (maska = tvar písmen). */
  private createRainbowTitle(): void {
    const cx = this.cameras.main.width / 2;
    const w = TITLE.length * GLYPH_ADV;
    // Maska: bílý titulek (nepřidaný do scény, slouží jen jako bitmapová maska).
    const maskText = this.make
      .bitmapText({ x: cx, y: TITLE_Y, font: FONT, text: TITLE, size: TITLE_SIZE }, false)
      .setOrigin(0.5, 0);
    this.rainbow = this.add
      .tileSprite(cx, TITLE_Y, w, TITLE_SIZE, "rainbow")
      .setOrigin(0.5, 0);
    this.rainbow.setMask(maskText.createBitmapMask());
    // Zlatá písmena už nepotřebujeme – duhový titulek je nahradil.
    for (const L of this.titleLetters) L.obj.destroy();
    this.titleLetters = [];
  }

  private createFlankingRockfords(): void {
    const cx = this.cameras.main.width / 2;
    const half = (TITLE.length * GLYPH_ADV) / 2;
    this.rockfordLeftSprite = this.add
      .sprite(cx - half - 22, TITLE_Y + 12, "bd", 0)
      .setScale(1.5);
    this.rockfordRightSprite = this.add
      .sprite(cx + half + 22, TITLE_Y + 12, "bd", 0)
      .setScale(1.5);
    this.startIdleAnimationCycle();
  }

  private changeCave(delta: number): void {
    this.completeIntro();
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
    this.completeIntro();
    this.scene.start("GameScene", { caveNumber: this.selectedCave });
  }

  private createAnims() {
    const ensure = (key: string, start: number, end: number, fps: number, loop: boolean) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("bd", { start, end }),
        frameRate: fps,
        repeat: loop ? -1 : 0,
      });
    };
    ensure("iddle_anim_1", 0, 0, 1, false);
    ensure("iddle_anim_2", 0, 2, 6, true);
    ensure("iddle_anim_3", 3, 6, 6, true);
    ensure("run_l", 10, 16, 12, true);
    ensure("run_r", 20, 26, 12, true);
  }

  private startIdleAnimationCycle(): void {
    const idleAnims = ["iddle_anim_1", "iddle_anim_2", "iddle_anim_3"];
    const playNextIdle = () => {
      if (!this.rockfordLeftSprite || !this.rockfordRightSprite) return;
      const animKey = idleAnims[this.idleAnimIndex]!;
      this.rockfordLeftSprite.play(animKey);
      this.rockfordRightSprite.play(animKey);
      this.time.delayedCall(Phaser.Math.Between(3000, 5000), () => {
        this.idleAnimIndex = (this.idleAnimIndex + 1) % idleAnims.length;
        playNextIdle();
      });
    };
    playNextIdle();
  }
}
