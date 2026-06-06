import { CaveDefinition } from "../core/CaveDefinition";

/**
 * Cave configuration - metadata for each cave
 * TODO: Move to JSON config file in future
 */
const CAVE_CONFIG: Record<
  number,
  { diamonds: number; time: number; name: string }
> = {
  1: { diamonds: 12, time: 150, name: "Intro" },
  2: { diamonds: 15, time: 180, name: "Rooms" },
  3: { diamonds: 20, time: 200, name: "Maze" },
  4: { diamonds: 18, time: 160, name: "Butterfly Menace" },
  5: { diamonds: 25, time: 220, name: "Corridor" },
  6: { diamonds: 22, time: 190, name: "Fireflies" },
  7: { diamonds: 30, time: 240, name: "Amoeba" },
  8: { diamonds: 20, time: 170, name: "Enchanted Wall" },
  9: { diamonds: 28, time: 210, name: "Greed" },
  10: { diamonds: 16, time: 150, name: "Tracks" },
  11: { diamonds: 35, time: 260, name: "Crowd" },
  12: { diamonds: 24, time: 200, name: "Walls" },
  13: { diamonds: 30, time: 230, name: "Apocalyptic Wall" },
  14: { diamonds: 26, time: 210, name: "Zigzag" },
  15: { diamonds: 40, time: 280, name: "Funnel" },
  16: { diamonds: 32, time: 240, name: "Enchanted Fireflies" },
  17: { diamonds: 38, time: 270, name: "Intermission 1" },
  18: { diamonds: 45, time: 300, name: "Intermission 2" },
  19: { diamonds: 50, time: 320, name: "Intermission 3" },
  20: { diamonds: 60, time: 360, name: "Intermission 4" },
};

/**
 * Ladící (TEST) scény. Zobrazují se na ZAČÁTKU menu, ať jsou hned po ruce.
 * Až bude mechanika odladěná, stačí položku odsud smazat a z menu zmizí.
 * Čísla od 101 výš, aby nekolidovala s ostrými jeskyněmi 1–20.
 */
const TEST_CAVES: {
  number: number;
  file: string;
  name: string;
  diamonds: number;
  time: number;
}[] = [
  { number: 101, file: "test_amoeba", name: "TEST: Amoeba", diamonds: 1, time: 999 },
  { number: 102, file: "test_magic_wall", name: "TEST: Magic Wall", diamonds: 1, time: 999 },
];

/**
 * CaveLoader - loads cave definitions from .txt files
 */
export class CaveLoader {
  private static caves: Map<number, CaveDefinition> = new Map();
  private static loaded = false;

  /**
   * Load all caves from /levels/*.txt files
   */
  static async loadAll(): Promise<void> {
    if (this.loaded) return;

    console.log("Loading all caves...");

    for (let i = 1; i <= 20; i++) {
      try {
        const map = await this.loadCaveFile(i);
        const config = CAVE_CONFIG[i] || {
          diamonds: 12,
          time: 150,
          name: `Cave ${i}`,
        };

        const cave: CaveDefinition = {
          caveNumber: i,
          name: config.name,
          width: 40,
          height: 23, // 22 original + 1 empty row for UI space
          map: map,
          diamondsNeeded: config.diamonds,
          timeLimit: config.time,
          diamondValue: 10,
          diamondBonusValue: 15,
          timeBonus: 5,
        };

        this.caves.set(i, cave);
        console.log(`Loaded cave ${i}: ${cave.name}`);
      } catch (error) {
        console.error(`Failed to load cave ${i}:`, error);
      }
    }

    // Ladící scény (na začátku menu). Snadno odstranitelné – viz TEST_CAVES.
    for (const t of TEST_CAVES) {
      try {
        const map = await this.loadCaveFileByName(t.file);
        const cave: CaveDefinition = {
          caveNumber: t.number,
          name: t.name,
          width: 40,
          height: 23, // 22 original + 1 empty row for UI space
          map,
          diamondsNeeded: t.diamonds,
          timeLimit: t.time,
          diamondValue: 10,
          diamondBonusValue: 15,
          timeBonus: 5,
        };
        this.caves.set(t.number, cave);
        console.log(`Loaded test cave ${t.number}: ${cave.name}`);
      } catch (error) {
        console.error(`Failed to load test cave ${t.number}:`, error);
      }
    }

    this.loaded = true;
    console.log(`All caves loaded (${this.caves.size} total)`);
  }

  /**
   * Load a single cave file
   */
  private static async loadCaveFile(caveNumber: number): Promise<string[]> {
    const paddedNumber = caveNumber.toString().padStart(2, "0");
    return this.fetchCaveLines(`levels/cave${paddedNumber}.txt`);
  }

  /** Na\u010Dte lad\u00EDc\u00ED sc\u00E9nu podle n\u00E1zvu souboru (bez p\u0159\u00EDpony, ze slo\u017Eky levels/). */
  private static async loadCaveFileByName(stem: string): Promise<string[]> {
    return this.fetchCaveLines(`levels/${stem}.txt`);
  }

  /** St\u00E1hne a naparsuje soubor jeskyn\u011B: o\u0159e\u017Ee BOM, zvaliduje 40\u00D722, p\u0159id\u00E1 UI \u0159\u00E1dek. */
  private static async fetchCaveLines(path: string): Promise<string[]> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.status}`);
    }

    const text = await response.text();

    // Remove BOM (UTF-8 byte order mark) if present
    const cleanText = text.replace(/^\uFEFF/, "");

    // Split into lines and filter empty lines
    const lines = cleanText.split(/\r?\n/).filter((line) => line.length > 0);

    // Validate dimensions
    if (lines.length !== 22) {
      console.warn(`${path}: Expected 22 lines, got ${lines.length}`);
    }

    lines.forEach((line, idx) => {
      if (line.length !== 40) {
        console.warn(
          `${path} line ${idx + 1}: Expected 40 chars, got ${line.length}`
        );
      }
    });

    // Add empty row at the top for UI space (so UI doesn't overlap gameplay)
    const emptyRow = " ".repeat(40); // 40 spaces
    const linesWithUISpace = [emptyRow, ...lines];

    return linesWithUISpace;
  }

  /**
   * Get a cave by number (1-20)
   */
  static getCave(caveNumber: number): CaveDefinition | null {
    if (!this.loaded) {
      console.error("Caves not loaded! Call loadAll() first.");
      return null;
    }

    return this.caves.get(caveNumber) || null;
  }

  /**
   * Get all loaded caves
   */
  static getAllCaves(): CaveDefinition[] {
    return Array.from(this.caves.values()).sort(
      (a, b) => a.caveNumber - b.caveNumber
    );
  }

  /**
   * Pořadí jeskyní v menu: nejdřív ladící (TEST) scény, pak ostré jeskyně 1–20.
   * WelcomeScene podle tohoto pole listuje – test scény jsou tak hned na začátku.
   */
  static getMenuOrder(): number[] {
    const realCaves = Object.keys(CAVE_CONFIG)
      .map(Number)
      .sort((a, b) => a - b);
    return [...TEST_CAVES.map((t) => t.number), ...realCaves];
  }

  /**
   * Check if caves are loaded
   */
  static isLoaded(): boolean {
    return this.loaded;
  }
}
