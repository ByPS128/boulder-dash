# Boulder Dash JS

TypeScript klon klasické hry Boulder Dash z Atari, implementovaný pomocí KaPlay 3000.x frameworku.

## 🎮 Jak spustit hru

### **Varianta 1: Dvojklik (NEJJEDNODUŠŠÍ)**
```
Dvojklik na soubor: start.cmd
```
→ Nainstaluje závislosti, sestaví projekt, spustí dev server a otevře prohlížeč automaticky

### **Varianta 2: V Rideru (DOPORUČENO pro vývoj)**
```
1. Otevři projekt v Rideru
2. Nahoře vpravo: Dropdown → "Boulder Dash Dev"
3. Klikni na zelenou šipku ▶️
```
→ Dev server se spustí v terminalu Rideru s live reload

### **Varianta 3: Manuálně**
```cmd
cd C:\repo\github\ByPS\boulder-dash-js
npm install
npm run dev
```
Pak otevři: http://localhost:8000

---

## 📚 Dokumentace

### Pravidla hry
Kompletní popis mechanik a objektů:
https://strategywiki.org/wiki/Boulder_Dash/Objects

### AI dokumentace
Interní pravidla pro AI asistenta:
`CLAUDE.md`

---

## 🛠️ Technologie

- **Engine:** KaPlay 3000.x (nástupce Kaboom.js)
- **Jazyk:** TypeScript
- **Build Tool:** Vite
- **Bundler:** ESBuild (via Vite)

---

## 🎯 Implementované objekty

- ✅ Rockford (hráč)
- ✅ Boulder (kámen) - s padáním a skluzem
- ✅ Diamond (diamant) - sbíratelný, **STEJNÁ FYZIKA jako Boulder**
- ✅ Dirt (hlína) - kopatelná
- ✅ Wall (zeď) - zničitelná
- ✅ Titanium Wall - nezničitelná
- ✅ Exit (východ) - otevře se po sebrání diamantů
- ✅ Firefly (světluška) - navigace clockwise, zabíjen padajícím Boulderem/Diamantem
- ✅ Butterfly (motýl) - navigace counterclockwise, dropne 9 diamantů při direct kill
- ✅ Explosion (exploze) - 3x3 oblast, butterfly explosion vs chain explosion
- ❌ Amoeba (améba) - připraveno, ale neimplementováno
- ❌ Magic Wall - připraveno, ale neimplementováno

---

## 🕹️ Ovládání

- **Šipky / WASD:** Pohyb Rockforda
- **Escape:** Pauza (zatím není implementováno)

---

## 📁 Struktura projektu

```
boulder-dash-js/
├── src/
│   ├── main.ts                    # Entry point, KaPlay initialization
│   ├── config/
│   │   ├── constants.ts           # Game constants (board size, tags, etc.)
│   │   ├── sprites.ts             # Sprite loading and animations
│   │   └── levels.ts              # Level definitions
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces and types
│   ├── entities/
│   │   └── EntityFactory.ts       # Factory for creating game objects
│   ├── systems/
│   │   ├── PhysicsSystem.ts       # Gravity, falling, rolling mechanics
│   │   ├── ExplosionSystem.ts     # Explosion creation and effects
│   │   ├── EnemySystem.ts         # Firefly/Butterfly AI and movement
│   │   └── InputSystem.ts         # Keyboard input handling
│   ├── scenes/
│   │   └── GameScene.ts           # Main game scene and loop
│   └── utils/
│       └── directions.ts          # Direction utility functions
├── resources/
│   └── spritesheet_A.png          # Sprite atlas (10x13 grid)
├── dist/                          # Build output (generated)
├── index.html                     # HTML entry point
├── package.json                   # NPM dependencies
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite build configuration
├── start.cmd                      # Quick start script
├── .run/
│   └── Boulder Dash Dev.run.xml   # Rider run configuration
├── CLAUDE.md                      # AI assistant rules
└── README.md                      # Tento soubor
```

