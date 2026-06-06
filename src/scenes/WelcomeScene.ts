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
const LW = GLYPH_ADV; // šířka písmene
const LH = TITLE_SIZE; // výška písmene

// Pohyb Rockfordů při nanášení = rychlost hry (1 dlaždice 16 px za 1 tick 150 ms).
const STEP_PX = 16;
const STEP_MS = 150;

type Seg = { dx: number; dy: number; dist: number };
type LetterPlan = {
  obj: Phaser.GameObjects.BitmapText;
  startX: number;
  startY: number;
  segs: Seg[];
};

/** HSV → RGB (h,s,v 0–1). Pro generování duhové textury. */
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
 * Welcome / menu scéna. Text ostrým Atari bitmapovým fontem (RetroFont).
 * Úvod: banda Rockfordů „nanosí" písmena BOULDER DASH (rychlostí hry, sokoban-style
 * tlačení z různých směrů); přerušitelné klávesou. Titulek pak vyplní rolovací duha.
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

  // Úvodní animace
  private introDone = false;
  private titleLetters: Phaser.GameObjects.BitmapText[] = [];
  private carriers: Phaser.GameObjects.Sprite[] = [];
  private introTweens: Phaser.Tweens.Tween[] = [];
  private introFade: Phaser.GameObjects.GameObject[] = [];
  private rainbow?: Phaser.GameObjects.TileSprite;

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

    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.leftKey.on("down", () => this.changeCave(-1));
    this.rightKey.on("down", () => this.changeCave(1));
    this.enterKey.on("down", () => this.startGame());
    this.input.keyboard!.on("keydown", () => this.completeIntro());

    this.menuOrder = CaveLoader.getMenuOrder();
    const idx = this.menuOrder.indexOf(this.selectedCave);
    this.menuIndex = idx >= 0 ? idx : 0;
    this.selectedCave = this.menuOrder[this.menuIndex]!;
    this.updateCaveDisplay();
  }

  update(_time: number, delta: number): void {
    // Rolovací duha v titulku (klidná rychlost ~ 12 px/s).
    if (this.rainbow) this.rainbow.tilePositionY -= delta * 0.012;
  }

  // ---------------------------------------------------------------- MENU
  private buildMenu(): void {
    const cx = this.cameras.main.width / 2;
    const sel = this.add.bitmapText(cx, 58, FONT, "< SELECT CAVE >", 8).setOrigin(0.5, 0).setTint(PAL.heading);
    this.caveNameText = this.add.bitmapText(cx, 72, FONT, "", 16).setOrigin(0.5, 0).setTint(PAL.name);
    this.caveInfoText = this.add.bitmapText(cx, 94, FONT, "", 8).setOrigin(0.5, 0).setTint(PAL.info);
    this.bestScoreText = this.add.bitmapText(cx, 108, FONT, "", 8).setOrigin(0.5, 0).setTint(PAL.ok);
    const sep = this.add.rectangle(cx, 126, this.cameras.main.width - 48, 1, 0x6b5a33);
    const ctrlHead = this.add.bitmapText(cx, 134, FONT, "CONTROLS", 8).setOrigin(0.5, 0).setTint(PAL.heading);

    const controls: [string, string][] = [
      ["ARROWS", "MOVE ROCKFORD"],
      ["P", "PAUSE / RESUME"],
      ["R", "RESTART LEVEL"],
      ["ESC", "QUIT LEVEL"],
    ];
    const colKey = cx - 90, colDesc = cx - 30;
    let cy = 148;
    const ctrlLines: Phaser.GameObjects.GameObject[] = [];
    for (const [key, desc] of controls) {
      ctrlLines.push(this.add.bitmapText(colKey, cy, FONT, key, 8).setOrigin(0, 0).setTint(PAL.name));
      ctrlLines.push(this.add.bitmapText(colDesc, cy, FONT, desc, 8).setOrigin(0, 0).setTint(PAL.info));
      cy += 13;
    }
    const start = this.add.bitmapText(cx, 212, FONT, "PRESS ENTER TO START", 16).setOrigin(0.5, 0).setTint(PAL.ok);

    this.introFade = [sel, this.caveNameText, this.caveInfoText, this.bestScoreText, sep, ctrlHead, ...ctrlLines, start];
    for (const o of this.introFade) (o as any).setAlpha(0);
  }

  // ------------------------------------------------------- ÚVODNÍ ANIMACE
  /** Vytvoří písmena (různé startovní strany/dráhy) a spustí bandu Rockfordů. */
  private buildTitleIntro(): void {
    const cx = this.cameras.main.width / 2;
    const W = this.cameras.main.width;
    const left = cx - (TITLE.length * GLYPH_ADV) / 2;

    const plans: LetterPlan[] = [];
    let k = 0;
    for (let i = 0; i < TITLE.length; i++) {
      const ch = TITLE[i]!;
      if (ch === " ") continue;
      const slotX = left + i * GLYPH_ADV;
      const leftDist = slotX + LW;
      const rightDist = W + LW - slotX;
      const fromLeft = leftDist <= rightDist;
      const sideDist = Math.min(leftDist, rightDist);
      let startX: number, startY: number, segs: Seg[];
      if (sideDist > 180) {
        // střed titulku → shora dolů (krátká dráha)
        startX = slotX; startY = -LH - 16;
        segs = [{ dx: 0, dy: 1, dist: TITLE_Y - startY }];
      } else {
        // kraj → z nejbližšího boku; každé druhé jako zalomená dráha (sokoban obíhání)
        const sokoban = k % 2 === 0;
        startY = sokoban ? TITLE_Y - 56 : TITLE_Y;
        if (fromLeft) { startX = -LW; segs = [{ dx: 1, dy: 0, dist: slotX - startX }]; }
        else { startX = W + LW; segs = [{ dx: -1, dy: 0, dist: startX - slotX }]; }
        if (sokoban) segs.push({ dx: 0, dy: 1, dist: 56 });
      }
      const obj = this.add.bitmapText(startX, startY, FONT, ch, TITLE_SIZE).setOrigin(0, 0).setTint(PAL.title);
      this.titleLetters.push(obj);
      plans.push({ obj, startX, startY, segs });
      k++;
    }

    // Banda: jeden Rockford na každé písmeno, všichni paralelně (rychlé a „rojové").
    Promise.all(plans.map((p) => this.carrierWork([p]))).then(() => {
      if (!this.introDone) this.completeIntro();
    });
  }

  /** Jeden Rockford z bandy postupně doručí svá písmena. */
  private async carrierWork(letters: LetterPlan[]): Promise<void> {
    let carrier: Phaser.GameObjects.Sprite | null = null;
    for (const L of letters) {
      if (this.introDone) return;
      const b0 = this.behindCenter(L.startX, L.startY, L.segs[0]!);
      if (!carrier) {
        carrier = this.add.sprite(b0.x, b0.y, "bd", 0).setOrigin(0.5, 0.5).setScale(1.25);
        carrier.play("run_r");
        this.carriers.push(carrier);
      } else {
        await this.walk(carrier, b0.x, b0.y, "yx");
      }
      let lx = L.startX, ly = L.startY;
      for (const seg of L.segs) {
        if (this.introDone) return;
        const b = this.behindCenter(lx, ly, seg);
        await this.walk(carrier, b.x, b.y, "yx"); // dojít/obejít za písmeno
        await this.push(carrier, L.obj, seg);     // tlačit na slot
        lx += seg.dx * seg.dist;
        ly += seg.dy * seg.dist;
      }
    }
    // Hotovo: Rockford zůstane u posledního písmene; finalizace (completeIntro)
    // ho odstraní hned, jak doručí poslední písmeno i ostatní z bandy.
  }

  /** Střed pozice Rockforda „za" písmenem pro tlačení daným směrem. */
  private behindCenter(lx: number, ly: number, seg: Seg): { x: number; y: number } {
    if (seg.dx > 0) return { x: lx - 12, y: ly + LH / 2 };
    if (seg.dx < 0) return { x: lx + LW + 12, y: ly + LH / 2 };
    return { x: lx + LW / 2, y: ly - 12 }; // tlačení dolů → nad písmenem
  }

  /** Chůze Rockforda po krocích STEP_PX (rychlost hry); pořadí os "xy"/"yx". */
  private async walk(c: Phaser.GameObjects.Sprite, toX: number, toY: number, order: "xy" | "yx"): Promise<void> {
    const axis = async (which: "x" | "y", to: number) => {
      while (!this.introDone) {
        const cur = which === "x" ? c.x : c.y;
        const d = to - cur;
        if (Math.abs(d) < 0.5) break;
        const step = Math.sign(d) * Math.min(STEP_PX, Math.abs(d));
        if (which === "x") c.play(step > 0 ? "run_r" : "run_l", true);
        await this.tweenP(c, which === "x" ? { x: cur + step } : { y: cur + step });
      }
    };
    if (order === "xy") { await axis("x", toX); await axis("y", toY); }
    else { await axis("y", toY); await axis("x", toX); }
  }

  /** Tlačení písmene (i Rockforda) na slot po krocích STEP_PX. */
  private async push(c: Phaser.GameObjects.Sprite, letter: Phaser.GameObjects.BitmapText, seg: Seg): Promise<void> {
    const n = Math.max(1, Math.ceil(seg.dist / STEP_PX));
    const len = seg.dist / n;
    for (let s = 0; s < n && !this.introDone; s++) {
      if (seg.dx !== 0) c.play(seg.dx > 0 ? "run_r" : "run_l", true);
      await this.tweenP([c, letter], { x: `+=${seg.dx * len}`, y: `+=${seg.dy * len}` });
    }
  }

  /** Promise obal nad tweenem jednoho kroku (registruje se kvůli přeskočení). */
  private tweenP(targets: any, props: Record<string, any>): Promise<void> {
    return new Promise<void>((res) => {
      const tw = this.tweens.add({ targets, ...props, duration: STEP_MS, onComplete: () => res() });
      this.introTweens.push(tw);
    });
  }

  /** Dokončí/přeskočí úvod: duhový titulek, Rockfordi po stranách, menu se objeví. */
  private completeIntro(): void {
    if (this.introDone) return;
    this.introDone = true;
    for (const t of this.introTweens) t.stop();
    this.introTweens = [];
    for (const c of this.carriers) c.destroy();
    this.carriers = [];

    this.createRainbowTitle();
    this.createFlankingRockfords();
    for (const o of this.introFade) this.tweens.add({ targets: o, alpha: 1, duration: 250 });
  }

  // ----------------------------------------------------------- DUHA
  private ensureRainbowTexture(): void {
    if (this.textures.exists("rainbow")) return;
    const nBands = 8;
    const bandH = 8; // vyšší pruhy (dle předlohy)
    const wpx = 4;
    const cycle = nBands * bandH;
    const canvas = document.createElement("canvas");
    canvas.width = wpx;
    canvas.height = cycle;
    const ctx = canvas.getContext("2d")!;
    for (let bi = 0; bi < nBands; bi++) {
      const hue = bi / nBands; // rovnoměrně po spektru, smyčka beze švu
      for (let yy = 0; yy < bandH; yy++) {
        const shine = Math.sin((Math.PI * (yy + 0.5)) / bandH); // 0→1→0
        const v = 0.22 + 0.78 * shine; // výrazný lesk (tmavé okraje, jasný střed)
        const [r, g, b] = hsvToRgb(hue, 0.85, v);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, bi * bandH + yy, wpx, 1);
      }
    }
    this.textures.addCanvas("rainbow", canvas);
  }

  private createRainbowTitle(): void {
    const cx = this.cameras.main.width / 2;
    const w = TITLE.length * GLYPH_ADV;
    const maskText = this.make
      .bitmapText({ x: cx, y: TITLE_Y, font: FONT, text: TITLE, size: TITLE_SIZE }, false)
      .setOrigin(0.5, 0);
    this.rainbow = this.add.tileSprite(cx, TITLE_Y, w, TITLE_SIZE, "rainbow").setOrigin(0.5, 0);
    this.rainbow.setMask(maskText.createBitmapMask());
    for (const obj of this.titleLetters) obj.destroy();
    this.titleLetters = [];
  }

  private createFlankingRockfords(): void {
    const cx = this.cameras.main.width / 2;
    const half = (TITLE.length * GLYPH_ADV) / 2;
    this.rockfordLeftSprite = this.add.sprite(cx - half - 22, TITLE_Y + 12, "bd", 0).setScale(1.5);
    this.rockfordRightSprite = this.add.sprite(cx + half + 22, TITLE_Y + 12, "bd", 0).setScale(1.5);
    this.startIdleAnimationCycle();
  }

  // ----------------------------------------------------------- MENU LOGIKA
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
    this.caveInfoText.setText(`DIAMONDS ${cave.diamondsNeeded}   TIME ${cave.timeLimit}S`);
    const bestScore = sessionStats.getBestScoreForCave(this.selectedCave);
    if (sessionStats.wasCompleted(this.selectedCave)) {
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
