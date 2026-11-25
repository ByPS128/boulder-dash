# Boulder Dash: historie, Atari verze a zdrojové kódy

> Přesunuto doslova z `CLAUDE.md` (sekce „HISTORIE, ATARI VERZE A ZDROJOVÉ KÓDY“) 25. 11. 2026, aby se
> referenční text nenačítal v každé session. Soubory C64 disassembly, které text zmiňuje „v rootu repa“
> (`Boulder Dash Disassembly - Retrointernals.mhtml`, `Boulderdash-C64-commented-disassembly.asm`), leží jen
> v lokálním checkoutu, v gitu nejsou.

## 🕹️ HISTORIE, ATARI VERZE A ZDROJOVÉ KÓDY

**Zdroj:** webový výzkum (Wikipedia, boulder-dash.nl interview s Liepou, First Star
Software, VGMPF, Retrointernals, elmerproductions). Flagy nejistoty jsou označeny.

### PŮVOD HRY — Boulder Dash je PŮVODNĚ ATARIJSKÁ HRA
- **Peter Liepa** napsal v **roce 1983 první Boulder Dash na Atari 800** (spolu
  s **Chrisem Grayem**). Nejdřív prototyp ve **Forthu** (~6 měsíců), pak přepis do
  **6502 assembleru** kvůli výkonu.
- Liepa vlastními slovy: *"I designed all of the elements, physics, caves, the game
  play, the graphics, the music, and the title. Chris helped out with a few odds and
  ends."*
- Vydal **First Star Software**, práva koupili **28. 10. 1983**. Vydáno **březen 1984**
  (NTSC). **C64 verze až duben 1984** — tedy PORT, ne originál.
- ⚠️ **DŮLEŽITÉ pro tento projekt:** Všechny dostupné disassembly (včetně dvou souborů
  v rootu repa) jsou **C64**, tedy derivát atarijského originálu. Logika je sdílená,
  ale nejde o atarijský kód.

### ATARI 8-BIT TECHNICKÉ DETAILY
- **ANTIC + GTIA**: smooth fine-scrolling (BD je učebnicová ukázka). Liepa
  **zdvojnásobil dlaždice na 16×16** a scrolloval, místo zmenšování jeskyní → proto
  je v naší hře `TILE = 16` historicky správně.
- **POKEY** (zvuk): 4 kanály, attack/decay obálky, bonus život po 500 bodech
  (na Atari s 2s "shimmer" efektem).
- Originální zobrazení Liepa popisuje jako 24×40 znaků bez scrollingu, později
  rozšířeno na větší scrollující jeskyně.
- ⚠️ Přesný ANTIC mód a registry barev atarijské verze se z primárního zdroje
  potvrdit NEPODAŘILO. Frame/tick rate atarijské verze rovněž NEPOTVRZEN.

### STRUKTURA JESKYNÍ V ORIGINÁLU
- **16 hlavních jeskyní A–P** + **4 hratelné intermission/bonus jeskyně** (po jeskyních
  D, H, L, P → bonus Rockford). Celkem 20 slotů.
- **5 obtížností (sublevelů)** na jeskyni; vyšší obtížnost = méně času + víc diamantů.
- ⚠️ NÁŠ PROJEKT toto NEMÁ: jeskyně jsou ručně kreslené ASCII s vymyšlenými názvy,
  ne A–P, ne generátor.

### 🎲 PSEUDONÁHODNÝ GENERÁTOR JESKYNÍ (Liepův klíčový trik)
Celá jeskyně = pár desítek bajtů. Dvě vrstvy:
1. **Náhodná výplň** — deterministický PRNG mapuje každou buňku na 1 ze 4 objektů
   podle 4 pravděpodobnostních bajtů (typicky Space/Dirt/Boulder/Diamond).
2. **Kreslené objekty navrch** — seznam příkazů (`ccoooooo`, horní 2 bity = příkaz):
   - `$00` **Single(x,y)** — bod
   - `$40` **Line(x,y,len,dir)** — dir: N=0,NE=1,E=2,SE=3,S=4,SW=5,W=6,NW=7
   - `$80` **FilledRect(x,y,w,h,interiér)** — obrys + výplň
   - `$c0` **Rect(x,y,w,h)** — dutý obdélník
   - seznam končí `$ff`

**PRNG (`PseudoRandom`, $6ced v C64 disassembly):** dva seed bajty `RandSeed1`/
`RandSeed2`, čistá aritmetika (operace `ROR`/`AND $80`/`AND $7f`), slavná konstanta
**`+$13`**. Vygenerovaný bajt se porovná proti 4 pravděpodobnostním bajtům.
Každá z 5 obtížností má **vlastní počáteční seed** → stejná jeskyně, jiný layout.

**32-bajtová hlavička jeskyně:** CaveNumber, MagicWallTime/Amoeba-max,
InitialDiamondValue, ExtraDiamondValue, 5× seed, 5× DiamondsNeeded, 5× CaveTime,
2× background color, foreground color, 2× neznámé, 4× RandomObjectNumber,
4× ProbabilityOfObject.

### ZDROJOVÉ KÓDY — DOSTUPNOST
- **Originální atarijský 6502 zdroják NENÍ veřejný.** First Star drží práva, nikdo
  (ani Liepa) ho nevydal.
- **Neexistuje ani dedikovaný atarijský disassembly** (ověřeno i v kurátorovaném
  seznamu `realdmx/retrore` — BD tam není).
- **Dostupné reference (vše C64, logika sdílená s Atari designem):**
  - Retrointernals C64 disassembly: https://www.retrointernals.org/boulder-dash/boulder-dash-disassembly.html
    (zdroj souboru `Boulder Dash Disassembly - Retrointernals.mhtml` v rootu)
  - Repo soubor `Boulderdash-C64-commented-disassembly.asm` — byte-exact `PseudoRandom`,
    32-bajtová hlavička, draw příkazy (NEJBOHATŠÍ technická reference, kterou máme)
  - "Inside Boulder Dash" (Peter Broadribb) — RNG + dekodér + BDCFF spec + decodecaves.c:
    https://www.elmerproductions.com/sp/peterb/insideBoulderdash.html
  - Liepa interview (potvrzuje atarijský původ): https://www.boulder-dash.nl/
  - Jake Gordon — JS reimplementace z C64 cave dat:
    https://jakesgordon.com/writing/javascript-boulderdash/ a .../boulderdash-cave-data/
