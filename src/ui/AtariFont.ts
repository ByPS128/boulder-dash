import Phaser from "phaser";

/**
 * Atari bitmapové fonty z balíku `resources/EightBit-Atari-Fonts-2/Original Bitmaps`.
 *
 * Charsety jsou PNG 256×32, 1-bit (černé pozadí / bílé glyfy), mřížka 32×4 po 8×8 px.
 * Prvních 64 buněk odpovídá ASCII 32–95 (mezera … '_'), což pokrývá velká písmena,
 * číslice i interpunkci. Texty v UI proto píšeme verzálkami (jako originál Boulder Dash).
 *
 * Pozadí se NEbaké do souboru – charset se při načtení **za běhu** přemaskuje na RGBA
 * (bílé glyfy, průhledné pozadí), takže tint i maskování (rolovací duha) fungují všude,
 * i nad barevným pozadím jeskyní.
 */
const CHARSET_DIR = "resources/EightBit-Atari-Fonts-2/Original Bitmaps";

const ATARI_CHARS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_";

/**
 * Registr fontů: logický klíč → název PNG v balíku (bez přípony).
 * Přidáním řádku zpřístupníš další font; konkrétní text si pak font volí klíčem
 * v `this.add.bitmapText(x, y, KLÍČ, ...)`.
 */
export const ATARI_FONTS: Record<string, string> = {
  main: "ATARIPL", // dle uživatele nejvíc „Atari"
};

/** Výchozí font pro běžný text. */
export const DEFAULT_FONT = "main";

const rawKey = (key: string) => `${key}__charset`;

/** Zařadit do scene.preload(): načte syrové charset PNG (1-bit, neprůhledné). */
export function preloadAtariFonts(scene: Phaser.Scene): void {
  for (const [key, file] of Object.entries(ATARI_FONTS)) {
    const rk = rawKey(key);
    if (scene.textures.exists(rk)) continue;
    // Cesta obsahuje mezeru ("Original Bitmaps") → enkódovat pro URL.
    scene.load.image(rk, encodeURI(`${CHARSET_DIR}/${file}.png`));
  }
}

/**
 * Zavolat v scene.create() (po načtení assetů): z každého charsetu vyrobí RGBA
 * texturu s průhledným pozadím a zaregistruje RetroFont pod logickým klíčem.
 */
export function registerAtariFonts(scene: Phaser.Scene): void {
  for (const key of Object.keys(ATARI_FONTS)) {
    if (scene.cache.bitmapFont.has(key)) continue;
    if (!scene.textures.exists(key)) maskCharset(scene, rawKey(key), key);
    const data = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: key,
      width: 8,
      height: 8,
      chars: ATARI_CHARS,
      charsPerRow: 32,
      "offset.x": 0,
      "offset.y": 0,
      "spacing.x": 0,
      "spacing.y": 0,
      lineSpacing: 0,
    });
    scene.cache.bitmapFont.add(key, data);
  }
}

/**
 * Převede černobílý charset na RGBA: jasné glyfy → bílé neprůhledné, pozadí → průhledné.
 * Výsledek zaregistruje jako texturu pod `outKey` (použije ji RetroFont i maska duhy).
 */
function maskCharset(scene: Phaser.Scene, srcKey: string, outKey: string): void {
  const src = scene.textures.get(srcKey).getSourceImage() as HTMLImageElement;
  const w = src.width;
  const h = src.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i]! >= 128) {
      // jas glyfu (charset je černobílý) → bílá neprůhledná (tintovatelná)
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = 255;
    } else {
      d[i + 3] = 0; // pozadí → průhledné
    }
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas(outKey, canvas);
}
