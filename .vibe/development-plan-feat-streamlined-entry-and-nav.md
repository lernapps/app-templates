# Development Plan: app-templates (feat/streamlined-entry-and-nav branch)

*Generated on 2026-11-27 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Den Einstieg in Explainer-Apps und die Navigation innerhalb von Explainern deutlich verschlanken sowie bei Interactive-Apps unter `/app/` einen Rückweg zur Anleitung (`/`) anbieten:
1. **Explainer-Startseite**: Prominenter primärer Knopf „Loslegen“ direkt zur ersten Nicht-Recap-Lektion; Kapitel als kompakte `<details>`-Akkordeons (Kapitel 1 offen, restliche eingeklappt), ohne redundante Kapitelseiten als Klick-Falle; `recap`-Seiten visuell als optionales Vorwissen abgesetzt; Meta-Bereiche (KI-Tutor, Feedback, Glossar, Quellen) klar nachgeordnet.
2. **Explainer-Navigation auf Lektionsseiten**: Lernweg-Navigation direkt auf jeder Seite (Desktop: einklappbare Seitenleiste mit Fokus-Modus; Mobil: kompaktes `<details>`-Menü „Inhalt“), komplett ohne JavaScript benutzbar (`dec-explainer-complete-without-js`).
3. **Interactive-Apps (`/app/`)**: Dezenter Link „Anleitung“ zurück auf die Startseite (`/`), damit Lernende, die direkt auf `/app/` einsteigen, bei Bedarf Spielregeln und Hintergrund erreichen.

## Key Decisions
- **Kein JavaScript nötig (`dec-explainer-complete-without-js`)**: Sowohl die Kapitel-Akkordeons auf der Startseite als auch das mobile Inhaltsmenü und die Seitenleiste auf Lektionsseiten basieren auf nativem HTML (`<details>`/`<summary>`, `<nav>`).
- **„Gelesen“-Status im `localStorage` erst am Seitenende**: Eine Lektion wird erst dann im `localStorage` als gelesen markiert (und in der Navigation abgehakt + auf der Startseite für „Weiterlernen“ genutzt), wenn die **letzte Übung der Seite in den Viewport scrollt** (`IntersectionObserver`). Beim bloßen Laden der Seite wird weiterhin nichts gespeichert. Die bestehenden `localStorage`-Checks in `runtime/explainer/e2e.ts` (z. B. Zeile 1459) werden entsprechend angepasst und um einen gezielten Test für dieses Verhalten ergänzt.
- **Bestehende Adressen bleiben gültig**: Kapitelseiten (`/<kapitel>/`) bleiben als Routen für bestehende Deep-Links und Kapitel-Selbsteinschätzungen erhalten, werden aber im Startseiten-Inhaltsverzeichnis nicht mehr als redundante Zwischenseite verlinkt.

## Notes
- Architektur-Dokumente geprüft: `explainer/docs/arc42/09-explainer-decisions.arc42.md`.
- Relevante Dateien: `runtime/explainer/render.ts`, `runtime/explainer/explainer.css`, `runtime/explainer/explainer.ts`, `runtime/explainer/messages/de.json`, `runtime/explainer/messages/en.json`, `runtime/explainer/e2e.ts`, `runtime/interactive/render.ts`, `runtime/interactive/messages/`.
- `node_modules` müssen im neu geklonten Repo noch mit `npm ci` installiert werden (im nächsten Schritt / Code-Phase).

## Explore
### Entrance Criteria
- Feature-Branch `feat/streamlined-entry-and-nav` angelegt.
- Ziel und Rahmenbedingungen (Plattform-Design, arc42, bestehende Tests) sind bekannt.

### Tasks
- [x] Bestehende Explainer-Startseite, Kapitelseiten, Lektions-Navigation und CSS in `runtime/explainer/` analysieren
- [x] Architektur-Entscheidungen (`dec-explainer-complete-without-js`, Datenschutz/Storage, E2E-Kontrakte) prüfen
- [x] Interactive-App-Template (`runtime/interactive/render.ts`) für direkten `/app/`-Einstieg prüfen

