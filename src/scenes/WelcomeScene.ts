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
const CELL = (TITLE_SIZE / 8) * 8; // mřížka = velikost písmene = 24 px

/**
 * Konfigurace úvodní animace (nanášení titulku Rockfordy). Drženo pohromadě,
 * ať se to snadno ladí.
 * - tickMs: kadence mřížky (1 buňka za tick) → celková rychlost. Hra je ~225 ms
 *   na 24px buňku; tady je to lehce svižnější.
 * - stepMin/MaxMs: vizuální délka jednoho kroku (< tickMs → vzniká „stutter",
 *   takže každý krok netrvá stejně, jako ve hře).
 * - pushStruggleChance: šance, že tlačení 1 tick „zadrhne" (Rockford postojí).
 * - spawnRowMin/Max: náhodný řádek pod nápisem, odkud se prostřední písmeno tlačí.
 * - finishMs: po stisku klávesy se úvod dorazí do ~půl vteřiny.
 */
const INTRO_CFG = {
  tickMs: 130,
  stepMinMs: 70,
  stepMaxMs: 122,
  pushStruggleChance: 0.18,
  spawnRowMin: 2,
  spawnRowMax: 4,
  finishMs: 400,
  fadeMs: 500, // nafejdování zbytku scény po složení titulku
  rockfordScale: 1.5,
};

type Cell = { c: number; r: number };
type IntroStep =
  | { t: "move"; to: Cell }
  | { t: "push"; to: Cell; letter: Phaser.GameObjects.BitmapText; letterTo: Cell; place: boolean };

interface IntroActor {
  sprite: Phaser.GameObjects.Sprite;
  cell: Cell;
  letterCell: Cell | null; // buňka právě tlačeného písmene (kvůli obsazenosti)
  endCell: Cell; // kde Rockford skončí (vedle B / H)
  steps: IntroStep[];
  idx: number;
  facing: "l" | "r";
  struggling: boolean; // čeká kvůli zádrhelu tlačení
  done: boolean;
}

const cellKey = (c: Cell) => `${c.c},${c.r}`;
const sameCell = (a: Cell, b: Cell) => a.c === b.c && a.r === b.r;

// Barvy rolovací duhy vytažené ze svislého sloupce předlohy
// resources/atari-dev-a-1.png (každá barva přechází světlá→tmavá, pak následuje
// další barva). V titulku se jen svisle scrollují (raster-bar efekt jako na Atari).
const RAINBOW_COLORS: [number, number, number][] = [
  [172, 244, 144], [132, 204, 104], [97, 170, 70], [39, 113, 11], [10, 85, 0],
  [159, 240, 195], [119, 201, 156], [51, 134, 88], [26, 109, 63], [0, 57, 10],
  [163, 229, 243], [89, 155, 169], [55, 122, 136], [30, 98, 111], [0, 45, 59],
  [0, 22, 36], [134, 178, 234], [100, 144, 200], [41, 86, 143], [13, 58, 115],
  [0, 10, 68], [191, 205, 255], [117, 131, 221], [84, 98, 188], [59, 73, 164],
  [6, 20, 112], [0, 1, 90], [192, 145, 255], [157, 110, 221], [100, 52, 164],
  [72, 24, 136], [24, 0, 90], [248, 180, 255], [174, 106, 200], [141, 72, 167],
  [117, 47, 143], [65, 0, 91], [42, 0, 68], [219, 141, 203], [185, 106, 169],
  [128, 48, 111], [100, 19, 83], [53, 0, 36], [255, 187, 195], [189, 113, 121],
  [157, 80, 88], [132, 55, 63], [80, 4, 10], [57, 0, 0], [222, 152, 138],
  [188, 118, 103], [131, 60, 45], [103, 31, 16], [56, 0, 0], [250, 204, 144],
  [176, 130, 70], [144, 97, 36], [91, 44, 0], [67, 19, 0], [211, 211, 211],
  [137, 137, 137], [104, 104, 104], [51, 51, 51], [27, 27, 27],
];

/** Manhattan dráha mezi buňkami (po jedné buňce). Pořadí os "yx" (svisle pak vodorovně). */
function walkSteps(from: Cell, to: Cell, order: "xy" | "yx" = "yx"): IntroStep[] {
  const out: IntroStep[] = [];
  let { c, r } = from;
  const goY = () => { while (r !== to.r) { r += Math.sign(to.r - r); out.push({ t: "move", to: { c, r } }); } };
  const goX = () => { while (c !== to.c) { c += Math.sign(to.c - c); out.push({ t: "move", to: { c, r } }); } };
  if (order === "yx") { goY(); goX(); } else { goX(); goY(); }
  return out;
}

