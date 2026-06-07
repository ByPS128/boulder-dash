import Phaser from "phaser";
import {
  CellEntity,
  CellKind,
  DIR,
  EnemyEntity,
  MagicWallEntity,
  MoveableEntity,
  PlayerEntity,
  Vec2,
  V,
  addV,
  eqV,
  isEnemy,
  isMoveable,
  isPlayer,
  Difficulty,
  DIFFICULTY_CONFIG,
} from "../core/types";
import { CaveDefinition } from "../core/CaveDefinition";
import { CaveLoader } from "../levels/CaveLoader";
import { Rng } from "../core/Rng";
import { sessionStats } from "../core/SessionStats";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { GameOverData } from "./GameOverScene";
import { preloadAtariFonts, registerAtariFonts, DEFAULT_FONT } from "../ui/AtariFont";

// Game states
enum GameState {
  SPAWNING = "spawning",
  PLAYING = "playing",
  PAUSED = "paused",
  RESTART_CONFIRM = "restart_confirm",
  QUIT_CONFIRM = "quit_confirm",
  DEAD = "dead",
  VICTORY = "victory",
}

const BOARD_WIDTH = 40;
const BOARD_HEIGHT = 23; // 22 original + 1 empty row for UI space

const VISIBLE_W = 28;
const VISIBLE_H = 16;

const TILE = 16;

// Atari bitmap font (stejný jako v menu) pro HUD i title card.
const FONT = DEFAULT_FONT;

// Barvy HUD (tinty bitmap textu).
const HUD = {
  ok: 0x6cc04a, // splněno / dost času
  warn: 0xffaa00, // čas dochází
  danger: 0xff4030, // málo času
  score: 0xffd23f, // zlatá
  white: 0xffffff,
} as const;

// Fixed-step tick (matches Kaboom version feel)
const SPEED = 0.15;

// Spritesheet frames (spritesheet_A.png)
const FRAMES = {
  TITAN: 30,
  SPAWN: 31,
  BRICKS: 32,
  DIRT: 33,
  BOULDER: 35,
  DIAMOND: 40,
  MAGICWALL: 50, // řádek 6 v listu (od 1), 4 framy animace
  AMOEBA: 60, // řádky 7–8 v listu (od 1), 4 framy animace
  FIREFLY: 80,
  BUTTERFLY: 90,
  EXPLOSION: 100,
} as const;

const ANIMS = {
  IDLE1: "iddle_anim_1",
  IDLE2: "iddle_anim_2",
  IDLE3: "iddle_anim_3",
  RUN_L: "runLeft_anim",
  RUN_R: "runRight_anim",
  BORN: "born_anim",
  SPAWN: "spawn_anim",
  EXIT_OPEN: "exitOpened_anim",
  EXPLOSION: "explosion_anim",
  FIREFLY: "firefly_anim",
  BUTTERFLY: "butterfly_anim",
  DIAMOND: "diamond_anim",
  AMOEBA: "amoeba_anim",
  MAGICWALL: "magicwall_anim",
} as const;

// Extra mechanics (Boulder Dash-like)
const MAGIC_WALL_ACTIVE_TICKS = 200;

// Amoeba – autentické chování naportované z disassembly (ProcessAmoeba @ $6fd0).
const AMOEBA_MAX_SIZE = 200; // >= 200 buněk → celá amoeba se přemění na balvany
const AMOEBA_MASK_SLOW = 0x7f; // start: (rand & mask) < 4 ≈ 3 % šance růstu / buňku / tick
const AMOEBA_MASK_FAST = 0x0f; // po uplynutí času: ≈ 25 % (růst zrychlí, tlačí na hráče)
const AMOEBA_SLOW_GROWTH_SECONDS = 30; // v originále per jeskyně (Amoeba3PercentMax)
// Pořadí směrů růstu jako v originále (offset tabulka 01 28 2a 51): nahoru, vlevo, vpravo, dolů.
const AMOEBA_DIRS: Vec2[] = [DIR.UP, DIR.LEFT, DIR.RIGHT, DIR.DOWN];

const FIREFLY_INIT_DIRS: Vec2[] = [DIR.LEFT, DIR.DOWN, DIR.RIGHT, DIR.UP];
const BUTTERFLY_INIT_DIRS: Vec2[] = [DIR.LEFT, DIR.UP, DIR.RIGHT, DIR.DOWN];

const DIR_TO_STR = (d: Vec2): "left" | "right" | "up" | "down" => {
  if (eqV(d, DIR.LEFT)) return "left";
  if (eqV(d, DIR.RIGHT)) return "right";
  if (eqV(d, DIR.UP)) return "up";
  return "down";
};

const STR_TO_DIR: Record<"left" | "right" | "up" | "down", Vec2> = {
  left: DIR.LEFT,
  right: DIR.RIGHT,
  up: DIR.UP,
  down: DIR.DOWN,
};

const NEXT_LEFT: Record<"left" | "right" | "up" | "down", Vec2> = {
  left: DIR.DOWN,
  down: DIR.RIGHT,
  right: DIR.UP,
  up: DIR.LEFT,
};

const NEXT_RIGHT: Record<"left" | "right" | "up" | "down", Vec2> = {
  left: DIR.UP,
  up: DIR.RIGHT,
  right: DIR.DOWN,
  down: DIR.LEFT,
};

export class GameScene extends Phaser.Scene {
  private gridW = 0;
  private gridH = 0;
  private grid: (CellEntity | null)[][] = [];

  // reservation grid (boulders/diamonds falling plans)
  private inMove: (MoveableEntity | null)[][] = [];

  // Cells vacated by Rockford in the current tick
  private rockfordVacated: Set<string> = new Set();

  private player!: PlayerEntity;
  private exit!: CellEntity;
  private spawnSprite!: Phaser.GameObjects.Sprite;

  // Game state
  private gameState: GameState = GameState.SPAWNING;

  // Cave data
  private caveNumber = 1;
  private cave!: CaveDefinition;
  private currentDifficulty: Difficulty = Difficulty.NORMAL;
  private difficultySystemEnabled = false; // not yet implemented

  // Game stats
  private score = 0;
  private diamondsCollected = 0;
  private diamondsNeeded = 0;
  private exitOpened = false;

  // Stav amoeby (zrcadlí proměnné z disassembly)
  private amoebaCountPrev = 0; // AmoebaCellCountPreviousTick
  private amoebaCouldGrowLastTick = true; // AmeobaCouldGrowLastTick
  private amoebaIsGrowing = false; // AmoebaIsGrowing
  private amoebaGrowthMask = AMOEBA_MASK_SLOW; // AmoebaGrowthProbabilityMask

  // Timer
  private timeLimit = 0;
  private timeRemaining = 0;

  private stepAcc = 0;
  private tickCount = 0;
  // Herní čas v sekundách – narůstá jen když hra běží (ne během pauzy/dialogů).
  // Používá se místo Date.now(), aby pauza nezkreslovala časování animací ani statistiky.
  private gameTime = 0;
  // Deterministický PRNG (autentický algoritmus Boulder Dash) pro běhové náhody:
  // pravděpodobnost tlačení balvanu a růst amoeby. Seedován per jeskyně.
  private rng!: Rng;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  // Additional keys
  private pKey!: Phaser.Input.Keyboard.Key;
  private rKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  private camOffset: Vec2 = V(0, 0);
  private camWantedPx: Vec2 = V(0, 0);

  // UI (bitmap font)
  private scoreText!: Phaser.GameObjects.BitmapText;
  private diamondsText!: Phaser.GameObjects.BitmapText;
  private timerText!: Phaser.GameObjects.BitmapText;
  private diamondIcon!: Phaser.GameObjects.Sprite;

  // Death tracking
  private deathReason: string = "";

  // Idle animation rotation
  private idleAnimIndex = 0;
  private idleStartTime = 0;
  private readonly IDLE_ANIM_DURATION = 3; // seconds per idle animation

