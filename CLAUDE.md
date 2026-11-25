# AI ASSISTANT RULES & PROCEDURES
# Pro projekt: Boulder Dash JS Clone

## DŮLEŽITÉ: TENTO DOKUMENT ČÍST VŽDy NA ZAČÁTKU SESSION!

---

## 📋 ZÁKLADNÍ PRAVIDLA:

### 1. ÚPLNOST A DŮSLEDNOST
- ✅ Vytvořit CHECKLIST pro každý úkol
- ✅ CROSS-CHECK implementaci proti checklistu

### 2. STUDIUM PRAVIDEL
- ✅ Když tvrdím "nastudoval jsem pravidla", znamená to:
  - Přečetl jsem KAŽDÉ pravidlo pro KAŽDÝ objekt
  - Vytvořil jsem si mentální model VŠECH interakcí
  - Jsem schopen zodpovědět JAKÝKOLIV detail bez hledání
- ❌ NESMÍM říct "nastudoval jsem", pokud neznám VŠECHNY detaily

### 3. IMPLEMENTACE
- ✅ Při implementaci objektu zkontrolovat VŠECHNY jeho vlastnosti:
  - Pohyb/navigace
  - Death conditions (VŠECHNY varianty: "A or B or C")
  - Interakce s KAŽDÝM jiným objektem
  - Edge cases
  - Spawn/destroy chování
- ✅ Při podobných objektech (Firefly/Butterfly):
  - Zkontrolovat ROZDÍLY
  - Zkontrolovat SPOLEČNÉ vlastnosti pro OBA
  - Nejen "co je jinak", ale i "co MUSÍ být stejné"

### 4. VALIDACE
Po každém návrhu/implementaci:
```
VALIDAČNÍ CHECKLIST:
□ Přečetl jsem VŠECHNA pravidla objektu?
□ Implementoval jsem KAŽDÉ pravidlo?
□ Zkontroloval jsem interakce s VŠEMI objekty?
□ Zkontroloval jsem edge cases?
□ Funguje to pro VŠECHNY podobné objekty?
```

---

## 🎮 BOULDER DASH - KLÍČOVÉ MECHANIKY:

### OBJEKTY A JEJICH KOMPLETNÍ PRAVIDLA:

#### ROCKFORD (Hráč):
- Pohyb: 4 směry
- Může: kopat Dirt, sbírat Diamonds, tlačit Boulders (jen horizontálně)
- Death: falling objects, explosions, enemy touch
- Vstup do Exit = win

#### BOULDER:
- Padá dolů (gravity)
- Sjíždí z: Walls, Boulders, Diamonds (priorita: vlevo > vpravo)
- Tlačitelný Rockfordem (jen horizontálně)
- Zabíjí: Rockford, Firefly, Butterfly při PÁDU (isFalling=true)
- Zničitelný explozí

#### DIAMOND:
- **STEJNÁ FYZIKA jako Boulder** (padání + skluz)
- Sbíratelný Rockfordem
- **Zabíjí: Rockford, Firefly, Butterfly při PÁDU** (stejně jako Boulder!)
- Zničitelný explozí
- Scoring: 10 bodů (15 po otevření Exitu)

#### DIRT:
- Rockford může kopat
- Zničitelná explozí
- Amoeba může pohltit

#### WALL (Brick):
- Zničitelná explozí
- Boulder/Diamond z ní sjíždí

#### TITANIUM WALL:
- **NEZNIČITELNÁ** (ani explozí)
- Boulder/Diamond z ní NESJÍŽDÍ (není "rounded")

#### EXIT:
- Otevře se po sebrání required diamonds
- Nezničitelný explozí
- Rockford vstupem vyhrává level

#### FIREFLY (Enemy):
- Navigace: **CLOCKWISE** (preferuje LEFT = NEXT_DIRECTION_TO_LEFT)
- Zastaví se: když není vlevo volno
- Death conditions:
  - ✅ Falling **BOULDER**
  - ✅ Falling **DIAMOND**
  - ✅ Amoeba **TOUCH**
- Při smrti: **STANDARD EXPLOSION** (3x3 Empty Space)
- Zabíjí Rockforda při dotyku

#### BUTTERFLY (Enemy):
- Navigace: **COUNTERCLOCKWISE** (preferuje RIGHT = NEXT_DIRECTION_TO_RIGHT)
- Zastaví se: když není vpravo volno
- Death conditions:
  - ✅ Falling **BOULDER**
  - ✅ Falling **DIAMOND**
  - ✅ Amoeba **TOUCH**
- Při smrti:
  - Direct kill (Boulder/Diamond/Amoeba) → **9 DIAMONDS**
  - Chain explosion (killed by explosion) → **NO BONUS** (Empty Space)