/**
 * Welcome / menu scéna. Ostrý Atari bitmapový font (RetroFont).
 * Úvod: dva Rockfordi „nanosí" písmena BOULDER DASH – tlačí je jako balvany po mřížce
 * (rychlostí hry), prostřední z náhodných spodních řádků zatlačí nahoru, B a H přirazí
 * na řádku nápisu a zůstanou stát v idle. Přerušitelné klávesou. Titulek pak vyplní duha.
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

  // Úvodní animace
  private introDone = false;
  private left = 0; // x levého okraje nápisu (sloupec 0)
  private actors: IntroActor[] = [];
  private introLetters: { obj: Phaser.GameObjects.BitmapText; col: number }[] = [];
  private placed = new Set<string>(); // buňky s již položenými písmeny (řádek 0)
  private introTweens: Phaser.Tweens.Tween[] = [];
  private introTimer?: Phaser.Time.TimerEvent;
  private introFade: Phaser.GameObjects.GameObject[] = [];
  private rainbow?: Phaser.GameObjects.TileSprite;

  constructor() {
    super("WelcomeScene");
  }

  init(data?: { lastCave?: number }): void {
    this.introDone = false;
    this.actors = [];
    this.introLetters = [];
    this.placed = new Set();
    this.introTweens = [];
    this.introFade = [];
    if (data?.lastCave) this.selectedCave = data.lastCave;
  }

  preload() {
    this.load.spritesheet("bd", "resources/spritesheet_A.png", { frameWidth: 16, frameHeight: 16 });
    preloadAtariFonts(this);
  }

  create(): void {
    registerAtariFonts(this);
    this.createAnims();
    this.ensureRainbowTexture();
    this.left = this.cameras.main.width / 2 - (TITLE.length * CELL) / 2;

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
    if (this.rainbow) this.rainbow.tilePositionY -= delta * 0.012; // rolovací duha
  }

  // ----------------------------------------------------- mřížka → pixely
  private letterX(col: number): number { return this.left + col * CELL; }
  private rowY(row: number): number { return TITLE_Y + row * CELL; }
  private actorX(col: number): number { return this.left + col * CELL + CELL / 2; }
  private actorY(row: number): number { return TITLE_Y + row * CELL + CELL / 2; }

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
  private buildTitleIntro(): void {
    // Rozdělení: levý staví BOULDE (sloupce 0–5) zleva, pravý RDASH (6,8,9,10,11) zprava.
    // První (B) a poslední (H) písmeno se dělají nakonec; prostřední v náhodném pořadí.
    const leftMiddle = Phaser.Utils.Array.Shuffle([1, 2, 3, 4, 5]);
    const rightMiddle = Phaser.Utils.Array.Shuffle([6, 8, 9, 10]);

    const leftPlan = this.buildActorSteps("L", [...leftMiddle.map((c) => ({ col: c, final: false })), { col: 0, final: true }]);
    const rightPlan = this.buildActorSteps("R", [...rightMiddle.map((c) => ({ col: c, final: false })), { col: 11, final: true }]);

    this.actors = [this.spawnActor("L", leftPlan), this.spawnActor("R", rightPlan)];
    this.introTimer = this.time.addEvent({ delay: INTRO_CFG.tickMs, loop: true, callback: () => this.introTick() });
  }

  private spawnActor(side: "L" | "R", plan: { spawn: Cell; end: Cell; steps: IntroStep[] }): IntroActor {
    const sprite = this.add
      .sprite(this.actorX(plan.spawn.c), this.actorY(plan.spawn.r), "bd", 0)
      .setOrigin(0.5, 0.5)
      .setScale(INTRO_CFG.rockfordScale);
    sprite.play(side === "L" ? "run_r" : "run_l");
    return {
      sprite,
      cell: { ...plan.spawn },
      letterCell: null,
      endCell: plan.end,
      steps: plan.steps,
      idx: 0,
      facing: side === "L" ? "r" : "l",
      struggling: false,
      done: false,
    };
  }

  /** Sestaví všechny kroky pro jednoho Rockforda (postupně přes jeho písmena). */
  private buildActorSteps(
    side: "L" | "R",
    tasks: { col: number; final: boolean }[]
  ): { spawn: Cell; end: Cell; steps: IntroStep[] } {
    const dir = side === "L" ? 1 : -1;
    const S = side === "L" ? -5 : 16; // sloupec spawnu písmene (1 buňku za hranou)
    const steps: IntroStep[] = [];
    let cur: Cell | null = null;
    let spawn: Cell = { c: S - dir, r: 0 };

    for (const task of tasks) {
      const R = task.final ? 0 : Phaser.Math.Between(INTRO_CFG.spawnRowMin, INTRO_CFG.spawnRowMax);
      // písmeno spawne 1 buňku za hranou; Rockford začne o buňku dál (bod 3)
      const letter = this.add
        .bitmapText(this.letterX(S), this.rowY(R), FONT, TITLE[task.col]!, TITLE_SIZE)
        .setOrigin(0, 0)
        .setTint(PAL.title);
      this.introLetters.push({ obj: letter, col: task.col });

      const behind: Cell = { c: S - dir, r: R };
      if (cur === null) {
        spawn = behind; // první písmeno: Rockford se zde rovnou objeví
      } else {
        // K finálnímu písmenu (B/H na řádku 0) jdeme NEJDŘÍV vodorovně (po volném
        // řádku 1) a do řádku 0 vystoupíme až za hranou – jinak by Rockford narazil
        // do už položeného písmene přímo nad sebou a zasekl se. K prostředním
        // (řádek ≥2) stačí svisle dolů ("yx").
        steps.push(...walkSteps(cur, behind, task.final ? "xy" : "yx"));
      }

      // přitlačit písmeno vodorovně do cílového sloupce
      let lc = S, ac = S - dir;
      while (lc !== task.col) {
        lc += dir; ac += dir;
        steps.push({ t: "push", to: { c: ac, r: R }, letter, letterTo: { c: lc, r: R }, place: task.final && lc === task.col });
      }
      cur = { c: task.col - dir, r: R };

      if (!task.final) {
        // obejít písmeno a dostat se pod něj
        steps.push(...walkSteps(cur, { c: task.col - dir, r: R + 1 }));
        steps.push(...walkSteps({ c: task.col - dir, r: R + 1 }, { c: task.col, r: R + 1 }));
        // vytlačit nahoru na pozici v nápisu
        let lr = R, ar = R + 1;
        while (lr !== 0) {
          lr -= 1; ar -= 1;
          steps.push({ t: "push", to: { c: task.col, r: ar }, letter, letterTo: { c: task.col, r: lr }, place: lr === 0 });
        }
        cur = { c: task.col, r: 1 };
      }
    }
    return { spawn, end: cur ?? spawn, steps };
  }

  /** Jeden tik mřížky: vyřeší pohyb obou Rockfordů (levý má prioritu, druhý počká). */
  private introTick(): void {
    if (this.introDone) return;
    const reserved = new Set<string>(); // buňky zabrané tento tick (priorita)
    let active = false;

    for (const a of this.actors) {
      if (a.done) continue;
      if (a.idx >= a.steps.length) {
        a.done = true;
        this.onActorFinished(a);
        continue;
      }
      active = true;
      const step = a.steps[a.idx]!;

      // Zádrhel při tlačení: občas Rockford 1 tik postojí, pak se pohne.
      if (step.t === "push" && !a.struggling && Phaser.Math.FloatBetween(0, 1) < INTRO_CFG.pushStruggleChance) {
        a.struggling = true;
        continue;
      }
      a.struggling = false;

      const other = this.actors.find((x) => x !== a)!;
      const blocked = (cell: Cell): boolean => {
        const k = cellKey(cell);
        if (reserved.has(k)) return true;
        if (!other.done && sameCell(cell, other.cell)) return true;
        if (other.letterCell && sameCell(cell, other.letterCell)) return true;
        if (this.placed.has(k)) return true;
        return false;
      };

      if (step.t === "move") {
        if (blocked(step.to)) continue; // počkej (pojistka proti křížení)
        a.cell = step.to;
        reserved.add(cellKey(a.cell));
        this.commitMove(a, false);
        a.idx++;
      } else {
        if (blocked(step.letterTo)) continue;
        a.cell = step.to;
        a.letterCell = step.letterTo;
        reserved.add(cellKey(a.cell));
        reserved.add(cellKey(a.letterCell));
        this.commitMove(a, true, step);
        if (step.place) {
          this.placed.add(cellKey(step.letterTo));
          a.letterCell = null;
        }
        a.idx++;
      }
    }

    if (!active) this.finishIntro();
  }

  /** Plynulý tween Rockforda (a tlačeného písmene) do nové buňky; nastaví směr běhu. */
  private commitMove(a: IntroActor, push: boolean, step?: IntroStep & { t: "push" }): void {
    const tx = this.actorX(a.cell.c);
    const ty = this.actorY(a.cell.r);
    const dx = tx - a.sprite.x;
    if (dx > 0.5) { a.facing = "r"; a.sprite.play("run_r", true); }
    else if (dx < -0.5) { a.facing = "l"; a.sprite.play("run_l", true); }
    else a.sprite.play(a.facing === "r" ? "run_r" : "run_l", true);

    const dur = Phaser.Math.Between(INTRO_CFG.stepMinMs, INTRO_CFG.stepMaxMs);
    this.introTweens.push(this.tweens.add({ targets: a.sprite, x: tx, y: ty, duration: dur }));
    if (push && step && a.letterCell) {
      this.introTweens.push(
        this.tweens.add({ targets: step.letter, x: this.letterX(a.letterCell.c), y: this.rowY(a.letterCell.r), duration: dur })
      );
    }
  }

  private onActorFinished(a: IntroActor): void {
    a.sprite.setPosition(this.actorX(a.endCell.c), this.actorY(a.endCell.r));
    this.idleActor(a.sprite);
  }

  /** Vše doručeno → duhový titulek + nafejdování menu (Rockfordi zůstávají jako idle). */
  private finishIntro(): void {
    if (this.introDone) return;
    this.introDone = true;
    this.introTimer?.remove();
    this.createRainbowTitle();
    for (const o of this.introFade) this.tweens.add({ targets: o, alpha: 1, duration: INTRO_CFG.fadeMs });
  }

  /** Skip klávesou: dorazí úvod do ~0,5 s – písmena na místo, Rockfordi vedle, menu. */
  private completeIntro(): void {
    if (this.introDone) return;
    this.introDone = true;
    this.introTimer?.remove();
    for (const t of this.introTweens) t.stop();
    this.introTweens = [];

    // písmena doskočí na své sloupce v nápisu
    for (const L of this.introLetters) L.obj.setPosition(this.letterX(L.col), this.rowY(0));
    // Rockfordi na své koncové (boční) pozice + idle
    for (const a of this.actors) {
      a.done = true;
      a.letterCell = null;
      a.sprite.setPosition(this.actorX(a.endCell.c), this.actorY(a.endCell.r));
      this.idleActor(a.sprite);
    }
    this.createRainbowTitle();
    for (const o of this.introFade) this.tweens.add({ targets: o, alpha: 1, duration: INTRO_CFG.finishMs });
  }

  /** Nezávislá náhodná idle animace jednoho Rockforda (dokola). */
  private idleActor(sprite: Phaser.GameObjects.Sprite): void {
    // Jen smyčkové animace (blink + podupávání). Jednoframové iddle_anim_1
    // (repeat:0) po opakovaném přehrání nechávalo sprite prázdný → vynecháno.
    const idles = ["iddle_anim_2", "iddle_anim_3"];
    const next = () => {
      if (!sprite.active) return;
      sprite.play(Phaser.Utils.Array.GetRandom(idles));
      this.time.delayedCall(Phaser.Math.Between(2500, 5000), next);
    };
    next();
  }

  // ----------------------------------------------------------- DUHA
  private ensureRainbowTexture(): void {
    if (this.textures.exists("rainbow")) return;
    const wpx = 4;
    const canvas = document.createElement("canvas");
    canvas.width = wpx;
    canvas.height = RAINBOW_COLORS.length;
    const ctx = canvas.getContext("2d")!;
    for (let i = 0; i < RAINBOW_COLORS.length; i++) {
      const [r, g, b] = RAINBOW_COLORS[i]!;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, i, wpx, 1);
    }
    this.textures.addCanvas("rainbow", canvas);
  }

  private createRainbowTitle(): void {
    const cx = this.cameras.main.width / 2;
    const w = TITLE.length * CELL;
    const maskText = this.make
      .bitmapText({ x: cx, y: TITLE_Y, font: FONT, text: TITLE, size: TITLE_SIZE }, false)
      .setOrigin(0.5, 0);
    this.rainbow = this.add.tileSprite(cx, TITLE_Y, w, TITLE_SIZE, "rainbow").setOrigin(0.5, 0);
    this.rainbow.setMask(maskText.createBitmapMask());
    for (const L of this.introLetters) L.obj.destroy();
    this.introLetters = [];
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
      this.anims.create({ key, frames: this.anims.generateFrameNumbers("bd", { start, end }), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    ensure("iddle_anim_1", 0, 0, 1, false);
    ensure("iddle_anim_2", 0, 2, 6, true);
    // Podupávání nohou: zem (7) → noha nahoru (8) → zem (7). Framy 4 a 9 jsou
    // prázdné a starý rozsah 3–6 přes ně „probliknul" + končil se zvednutou nohou.
    if (!this.anims.exists("iddle_anim_3")) {
      this.anims.create({
        key: "iddle_anim_3",
        // Podupávání: stoj (0) → vykopnutí nohy (3) → stoj (0). Vždy končí na zemi.
        frames: [
          { key: "bd", frame: 0 },
          { key: "bd", frame: 3 },
          { key: "bd", frame: 0 },
        ],
        frameRate: 5,
        repeat: -1,
      });
    }
    ensure("run_l", 10, 16, 12, true);
    ensure("run_r", 20, 26, 12, true);
  }
}
