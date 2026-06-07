import Phaser from "phaser";

/**
 * Přebarvování spritů podle barevného schématu jeskyně.
 *
 * Princip (per-entity recolor):
 * - `resources/sprites_source.png` je ŠABLONA: 6-barevný indexovaný sheet, kde každá
 *   z barev je „slot". Bereme z ní jen TVARY (které pixely jsou který slot), barvy
 *   samotné nás nezajímají – přemapujeme je.
 * - Sloty: 0 = průhledná (vždy), 1 = base, 2 = shadow, 3 = hi, 4 = accent, 5 = ink.
 * - Schéma říká, jakou cílovou barvu má každý slot – GLOBÁLNĚ a volitelně PER ENTITA
 *   (např. diamantu jiný `base` než balvanu). Protože stejný zdrojový slot dostane
 *   u různých entit jinou barvu, výsledná textura už není 6-barevná, ale RGBA s
 *   libovolným počtem barev.
 * - Výsledek vykreslíme do jedné canvas textury "bd" (s 16×16 framy). Všechny sprity
 *   i animace dál používají klíč "bd"; při změně jeskyně jen překreslíme jeho obsah.
 */

// Mřížka listu: 10 sloupců × 13 řádků po 16×16 px (160×208).
const COLS = 10;
const ROWS = 13;
const FW = 16;
const FH = 16;
const W = COLS * FW;
const H = ROWS * FH;

export type SlotName = "base" | "shadow" | "hi" | "accent" | "ink";
/** Pořadí = zdrojový index v paletě (0 = průhledná, dál sloty). */
const SLOT_BY_INDEX: (SlotName | null)[] = [null, "base", "shadow", "hi", "accent", "ink"];

/** Známá 6-barevná paleta zdroje (RGB). Index 0 je v PNG průhledný. */
const SOURCE_PALETTE: [number, number, number][] = [
  [0, 0, 36], // 0 transparent
  [100, 100, 100], // 1 base
  [25, 29, 25], // 2 shadow
  [252, 249, 252], // 3 hi
  [163, 110, 48], // 4 accent
  [0, 0, 0], // 5 ink (zatím v grafice nevyužitý slot)
];

/**
 * Mapování entita → framy, které jí patří (16×16, frame = řádek*10 + sloupec).
 * Sdílené framy (titan = zavřený exit, born = exploze) přiřazujeme primárnímu
 * vlastníkovi – vizuálně to tak stejně sdílí barvy. Framy zde neuvedené berou
 * globální barvy schématu.
 */
const ENTITY_FRAMES: Record<string, number[]> = {
  rockford: range(0, 6).concat(range(10, 16), range(20, 26)),
  titan: [30],
  spawn: [31],
  wall: [32],
  dirt: [33],
  boulder: [35],
  diamond: range(40, 47),
  magicwall: range(50, 53),
  amoeba: range(60, 63),
  firefly: range(80, 83),
  butterfly: range(90, 93),
  explosion: range(100, 104),
};

export interface Scheme {
  id: string;
  /** Globální barvy slotů (chybějící slot → ponechá barvu zdroje). */
  global: Partial<Record<SlotName, [number, number, number]>>;
  /** Přepisy per entita: entity → slot → barva. */
  perEntity: Record<string, Partial<Record<SlotName, [number, number, number]>>>;
}

const SOURCE_KEY = "sprites_source";
const OUT_KEY = "bd";

// Stav (textury jsou globální, počítáme jen jednou).
let sourceSlots: Uint8Array | null = null; // pro každý pixel jeho slot (0–5)
let frameEntity: (string | null)[] | null = null; // frame → entita
const recolorCache = new Map<string, HTMLCanvasElement>(); // schéma.id → přebarvené plátno

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

/** Zařadit do scene.preload(): načte zdrojovou šablonu spritů. */
export function preloadSprites(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SOURCE_KEY)) {
    scene.load.image(SOURCE_KEY, `resources/${SOURCE_KEY}.png`);
  }
}

/**
 * Zajistí texturu "bd" a obarví ji daným schématem. Volat v create() PŘED
 * vytvořením animací a spritů.
 */
export function applyCaveScheme(scene: Phaser.Scene, scheme: Scheme): void {
  ensureSourceSlots(scene);
  ensureBdTexture(scene);
  const tex = scene.textures.get(OUT_KEY) as Phaser.Textures.CanvasTexture;
  const colored = recolor(scheme);
  tex.context.clearRect(0, 0, W, H);
  tex.context.drawImage(colored, 0, 0);
  tex.refresh(); // nahraje překreslený obsah na GPU – existující sprity se aktualizují
}

/** Spočítá pro každý pixel zdroje jeho slot (0–5). Jen jednou. */
function ensureSourceSlots(scene: Phaser.Scene): void {
  if (sourceSlots) return;
  const src = scene.textures.get(SOURCE_KEY).getSourceImage() as HTMLImageElement;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;
  sourceSlots = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    if (d[o + 3]! < 128) {
      sourceSlots[i] = 0; // průhledné
      continue;
    }
    sourceSlots[i] = nearestSlot(d[o]!, d[o + 1]!, d[o + 2]!);
  }

  // frame → entita
  frameEntity = new Array(COLS * ROWS).fill(null);
  for (const [name, frames] of Object.entries(ENTITY_FRAMES)) {
    for (const f of frames) frameEntity[f] = name;
  }
}

/** Najde nejbližší slot (1–5) ke zdrojové barvě (zdroj má přesně 6 barev). */
function nearestSlot(r: number, g: number, b: number): number {
  let best = 1;
  let bestD = Infinity;
  for (let s = 1; s <= 5; s++) {
    const p = SOURCE_PALETTE[s]!;
    const dd = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = s;
    }
  }
  return best;
}

/** Vytvoří canvas texturu "bd" s 16×16 framy (jen jednou). */
function ensureBdTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(OUT_KEY)) return;
  const tex = scene.textures.createCanvas(OUT_KEY, W, H)!;
  for (let f = 0; f < COLS * ROWS; f++) {
    const c = f % COLS;
    const r = Math.floor(f / COLS);
    tex.add(f, 0, c * FW, r * FH, FW, FH);
  }
}

/** Přebarví zdroj podle schématu → plátno (cachované per schéma.id). */
function recolor(scheme: Scheme): HTMLCanvasElement {
  const cached = recolorCache.get(scheme.id);
  if (cached) return cached;

  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const slots = sourceSlots!;
  const fe = frameEntity!;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * 4;
      const slot = slots[i]!;
      if (slot === 0) {
        d[o + 3] = 0; // průhledná
        continue;
      }
      const frame = Math.floor(y / FH) * COLS + Math.floor(x / FW);
      const entity = fe[frame];
      const slotName = SLOT_BY_INDEX[slot]!;
      const col =
        (entity && scheme.perEntity[entity]?.[slotName]) ||
        scheme.global[slotName] ||
        SOURCE_PALETTE[slot]!;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  recolorCache.set(scheme.id, cv);
  return cv;
}