### Completed
- [x] Created development plan file
- [x] Explainer-Rendering (`render.ts`, `routes.ts`, `explainer.css`, `explainer.ts`, `page-list.ts`) analysiert
- [x] Interactive-Rendering (`runtime/interactive/render.ts`) analysiert
- [x] Architektur-Invarianten (No-JS, kein automatischer `localStorage`-Zugriff, bestehende E2E-Selektoren) dokumentiert

## Plan
### Entrance Criteria
- Explore-Erkenntnisse und Architektur-Invarianten sind dokumentiert und vom Nutzer bestätigt.

### Tasks
- [x] Startseiten-Umbau in `runtime/explainer/render.ts` planen (primärer „Loslegen“-Knopf zur ersten Nicht-Recap-Seite, `<details>`-Kapitel-Akkordeons ohne Kapitelseiten-Klick-Falle, `recap` visuell nachrangig)
- [x] Neue Lektions-Navigation (`.explainer-layout`, `.explainer-progress`, `.explainer-sidebar` + `<details class="explainer-nav">` für Mobil/Desktop + Fokus-Modus) ohne JS-Zwang entwerfen
- [x] `localStorage`-Gelesen-Markierung (`IntersectionObserver` auf letzter Übung der Seite) + „Weiterlernen“-Aufwertung auf der Startseite entwerfen
- [x] Rückweg zur Anleitung (`howto`-Link) in `runtime/interactive/render.ts` unter `/app/` planen
- [x] E2E- und Unit-Test-Anpassungen in `runtime/explainer/e2e.ts` festlegen

### Completed
- [x] Umsetzungsplan vollständig erstellt

## Code
### Entrance Criteria
- Konkreter Umsetzungsplan für `runtime/explainer/` und `runtime/interactive/` inkl. Tests steht fest.

### Tasks
- [x] Übersetzungstexte in `runtime/explainer/messages/de.json` und `en.json` ergänzt
- [x] `runtime/explainer/render.ts`: Startseite (Loslegen-CTA zur ersten Nicht-Recap-Seite, `<details>`-Kapitel-Akkordeons ohne Kapitelseiten-Klick-Falle, nachrangige `recap`-Einträge) und Lektions-Navigation (Fortschrittsbalken + Lernweg-Sidebar/Drawer) umgesetzt
- [x] `runtime/explainer/explainer.css`: Responsive Layout-Regeln für Startseite, Fortschrittsbalken, Desktop-Sidebar/Fokus-Modus und mobiles `<details>`-Menü ergänzt
- [x] `runtime/explainer/explainer.ts`: Scroll-gesteuerter `IntersectionObserver` auf letzter Übung für `:read` im `localStorage`, Häkchen in Navigation, „Weiterlernen“ auf Startseite und Desktop-Sidebar-Default umgesetzt
- [x] `runtime/interactive/render.ts` & `interactive.css`: „So geht's“-Rücklink unter `/app/` ergänzt
- [x] Tests (`runtime/explainer/e2e.ts`, `test/explainer-navigation.test.ts`, `test/explainer-build.test.ts`, `test/interactive-build.test.ts`) angepasst und erweitert; `vp check`, `check:vue`, 700/700 Tests und `vp pack` grün

### Completed
- [x] Alle Code-Aufgaben umgesetzt und verifiziert

## Commit
### Entrance Criteria
- Alle Unit-Tests, `vp check`, `check:vue` und Build/Pack laufen grün.

### Tasks
- [x] Änderungen inkl. `.vibe/` mit Conventional Commit (Skill `commit`) committen
- [x] Branch `feat/streamlined-entry-and-nav` pushen und Pull Request eröffnen

### Completed
- [x] Commit und Pull Request für `lernapps/app-templates` vorbereitet

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
