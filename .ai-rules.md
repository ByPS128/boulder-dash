# AI ASSISTANT RULES & PROCEDURES
# Pro projekt: Boulder Dash JS Clone

## DŮLEŽITÉ: TENTO DOKUMENT ČÍST VŽDy NA ZAČÁTKU SESSION!

---

## 📋 ZÁKLADNÍ PRAVIDLA:

### 1. ÚPLNOST A DŮSLEDNOST
- ❌ NIKDY nepředpokládat, že "něco už funguje"
- ✅ VŽDy EXPLICITNĚ OVĚŘIT každý detail
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
- Amoeba může pohltit (až bude implementována)

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

#### AMOEBA (zatím neimplementována):
- Roste přes Empty Space a Dirt
- Zabíjí Firefly/Butterfly při dotyku (okamžitá exploze)
- Transformace: 200 units → Boulders, enclosed → Diamonds
- Zničitelná explozí

#### MAGIC WALL (zatím neimplementována):
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
□ Explicitně jsem napsal validační checklist do odpovědi?
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
- ❌ "už funguje" → OVĚŘIT explicitně
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
- ✅ Na konci odpovědi: **VALIDAČNÍ CHECKLIST**

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

---

## 📖 ORIGINÁLNÍ PRAVIDLA ZE STRATEGYWIKI

**Zdroj:** https://strategywiki.org/wiki/Boulder_Dash/Objects
**Poznámka:** Toto je doslovná kopie pravidel ze StrategyWiki, aby nebylo nutné parsovat HTML online.

---

### **Rockford (Player Character)**
- Player-controlled character
- Can move in 4 directions
- Can dig Dirt
- Can collect Diamonds
- Can push Boulders
- Can enter Exit to complete cave
- Can be killed by:
  * Falling objects
  * Explosions
  * Enemy contact

### **Empty Space**
- Can be occupied by characters, enemies, objects, obstacles

### **Dirt**
- Can be dug by Rockford
- Destroyable by explosions
- Can be overtaken by Amoeba

### **Boulder**
- Falls downward
- Rolls off Walls, Boulders, Diamonds
- Can be pushed by Rockford
- Pushes randomly determined
- Converts to Diamond through Magic Wall
- Destroyable by explosions

### **Diamond**
- Collectible by Rockford when stationary
- Falls downward
- Rolls off Walls, Boulders, Diamonds
- Converts to Boulder through Magic Wall
- Destroyable by explosions

### **Wall**
- Destroyable by explosions

### **Titanium Wall**
- Indestructible

### **Magic Wall**
- Activates when Boulder/Diamond drops through
- Converts Boulders and Diamonds
- Conversions can fail if space below is occupied
- Limited active duration
- Destroyable by explosions

### **Firefly (Enemy)**
- Navigates clockwise
- Pauses if no left-side empty space
- Killed by falling Boulder/Diamond
- Killed by Amoeba contact

### **Butterfly (Enemy)**
- Navigates counterclockwise
- Pauses if no right-side empty space
- Killed by falling Boulder/Diamond
- Killed by Amoeba contact
- **Contains 9 Diamonds when killed (except in explosions)**

### **Amoeba**
- Grows randomly in speed/direction
- Grows over Empty Space/Dirt
- Kills Butterflies/Fireflies on contact
- Converts to Boulders at 200 units
- Converts to Diamonds if growth stops
- Destroyable by explosions

### **Exit**
- Resembles Titanium Wall initially
- Reveals when sufficient Diamonds collected
- Allows level completion when entered by Rockford

---

## 🔑 KLÍČOVÉ DETAILY Z PRAVIDEL:

### Falling Objects (Boulder & Diamond):
- **"Falls downward"** - oba objekty padají
- **"Rolls off Walls, Boulders, Diamonds"** - oba objekty sjíždí z těchto povrchů
- Boulder i Diamond jsou **deadly when falling**

### Enemy Death Conditions:
- **"Killed by falling Boulder/Diamond"** - je to "**Boulder OR Diamond**", ne jen Boulder!
- **"Killed by Amoeba contact"** - dotyk s Amoebou
- Firefly: standardní exploze (Empty Space)
- Butterfly: **"Contains 9 Diamonds when killed (except in explosions)"**
  - Direct kill → 9 diamonds
  - Chain explosion → no diamonds

### Magic Wall:
- **"Converts Boulders and Diamonds"** - obousměrná konverze
- **"Conversions can fail if space below is occupied"** - musí být místo pod zdí
- **"Limited active duration"** - časově omezená

### Amoeba:
- **"Converts to Boulders at 200 units"** - při velkém růstu
- **"Converts to Diamonds if growth stops"** - když je obklopena
- **"Kills Butterflies/Fireflies on contact"** - okamžitá smrt nepřátel

---

**POSLEDNÍ KONTROLNÍ OTÁZKA PŘED KAŽDOU ODPOVĚDÍ:**
"Přečetl jsem si .ai-rules.md a postupoval podle něj?"

**ANO → pokračuj**
**NE → STOP, přečti .ai-rules.md a začni znovu**
