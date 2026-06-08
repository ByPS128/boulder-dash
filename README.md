# Boulder Dash — remake v Phaser 3 + TypeScript

Webový remake hry **Boulder Dash**, kterou původně napsali Peter Liepa a Chris Gray
**na Atari 800** a vydala First Star Software v roce 1984. Projekt cílí na autentický
vzhled a pocit **Atari 8-bit (800 XL / 130 XE)** — proto atarijský font, balík
atarijských fontů a originální C64 disassembly soubory uložené v rootu repa jako
referenční materiál.

> Referenci k herním pravidlům, historická fakta, originální algoritmus generování
> jeskyní a zdroje disassembly najdeš v **[CLAUDE.md](./CLAUDE.md)** — to je master
> referenční dokument tohoto projektu.

---

## Technologie

| Vrstva   | Volba                               | Poznámka |
|----------|-------------------------------------|----------|
| Engine   | [Phaser 3](https://phaser.io) 3.80  | Scény, sprity, animace, vstup, kamera. |
| Jazyk    | TypeScript 5.5                      | Typovaný model entit (union `CellEntity`). |
| Build    | Vite 5                              | Dev server + produkční bundle (ESM). |
| Render   | `pixelArt`, `roundPixels`, bez AA   | Ostré 16×16 retro dlaždice; jen celočíselný zoom. |
| Font     | Atari **bitmap** font (RetroFont)   | Ostrý charset (ATARIPL) z balíku, maskovaný za běhu — `src/ui/AtariFont.ts`. |

Žádný backend, žádný testovací framework — čistě klientská hra.

**Logické plátno:** `28 × 16` dlaždic × `16 px` = **448 × 256 px** (`Scale.FIT`,
centrované). Dlaždice 16×16 odpovídají Liepovým zdvojnásobeným atarijským tiles.

## Rychlý start

```bash
npm i
npm run dev      # vývojový server Vite
npm run build    # produkční build
npm run preview  # náhled buildu
```

Otevři URL, kterou Vite vypíše. Atarijský font se načte před startem Phaseru
(viz `src/main.ts`).

## Ovládání

| Klávesa        | Akce |
|----------------|------|
| Šipky          | Pohyb Rockforda (kopání hlíny, sběr diamantů, tlačení balvanů vodorovně) |
| `P`            | Pauza / pokračovat |
| `R`            | Restart úrovně (s potvrzením) |
| `ESC`          | Opustit úroveň (s potvrzením) |

## Struktura projektu

```
index.html                  připojí #app a spustí src/main.ts (žádný webový font – font je bitmapový)
src/
  main.ts                   CaveLoader.loadAll() + SchemeLoader.loadAll() → new Phaser.Game
  core/
    types.ts                Vec2/DIR helpery, CellKind, union CellEntity, config obtížnosti
    CaveDefinition.ts       Rozhraní metadat jeskyně (vč. speed, scheme) + úpravy obtížnosti
    SessionStats.ts         Pokusy per jeskyně, best score; persistováno do localStorage
    Rng.ts                  Deterministický PRNG (věrný překlad 6502 PseudoRandom)
    SpritePalette.ts        Per-entity recolor: ze sprites_source vyrobí obarvenou texturu "bd"
  levels/
    CaveLoader.ts           Fetchne+parsuje levels/*.txt (hlavička + mapa)
    SchemeLoader.ts         Načte+parsuje levels/schemes.txt → barevná schémata
  scenes/
    WelcomeScene.ts         Úvod: bitmap font, carry intro (2 Rockfordi), rolovací duha, výběr jeskyně
    GameScene.ts            Jádro herní smyčky a simulace (viz níže)
    GameOverScene.ts        Výsledek victory / death / quit + time bonus
  ui/
    AtariFont.ts            Načtení Atari charsetu + runtime maskování → Phaser RetroFont
    ConfirmDialog.ts        Znovupoužitelný potvrzovací dialog Y/N
levels/cave01..20.txt       Definice jeskyní: hlavička (metadata) + mapa 40×22
levels/test_*.txt           Ladící TEST scény (amoeba, magic wall)
levels/schemes.txt          Barevná schémata jeskyní (palette-swap)
resources/                  sprites_source.png (šablona spritů), balík atarijských fontů
                            (EightBit-Atari-Fonts-2), atari-dev-a-*.png/gif (předlohy duhy)
atari.md                    Poznámky k Atari grafickému kernelu / DLI raster bars (předloha duhy)
CLAUDE.md                   Master pravidla & reference (číst první)
*.asm / *.mhtml             C64 Boulder Dash disassembly (reference)
```

## Architektura a tok dat

```
index.html ─ font ─▶ main.ts ─▶ CaveLoader.loadAll() ─▶ new Phaser.Game
                                   scény: WelcomeScene → GameScene → GameOverScene
                                                              (+ ui/ConfirmDialog)
```

- **CaveLoader** fetchne `levels/caveNN.txt`, ořeže BOM, zvaliduje 40×22 a
  **přidá jeden prázdný řádek navrch** (proto `BOARD_HEIGHT = 23`), aby vznikl prostor
  pro horní UI lištu. Diamanty/čas/název per jeskyně přichází z hardcoded mapy
  `CAVE_CONFIG`.
- **SessionStats** je singleton persistovaný do `localStorage` pod klíčem
  `boulder-dash-stats` (pokusy, best score, flagy dokončení).

## Úvodní obrazovka (Welcome)

- **Ostrý Atari font** (`src/ui/AtariFont.ts`): charset z balíku
  `EightBit-Atari-Fonts-2` (default **ATARIPL**) se při načtení **za běhu** přemaskuje
  na RGBA (bílé glyfy / průhledné pozadí) a zaregistruje jako Phaser **RetroFont** →
  ostré hrany místo rozpitého TTF. Konfigurovatelné (`ATARI_FONTS`), texty verzálkami.
- **Carry intro:** dva Rockfordi „nanosí" písmena **BOULDER DASH** po mřížce (24 px) a
  tlačí je jako balvany (sokoban) – levý staví **BOULDE** zleva, pravý **RDASH** zprava
  (i R bere ze své strany). Prostřední písmena přijdou z náhodného spodního řádku, Rockford
  je dotlačí do sloupce, obejde a vytlačí nahoru. **B a H** se dělají nakonec a Rockfordi
  u nich zůstanou v idle. Vše laditelné v **`INTRO_CFG`**; **přerušitelné** libovolnou klávesou.
- **Rolovací duha** v titulku: barvy `RAINBOW_COLORS` jsou vytažené ze sloupce předlohy
  `resources/atari-dev-a-1.png` (každá barva světlá→tmavá, pak další), maskované tvarem
  písmen a svisle scrollované (Atari raster-bar efekt – viz `atari.md`).

## Simulační model (ta důležitá část)

`GameScene` běží **s fixním krokem**, odděleně od render FPS:

- `update()` akumuluje `delta` do `stepAcc` a spouští `step()` každých
  `SPEED = 0.15 s` (~6,6 ticků/s). Zobrazený **časovač** běží v reálném čase.
- Každý `step()` má **pevné pořadí fází** — právě toto pořadí drží fyziku správnou:

  ```
  tickCount++
  resetMovingFlags()                          // vyčistí inMove[] + moveProcessed
  rockfordVacated.clear()
  moveRockford()
  markBouldersToMove → markFireflies → markButterflies   // fáze PLÁN
  moveBoulders → moveFireflies → moveButterflies          // fáze VÝKON
  processAmoeba()
  processRockfordCollisionsWithEnemies()
  processEnemyCollisionsWithAmoeba()
  mark…ToMove ×3                              // přeplánování pro příští tick
  ```

### Klíčové mechanismy

- **Dvě mřížky.** `grid[][]` drží entity; `inMove[][]` je *rezervační* mřížka.
  Fáze `mark…` rozhodne, kam každý balvan/diamant spadne nebo se skutálí, a
  zarezervuje cílovou buňku; fáze `move…` provede pohyb jen pokud
  `inMove[ny][nx] === self`. Tím se řeší dva padající objekty soupeřící o stejnou
  buňku — klasický problém cell-based Boulder Dashe.
- **`rockfordVacated`** — buňky, které Rockford opustil v tomto ticku. Balvany nad
  nimi **nezačnou** padat okamžitě (`markBouldersToMove` je přeskočí), což dává
  1-tickové okno na únik věrné originálu.
- **Gravitace a skluz** (`markBouldersToMove`): pad rovně → jinak skluz vlevo
  (priorita) → skluz vpravo, ale jen když je objekt pod ním `isRounded`
  (balvan/diamant) a buňka do strany i buňka pod ní jsou prázdné. Iteruje zdola nahoru.
- **Magic wall** (`handleMagicWallDrop`): *padající* objekt projde a konvertuje se
  balvan↔diamant; aktivní po `MAGIC_WALL_ACTIVE_TICKS = 200`; objekt zmizí, pokud je
  buňka pod zdí obsazená.

## Formát souboru jeskyně

Každý `levels/caveNN.txt` má **hlavičku** (`klíč: hodnota`), oddělovač `---` a pod ním
**mapu 40 × 22** ASCII:

```
name: Intro
diamonds: 12
time: 150
speed: 0.15          # délka herního ticku v s (menší = rychlejší)
scheme: classic      # ID barevného schématu (levels/schemes.txt)
---
====================================== (22 řádků mapy)
```

| Znak | Dlaždice        | Znak | Dlaždice           |
|------|-----------------|------|--------------------|
| `=`  | Titanová zeď    | `S`  | Spawn Rockforda    |
| `-`  | Cihlová zeď     | `E`  | Exit               |
| `.`  | Hlína           | `O`  | Firefly            |
| ` `  | Prázdný prostor | `X`  | Butterfly          |
| `*`  | Balvan          | `P`  | Magic wall         |
| `+`  | Diamant         | `A`  | Amoeba             |

## Barevná schémata jeskyní (palette-swap)

Sprity nemají barvy zapečené – existuje **jedna šablona** `resources/sprites_source.png`
(6-barevný indexovaný list) a barvy se nastavují **per jeskyně** podle schématu.

- **Sloty** (sémantické názvy zdrojových indexů): `base`, `shadow`, `hi`, `accent`,
  `ink` (+ index 0 = vždy průhledný). Stačí obvykle nastavit `base` + `accent`,
  zbytek (stín/bílá) se vezme ze šablony.
- **Schéma** (`levels/schemes.txt`) má **globální** barvy slotů a volitelné
  **per-entity přepisy** (`diamond.base #BFE9FF`) – takže stejný slot může být u
  diamantu jiný než u hlíny. Entity: `rockford, dirt, wall, titan, boulder, diamond,
  magicwall, amoeba, firefly, butterfly, spawn, explosion`.
- **Runtime** (`src/core/SpritePalette.ts`): při změně jeskyně se ze šablony vyrobí
  obarvená RGBA textura "bd" (frame po framu podle entit), výsledek se **cachuje per
  schéma**. Všechny sprity i animace dál používají klíč "bd".

Příklad:
```
[classic]
base   #646464
accent #A36E30

[ocean]
base   #2E5C8A
accent #6CC0FF
diamond.base   #BFE9FF   # diamanty modré
amoeba.base    #2FB36B   # amoeba zelená (zbytek scény zůstane modrý)
```

## Aktuální stav

**Hotovo**
- Mřížka dlaždic, sledování/scroll kamery, spawn animace, win/lose flow.
- Kopání hlíny, sběr diamantů + skóre (10 / 15 po otevření exitu), exit se otevře
  po nasbírání potřebných diamantů.
- Fyzika balvanů a diamantů: gravitace, skluz, tlačení (vodorovně).
- Fireflies (po směru hodinových ručiček) a butterflies (proti směru): navigace,
  smrt padajícím balvanem/diamantem, exploze 3×3; butterfly dropne 9 diamantů jen při
  přímém zabití (ne při řetězové explozi).
- Konverze magic wall; **autentický růst amoeby** (port `ProcessAmoeba` z disassembly:
  měřený růst přes PRNG, práh 200 buněk → balvany, uzavřená → diamanty, zabíjení nepřátel).
- HUD času, skóre, potřebných diamantů; dialogy pauza/restart/quit.
- Statistiky session (best score, dokončení) v `localStorage`.
- Dedikované animované sprity amoeby (framy 60–63) a magic wall (50–53).
- Deterministický PRNG `src/core/Rng.ts` (věrný překlad 6502 rutiny `PseudoRandom`)
  pro herní náhody – tlačení balvanu (`canPush`) i růst amoeby; reprodukovatelné a
  seedované per jeskyně.
- Herní čas (`gameTime`) místo `Date.now()` – pauza nezkresluje animace ani statistiky.
- Ladící TEST scény na začátku menu (viz `TEST_CAVES` v `CaveLoader`).
- **Úvodní obrazovka**: ostrý Atari bitmap font (RetroFont), carry intro (2 Rockfordi
  nanosí titulek, sokoban-tlačení), rolovací duha z předlohy; přerušitelné klávesou
  (viz sekce *Úvodní obrazovka* výše).
- **Barevná schémata jeskyní** (palette-swap): jedna šablona spritů + per-cave/per-entity
  obarvení za běhu (viz sekce výše); metadata jeskyně (vč. `speed`, `scheme`) v hlavičce `.txt`.
- **In-game HUD** na bitmap fontu: vlevo animovaná ikona diamantu + sebráno/potřeba
  (zezelená po splnění), uprostřed čas (barevně), vpravo skóre (6 míst, zarovnané);
  tmavý pruh pro čitelnost. Název jeskyně se ukáže jako **title card** přes plochu
  (bílé písmo s černým obrysem, fade in/out). Žádné přetékání dlouhých názvů.

**Drobnosti (zatím neřešíme)**
- Sprity amoeby: animace odpovídá originálu (ověřeno dle videí), jen barvy se
  od Atari předlohy mírně liší — kosmetická drobnost.
- Magic wall animuje pořád; v originále „mele" jen když je aktivní (k navázání na
  `activeUntilTick`).
