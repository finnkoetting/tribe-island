# Tribez Browser Game – Zusammenfassung (Projektstatus)

Diese Datei fasst **drei zentrale Dokumente** zusammen:
1. Aktuelle Projektstruktur  
2. Entwicklungs‑To‑Do / Fortschritt  
3. Ziel‑Ordnerstruktur (Next.js, modular)

Ziel: **ein schneller Gesamtüberblick**, ohne sich durch mehrere PDFs zu lesen.

---

## 1. Aktuelle Projektstruktur (IST‑Zustand)

### Architektur
- **Next.js App Router**
- Saubere Trennung:
  - UI (`app/`)
  - Engine & Logik (`src/game/`)
  - Assets (`public/`)
- Engine ist **UI‑unabhängig**
- `/game` und `/debug` strikt getrennt

### Wichtige Bereiche
- `app/game/`  
  → Game Entry, Layout, Client (Gameplay + Debug)
- `app/debug/`  
  → State‑Inspector, Cheats, Dev‑HUD (nur DEV_MODE)
- `src/game/engine/`  
  → Tick‑System, Commands, Create‑Logik
- `src/game/domains/`  
  → Fachlogik (World, Economy, Buildings)
- `src/game/types/`  
  → Single Source of Truth (GameState)

**Status:**  
Sehr solide, skalierbare Basis für Simulation, Debugging und spätere Features.

---

## 2. Entwicklungs‑Status & To‑Do

### ✅ Bereits vollständig umgesetzt

#### Core & Architektur
- Zentrale GameState‑Struktur
- Engine / Domain / UI sauber getrennt
- Vollständige TypeScript‑Typisierung
- Event‑System im State

#### Zeit & Tagesablauf
- 30 Min = 1 Ingame‑Tag
- Phasen: Nacht → Morgen → Tag → Abend
- Uhrzeit‑Hooks:
  - 07:00 Frühstück
  - 08:00 Arbeitsbeginn
  - 19:00 Abendessen
  - 20:00 Schlafen

#### Villager‑System
- Stats (Work, Morale, Needs)
- Jobs & Jobwechsel
- Zuweisung zu Gebäuden

#### Economy & Buildings
- Inventory‑System
- Beeren als erste Ressource
- Ressourcen‑Verbrauch (Essen)
- Gebäude‑Placement mit Regeln
- Tasks mit ms‑basiertem Fortschritt
- Collect‑Mechanik + Progressbars

#### Debug & UI
- `/debug` Route
- Live GameState‑Inspector
- Cheats (Ressourcen, Pause, Speed, Spawns)
- HUD: Uhr, Phase, Flags

**Fazit:**  
👉 Die komplette **Core‑Simulation läuft stabil**.

### 🔜 Nächste logische Schritte
- WorldCanvas (Klick‑Placement)
- Storage & Kapazitäten
- Quests / Daily Tasks
- Villager‑Bewegung & Animation
- Save / Load
- Balancing

---

## 3. Ziel‑Ordnerstruktur (SOLL‑Architektur)

### Leitprinzipien
- Keine riesigen Dateien
- Domain‑ & Feature‑basiert
- Assets **nur** in `public/assets`
- Code referenziert Assets über **IDs**
- Barrel‑Exports (`index.ts`) überall

### Wichtige Konzepte

#### Engine
- `commands/` → Aktionen (ändern State)
- `queries/` → reine View‑Daten für UI
- `tick/` → Simulation & Phasen
- `events/` → EventBus
- `rng/` → deterministischer Zufall

#### Domains
- `world/` → Grid, Platzierung, Navigation
- `economy/` → Inventory, Kosten, Kapazität
- `buildings/` → Tasks, Produktion, Collect
- `villagers/` → Needs, AI, Jobs, Krankheit
- `quests/` → Daily‑ & Projekt‑Quests
- `trade/` → Karawanen, Deals, Überfälle
- `threats/` → Angriffe & Krisen

#### Content‑Layer
- Reine Definitionsdaten:
  - Ressourcen
  - Gebäude
  - Villager
  - Quests
  - Handel
→ **Balancing ohne Code‑Änderung**

#### Rendering & UI
- Canvas / Iso‑Renderer
- Animation‑System
- FX (Progress, Collect, Events)
- UI liest **nur Queries**, niemals State direkt

---

## Gesamtbewertung

**Du bist an einem extrem starken Punkt:**
- Engine & Simulation sind fertig
- Debugging ist vorbildlich
- Architektur ist zukunftssicher

### Aktueller Fokus sollte sein:
1. **WorldCanvas & Interaktion**
2. **Bewegung & visuelles Leben**
3. **Quests als Spieler‑Leitplanke**

> Alles Weitere (Balancing, Content, Polishing) baut sauber darauf auf.

---

_Ende der Zusammenfassung_
