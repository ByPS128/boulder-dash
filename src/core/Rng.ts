/**
 * Deterministický pseudonáhodný generátor (PRNG) z originálního Boulder Dashe.
 *
 * Jde o věrný překlad 6502 rutiny `PseudoRandom` ($6ced) z komentovaného
 * disassembly (viz `Boulderdash-C64-commented-disassembly.asm` v rootu repa a
 * sekce „GENERÁTOR JESKYNÍ" v CLAUDE.md). Stav tvoří dva bajty seedu
 * (RandSeed1/RandSeed2), výstupem je RandSeed1 po aktualizaci.
 *
 * Proč zrovna tenhle generátor: je deterministický a seedovatelný (stejný seed →
 * stejná posloupnost), takže herní náhody (tlačení balvanu, růst amoeby) jsou
 * reprodukovatelné a věrné originálu. Navíc ho půjde použít beze změny pro budoucí
 * autentický generátor jeskyní, který stojí na stejné rutině.
 *
 * Poznámka k překladu: ROR na 6502 rotuje přes carry flag. V této rutině jsou ale
 * všechny bity vstupující přes carry následně odmaskované (`AND #$80` / `AND #$7F`),
 * takže výsledek na vstupním carry nezávisí — emulace carry tu proto není potřeba.
 */
export class Rng {
  private seed1: number; // RandSeed1 (dolní bajt stavu)
  private seed2: number; // RandSeed2 (horní bajt stavu)

  /** Seed: dolní bajt → seed1, horní bajt → seed2. */
  constructor(seed = 0) {
    this.seed1 = seed & 0xff;
    this.seed2 = (seed >> 8) & 0xff;
  }

  /** Nastaví stav přímo dvěma bajty (jak to dělá originál per obtížnost). */
  setSeed(seed1: number, seed2: number): void {
    this.seed1 = seed1 & 0xff;
    this.seed2 = seed2 & 0xff;
  }

  /** Vrátí další pseudonáhodný bajt 0–255 a posune stav. */
  nextByte(): number {
    const s1 = this.seed1;
    const s2 = this.seed2;

    // SeededRandTemp1 = bit0 RandSeed1 posunutý na bit7
    const temp1 = s1 & 0x01 ? 0x80 : 0x00;
    // SeededRandTemp2 = RandSeed2 >> 1 (horní bit odmaskován)
    const temp2 = (s2 >> 1) & 0x7f;

    // RandSeed2 = ((bit0 RandSeed2)<<7) + RandSeed2 + 0x13   (CLC → carry-in 0)
    let sum = (s2 & 0x01 ? 0x80 : 0x00) + s2; // ADC RandSeed2
    let carry = sum > 0xff ? 1 : 0;
    sum = (sum & 0xff) + 0x13 + carry; // ADC #$13
    carry = sum > 0xff ? 1 : 0;
    this.seed2 = sum & 0xff;

    // RandSeed1 = RandSeed1 + SeededRandTemp1 + SeededRandTemp2 (+ carry)
    sum = s1 + temp1 + carry; // ADC SeededRandTemp1
    carry = sum > 0xff ? 1 : 0;
    sum = (sum & 0xff) + temp2 + carry; // ADC SeededRandTemp2
    this.seed1 = sum & 0xff;

    return this.seed1;
  }

  /** Float v intervalu [0, 1). */
  nextFloat(): number {
    return this.nextByte() / 256;
  }

  /** Celé číslo v intervalu [0, n). */
  nextInt(n: number): number {
    return Math.floor(this.nextFloat() * n);
  }

  /** Vrátí true s pravděpodobností `p` (0–1). */
  chance(p: number): boolean {
    return this.nextFloat() < p;
  }
}
