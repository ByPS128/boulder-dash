# Boulder Dash JS

JavaScript klon klasické hry Boulder Dash z Atari, implementovaný pomocí Kaboom.js frameworku.

## 🎮 Jak spustit hru

### **Varianta 1: Dvojklik (NEJJEDNODUŠŠÍ)**
```
Dvojklik na soubor: start.cmd
```
→ Server se spustí, prohlížeč se otevře automaticky

### **Varianta 2: V Rideru (DOPORUČENO pro vývoj)**
```
1. Otevři projekt v Rideru
2. Nahoře vpravo: Dropdown → "Boulder Dash"
3. Klikni na zelenou šipku ▶️
```
→ Server se spustí v terminalu Rideru

### **Varianta 3: Manuálně (starý způsob)**
```cmd
cd C:\repo\github\ByPS\boulder-dash-js
python3 simple-cors-http-server.py
```
Pak otevři: http://localhost:8000/BoulderDash.html

---

## 📚 Dokumentace

### Pravidla hry
Kompletní popis mechanik a objektů:
https://strategywiki.org/wiki/Boulder_Dash/Objects

### AI dokumentace
Interní pravidla pro AI asistenta:
`.ai-rules.md`

---

## 🛠️ Technologie

- **Engine:** Kaboom.js v0.6.0
- **Jazyk:** JavaScript (vanilla)
- **Server:** Python SimpleHTTPServer s CORS

---

## 🎯 Implementované objekty

- ✅ Rockford (hráč)
- ✅ Boulder (kámen) - s padáním a skluzem
- ✅ Diamond (diamant) - sbíratelný
- ✅ Dirt (hlína) - kopatelná
- ✅ Wall (zeď) - zničitelná
- ✅ Titanium Wall - nezničitelná
- ✅ Exit (východ) - otevře se po sebrání diamantů
- ✅ Firefly (světluška) - navigace clockwise
- ✅ Butterfly (motýl) - navigace counterclockwise, dropne 9 diamantů
- ✅ Explosion (exploze) - 3x3 oblast
- ❌ Amoeba (améba) - připraveno, ale neimplementováno
- ❌ Magic Wall - připraveno, ale neimplementováno

---

## 🕹️ Ovládání

- **Šipky:** Pohyb Rockforda
- **Escape:** Pauza (zatím není implementováno)

---

## 📁 Struktura projektu

```
boulder-dash-js/
├── game.js                      # Hlavní herní logika
├── BoulderDash.html             # Entry point
├── resources/
│   └── spritesheet_A.png        # Sprite atlas (10x13 grid)
├── start.cmd                    # Quick start script
├── .run/
│   └── Boulder Dash.run.xml     # Rider run configuration
├── simple-cors-http-server.py   # Python HTTP server
└── README.md                    # Tento soubor
```

---

## 🚀 Vývoj

### Spuštění dev serveru
```cmd
start.cmd
```

### Zastavení serveru
```
Ctrl+C v terminálu
```

---

## 📝 License

MIT (nebo dle tvého výběru)