- Zabíjí Rockforda při dotyku

#### EXPLOSION:
- Radius: **3x3** oblast
- Ničí: všechno kromě Titanium Wall a Exit
- Firefly explosion → 9x Empty Space
- Butterfly explosion → 9x Diamonds (nebo Empty Space při chain)
- Chain rule: "Can contain 9 Diamonds upon being killed but not in explosions"

#### AMOEBA:
- Roste přes Empty Space a Dirt
- Zabíjí Firefly/Butterfly při dotyku (okamžitá exploze)
- Transformace: 200 units → Boulders, enclosed → Diamonds
- Zničitelná explozí

#### MAGIC WALL:
- Konverze: Boulder ↔ Diamond
- Aktivace při průchodu falling objektu
- Časově omezená
- Zničitelná explozí

---

## 🔍 TYPICKÉ CHYBY - NIKDY JE NEOPAKOVAT:

### ❌ CHYBA: "Boulder zabíjí nepřátele"
**Správně:** "Boulder **A DIAMOND** zabíjí nepřátele"
**Důvod:** Pravidlo říká "falling Boulder **or Diamond**" - jsou to 2 objekty!

### ❌ CHYBA: "Butterfly naviguje jinak než Firefly"
**Správně:** "Butterfly má **jiný směr preference** (RIGHT vs LEFT) **ALE** stejné death conditions jako Firefly"
**Důvod:** Rozdíl v navigaci ≠ rozdíl ve VŠECH vlastnostech

### ❌ CHYBA: "Butterfly dropne 9 diamonds při smrti"
**Správně:** "Butterfly dropne 9 diamonds **POUZE při direct kill** (Boulder/Diamond/Amoeba), **NE při chain explosion**"
**Důvod:** Pravidlo explicitně říká "but not in explosions"

### ❌ CHYBA: "Implementoval jsem boulder physics"
**Správně:** "Implementoval jsem boulder **A DIAMOND** physics - Diamond má STEJNOU fyziku"
**Důvod:** Diamond má tag BOULDER_TAG → sdílí fyziku, musím to vědět

---

## 📝 PRACOVNÍ POSTUP PŘI IMPLEMENTACI:

### KROK 1: ANALÝZA ÚKOLU
```
1. Přečíst zadání
2. Identifikovat VŠECHNY objekty v úkolu
3. Pro KAŽDÝ objekt:
   - Najít VŠECHNA pravidla (pohyb, death, spawn, interactions)
   - Zkontrolovat pravidla proti tomuto dokumentu
   - Vytvořit checklist vlastností
```

### KROK 2: NÁVRH IMPLEMENTACE
```
1. Navrhnout funkce
2. Pro KAŽDOU funkci ověřit:
   - Řeší VŠECHNY vlastnosti objektu?
   - Řeší interakce s VŠEMI objekty?
   - Edge cases?
3. Cross-check proti checklistu z kroku 1
```

### KROK 3: VALIDACE NÁVRHU
```
PŘED odesláním návrhu user:
□ Vytvořil jsem checklist všech pravidel?
□ Každé pravidlo má implementaci?
□ Zkontroloval jsem "or" varianty (A or B or C)?
□ Zkontroloval jsem podobné objekty (Firefly vs Butterfly)?
□ Prošel jsem validační checklist (interně; do odpovědi jen výsledek a co neprošlo)?
```

### KROK 4: IMPLEMENTACE
```
1. Implementovat podle návrhu
2. Po každé funkci: cross-check proti checklistu
3. Otestovat mentálně edge cases
```

---

## 🚨 RED FLAGS - OKAMŽITĚ ZASTAVIT A ZKONTROLOVAT:

Pokud vidím v MOJE odpovědi:
- ❌ "podobně jako X" → OVĚŘIT všechny rozdíly I podobnosti
- ❌ "mainly" / "primárně" → Co jsem VYNECHAL?
- ❌ Implementuji objekt, ale nezmiňuji VŠECHNY jeho death conditions
- ❌ Implementuji podobné objekty (Firefly/Butterfly), ale nezmiňuji co mají SPOLEČNÉ

---

## 💡 KOMUNIKACE S USEREM:

### CO NIKDY NEŘÍKAT:
- ❌ "Nastudoval jsem pravidla" (pokud jsem nepřečetl KAŽDÝ detail)
- ❌ "Boulder zabíjí..." (správně: "Boulder a Diamond zabíjí...")
- ❌ "Implementoval jsem X" (pokud jsem vynechal část pravidel)

