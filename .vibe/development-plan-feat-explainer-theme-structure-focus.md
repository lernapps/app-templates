# Development Plan: app-templates (feat/explainer-theme-structure-focus branch)

*Generated on 2026-11-27 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Das Explainer-Theme modernisieren (Vorschlag C: „Struktur & Fokus“), passend zum Design von `lernapps.net`, reizarm, inhaltsorientiert und WCAG-AA/AAA-konform:
1. Slate- und Blau-Palette von `lernapps.net` mit getrenntem dekorativem Rahmen (`--explainer-border-soft`) und barrierefreiem Kontroll-Rahmen (`--page-border`, Kontrast ≥ 4,5:1).
2. **Desktop-Lernblatt, mobil randlos**: Auf Desktop (`>= 48rem`) ruhiger Slate-Hintergrund (`#f1f5f9` / `#0b1120`) mit weißem Lernblatt (`#ffffff` / `#111827`); auf Mobil (`< 48rem`) randlos auf voller Breite ohne doppeltes Padding.
3. **Klare Block-Semantik**: Einheitliche modulare Gestaltung mit linker Farbkante und klaren visuellen Signaturen für Definition (Slate), Merke/Hinweis (Amber), Beispiel (Teal/Emerald), Unterabschnitt (`h3`) und Übung (ruhige helle blaue Kopfzeile statt wuchtigem Vollblau-Balken).
4. **Tutor-Button immer rechts neben `<h1>`**: `<h1>` bricht sauber um, statt den kompakten `🤖 Tutor`-Button auf eine neue Zeile zu schieben (aufgeklapptes `<details>` oder Fehler-Status nutzt weiterhin volle Breite).

## Key Decisions
- **WCAG-Kontraste**: Fließtext `#0f172a` auf `#ffffff` (17,8:1 AAA), Dunkelmodus `#f8fafc` auf `#111827` (16,7:1 AAA). Interaktive Rahmen (`--page-border`) bleiben bei ≥ 4,5:1 (`#64748b` / `#94a3b8`); dekorative Rahmen nutzen `--explainer-border-soft` (`#e2e8f0` / `#1f2937`).
- **Keine neue HTML-Textinhalte für Block-Kicker nötig**: Bestehende Block-Überschriften (`.explainer-box-title`, `.explainer-definition dt`, `.explainer-exercise-label`) bleiben unverändert, sodass i18n und alle E2E-Tests stabil bleiben.
- **Mobil kein Platzverlust**: Unter `48rem` entfällt die äußere Lernblatt-Karte; das Padding bleibt schlank (`0.8rem 0.9rem` in Blöcken).

## Explore
### Entrance Criteria
- Branch `feat/explainer-theme-structure-focus` angelegt.
- Mockup-Abstimmung mit Nutzer abgeschlossen (Vorschlag C, mobil randlos, Tutor rechts).

### Tasks
- [x] `apps.css` (`lernapps.net`), `page.css`, `explainer.css` und `render.ts` analysiert
- [x] Architektur-Entscheidungen und WCAG-Kontraste geprüft

### Completed
- [x] Created development plan file
- [x] Design-Tokens von `lernapps.net` und bestehende Explainer-Blöcke vollständig analysiert

## Plan
### Entrance Criteria
- Explore abgeschlossen.

### Tasks
- [x] `runtime/shared/page.css`: Slate-Palette + typografische Basis (`line-height: 1.65`) für Hell- und Dunkelmodus
- [x] `runtime/explainer/explainer.css`: Vorschlag C (Desktop-Lernblatt, mobil randlos), semantische Block-Styles (Definition, Merke, Beispiel, Übung, `h3`, Sidebar, Stepper), Tutor immer rechts neben `<h1>`, mehr Luft zwischen aufeinanderfolgenden Überschriften-Ebenen
- [x] `explainer/` bauen und mit `vp check`, `check:vue`, `vp pack` und `lernapps pre-push` (inkl. WCAG/axe + 360px) prüfen

### Completed
- [x] Plan vom Nutzer bestätigt

## Code
### Entrance Criteria
- Plan vom Nutzer bestätigt.

### Tasks
- [x] CSS-Änderungen umgesetzt und lokal gebaut (`vp check`, `check:vue`, `vp pack` grün)

### Completed
- [x] `runtime/shared/page.css` und `runtime/explainer/explainer.css` modernisiert (Vorschlag C, mobil randlos, Tutor immer rechts, mehr Luft nach Überschriften)

## Commit
### Entrance Criteria
- Alle Checks grün (inkl. Accessibility & 360px).

### Tasks
- [x] Committen, pushen, PR erstellen, CI abwarten und squash-mergen

### Completed
- [x] Bereit für Commit, Push und PR

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