---

## 🚀 Vývoj

### Instalace závislostí
```cmd
npm install
```

### Spuštění dev serveru (s live reload)
```cmd
npm run dev
```

### Build pro produkci
```cmd
npm run build
```

### Preview production buildu
```cmd
npm run preview
```

### Type checking
```cmd
npm run type-check
```

---

## 🏗️ Architektura

### Modulární struktura
Hra je rozdělena do logických celků:
- **Config:** Konstanty, sprite definice, levely
- **Types:** TypeScript interfaces a typy
- **Entities:** Factory pro vytváření herních objektů
- **Systems:** Nezávislé systémy (fyzika, exploze, AI, input)
- **Scenes:** Herní scény a hlavní game loop
- **Utils:** Pomocné funkce

### Component-Based Design
Využívá KaPlay component systém:
- Každý objekt má komponenty (sprite, position, area, custom)
- Tagy pro identifikaci (`rockford`, `boulder`, `enemy`, atd.)
- Role tagy pro skupinové chování (`moveable`, `enemy`)

### Systémy
- **PhysicsSystem:** Gravitace, padání, skluz boulderů/diamantů
- **ExplosionSystem:** Vytváření explozí (standard vs butterfly)
- **EnemySystem:** AI pro Firefly (clockwise) a Butterfly (counterclockwise)
- **InputSystem:** Zpracování klávesnice s "sticky keys"

---

## 🎮 Herní mechaniky

### Boulder/Diamond Physics
- Padá dolů pokud je prostor volný
- Sjíždí z: Walls, Boulders, Diamonds (priorita: vlevo > vpravo)
- Zabíjí Rockforda/nepřátele **POUZE při pádu** (isFalling=true)
- Diamond má **STEJNOU fyziku** jako Boulder (tag BOULDER_TAG)

### Enemy Behavior
**Firefly:**
- Navigace **CLOCKWISE** (preferuje LEFT)
- Death: falling Boulder **OR** Diamond **OR** Amoeba touch
- Exploze: standard (9x Empty Space)

**Butterfly:**
- Navigace **COUNTERCLOCKWISE** (preferuje RIGHT)
- Death: falling Boulder **OR** Diamond **OR** Amoeba touch
- Exploze:
  - Direct kill (Boulder/Diamond/Amoeba) → **9 DIAMONDS**
  - Chain explosion → **NO BONUS** (Empty Space)

### Explosion Rules
- 3x3 oblast
- Ničí vše kromě Titanium Wall a Exit
- Chain detection: enemies killed by explosion mají flag `killedByExplosion`

---

## 📝 License

MIT (nebo dle tvého výběru)

---

## 🔄 Migration z Kaboom 0.6.0 na KaPlay 3000.x

### Hlavní změny:
- `kaboom()` → `kaplay()`
- `global: true` již není podporováno (musí se importovat `k` kontext)
- `action()` → `onUpdate()`
- `solid()` → `area()` (pro collision)
- `loadRoot()` → `loadRoot()` (stejné, ale jiné chování)
- Sprite animace: jiný API pro `onAnimEnd()`

### TypeScript Benefits:
- Type safety pro všechny herní objekty
- Autocomplete v IDE
- Compile-time error checking
- Better refactoring support

---

## 🐛 Known Issues

- Win/Lose scény zatím nejsou implementovány (console.log)
- Pause funkce není implementována
- Amoeba a Magic Wall nejsou implementovány

---

## 🎯 TODO (budoucí features)

- [ ] Win/Lose scény
- [ ] Pause menu
- [ ] Amoeba implementation
- [ ] Magic Wall implementation
- [ ] Sound effects
- [ ] Music
- [ ] More levels (Cave B, C, D...)
- [ ] High score system
- [ ] Settings menu

---

**Enjoy! 💎🪨**