- Systém obtížnosti je připravený (`types.ts`), ale **vypnutý**
  (`difficultySystemEnabled = false`).

**Plánováno (TODO)**
- **Barva HUDu podle scény** (rozšíření barevných schémat). V originále nese hlavičku
  jeskyně i `foreground color`, kterým se barví horní řádek → chceme totéž, ať HUD ladí
  se scénou (viz růžovo-zelená předloha). Návrh: do `levels/schemes.txt` přidat 3
  volitelné klíče, vše s **fallbackem na dnešní default**, když schéma neuvede:
  - `hud.fg`   – hlavní text HUDu (skóre, počet diamantů, čas v normálu) = „naladí horní řádek"
  - `hud.ok`   – stav splněno / dost času (dnes zeleně)
  - `hud.warn` – čas dochází (výstražná barva)

  Implementace: rozšířit `Scheme` o `hud`, naparsovat v `SchemeLoader`, číst v
  `GameScene.createUI/updateUI` (konstanty `HUD`). **Odloženo:** blikání po sebrání všech
  diamantů; dvoustupňová výstraha času (≤60 / ≤30) – buď `hud.warn` přepíše první stupeň
  a ≤30 zůstane systémově červená, nebo se odvodí ztmavením.
- **Zvukový systém** – hra je zatím **úplně němá**, žádné zvuky ani hudba. Originál na
  Atari používal čip **POKEY** (4 kanály, attack/decay obálky). K dořešení: efekty
  (kopání hlíny, sběr diamantu, padající/dosednutý balvan, exploze, tlačení balvanu,
  amoeba, otevření exitu, výhra/smrt, docházející čas, bonus život po 500 bodech) +
  případně titulní/herní hudba. Zvážit autentické POKEY-like tóny vs. samply; hlasitost
  v nastavení; respektovat pauzu (`gameTime`).

**Odchylky od originální atarijské hry**
- Jeskyně jsou **ručně kreslené ASCII mapy** s vlastními názvy ("Intro", "Rooms", …),
  **ne** originálních 16 jeskyní A–P + 4 intermission a **ne** generované Liepovým
  pseudonáhodným generátorem. Implementace tohoto generátoru (+ originálních
  32-bajtových hlaviček jeskyní) je největší krok k autentickému atarijskému portu.
  Algoritmus viz CLAUDE.md.

## Poděkování a historie

Boulder Dash © Peter Liepa a Chris Gray, First Star Software (1984). Původně vyvinuto
na **Atari 800**. Toto je nekomerční fanouškovský remake. Plnou historii a referenční
odkazy najdeš v CLAUDE.md.
