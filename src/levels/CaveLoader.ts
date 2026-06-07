import { CaveDefinition } from "../core/CaveDefinition";

/**
 * Seznam souborů jeskyní. Vlastnosti (diamanty, čas, rychlost, barevné schéma,
 * název) se NEberou odsud, ale z HLAVIČKY každého `.txt` (viz formát níže).
 * Test scény (čísla od 101) se v menu zobrazují jako první.
 */
const CAVE_FILES: { number: number; file: string }[] = [];
for (let i = 1; i <= 20; i++) {
  CAVE_FILES.push({ number: i, file: `cave${String(i).padStart(2, "0")}` });
}
const TEST_FILES: { number: number; file: string }[] = [
  { number: 101, file: "test_amoeba" },
  { number: 102, file: "test_magic_wall" },
];

/**
 * CaveLoader – načítá jeskyně z `levels/*.txt`.
 *
 * Formát souboru: hlavička `klíč: hodnota` (name, diamonds, time, speed, scheme),
 * pak oddělovač `---` a pod ním mapa 40×22. Příklad:
 *   name: Intro
 *   diamonds: 12
 *   time: 150
 *   speed: 0.15
 *   scheme: classic
 *   ---
 *   ====================================== (22 řádků mapy)
 */
export class CaveLoader {
  private static caves: Map<number, CaveDefinition> = new Map();
  private static loaded = false;

  static async loadAll(): Promise<void> {
    if (this.loaded) return;
    console.log("Loading all caves...");

    for (const c of [...CAVE_FILES, ...TEST_FILES]) {
      try {
        const cave = await this.loadCave(c.number, c.file);
        this.caves.set(c.number, cave);
        console.log(`Loaded cave ${c.number}: ${cave.name} [${cave.scheme}]`);
      } catch (error) {
        console.error(`Failed to load cave ${c.number} (${c.file}):`, error);
      }
    }

    this.loaded = true;
    console.log(`All caves loaded (${this.caves.size} total)`);
  }

  /** Stáhne a naparsuje jeden soubor jeskyně (hlavička + mapa). */
  private static async loadCave(number: number, file: string): Promise<CaveDefinition> {
    const path = `levels/${file}.txt`;
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);

    const text = (await response.text()).replace(/^﻿/, ""); // ořež BOM
    const lines = text.split(/\r?\n/);

    // Rozdělit na hlavičku a mapu podle samostatného řádku "---".
    const sep = lines.findIndex((l) => l.trim() === "---");
    const headerLines = sep >= 0 ? lines.slice(0, sep) : [];
    const mapLines = (sep >= 0 ? lines.slice(sep + 1) : lines).filter((l) => l.length > 0);

    // Parse hlavičky "klíč: hodnota".
    const meta: Record<string, string> = {};
    for (const h of headerLines) {
      const m = h.match(/^(\w+):\s*(.*)$/);
      if (m) meta[m[1]!.toLowerCase()] = m[2]!.trim();
    }

    // Validace mapy.
    if (mapLines.length !== 22) {
      console.warn(`${path}: Expected 22 map lines, got ${mapLines.length}`);
    }
    mapLines.forEach((line, idx) => {
      if (line.length !== 40) {
        console.warn(`${path} map line ${idx + 1}: Expected 40 chars, got ${line.length}`);
      }
    });

    // Prázdný řádek navrch pro horní UI lištu (proto height = 23).
    const map = [" ".repeat(40), ...mapLines];

    return {
      caveNumber: number,
      name: meta.name ?? `Cave ${number}`,
      width: 40,
      height: 23,
      map,
      diamondsNeeded: Number(meta.diamonds) || 12,
      timeLimit: Number(meta.time) || 150,
      diamondValue: 10,
      diamondBonusValue: 15,
      timeBonus: 5,
      speed: Number(meta.speed) || 0.15,
      scheme: meta.scheme ?? "classic",
    };
  }

  /** Get a cave by number. */
  static getCave(caveNumber: number): CaveDefinition | null {
    if (!this.loaded) {
      console.error("Caves not loaded! Call loadAll() first.");
      return null;
    }
    return this.caves.get(caveNumber) || null;
  }

  static getAllCaves(): CaveDefinition[] {
    return Array.from(this.caves.values()).sort((a, b) => a.caveNumber - b.caveNumber);
  }

  /** Pořadí jeskyní v menu: nejdřív test scény, pak ostré 1–20. */
  static getMenuOrder(): number[] {
    return [...TEST_FILES.map((t) => t.number), ...CAVE_FILES.map((c) => c.number)];
  }

  static isLoaded(): boolean {
    return this.loaded;
  }
}
