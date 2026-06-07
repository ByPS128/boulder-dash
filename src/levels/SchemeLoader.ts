import { Scheme, SlotName } from "../core/SpritePalette";

/**
 * Načítá barevná schémata z `levels/schemes.txt`.
 *
 * Formát:
 *   [id]                      ← začátek schématu s unikátním ID
 *   base   #646464            ← globální barva slotu
 *   accent #A36E30
 *   diamond.base #BFE9FF      ← přepis slotu pro konkrétní entitu
 *   # komentář / prázdné řádky se ignorují
 *
 * Sloty: base, shadow, hi, accent, ink. Entity: rockford, dirt, wall, titan,
 * boulder, diamond, magicwall, amoeba, firefly, butterfly, spawn, explosion.
 */
const SLOTS: SlotName[] = ["base", "shadow", "hi", "accent", "ink"];

/** Náhradní schéma, když odkazované ID chybí (necháme barvy zdroje). */
const FALLBACK: Scheme = { id: "default", global: {}, perEntity: {} };

export class SchemeLoader {
  private static schemes = new Map<string, Scheme>();
  private static loaded = false;

  static async loadAll(): Promise<void> {
    if (this.loaded) return;
    try {
      const res = await fetch("levels/schemes.txt");
      if (res.ok) {
        const text = (await res.text()).replace(/^﻿/, "");
        this.parse(text);
      } else {
        console.warn("schemes.txt not found, using source colours");
      }
    } catch (e) {
      console.warn("Failed to load schemes.txt", e);
    }
    this.loaded = true;
    console.log(`Loaded ${this.schemes.size} colour schemes`);
  }

  private static parse(text: string): void {
    let current: Scheme | null = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;

      const header = line.match(/^\[(.+)\]$/);
      if (header) {
        current = { id: header[1]!.trim(), global: {}, perEntity: {} };
        this.schemes.set(current.id, current);
        continue;
      }
      if (!current) continue;

      // "klíč #RRGGBB" – klíč je buď slot, nebo "entita.slot"
      const m = line.match(/^(\S+)\s+#?([0-9a-fA-F]{6})$/);
      if (!m) continue;
      const key = m[1]!;
      const rgb = hexToRgb(m[2]!);

      if (key.includes(".")) {
        const [entity, slot] = key.split(".") as [string, SlotName];
        if (!SLOTS.includes(slot)) continue;
        (current.perEntity[entity] ??= {})[slot] = rgb;
      } else if (SLOTS.includes(key as SlotName)) {
        current.global[key as SlotName] = rgb;
      }
    }
  }

  /** Vrátí schéma podle ID (nebo náhradní, pokud chybí). */
  static get(id: string | undefined): Scheme {
    if (!id) return FALLBACK;
    return this.schemes.get(id) ?? FALLBACK;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
