# Development Plan: app-templates (feat/explainer-section-stepper branch)

*Generated on 2026-11-27 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Issue #223 umsetzen: Hauptabschnitte (`<section class="explainer-section">`) auf Explainer-Lektionsseiten mit JavaScript als kompakte Teil-Seiten (Stepper) mit klickbarer Schritt-Leiste oben, „Weiter“-Navigation unten und „Alle anzeigen“-Umschalter darstellen – ohne Build-Änderung und vollständig ohne JavaScript lesbar.

## Key Decisions
- **Reines Client-JS + CSS (`explainer.ts`, `explainer.css`)**: Kein Build-Umbau; ohne JS bleiben alle `<section class="explainer-section">` vollständig untereinander sichtbar (`dec-explainer-complete-without-js`).
- **Klickbare Schritt-Leiste + „Alle anzeigen“-Umschalter**: Ersetzt `.explainer-toc` bei aktivem JS. Lernende können beim Üben in 1 Klick zurück zur Regel springen (Eingaben bleiben im DOM) oder alle Abschnitte gleichzeitig einblenden.
- **Deep-Links & Anker (`#id`, `hashchange`)**: Öffnen automatisch den Abschnitt, der das Ziel-Element enthält.
- **Diff-, Feedback- & Druckansicht**: Bei `.explainer-diff-bar`, `?feedback`, eingeschaltetem Feedback-Modus oder `@media print` sind immer alle Abschnitte sichtbar.
- **Kein `localStorage` für den Stepper**: Reiner In-Memory-Zustand.

## Notes
- Betroffene Dateien: `runtime/explainer/messages/de.json`, `runtime/explainer/messages/en.json`, `runtime/explainer/explainer.ts`, `runtime/explainer/explainer.css`, `runtime/explainer/e2e.ts`.

## Explore
### Entrance Criteria
- Branch `feat/explainer-section-stepper` von aktuellem `main` (inkl. PR #221) angelegt.
- Issue #223 definiert die Anforderungen.

### Tasks
- [x] Abschnitt-Markup (`<section class="explainer-section">`) in `runtime/explainer/render.ts` geprüft
- [x] Bestehende E2E-Tests (`runtime/explainer/e2e.ts`) auf Navigation ohne Anker geprüft

### Completed
- [x] Created development plan file
- [x] DOM-Struktur und E2E-Interaktionen analysiert

## Plan
### Entrance Criteria
- Explore-Erkenntnisse und Randbedingungen dokumentiert.

### Tasks
- [x] Übersetzungs-Keys (`stepperLabel`, `stepperAll`, `stepperSteps`, `stepperPrev`, `stepperNext`) für `de.json` und `en.json` festlegen
- [x] `startStepper(root)` in `runtime/explainer/explainer.ts` entwerfen (Schritt-Leiste, Vor/Zurück-Leiste, Anker/Hash-Sprung, „Alle anzeigen“, Feedback-/Diff-Integration)
- [x] Responsive Styles + `@media print` in `runtime/explainer/explainer.css` planen
- [x] E2E-Tests in `runtime/explainer/e2e.ts` anpassen (`showAllSections` bei Block-Tests ohne Hash + neuer Stepper-Test)

### Completed
- [x] Umsetzungsplan vollständig dokumentiert

## Code
### Entrance Criteria
- Umsetzungsplan für Messages, `explainer.ts`, `explainer.css` und `e2e.ts` steht fest.

### Tasks
- [x] Neue Messages in `runtime/explainer/messages/de.json` und `en.json` ergänzt
- [x] `startStepper` in `runtime/explainer/explainer.ts` implementiert
- [x] Styles inkl. `@media print` in `runtime/explainer/explainer.css` ergänzt
- [x] `runtime/explainer/e2e.ts` angepasst und Stepper-E2E-Test hinzugefügt
- [x] `vp check`, `check:vue`, `vp pack` und `lernapps check --pre-push` in `explainer/` (Playwright Desktop & 360 px, No-JS, WCAG) grün

### Completed
- [x] Abschnitts-Stepper umgesetzt und verifiziert

## Commit
### Entrance Criteria
- Alle Checks, Unit-Tests und Playwright-E2E-Tests laufen grün.

### Tasks
- [x] Änderungen inkl. `.vibe/` mit Conventional Commit committen, pushen und PR für Issue #223 eröffnen

### Completed
- [x] Commit und Pull Request für Issue #223 vorbereitet

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
