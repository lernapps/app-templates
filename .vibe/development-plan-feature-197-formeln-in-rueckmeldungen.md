# Development Plan: app-templates (feature/197-formeln-in-rueckmeldungen branch)

*Generated on 2026-11-24 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Issue lernapps/app-templates#197: Brüche (mindestens `\frac`, gern alle Formeln via `$…$`) in Rückmeldungen von `vue-component` und in `mistakes` von `generated`-Aufgaben genauso setzen wie im Seitentext. Dabei die No-JS-Prüfung beachten (`<math>` außerhalb beschriebener Aufgaben zählt als Formel des Inhalts). Auftraggeber: Mathe-Epic lernapps/apps#402. Ergebnis: PR, nicht mergen.

Entrance criteria:
- Explore: Branch existiert, Issue gelesen.
- Plan: Laufzeit-Formelsetzung, Rückmeldungspfade und No-JS-Prüfung verstanden; Variante gewählt.
- Code: Plan steht, Tests-Strategie klar.
- Commit: Tests und Lint grün, Doku angepasst.
## Key Decisions
- Autonom arbeiten: Der Auftrag sagt „melde dich nur, wenn der Mensch entscheiden muss“; deshalb kein Stopp an den Phasengrenzen. Der Mensch prüft den PR.
- Temml bleibt Build-only (`test/architecture.test.ts`, BUILD_ONLY). Rückmeldungen entstehen aber im Browser (`islands.ts` `showFeedback`, `engine.ts` `line`, `diagnose` aus `explainer.ts`). Darum ein kleiner Browser-Renderer `runtime/shared/text/fraction.ts` (nur Teilmenge: Zahlen, Buchstaben, + − = < >, \\cdot \\times \\div, Klammern, `\\frac{}{}` verschachtelt), Ausgabe wie Temml (`<math><mfrac>…`).
- Einfachere Alternative gewählt: nur Brüche (plus Rechenzeichen drumherum), nicht alle Formeln der Formelliste. Begründung: ganz Temml in den Browser bräche die Architekturregel und kostet ~Hunderte KB. Alles außerhalb der Teilmenge bleibt Klartext und wird beim Build als Problem gemeldet.
- Build-Prüfung: `mistakes`-Meldungen von `generated` (je Seed, nach `fill`) und `reason(...)` von Komponenten (`wrong(task)`) dürfen `$…$` nur in der Teilmenge enthalten.
- No-JS: Rückmeldungen entstehen erst im Browser und liegen in `.question-feedback` leer im Build; kein `<math>` im statischen HTML, die Zählung der e2e-Prüfung bleibt unberührt.

## Notes
Verschachtelte Brüche sind ausgenommen (Temml setzt dort Schriftgrad-Attribute; die Ausgabe wäre nicht mehr gleich). Lokal fehlte das Peer-Paket `@lernapps/tooling`; per `npm install --no-save` nachgezogen, danach 655 Tests grün, `vp check` sauber.
Fundstellen: `engine.ts` `startQuestion` hat schon `options.format` (für Gründe, `line()`); `explainer.ts:115` übergibt es für `generated` nicht. `islands.ts` `showFeedback` setzt `textContent`. `exercise.ts:351` prüft `reason` beim Build. `soundness.ts:168` füllt die Meldungen je Seed.

## Explore
### Tasks
- [ ] *Tasks will be added as they are identified*

### Completed
- [x] Created development plan file

## Plan
### Tasks

### Completed
- [x] Variante gewählt (Brüche + Rechenzeichen, Browser-Renderer), Fundstellen und No-JS-Wirkung geklärt

## Code
### Tasks
- [x] `runtime/shared/text/fraction.ts`: `fractionHtml`, `fractionProblems`
- [x] `explainer.ts`: `format: fractionHtml` für `generated`
- [x] `islands.ts`: `showFeedback` setzt Formeln
- [x] Build-Prüfung: `soundness.ts` (mistakes je Seed), `components/exercise.ts` (reason)
- [x] Tests (`test/explainer-formulas.test.ts` o. ä.), `npx vp test`, Lint/Typen
- [x] arc42-Doku (08-concepts) und Schema-Beschreibung von `mistakes` anpassen

### Completed
*None yet*

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