### CO VŽDy ŘÍKAT:
- ✅ "Implementoval jsem X včetně VŠECH pravidel: A, B, C"
- ✅ "Zkontroloval jsem death conditions: Boulder ✓, Diamond ✓, Amoeba ✓"
- ✅ "Butterfly má odlišnou navigaci (RIGHT), ale STEJNÉ death conditions jako Firefly"
- ✅ **VALIDAČNÍ CHECKLIST** projdi interně; do odpovědi jen výsledek (a co neprošlo), ne celý checklist

---

## 🎯 CÍLE:

1. User nemusí NIKDY opakovat pravidla, která jsou v tomto dokumentu
2. User nemusí NIKDY upozorňovat na vynechané detaily
3. Každá moje odpověď je **KOMPLETNÍ** na první pokus
4. Být **užitečný pomocník**, ne zdroj frustrace

---

## 📚 ZDROJE PRAVIDEL:
- Original game documentation: https://strategywiki.org/wiki/Boulder_Dash/Objects
- Tento dokument je MASTER reference pro implementaci
- Doslovná kopie pravidel ze StrategyWiki a jejich rozbor: [`docs/strategywiki-objects.md`](docs/strategywiki-objects.md)
- Historie hry, Atari verze, generátor jeskyní (PRNG) a dostupné zdrojové kódy:
  [`docs/historie-a-zdroje.md`](docs/historie-a-zdroje.md)

---

## 🖥️ IMPLEMENTAČNÍ REFERENCE (mimo herní pravidla)

Stručný rozcestník k tomu, jak je hra technicky postavená (detaily a aktuální stav
viz `README.md`):

- **Ostrý Atari font** (`src/ui/AtariFont.ts`): charset z balíku `EightBit-Atari-Fonts-2`
  (default **ATARIPL**) se při načtení přemaskuje na RGBA (průhledné pozadí) a
  zaregistruje jako Phaser **RetroFont**. Texty UI píšeme VERZÁLKAMI (charset 0–63 = ASCII 32–95).
- **Welcome úvod** (`WelcomeScene.ts`): dva Rockfordi „nanosí" písmena BOULDER DASH
  po mřížce (sokoban-tlačení), levý BOULDE zleva, pravý RDASH zprava; B a H nakonec.
  Vše laditelné v `INTRO_CFG`. Přerušitelné klávesou.
- **Rolovací duha** v titulku: barvy `RAINBOW_COLORS` vytažené z `resources/atari-dev-a-1.png`
  (každá světlá→tmavá), maska = tvar písmen, scroll `tilePositionY`. Historická
  předloha (DLI raster bars) je v `atari.md`.
- **Deterministický PRNG** (`src/core/Rng.ts`): věrný překlad rutiny `PseudoRandom`
  (viz `docs/historie-a-zdroje.md`); používá se pro `canPush` a růst amoeby, seedovaný per jeskyně.
- **Spritesheet framy** (`resources/sprites_source.png`, 10×13): idle 0–2 (blink) a 3 (podupnutí,
  noha vždy končí na zemi); framy 4/9 jsou PRÁZDNÉ (nepoužívat); magic wall 50–53,
  amoeba 60–63, firefly 80, butterfly 90, explosion 100.
- **Barevná schémata jeskyní** (`src/core/SpritePalette.ts` + `levels/schemes.txt`):
  `resources/sprites_source.png` je ŠABLONA (6-barevný indexovaný list = „sloty" base/shadow/hi/
  accent/ink, index 0 průhledný). Schéma nastaví barvy slotů GLOBÁLNĚ i PER ENTITA
  (`diamond.base #...`). Za běhu se ze šablony vyrobí obarvená RGBA textura "bd"
  (frame→entita podle `ENTITY_FRAMES`), cache per schéma. Sprity/anim dál používají "bd".
  Pozn.: některé framy jsou sdílené (titan = zavřený exit, born = exploze) → sdílí barvy.
- **Definice jeskyně** (`CaveLoader.ts`): `.txt` = hlavička `klíč: hodnota`
  (name/diamonds/time/speed/scheme) + `---` + mapa 40×22. `speed` = délka herního ticku.
- **In-game HUD** (`GameScene.createUI`/`updateUI`): bitmap font, vlevo ikona diamantu
  + sebráno/potřeba (zezelená po splnění), uprostřed čas (barevně), vpravo skóre
  (6 míst, origin vpravo → neskáče). Název jeskyně = **title card** přes plochu
  (`showTitleCard`): bílé písmo + černý 8-směrný obrys, fade in/hold/out (tween `hold`+`yoyo`).
- **Ladící TEST scény** na začátku menu: čísla 101+ v `CaveLoader.ts` (`TEST_FILES`).
