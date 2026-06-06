# Atari 8-bit — grafický kernel a barevné efekty (poznámky)

Sbírka „pro zajímavost" k tomu, jak se na osmibitových Atari dělaly barevné efekty,
hlavně **rolovací duha / raster bars** — což je historická předloha pro efekt, který
v tomto projektu reprodukujeme softwarově (viz [CLAUDE.md](./CLAUDE.md), sekce o Atari,
a redesign Welcome scény).

> ⚠️ ASM ukázky níže jsou **ilustrativní**, synteticky vytažené z článku — pro přesné
> listingy a kontext viz zdroj.

## Zdroje
- **Programování grafického kernelu na osmibitových Atari** (root.cz):
  https://www.root.cz/clanky/programovani-grafickeho-kernelu-na-osmibitovych-atari/
  (dlouhý seriál s mnoha kódy)

## Grafický kernel — co to je
- Podprogram **synchronizovaný s generováním obrazu**, běží souběžně s vykreslováním.
- Umožňuje víc barev / spritů / efektů, než kolik dává „základní" režim.
- Stojí na přerušeních: **DLI** (Display List Interrupt) a **VBI** (Vertical Blank Interrupt).

**Čipy a pojmy:**
- **ANTIC** — generuje obraz podle *display listu* (seznam instrukcí pro jednotlivé řádky).
- **GTIA** — barvy a sprity (PMG).
- **Display list** — instrukce (znakové/bitmapové/prázdné řádky) s příznakem `DL_DLI` pro
  vyvolání obsluhy na daném řádku.
- **DLI** — přerušení vyvolané značkou v display listu; spustí vlastní 6502 rutinu.

## Rolovací duha / raster bars
Princip: **měnit barevný registr po jednotlivých scanline**, synchronizovaně s paprskem.
- `STA WSYNC` = počká na začátek dalšího řádku (zápis čehokoli).
- Zápis do `COLBK` (okraj/pozadí) nebo `COLPF0–3` (herní pole) → pruh barvy na řádku.
- Inkrement barvy mezi řádky → svislý duhový přechod; posun počáteční barvy mezi snímky
  → duha **roluje**.

Typická DLI smyčka (ilustrativně dle článku):
```asm
dli:
  ldx #192          ; počet řádků
  ldy color         ; počáteční barva
next_line:
  sty COLPF2        ; barva playfieldu na tomto řádku
  sta WSYNC         ; čekání na další scanline
  iny               ; další odstín
  dex
  bne next_line
  inc color         ; posun pro další snímek → rolování
  rti
```

GTIA režim 9 (16 intenzit jedné barvy), změna odstínu přes DLI:
```asm
dli:
  pha
  lda color
  clc
  adc #16
  sta COLBK         ; změní se všech 16 intenzit naráz
  sta color
  pla
  rti
```

## Klíčové registry
| Registr | Adresa | Účel |
|---------|--------|------|
| WSYNC   | $D40A  | Synchronizace na začátek řádku (zápis) |
| COLBK   | $D01A  | Barva okraje / pozadí |
| COLPF0–3| $D016–$D019 | Barvy herního pole / spritů |
| PRIOR/GPRIOR | $D01B / shadow $026F | Priorita a GTIA režim (bity 6–7) |
| VDSLST  | $0200–$0201 | Vektor DLI obsluhy |
| VVBLKD  | $0222–$0223 | Vektor VBI obsluhy |
| SDLSTL/H| $0230–$0231 | Shadow adresy display listu |
| NMIEN   | $D40E  | Povolení přerušení (bit7 = DLI, bit6 = VBI) |

Příznaky display listu: `DL_DLI=$80` (vyvolá DLI), `DL_LMS=$40` (nová adresa dat),
`DL_JVB=$41` (skok + čekání na VBlank).

## Souvislost s tímto projektem
Na reálném Atari = per-scanline změna `COLPF/COLBK` přes DLI + `WSYNC`. My to děláme
**softwarově**: vygenerovaná textura svislých duhových pruhů (s vnitřním leskem) jako
`TileSprite`, **maskovaná tvarem písmen** titulku, a posun `tilePositionY` po snímcích =
rolování. Stejný vizuální výsledek, web-nativní cesta.
