# Roman Runner

Ein 3D-Endless-Runner im antiken Rom. Du läufst die Via Appia entlang, weichst Säulentrümmern, herabhängenden Bannern und römischen Wagen aus.

Gebaut mit **TypeScript**, **Three.js** und **Vite** — ohne weitere Frameworks.

## Steuerung

| Taste | Aktion |
|-------|--------|
| ← / → (oder A/D) | Bahn wechseln |
| ↑ (oder W / Leertaste) | Springen |
| ↓ (oder S) | Ducken |

## Lokal starten

Voraussetzung: Node.js ≥ 18.

```bash
npm install
npm run dev
```

Vite öffnet das Spiel automatisch im Browser unter `http://localhost:5173`.

### Produktiv-Build

```bash
npm run build
npm run preview
```

Das fertige Bundle liegt in `dist/`.

## Auf Vercel deployen

1. Repo zu GitHub pushen.
2. Auf [vercel.com](https://vercel.com) → **New Project** → das Repo importieren.
3. Vercel erkennt Vite automatisch. Build-Command (`npm run build`) und Output-Directory (`dist`) sind bereits in `vercel.json` festgelegt — nichts manuell einstellen.
4. **Deploy** klicken.

Bei jedem Push auf `main` baut Vercel automatisch neu.

## Projektstruktur

```
.
├── index.html          # HUD-Overlay + Start-Screen
├── src/
│   ├── main.ts         # Entry-Point
│   ├── game.ts         # Hauptklasse: Loop, Szene, Kamera, State
│   ├── player.ts       # Spielfigur, Sprung, Duck, Lane-Wechsel
│   ├── world.ts        # Straße + Säulen/Statuen, Segment-Recycling
│   ├── obstacles.ts    # 3 Hindernistypen, Spawning, Kollision
│   ├── input.ts        # Tastatur → semantische Aktionen
│   ├── ui.ts           # DOM-Wrapper für HUD / Overlay
│   └── constants.ts    # Tuning-Werte (Speed, Lanes, Farben)
├── vite.config.ts
├── tsconfig.json
├── vercel.json
└── package.json
```

## Roadmap

Aktuell enthalten:

- [x] Charakter mit Lorbeerkranz, der automatisch nach vorne läuft
- [x] 3-Lane-System mit smoothem Wechsel
- [x] Springen und Ducken
- [x] Drei Hindernistypen (niedrig / hoch / volle Bahn)
- [x] Endlose Welt mit Säulen und Statuen am Wegesrand
- [x] Geschwindigkeit steigt mit der Zeit
- [x] Highscore-Speicherung via localStorage
- [x] Game-Over-Screen mit Neustart

Noch ausstehend (bewusst weggelassen für den ersten Prototypen):

- [ ] Münzen einsammeln
- [ ] Power-Ups (Magnet, Schild)
- [ ] Sound / Musik
- [ ] Bessere Texturen
