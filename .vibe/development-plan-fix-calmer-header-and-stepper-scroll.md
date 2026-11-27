# Development Plan: app-templates (fix/calmer-header-and-stepper-scroll branch)

*Generated on 2026-11-27 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Den Lektions-Kopf im Explainer deutlich beruhigen und den Scroll-Bug im Stepper beheben:
1. Kompaktes Burger-Menü (`☰ Inhalt`, `width: fit-content`) unter `< 64rem` mit sauberem Abstand zur Überschrift.
2. KI-Tutor-Button als gut lesbares Roboter-Icon + „Tutor“ im ruhigen Sekundär-Stil (`aria-label`/`title` nennen weiterhin den gewählten Assistenten).
3. Stepper als schlichte Tab-Leiste ohne grauen Kasten und ohne doppelte Trennlinie; auf Mobil (`< 48rem`) ausgeblendet.
4. Bugfix: Klick auf „Weiter“ / „Zurück“ / Schritt-Tab im Stepper scrollt nach oben (`window.scrollTo(0, 0)` + `focus({ preventScroll: true })`).

## Key Decisions
- **Tutor bleibt neben dem Titel, nicht in der Seitenleiste**: Klare Trennung zwischen Navigation (links) und Lern-Interaktion (Kopfzeile), aber visuell beruhigt.
- **Roboter-Icon + „Tutor“**: Kurzer, in normaler Schriftgröße gut lesbarer Text; der genaue Assistenten-Name bleibt über `aria-label` und `title` für Screenreader und Hover erhalten.
- **Kein Stepper auf Mobil (`< 48rem`)**: Mobil wird natürlich vertikal gescrollt (Fortschrittsbalken + `☰ Inhalt` reichen).

## Explore
### Entrance Criteria
- Branch `fix/calmer-header-and-stepper-scroll` von `main` angelegt.

### Tasks
- [x] Tutor-Button-Rendering (`explainer.ts`, `explainer.css`) und E2E-Checks (`e2e.ts`) geprüft

### Completed
- [x] Created development plan file
- [x] Tutor-Markup und E2E-Assertions (`e2e.ts` Zeilen 1597, 1850) identifiziert

## Plan
### Entrance Criteria
- Explore abgeschlossen.

### Tasks
- [x] `render.ts`: Burger-Symbol `☰` in `.explainer-nav-toggle` ergänzen
- [x] `explainer.ts`: Roboter-SVG + „Tutor“ mit `aria-label`/`title` sowie Scroll-to-top in `showStep` umsetzen
- [x] `explainer.css`: Kompaktes `☰ Inhalt`, ruhiger Tutor-Button, schlichte Stepper-Tab-Leiste, kein Stepper auf `< 48rem`, doppelte Trennlinie entfernen
- [x] `e2e.ts`: Tutor-Button-Assertions und 360px-Stepper-Test anpassen

### Completed
- [x] Plan vollständig erstellt

## Code
### Entrance Criteria
- Plan steht fest.

### Tasks
- [x] Änderungen in `render.ts`, `explainer.ts`, `explainer.css`, `e2e.ts` umsetzen
- [x] `vp check`, `check:vue`, `vp pack` und E2E-Tests (`test/explainer-navigation.test.ts`, Playwright Desktop & 360px Tutor/Stepper, `lernapps check`) laufen lassen

### Completed
- [x] Burger-Menü (`☰ Inhalt`), ruhiger Tutor-Button (Roboter-SVG + „Tutor“), Tab-Stepper, Mobile-Ausblendung und Scroll-to-top umgesetzt
- [x] `vp check`, `check:vue`, `vp pack`, `explainer-navigation.test.ts` und Playwright-Tests für Tutor & Stepper grün

## Commit
### Entrance Criteria
- Alle lokalen Checks und Playwright-Tests grün.

### Tasks
- [x] Committen, pushen, PR erstellen, CI abwarten und squash-mergen

### Completed
- [x] Änderungen bereit für Commit und PR

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
