# Boulder Dash: pravidla objektů ze StrategyWiki

> Přesunuto doslova z `CLAUDE.md` (sekce „ORIGINÁLNÍ PRAVIDLA ZE STRATEGYWIKI“ a „KLÍČOVÉ DETAILY Z PRAVIDEL“)
> 25. 11. 2026, aby se referenční text nenačítal v každé session. Stručná pravidla pro implementaci zůstávají
> v [`CLAUDE.md`](../CLAUDE.md), sekce „BOULDER DASH - KLÍČOVÉ MECHANIKY“.

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