  // Dialogs
  private activeDialog: ConfirmDialog | null = null;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super("GameScene");
  }

  init(data?: { caveNumber?: number }): void {
    if (data?.caveNumber) {
      this.caveNumber = data.caveNumber;
    }
  }

  preload() {
    this.load.spritesheet("bd", "resources/spritesheet_A.png", {
      frameWidth: TILE,
      frameHeight: TILE,
    });
    preloadAtariFonts(this);
  }

  create() {
    // Load cave
    const cave = CaveLoader.getCave(this.caveNumber);
    if (!cave) {
      console.error(`Cave ${this.caveNumber} not found!`);
      this.scene.start("WelcomeScene");
      return;
    }
    this.cave = cave;

    // Setup game parameters from cave
    this.diamondsNeeded = cave.diamondsNeeded;
    this.timeLimit = cave.timeLimit;
    this.timeRemaining = cave.timeLimit;
    // PRNG seedujeme číslem jeskyně → stejná jeskyně má reprodukovatelný průběh náhod.
    this.rng = new Rng(this.caveNumber);

    // Reset stavu amoeby (scene.restart znovu spustí create, ale ne inicializátory polí).
    this.amoebaCountPrev = 0;
    this.amoebaCouldGrowLastTick = true;
    this.amoebaIsGrowing = false;
    this.amoebaGrowthMask = AMOEBA_MASK_SLOW;

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.pKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.createAnims();
    this.buildLevelFromMap(cave.map);

    this.cameras.main.setBounds(0, 0, BOARD_WIDTH * TILE, BOARD_HEIGHT * TILE);
    this.cameras.main.setZoom(1);

    registerAtariFonts(this);
    this.createUI();
    this.showTitleCard();
    this.snapCameraToPlayer();

    this.initFireflies();
    this.initButterflies();
    this.markBouldersToMove();
    this.markFirefliesToMove();
    this.markButterfliesToMove();

    // Setup key listeners
    this.setupKeyListeners();
  }

  update(_time: number, deltaMs: number) {
    const delta = deltaMs / 1000;

    // Update timer (only when playing)
    if (this.gameState === GameState.PLAYING) {
      this.updateTimer(delta);
    }

    // Don't update game logic when paused or in dialogs
    if (
      this.gameState === GameState.PAUSED ||
      this.gameState === GameState.RESTART_CONFIRM ||
      this.gameState === GameState.QUIT_CONFIRM ||
      this.gameState === GameState.DEAD ||
      this.gameState === GameState.VICTORY
    ) {
      return;
    }

    // Herní čas běží jen tady (za guardem pauzy/dialogů), takže ho pauza nezvyšuje.
    this.gameTime += delta;

    this.stepAcc += delta;
    this.updateCamera(delta);

    if (this.stepAcc >= SPEED) {
      while (this.stepAcc >= SPEED) {
        this.stepAcc -= SPEED;
        this.step();
      }
    }
  }

  private posKey(x: number, y: number) { return `${x},${y}`; }

  private createAnims() {
    // Rockford
    this.anims.create({ key: ANIMS.IDLE1, frames: [{ key: "bd", frame: 0 }], frameRate: 1, repeat: 0 });
    this.anims.create({
      key: ANIMS.IDLE2,
      frames: this.anims.generateFrameNumbers("bd", { start: 0, end: 2 }),
      frameRate: 6,
      repeat: -1,
    });
    // Podupávání: stoj (0) → vykopnutí nohy (3) → stoj (0). Vždy končí na zemi.
    // (Starý rozsah 3–6 obsahoval prázdné framy 4/9 → probliknutí a „visící" noha.)
    this.anims.create({
      key: ANIMS.IDLE3,
      frames: [
        { key: "bd", frame: 0 },
        { key: "bd", frame: 3 },
        { key: "bd", frame: 0 },
      ],
      frameRate: 5,
      repeat: -1,
    });
    this.anims.create({
      key: ANIMS.RUN_L,
      frames: this.anims.generateFrameNumbers("bd", { start: 10, end: 16 }),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: ANIMS.RUN_R,
      frames: this.anims.generateFrameNumbers("bd", { start: 20, end: 26 }),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: ANIMS.BORN,
      frames: this.anims.generateFrameNumbers("bd", { start: 100, end: 104 }),
      frameRate: 12,
      repeat: 0,
    });

    // Spawn blinking (30..31) — play 5×, then born
    this.anims.create({
      key: ANIMS.SPAWN,
      frames: this.anims.generateFrameNumbers("bd", { start: FRAMES.TITAN, end: FRAMES.SPAWN }),
      frameRate: 10,
      repeat: 0,
    });

    // Exit opened (same frames in your original JS)
    this.anims.create({
      key: ANIMS.EXIT_OPEN,
      frames: this.anims.generateFrameNumbers("bd", { start: FRAMES.TITAN, end: FRAMES.SPAWN }),
      frameRate: 10,
      repeat: -1,
    });

    // Explosion (100..102)
    this.anims.create({
      key: ANIMS.EXPLOSION,
      frames: this.anims.generateFrameNumbers("bd", { start: FRAMES.EXPLOSION, end: FRAMES.EXPLOSION + 2 }),
      frameRate: 12,
      repeat: 0,
    });

    // Enemies
    this.anims.create({
      key: ANIMS.FIREFLY,
      frames: this.anims.generateFrameNumbers("bd", { start: FRAMES.FIREFLY, end: FRAMES.FIREFLY + 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: ANIMS.BUTTERFLY,
      frames: this.anims.generateFrameNumbers("bd", { start: FRAMES.BUTTERFLY, end: FRAMES.BUTTERFLY + 3 }),
      frameRate: 10,
      repeat: -1,
    });

    // Diamond spin (40..47)
    this.anims.create({
      key: ANIMS.DIAMOND,
      frames: this.anims.generateFrameNumbers("bd", { start: FRAMES.DIAMOND, end: FRAMES.DIAMOND + 7 }),
      frameRate: 12,
      repeat: -1,
    });

    // Amoeba (4 framy). Pozn.: pokud se sprity nečekaně dělí na 2 řádky listu,
    // bude potřeba framy upravit na nesouvislé (např. 60,61,70,71).
    this.anims.create({
      key: ANIMS.AMOEBA,
      frames: this.anims.generateFrameNumbers("bd", { start: FRAMES.AMOEBA, end: FRAMES.AMOEBA + 3 }),
      frameRate: 8,
      repeat: -1,
    });

    // Magic wall – animovaná (4 framy, řádek 6 v listu).
    this.anims.create({
      key: ANIMS.MAGICWALL,
      frames: this.anims.generateFrameNumbers("bd", { start: FRAMES.MAGICWALL, end: FRAMES.MAGICWALL + 3 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  private createUI() {
    const W = this.cameras.main.width;
    // Tmavý pruh pro čitelnost HUD nad hracím polem.
    this.add
      .rectangle(0, 0, W, 18, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(900);

    // Vlevo: animovaná ikona diamantu + sebráno/potřeba.
    this.diamondIcon = this.add
      .sprite(11, 9, "bd", FRAMES.DIAMOND)
      .setScrollFactor(0)
      .setDepth(1000);
    this.diamondIcon.play(ANIMS.DIAMOND);
    this.diamondsText = this.add
      .bitmapText(23, 1, FONT, `0/${this.diamondsNeeded}`, 16)
      .setScrollFactor(0)
      .setDepth(1000)
      .setTint(HUD.white);

    // Uprostřed: čas (barevně podle zbývajícího času).
    this.timerText = this.add
      .bitmapText(W / 2, 1, FONT, `${this.timeLimit}`, 16)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setTint(HUD.ok);

    // Vpravo: skóre, 6 míst zarovnaných (neskáče).
    this.scoreText = this.add
      .bitmapText(W - 6, 1, FONT, "000000", 16)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setTint(HUD.score);
  }

  /** Title card s názvem jeskyně přes plochu: bílé písmo s černým obrysem, fade. */
  private showTitleCard() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 - 8;
    const text = `CAVE ${this.caveNumber}: ${this.cave.name.toUpperCase()}`;
    const size = 16;
    const maxW = this.cameras.main.width - 40;

    const card = this.add.container(cx, cy).setScrollFactor(0).setDepth(2000).setAlpha(0);
    // Obrys: text 8× posunutý v inverzní (černé) barvě, navrch bílá výplň.
    const O = 2;
    const offsets = [[-O, -O], [0, -O], [O, -O], [-O, 0], [O, 0], [-O, O], [0, O], [O, O]];
    for (const [ox, oy] of offsets) {
      const t = this.make
        .bitmapText({ x: ox, y: oy, font: FONT, text, size }, false)
        .setOrigin(0.5, 0.5)
        .setTint(0x000000)
        .setMaxWidth(maxW)
        .setCenterAlign();
      card.add(t);
    }
    const main = this.make
      .bitmapText({ x: 0, y: 0, font: FONT, text, size }, false)
      .setOrigin(0.5, 0.5)
      .setTint(HUD.white)
      .setMaxWidth(maxW)
      .setCenterAlign();
    card.add(main);

    // 0,3 s fade in → ~0,9 s držení → 0,3 s fade out → zničit.
    this.tweens.add({
      targets: card,
      alpha: 1,
      duration: 300,
      hold: 900,
      yoyo: true,
      onComplete: () => card.destroy(),
    });
  }

  private setCell(x: number, y: number, ent: CellEntity | null) {
    this.grid[y]![x] = ent;
    if (ent) {
      ent.pos = V(x, y);
      if (ent.sprite) ent.sprite.setPosition(x * TILE, y * TILE);
    }
  }

  private inBounds(p: Vec2) {
    return p.x >= 0 && p.y >= 0 && p.x < this.gridW && p.y < this.gridH;
  }

  private getCell(p: Vec2): CellEntity | null {
    if (!this.inBounds(p)) return null;
    return this.grid[p.y]![p.x] ?? null;
  }

  private buildLevelFromMap(map: string[]) {
    this.gridH = map.length;
    this.gridW = map[0]!.length;
    this.grid = Array.from({ length: this.gridH }, () => Array<CellEntity | null>(this.gridW).fill(null));
    this.inMove = Array.from({ length: this.gridH }, () => Array<MoveableEntity | null>(this.gridW).fill(null));

    // Exit
    this.exit = {
      kind: CellKind.Exit,
      pos: V(0, 0),
      sprite: this.add.sprite(0, 0, "bd", FRAMES.TITAN).setOrigin(0, 0).setDepth(10),
    };

    // Player (hidden until spawn completes)
    this.player = {
      kind: CellKind.Player,
      pos: V(0, 0),
      sprite: this.add.sprite(0, 0, "bd", 0).setOrigin(0, 0).setDepth(20),
      hidden: true,
      direction: DIR.ZERO,
      lastSideAnim: ANIMS.RUN_R,
      pushAttempts: 0,
      isDead: false,
    };
    this.player.sprite!.setVisible(false);

    let spawnPos = V(0, 0);

    for (let y = 0; y < this.gridH; y++) {
      const row = map[y]!;
      for (let x = 0; x < this.gridW; x++) {
        const ch = row[x] ?? " ";
        if (ch === "*") {
          this.spawnMoveable(CellKind.Boulder, x, y, FRAMES.BOULDER);
        } else if (ch === "+") {
          const d = this.spawnMoveable(CellKind.Diamond, x, y, FRAMES.DIAMOND);
          d.sprite!.play(ANIMS.DIAMOND);
        } else if (ch === ".") {
          this.spawnStatic(CellKind.Dirt, x, y, FRAMES.DIRT);
        } else if (ch === "-") {
          this.spawnStatic(CellKind.Wall, x, y, FRAMES.BRICKS);
        } else if (ch === "=") {
          this.spawnStatic(CellKind.Titan, x, y, FRAMES.TITAN);
        } else if (ch === "P") {
          this.spawnMagicWall(x, y);
        } else if (ch === "A") {
          this.spawnAmoeba(x, y);
        } else if (ch === "O") {
          const f = this.spawnEnemy(CellKind.Firefly, x, y, FRAMES.FIREFLY);
          f.sprite!.play(ANIMS.FIREFLY);
        } else if (ch === "X") {
          const b = this.spawnEnemy(CellKind.Butterfly, x, y, FRAMES.BUTTERFLY);
          b.sprite!.play(ANIMS.BUTTERFLY);
        } else if (ch === "S") {
          spawnPos = V(x, y);
          this.setCell(x, y, this.player);
        } else if (ch === "E") {
          this.setCell(x, y, this.exit);
        }
      }
    }

    // Spawn sprite (not in grid, just visual gate)
    this.spawnSprite = this.add
      .sprite(spawnPos.x * TILE, spawnPos.y * TILE, "bd", FRAMES.SPAWN)
      .setOrigin(0, 0)
      .setDepth(30);

    let blinkCount = 0;
    this.spawnSprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (_anim: Phaser.Animations.Animation) => {
      const key = this.spawnSprite.anims.getName();
      if (key === ANIMS.SPAWN) {
        blinkCount++;
        if (blinkCount >= 5) {
          this.spawnSprite.play(ANIMS.BORN);
        } else {
          this.spawnSprite.play(ANIMS.SPAWN);
        }
      } else if (key === ANIMS.BORN) {
        this.spawnSprite.destroy();
        this.player.hidden = false;
        this.player.sprite!.setVisible(true);
        this.player.sprite!.play(ANIMS.IDLE1);
        this.gameState = GameState.PLAYING;
      }
    });

    this.spawnSprite.play(ANIMS.SPAWN);

    // Init camera wanted pos
    this.calcWantedCamPos();
    this.cameras.main.scrollX = this.camWantedPx.x - this.cameras.main.width / 2;
    this.cameras.main.scrollY = this.camWantedPx.y - this.cameras.main.height / 2;
  }

  private spawnStatic(kind: CellKind.Dirt | CellKind.Wall | CellKind.Titan, x: number, y: number, frame: number) {
    const ent: CellEntity = {
      kind,
      pos: V(x, y),
      sprite: this.add.sprite(x * TILE, y * TILE, "bd", frame).setOrigin(0, 0).setDepth(5),
    };
    this.setCell(x, y, ent);
    return ent;
  }

  private spawnMagicWall(x: number, y: number) {
    // Magic wall: animovaný sprite (4 framy z řádku 6 listu).
    const ent: MagicWallEntity = {
      kind: CellKind.MagicWall,
      pos: V(x, y),
      sprite: this.add.sprite(x * TILE, y * TILE, "bd", FRAMES.MAGICWALL).setOrigin(0, 0).setDepth(5),
      activeUntilTick: 0,
    };
    this.setCell(x, y, ent);
    ent.sprite!.play(ANIMS.MAGICWALL);
    return ent;
  }

  private spawnAmoeba(x: number, y: number) {
    // Amoeba: animovaný sprite (framy z řádků 7–8 listu).
    const ent: CellEntity = {
      kind: CellKind.Amoeba,
      pos: V(x, y),
      sprite: this.add.sprite(x * TILE, y * TILE, "bd", FRAMES.AMOEBA).setOrigin(0, 0).setDepth(15),
    };
    this.setCell(x, y, ent);
    ent.sprite!.play(ANIMS.AMOEBA);
    return ent;
  }

  private spawnMoveable(kind: CellKind.Boulder | CellKind.Diamond, x: number, y: number, frame: number) {
    const ent: MoveableEntity = {
      kind,
      pos: V(x, y),
      sprite: this.add.sprite(x * TILE, y * TILE, "bd", frame).setOrigin(0, 0).setDepth(15),
      isFalling: false,
      direction: DIR.ZERO,
      fallScenario: null,
      moveProcessed: false,
    };
    this.setCell(x, y, ent);
    return ent;
  }

  private spawnEnemy(kind: CellKind.Firefly | CellKind.Butterfly, x: number, y: number, frame: number) {
    const ent: EnemyEntity = {
      kind,
      pos: V(x, y),
      sprite: this.add.sprite(x * TILE, y * TILE, "bd", frame).setOrigin(0, 0).setDepth(15),
      direction: DIR.ZERO,
      moveProcessed: false,
      mustWait: false,
    };
    this.setCell(x, y, ent);
    return ent;
  }

  private step() {
    this.tickCount++;
    this.resetMovingFlags();
    this.rockfordVacated.clear();
    this.moveRockford();
    this.markBouldersToMove();
    this.markFirefliesToMove();
    this.markButterfliesToMove();
    this.moveBoulders();
    this.moveFireflies();
    this.moveButterflies();

    this.processAmoeba();

    if (this.gameState === GameState.PLAYING) {
      this.processRockfordCollisionsWithEnemies();
      this.processEnemyCollisionsWithAmoeba();
    }

    this.markBouldersToMove();
    this.markFirefliesToMove();
    this.markButterfliesToMove();
  }

  private resetMovingFlags() {
    for (let y = 0; y < this.gridH; y++) {
      for (let x = 0; x < this.gridW; x++) {
        this.inMove[y]![x] = null;
        const obj = this.grid[y]![x];
        if (!obj) continue;
        if (isMoveable(obj) || isEnemy(obj)) {
          obj.moveProcessed = false;
          if (isEnemy(obj)) obj.killedByExplosion = undefined;
        }
      }
    }
  }

  private isBlockedForRockford(obj: CellEntity | null) {
    if (!obj) return false;
    if (obj.kind === CellKind.Dirt) return false;
    if (obj.kind === CellKind.Diamond) return false;
    if (obj.kind === CellKind.Exit) return !this.exitOpened;
    return true;
  }

  private moveRockford() {
    if (this.gameState !== GameState.PLAYING || this.player.hidden || this.player.isDead) return;

    let dir = DIR.ZERO;
    if (this.cursors.left?.isDown) dir = DIR.LEFT;
    else if (this.cursors.right?.isDown) dir = DIR.RIGHT;
    else if (this.cursors.up?.isDown) dir = DIR.UP;
    else if (this.cursors.down?.isDown) dir = DIR.DOWN;

    this.player.direction = dir;
    if (eqV(dir, DIR.ZERO)) {
      // idle - use rotation of 3 different idle animations
      this.updateIdleAnimation();
      return;
    }

    const target = addV(this.player.pos, dir);
    if (!this.inBounds(target)) return;
    const obj = this.getCell(target);

    // Push boulder left/right (Kaboom parity: sometimes needs a few attempts, and boulder can drop down)
    if (obj && obj.kind === CellKind.Boulder && (eqV(dir, DIR.LEFT) || eqV(dir, DIR.RIGHT))) {
      const b = obj as MoveableEntity;
      const beyond = addV(target, dir);
      if (!this.inBounds(beyond) || this.getCell(beyond) !== null) {
        // still animate "trying to push" even if it cannot move
        this.playRockfordAnimByDir(dir);
        return;
      }

      // also animate while attempting to push (even if RNG gates the actual move)
      this.playRockfordAnimByDir(dir);
      if (!this.canPush()) {
        return;
      }
const belowBoulder = addV(target, DIR.DOWN);
      const newFallingState = this.inBounds(belowBoulder) && this.getCell(belowBoulder) === null;

      // clear boulder old cell first
      this.setCell(target.x, target.y, null);

      if (newFallingState) {
        // drop straight down instead of pushing sideways
        this.setCell(belowBoulder.x, belowBoulder.y, b);
        b.isFalling = true;
        b.direction = DIR.DOWN;
        b.fallScenario = null;
      } else {
        // push sideways
        this.setCell(beyond.x, beyond.y, b);
        b.isFalling = false;
        b.direction = DIR.ZERO;
        b.fallScenario = null;
      }
      b.moveProcessed = true;

      // move rockford into the boulder cell
      this.rockfordVacated.add(this.posKey(this.player.pos.x, this.player.pos.y));
    this.setCell(this.player.pos.x, this.player.pos.y, null);
      this.setCell(target.x, target.y, this.player);
      this.playRockfordAnimByDir(dir);
      return;
    }

    if (this.isBlockedForRockford(obj)) {
      this.updateIdleAnimation();
      return;
    }

    // Collect dirt/diamond
    if (obj && obj.kind === CellKind.Dirt) {
      obj.sprite?.destroy();
    }
    if (obj && obj.kind === CellKind.Diamond) {
      obj.sprite?.destroy();
      this.diamondsCollected++;
      // Score depends on whether exit is open
      const diamondValue = this.exitOpened ? this.cave.diamondBonusValue : this.cave.diamondValue;
      this.score += diamondValue;
      this.updateUI();
      if (!this.exitOpened && this.diamondsCollected >= this.diamondsNeeded) {
        this.exitOpened = true;
        this.exit.sprite?.play(ANIMS.EXIT_OPEN);
      }
    }

    // Vstup do exitu vyhodnotíme až PO přesunu – jinak by se zavolalo onVictory()
    // a return ještě před posunem spritu a Rockford by zůstal stát před exitem.
    const enteringExit = !!obj && obj.kind === CellKind.Exit && this.exitOpened;

    // move
    if (obj && obj !== this.exit) {
      this.setCell(target.x, target.y, null);
    }
    // record vacated cell so falling objects don’t start falling until next tick
    this.rockfordVacated.add(this.posKey(this.player.pos.x, this.player.pos.y));
    this.setCell(this.player.pos.x, this.player.pos.y, null);
    this.setCell(target.x, target.y, this.player);
    this.playRockfordAnimByDir(dir);

    // Teď, když Rockford vizuálně vstoupil na exit, ukončíme level vítězstvím.
    if (enteringExit) {
      this.onVictory();
    }
  }

  private playRockfordAnimByDir(dir: Vec2) {
    // Reset časovače idle animace při pohybu (herní čas, ne reálný).
    this.idleStartTime = this.gameTime;
    this.idleAnimIndex = 0;
    
    if (eqV(dir, DIR.LEFT)) {
      this.player.lastSideAnim = ANIMS.RUN_L;
      this.player.sprite!.play(ANIMS.RUN_L, true);
    } else if (eqV(dir, DIR.RIGHT)) {
      this.player.lastSideAnim = ANIMS.RUN_R;
      this.player.sprite!.play(ANIMS.RUN_R, true);
    } else if (eqV(dir, DIR.UP) || eqV(dir, DIR.DOWN)) {
      this.player.sprite!.play(this.player.lastSideAnim, true);
    }
  }

  private updateIdleAnimation() {
    // Herní čas místo Date.now() → během pauzy se idle animace neposouvá.
    const currentTime = this.gameTime;

    // Inicializace časovače při prvním idle
    if (this.idleStartTime === 0) {
      this.idleStartTime = currentTime;
      this.idleAnimIndex = 0;
    }
    
    // Rotace tří idle animací – přepnutí každých IDLE_ANIM_DURATION sekund.
    const idleAnims = [ANIMS.IDLE1, ANIMS.IDLE2, ANIMS.IDLE3];
    const elapsed = currentTime - this.idleStartTime;
    this.idleAnimIndex = Math.floor(elapsed / this.IDLE_ANIM_DURATION) % idleAnims.length;
    const anim = idleAnims[this.idleAnimIndex]!; // index je vždy v rozsahu (modulo délky pole)

    // Přehrát jen při skutečné změně, jinak by Phaser pořád restartoval první frame.
    if (this.player.sprite!.anims.getName() !== anim) {
      this.player.sprite!.play(anim, true);
    }
  }

  private canPush() {
    // Krátký "odpor" před tlačením (parita s Kaboom verzí).
    // Deterministický PRNG místo Phaser.Math.Between → reprodukovatelné chování věrné
    // originálu, kde pravděpodobnost tlačení vychází ze stejného generátoru.
    if (this.rng.nextInt(6) > 1 || this.player.pushAttempts < 2) {
      this.player.pushAttempts++;
      return false;
    }
    this.player.pushAttempts = 0;
    return true;
  }

  private isRounded(kind: CellKind) {
    return kind === CellKind.Boulder || kind === CellKind.Diamond;
  }

  private markBouldersToMove() {
    for (let y = this.gridH - 1; y >= 0; y--) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (!obj || !isMoveable(obj)) continue;

        const m = obj;

        // only boulders/diamonds have gravity in your JS
        const below = this.grid[m.pos.y + 1]?.[m.pos.x] ?? null;

        // Delay falling into a cell Rockford just vacated this tick (matches original BD feel: 1-tick gap when running away)
        if (below === null && !m.isFalling && this.rockfordVacated.has(this.posKey(m.pos.x, m.pos.y + 1))) {
          continue;
        }

        // Magic wall behaves like "pass-through" for falling objects
        const belowIsMagicWall = !!below && below.kind === CellKind.MagicWall;

        // fall straight
        if (below === null || belowIsMagicWall || ((isPlayer(below) || isEnemy(below)) && m.isFalling)) {
          if (!this.inMove[m.pos.y + 1]?.[m.pos.x]) {
            m.isFalling = true;
            m.direction = DIR.DOWN;
            m.fallScenario = "straight";
            this.inMove[m.pos.y + 1]![m.pos.x] = m;
          }
          continue;
        }

        // try roll if below is rounded
        if (below && this.isRounded(below.kind)) {
          // roll left
          const left = this.grid[m.pos.y]?.[m.pos.x - 1] ?? null;
          const belowLeft = this.grid[m.pos.y + 1]?.[m.pos.x - 1] ?? null;
          if (left === null && belowLeft === null && m.fallScenario === null && !this.inMove[m.pos.y]?.[m.pos.x - 1]) {
            m.isFalling = true;
            m.direction = DIR.LEFT;
            m.fallScenario = "rollLeft";
            this.inMove[m.pos.y]![m.pos.x - 1] = m;
            continue;
          }

          // roll right
          const right = this.grid[m.pos.y]?.[m.pos.x + 1] ?? null;
          const belowRight = this.grid[m.pos.y + 1]?.[m.pos.x + 1] ?? null;
          if (right === null && belowRight === null && m.fallScenario === null && !this.inMove[m.pos.y]?.[m.pos.x + 1]) {
            m.isFalling = true;
            m.direction = DIR.RIGHT;
            m.fallScenario = "rollRight";
            this.inMove[m.pos.y]![m.pos.x + 1] = m;
            continue;
          }
        }

        // stop
        m.isFalling = false;
        m.direction = DIR.ZERO;
        m.fallScenario = null;
      }
    }
  }

  private moveBoulders() {
    for (let y = this.gridH - 1; y >= 0; y--) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (!obj || !isMoveable(obj)) continue;
        const m = obj;
        if (m.moveProcessed) continue;
        if (eqV(m.direction, DIR.ZERO)) continue;

        const newPos = addV(m.pos, m.direction);
        if (!this.inBounds(newPos)) continue;

        // reserved?
        if (this.inMove[newPos.y]![newPos.x] !== m) continue;

        const crossing = this.getCell(newPos);

        // Magic wall: falling object passes through and is converted.
        if (
          crossing &&
          crossing.kind === CellKind.MagicWall &&
          eqV(m.direction, DIR.DOWN) &&
          m.isFalling
        ) {
          this.handleMagicWallDrop(m, crossing as MagicWallEntity);
          m.moveProcessed = true;
          continue;
        }

        // move (matches Kaboom original: move first, then resolve impact)
        this.setCell(m.pos.x, m.pos.y, null);
        this.setCell(newPos.x, newPos.y, m);
        m.moveProcessed = true;

        // `m` is the falling object that just moved into `crossing`'s cell,
        // so pass it directly instead of scanning the whole grid for it.
        this.fallingObjectImpactedOn(crossing, m);
      }
    }
  }

  private fallingObjectImpactedOn(obj: CellEntity | null, fallingObj: MoveableEntity) {
    if (!obj) return;

    if (obj.kind === CellKind.Player) {
      if (fallingObj.kind === CellKind.Boulder) {
        this.deathReason = "Crushed by falling boulder";
      } else if (fallingObj.kind === CellKind.Diamond) {
        this.deathReason = "Crushed by falling diamond";
      } else {
        this.deathReason = "Crushed by falling object";
      }
      this.boomRockford();
      return;
    }

    if (obj.kind === CellKind.Firefly) {
      this.boomObject(obj);
      return;
    }

    if (obj.kind === CellKind.Butterfly) {
      const isChainExplosion = (obj as EnemyEntity).killedByExplosion === true;
      this.boomButterfly(obj as EnemyEntity, isChainExplosion);
      return;
    }
  }

  private handleMagicWallDrop(m: MoveableEntity, wall: MagicWallEntity) {
    // Activate wall on first use
    if (wall.activeUntilTick === 0 || wall.activeUntilTick <= this.tickCount) {
      wall.activeUntilTick = this.tickCount + MAGIC_WALL_ACTIVE_TICKS;
    }

    const below = addV(wall.pos, DIR.DOWN);
    // Remove original from current spot
    this.setCell(m.pos.x, m.pos.y, null);

    // If wall already expired, object just rests on top (no conversion)
    if (wall.activeUntilTick <= this.tickCount) {
      // fall back: do nothing
      this.setCell(m.pos.x, m.pos.y, m);
      return;
    }

    if (!this.inBounds(below)) return;
    if (this.getCell(below) !== null) {
      // disappears if blocked below
      m.sprite?.destroy();
      return;
    }

    // Convert boulder<->diamond
    const newKind = m.kind === CellKind.Boulder ? CellKind.Diamond : CellKind.Boulder;
    m.kind = newKind;
    if (newKind === CellKind.Diamond) {
      m.sprite?.setFrame(FRAMES.DIAMOND);
      m.sprite?.play(ANIMS.DIAMOND);
    } else {
      m.sprite?.stop();
      m.sprite?.setFrame(FRAMES.BOULDER);
    }

    m.isFalling = true;
    m.direction = DIR.DOWN;
    m.fallScenario = null;

    this.setCell(below.x, below.y, m);
  }

  private initFireflies() {
    for (let y = this.gridH - 1; y >= 0; y--) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (!obj || obj.kind !== CellKind.Firefly) continue;
        const f = obj as EnemyEntity;
        f.direction = this.getFirstAvailableEnemyDirection(f, FIREFLY_INIT_DIRS);
      }
    }
  }

  private initButterflies() {
    for (let y = this.gridH - 1; y >= 0; y--) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (!obj || obj.kind !== CellKind.Butterfly) continue;
        const b = obj as EnemyEntity;
        b.direction = this.getFirstAvailableEnemyDirection(b, BUTTERFLY_INIT_DIRS);
      }
    }
  }

  private getFirstAvailableEnemyDirection(enemy: EnemyEntity, order: Vec2[]): Vec2 {
    for (const d of order) {
      const next = addV(enemy.pos, d);
      if (!this.inBounds(next)) continue;
      if (this.getCell(next) === null) return d;
    }
    return DIR.ZERO;
  }

  private markFirefliesToMove() {
    for (let y = this.gridH - 1; y >= 0; y--) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (!obj || obj.kind !== CellKind.Firefly) continue;
        const f = obj as EnemyEntity;
        f.mustWait = false;

        if (eqV(f.direction, DIR.ZERO)) {
          f.direction = this.getFirstAvailableEnemyDirection(f, FIREFLY_INIT_DIRS);
          if (eqV(f.direction, DIR.ZERO)) continue;
        }

        // follow left side (clockwise)
        const dirStr = DIR_TO_STR(f.direction);
        let nextDir = NEXT_LEFT[dirStr];
        let nextObj = this.getCell(addV(f.pos, nextDir));
        if (nextObj === null || nextObj.kind === CellKind.Firefly) {
          f.direction = nextDir;
          continue;
        }

        nextDir = STR_TO_DIR[dirStr];
        nextObj = this.getCell(addV(f.pos, nextDir));
        if (nextObj === null || nextObj.kind === CellKind.Firefly) {
          f.direction = nextDir;
          continue;
        }

        f.direction = NEXT_RIGHT[dirStr];
        f.mustWait = true;
      }
    }
  }

  private markButterfliesToMove() {
    for (let y = this.gridH - 1; y >= 0; y--) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (!obj || obj.kind !== CellKind.Butterfly) continue;
        const b = obj as EnemyEntity;
        b.mustWait = false;

        if (eqV(b.direction, DIR.ZERO)) {
          b.direction = this.getFirstAvailableEnemyDirection(b, BUTTERFLY_INIT_DIRS);
          if (eqV(b.direction, DIR.ZERO)) continue;
        }

        // follow right side (counterclockwise)
        const dirStr = DIR_TO_STR(b.direction);
        let nextDir = NEXT_RIGHT[dirStr];
        let nextObj = this.getCell(addV(b.pos, nextDir));
        if (nextObj === null || nextObj.kind === CellKind.Butterfly) {
          b.direction = nextDir;
          continue;
        }

        nextDir = STR_TO_DIR[dirStr];
        nextObj = this.getCell(addV(b.pos, nextDir));
        if (nextObj === null || nextObj.kind === CellKind.Butterfly) {
          b.direction = nextDir;
          continue;
        }

        b.direction = NEXT_LEFT[dirStr];
        b.mustWait = true;
      }
    }
  }

  private moveFireflies() {
    for (let y = this.gridH - 1; y >= 0; y--) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (!obj || obj.kind !== CellKind.Firefly) continue;
        const f = obj as EnemyEntity;
        if (f.moveProcessed || f.mustWait || eqV(f.direction, DIR.ZERO)) continue;

        const newPos = addV(f.pos, f.direction);
        if (!this.inBounds(newPos)) continue;

        if (this.inMove[newPos.y]![newPos.x] !== null) {
          // reserved by falling object -> skip
          continue;
        }

        const crossing = this.getCell(newPos);
        if (crossing && crossing.kind === CellKind.Firefly && (crossing as EnemyEntity).moveProcessed) continue;

        // move
        this.setCell(f.pos.x, f.pos.y, null);
        this.setCell(newPos.x, newPos.y, f);
        f.moveProcessed = true;

        // swap/cross handling (mirrors your JS)
        if (crossing && isEnemy(crossing)) {
          // push the crossed enemy in its direction if possible
          const e = crossing;
          const eNew = addV(e.pos, e.direction);
          if (this.inBounds(eNew) && this.getCell(eNew) === null) {
            this.setCell(e.pos.x, e.pos.y, null);
            this.setCell(eNew.x, eNew.y, e);
            e.moveProcessed = true;
          }
        }
      }
    }
  }

  private moveButterflies() {
    for (let y = this.gridH - 1; y >= 0; y--) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (!obj || obj.kind !== CellKind.Butterfly) continue;
        const b = obj as EnemyEntity;
        if (b.moveProcessed || b.mustWait || eqV(b.direction, DIR.ZERO)) continue;

        const newPos = addV(b.pos, b.direction);
        if (!this.inBounds(newPos)) continue;

        if (this.inMove[newPos.y]![newPos.x] !== null) {
          continue;
        }

        const crossing = this.getCell(newPos);
        if (crossing && crossing.kind === CellKind.Butterfly && (crossing as EnemyEntity).moveProcessed) continue;

        this.setCell(b.pos.x, b.pos.y, null);
        this.setCell(newPos.x, newPos.y, b);
        b.moveProcessed = true;

        if (crossing && isEnemy(crossing)) {
          const e = crossing;
          const eNew = addV(e.pos, e.direction);
          if (this.inBounds(eNew) && this.getCell(eNew) === null) {
            this.setCell(e.pos.x, e.pos.y, null);
            this.setCell(eNew.x, eNew.y, e);
            e.moveProcessed = true;
          }
        }
      }
    }
  }

  private processRockfordCollisionsWithEnemies() {
    // check 4-neighborhood
    for (const d of FIREFLY_INIT_DIRS) {
      const p = addV(this.player.pos, d);
      const obj = this.getCell(p);
      if (obj && isEnemy(obj)) {
        if (obj.kind === CellKind.Firefly) {
          this.deathReason = "Killed by firefly";
        } else if (obj.kind === CellKind.Butterfly) {
          this.deathReason = "Killed by butterfly";
        } else {
          this.deathReason = "Killed by enemy";
        }
        this.boomRockford();
        return;
      }
    }
  }

  private processAmoeba() {
    // Autentické chování amoeby – port z disassembly (ProcessAmoeba @ $6fd0):
    // - každá buňka má za tick šanci (rand & mask)<4 vyrůst JEDNÍM náhodným směrem
    //   do prázdna/hlíny; maska řídí rychlost (zpočátku ~3 %, později ~25 %),
    // - >= 200 buněk (minulý tick) → celá amoeba se změní na balvany,
    // - když minulý tick nemohla nikam růst → celá se změní na diamanty.
    // Rozhodnutí přeměny stojí na hodnotách z PŘEDCHOZÍHO ticku (1-tick lag),
    // proto je pro všechny buňky stejné.

    // Snapshot buněk amoeby – nově vyrostlé tento tick se už nezpracují ani nepočítají.
    const amoebas: Vec2[] = [];
    for (let y = 0; y < this.gridH; y++) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (obj && obj.kind === CellKind.Amoeba) amoebas.push(V(x, y));
      }
    }
    if (amoebas.length === 0) return;

    const count = amoebas.length; // AmoebaCellCountThisTick

    // Přerůstání: minulý tick >= 200 buněk → vše na balvany.
    if (this.amoebaCountPrev >= AMOEBA_MAX_SIZE) {
      for (const p of amoebas) this.convertAmoeba(p, CellKind.Boulder);
      this.amoebaCountPrev = count;
      return;
    }

    // Udušení: minulý tick nemohla nikam růst → vše na diamanty.
    if (!this.amoebaCouldGrowLastTick) {
      for (const p of amoebas) this.convertAmoeba(p, CellKind.Diamond);
      this.amoebaCountPrev = count;
      return;
    }

    // Po uplynutí času se růst zrychlí (maska SLOW → FAST), jako v originále.
    if (
      this.amoebaGrowthMask === AMOEBA_MASK_SLOW &&
      this.gameTime >= AMOEBA_SLOW_GROWTH_SECONDS
    ) {
      this.amoebaGrowthMask = AMOEBA_MASK_FAST;
    }

    // Má amoeba vůbec kam růst? (couldGrowThisTick)
    let couldGrow = false;
    for (const p of amoebas) {
      if (this.amoebaHasGrowableNeighbor(p)) {
        couldGrow = true;
        break;
      }
    }

    // Pravděpodobnostní růst: každá buňka zkusí jeden náhodný směr.
    for (const p of amoebas) {
      const r = this.rng.nextByte();
      const masked = r & this.amoebaGrowthMask;
      if (masked < 4) {
        const t = addV(p, AMOEBA_DIRS[masked]!); // index 0–3 → nahoru/vlevo/vpravo/dolů
        if (this.inBounds(t)) {
          const target = this.getCell(t);
          if (target === null || target.kind === CellKind.Dirt) {
            target?.sprite?.destroy();
            this.spawnAmoeba(t.x, t.y);
          }
        }
      }
    }

    // Aktualizace stavu pro příští tick (zrcadlí PreTickAmoebaProcessing).
    // couldGrowLastTick se "zapéká" na false, jakmile rostoucí amoeba ztratí prostor.
    if (!couldGrow && this.amoebaIsGrowing) {
      this.amoebaCouldGrowLastTick = false;
    }
    this.amoebaIsGrowing = couldGrow;
    this.amoebaCountPrev = count;
  }

  /** Má buňka amoeby aspoň jeden sousední růst (prázdno/hlína)? */
  private amoebaHasGrowableNeighbor(p: Vec2): boolean {
    for (const d of AMOEBA_DIRS) {
      const t = addV(p, d);
      if (!this.inBounds(t)) continue;
      const c = this.getCell(t);
      if (c === null || c.kind === CellKind.Dirt) return true;
    }
    return false;
  }

  /** Přemění buňku amoeby na balvan nebo diamant. */
  private convertAmoeba(p: Vec2, into: CellKind.Boulder | CellKind.Diamond) {
    const a = this.getCell(p);
    if (!a || a.kind !== CellKind.Amoeba) return;
    a.sprite?.destroy();
    const frame = into === CellKind.Diamond ? FRAMES.DIAMOND : FRAMES.BOULDER;
    const m = this.spawnMoveable(into, p.x, p.y, frame);
    if (into === CellKind.Diamond) m.sprite!.play(ANIMS.DIAMOND);
  }

  private processEnemyCollisionsWithAmoeba() {
    // Amoeba zabíjí firefly/butterfly při dotyku – kontrola 4-okolí každého nepřítele.
    // (Amoeba je v jeskyních 8 a 16 i v ladící scéně TEST: Amoeba.)
    for (let y = 0; y < this.gridH; y++) {
      for (let x = 0; x < this.gridW; x++) {
        const obj = this.grid[y]![x];
        if (!obj || !isEnemy(obj)) continue;

        const enemy = obj;
        for (const d of FIREFLY_INIT_DIRS) {
          const p = addV(enemy.pos, d);
          const near = this.getCell(p);
          if (near && near.kind === CellKind.Amoeba) {
            if (enemy.kind === CellKind.Firefly) this.boomObject(enemy);
            else this.boomButterfly(enemy, false);
            break;
          }
        }
      }
    }
  }

  private boomObject(obj: CellEntity | null) {
    if (!obj) return;
    if (obj.kind === CellKind.Player) {
      this.boomRockford();
      return;
    }
    this.boom(obj.pos, "standard");
    obj.sprite?.destroy();
    this.setCell(obj.pos.x, obj.pos.y, null);
  }

  private boomButterfly(butterfly: EnemyEntity | null, isChainExplosion: boolean) {
    if (!butterfly) return;
    const pos = butterfly.pos;
    butterfly.sprite?.destroy();
    this.setCell(pos.x, pos.y, null);
    this.boom(pos, isChainExplosion ? "standard" : "butterfly");
  }

  private boomRockford() {
    this.gameState = GameState.DEAD;
    this.player.isDead = true;
    const pos = this.player.pos;
    this.player.sprite?.destroy();
    this.setCell(pos.x, pos.y, null);
    
    // Set default reason if not already set
    if (!this.deathReason) {
      this.deathReason = "Killed by explosion";
    }
    
    this.boom(pos, "standard");
    // Show death dialog
    this.showDeathDialog();
  }

  private boom(center: Vec2, explosionType: "standard" | "butterfly") {
    for (let x = center.x - 1; x <= center.x + 1; x++) {
      for (let y = center.y - 1; y <= center.y + 1; y++) {
        const p = V(x, y);
        if (!this.inBounds(p)) continue;

        const obj = this.getCell(p);
        if (obj) {
          if (obj.kind === CellKind.Titan || obj.kind === CellKind.Exit) {
            continue;
          }
          if (isEnemy(obj)) {
            obj.killedByExplosion = true;
          }
          obj.sprite?.destroy();
          this.setCell(x, y, null);
        }

        if (explosionType === "butterfly") {
          const d = this.spawnMoveable(CellKind.Diamond, x, y, FRAMES.DIAMOND);
          d.sprite!.play(ANIMS.DIAMOND);
        } else {
          const s = this.add
            .sprite(x * TILE, y * TILE, "bd", FRAMES.EXPLOSION)
            .setOrigin(0, 0)
            .setDepth(25);
          const exp: CellEntity = { kind: CellKind.Explosion, pos: V(x, y), sprite: s };
          this.setCell(x, y, exp);
          s.play(ANIMS.EXPLOSION);
          s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            const c = this.getCell(V(x, y));
            if (c && c.kind === CellKind.Explosion) {
              this.setCell(x, y, null);
            }
            s.destroy();
          });
        }
      }
    }
  }

  private updateUI() {
    // Diamanty: po splnění zezelená text i ikona.
    const met = this.diamondsCollected >= this.diamondsNeeded;
    this.diamondsText.setText(`${this.diamondsCollected}/${this.diamondsNeeded}`);
    this.diamondsText.setTint(met ? HUD.ok : HUD.white);
    this.diamondIcon.setTint(met ? HUD.ok : HUD.white);

    // Skóre: 6 míst zarovnaných (origin vpravo → neskáče).
    this.scoreText.setText(this.score.toString().padStart(6, "0"));

    // Čas + barva podle zbývajícího času.
    this.timerText.setText(`${Math.max(0, Math.floor(this.timeRemaining))}`);
    if (this.timeRemaining <= 30) this.timerText.setTint(HUD.danger);
    else if (this.timeRemaining <= 60) this.timerText.setTint(HUD.warn);
    else this.timerText.setTint(HUD.ok);
  }

  // Camera
  private calcWantedCamPos() {
    this.camWantedPx = V((this.camOffset.x + VISIBLE_W / 2) * TILE, (this.camOffset.y + VISIBLE_H / 2) * TILE);
  }

  private snapCameraToPlayer() {
    this.camOffset = V(
      Phaser.Math.Clamp(this.player.pos.x - Math.floor(VISIBLE_W / 2), 0, BOARD_WIDTH - VISIBLE_W),
      Phaser.Math.Clamp(this.player.pos.y - Math.floor(VISIBLE_H / 2), 0, BOARD_HEIGHT - VISIBLE_H),
    );
    this.calcWantedCamPos();
    this.cameras.main.centerOn(this.camWantedPx.x, this.camWantedPx.y);
  }

  private updateCamera(_delta: number) {
    // same logic as Kaboom version: move offset when near edges of view
    const old = { ...this.camOffset };

    if (this.player.pos.x - this.camOffset.x < 5 && this.camOffset.x > 0) this.camOffset.x -= 1;
    if (this.player.pos.x - this.camOffset.x > VISIBLE_W - 5 && this.camOffset.x < BOARD_WIDTH - VISIBLE_W) this.camOffset.x += 1;
    if (this.player.pos.y - this.camOffset.y < 5 && this.camOffset.y > 0) this.camOffset.y -= 1;
    if (this.player.pos.y - this.camOffset.y > VISIBLE_H - 5 && this.camOffset.y < BOARD_HEIGHT - VISIBLE_H) this.camOffset.y += 1;

    if (old.x !== this.camOffset.x || old.y !== this.camOffset.y) {
      this.calcWantedCamPos();
    }
    this.cameras.main.centerOn(this.camWantedPx.x, this.camWantedPx.y);
  }

  // ============================================================================
  // New methods for refactored game flow
  // ============================================================================

  private setupKeyListeners(): void {
    this.pKey.on("down", () => this.handlePauseKey());
    this.rKey.on("down", () => this.handleRestartKey());
    this.escKey.on("down", () => this.handleEscKey());
  }

  private updateTimer(delta: number): void {
    this.timeRemaining -= delta;
    this.updateUI();

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.onTimeUp();
    }
  }

  private onTimeUp(): void {
    this.gameState = GameState.DEAD;
    this.player.isDead = true;
    this.deathReason = "Time's up";
    this.showDeathDialog();
  }

  private handlePauseKey(): void {
    if (
      this.gameState !== GameState.PLAYING &&
      this.gameState !== GameState.PAUSED
    ) {
      return;
    }

    if (this.gameState === GameState.PAUSED) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  private handleRestartKey(): void {
    if (
      this.gameState !== GameState.PLAYING &&
      this.gameState !== GameState.PAUSED
    ) {
      return;
    }

    this.showRestartConfirm();
  }

  private handleEscKey(): void {
    if (
      this.gameState !== GameState.PLAYING &&
      this.gameState !== GameState.PAUSED
    ) {
      return;
    }

    this.showQuitConfirm();
  }

  private pauseGame(): void {
    this.gameState = GameState.PAUSED;
    this.createPauseOverlay();
  }

  private resumeGame(): void {
    this.gameState = GameState.PLAYING;
    this.destroyPauseOverlay();
  }

  private createPauseOverlay(): void {
    const width = 300;
    const height = 200;
    const x = this.cameras.main.width / 2 - width / 2;
    const y = this.cameras.main.height / 2 - height / 2;

    this.pauseOverlay = this.add.container(x, y).setDepth(9999);
    this.pauseOverlay.setScrollFactor(0);

    const bg = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.9)
      .setOrigin(0, 0);
    const border = this.add
      .rectangle(0, 0, width, height, 0xffffff, 0)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0, 0);

    this.pauseOverlay.add(bg);
    this.pauseOverlay.add(border);

    let currentY = 20;

    const title = this.add
      .text(width / 2, currentY, "⏸ PAUSED ⏸", {
        fontFamily: "Atari",
        fontSize: "20px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    this.pauseOverlay.add(title);
    currentY += 40;

    const resume = this.add
      .text(width / 2, currentY, "Press P to resume", {
        fontFamily: "Atari",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);
    this.pauseOverlay.add(resume);
    currentY += 30;

    const timeText = this.add
      .text(width / 2, currentY, `Time: ${Math.floor(this.timeRemaining)}s / ${this.timeLimit}s`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    this.pauseOverlay.add(timeText);
    currentY += 20;

    const diamondText = this.add
      .text(width / 2, currentY, `Diamonds: ${this.diamondsCollected}/${this.diamondsNeeded}`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    this.pauseOverlay.add(diamondText);
    currentY += 20;

    const scoreText = this.add
      .text(width / 2, currentY, `Score: ${this.score}`, {
        fontFamily: "Atari",
        fontSize: "12px",
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);
    this.pauseOverlay.add(scoreText);
    currentY += 35;

    const actions = this.add
      .text(width / 2, currentY, "R - Restart   ESC - Quit", {
        fontFamily: "Atari",
        fontSize: "11px",
        color: "#888888",
      })
      .setOrigin(0.5, 0);
    this.pauseOverlay.add(actions);
  }

  private destroyPauseOverlay(): void {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }

  private showRestartConfirm(): void {
    const wasPlaying = this.gameState === GameState.PLAYING;
    this.gameState = GameState.RESTART_CONFIRM;

    if (wasPlaying) {
      this.destroyPauseOverlay();
    }

    const timeSpent = Math.floor(this.gameTime);

    this.activeDialog = new ConfirmDialog(this, {
      title: "⚠️ RESTART LEVEL?",
      message: "You will lose all progress!",
      details: [
        `Time played: ${timeSpent}s`,
        `Diamonds: ${this.diamondsCollected}/${this.diamondsNeeded}`,
        `Score: ${this.score}`,
      ],
      confirmText: "Press Y to restart",
      cancelText: "Press N to continue",
      onYes: () => this.restartLevel(),
      onNo: () => {
        this.activeDialog = null;
        if (wasPlaying) {
          this.resumeGame();
        } else {
          this.pauseGame();
        }
      },
    });
  }

  private showQuitConfirm(): void {
    const wasPlaying = this.gameState === GameState.PLAYING;
    this.gameState = GameState.QUIT_CONFIRM;

    if (wasPlaying) {
      this.destroyPauseOverlay();
    }

    const timeSpent = Math.floor(this.gameTime);

    this.activeDialog = new ConfirmDialog(this, {
      title: "⚠️ QUIT LEVEL?",
      message: "You will lose all progress!",
      details: [
        `Time played: ${timeSpent}s`,
        `Diamonds: ${this.diamondsCollected}/${this.diamondsNeeded}`,
        `Score: ${this.score}`,
      ],
      confirmText: "Press Y to quit",
      cancelText: "Press N to continue",
      onYes: () => this.quitLevel(),
      onNo: () => {
        this.activeDialog = null;
        if (wasPlaying) {
          this.resumeGame();
        } else {
          this.pauseGame();
        }
      },
    });
  }

  private restartLevel(): void {
    this.scene.restart({ caveNumber: this.caveNumber });
  }

  private quitLevel(): void {
    const timeSpent = Math.floor(this.gameTime);

    sessionStats.addAttempt({
      caveNumber: this.caveNumber,
      result: "quit",
      timeSpent,
      diamondsCollected: this.diamondsCollected,
      diamondsNeeded: this.diamondsNeeded,
      score: this.score,
      finalScore: this.score,
      difficulty: this.currentDifficulty,
      timestamp: new Date(),
    });

    const data: GameOverData = {
      result: "quit",
      caveNumber: this.caveNumber,
      caveName: this.cave.name,
      timeSpent,
      timeRemaining: this.timeRemaining,
      timeLimit: this.timeLimit,
      diamondsCollected: this.diamondsCollected,
      diamondsNeeded: this.diamondsNeeded,
      score: this.score,
      finalScore: this.score,
      timeBonus: 0,
      deathReason: "Gave up",
    };

    this.scene.start("GameOverScene", data);
  }

  private showDeathDialog(): void {
    const timeSpent = Math.floor(this.gameTime);

    sessionStats.addAttempt({
      caveNumber: this.caveNumber,
      result: "death",
      timeSpent,
      diamondsCollected: this.diamondsCollected,
      diamondsNeeded: this.diamondsNeeded,
      score: this.score,
      finalScore: this.score,
      difficulty: this.currentDifficulty,
      timestamp: new Date(),
    });

    const data: GameOverData = {
      result: "death",
      caveNumber: this.caveNumber,
      caveName: this.cave.name,
      timeSpent,
      timeRemaining: this.timeRemaining,
      timeLimit: this.timeLimit,
      diamondsCollected: this.diamondsCollected,
      diamondsNeeded: this.diamondsNeeded,
      score: this.score,
      finalScore: this.score,
      timeBonus: 0,
      deathReason: this.deathReason,
    };

    this.time.delayedCall(600, () => {
      this.scene.start("GameOverScene", data);
    });
  }

  private onVictory(): void {
    this.gameState = GameState.VICTORY;

    const timeSpent = Math.floor(this.gameTime);
    const timeBonus = Math.max(0, Math.floor(this.timeRemaining * this.cave.timeBonus));
    const finalScore = this.score + timeBonus;

    sessionStats.addAttempt({
      caveNumber: this.caveNumber,
      result: "victory",
      timeSpent,
      diamondsCollected: this.diamondsCollected,
      diamondsNeeded: this.diamondsNeeded,
      score: this.score,
      finalScore,
      difficulty: this.currentDifficulty,
      timestamp: new Date(),
    });

    const data: GameOverData = {
      result: "victory",
      caveNumber: this.caveNumber,
      caveName: this.cave.name,
      timeSpent,
      timeRemaining: this.timeRemaining,
      timeLimit: this.timeLimit,
      diamondsCollected: this.diamondsCollected,
      diamondsNeeded: this.diamondsNeeded,
      score: this.score,
      finalScore,
      timeBonus,
    };

    this.time.delayedCall(600, () => {
      this.scene.start("GameOverScene", data);
    });
  }
}
