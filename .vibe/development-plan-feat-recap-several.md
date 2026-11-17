# Development Plan: app-templates (feat/recap-several branch)

*Generated on 2026-11-17 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Eine Recap-Seite darf mehrere Bausteine wiederholen: eine kompakte **Sammel-Wiederholung** am Anfang eines Kapitels
(„Das brauchst du hier“) statt mehrerer einzelner Recap-Seiten (Auftrag Owner, 2026-11-17, aus lernapps/apps
Branch `claude/lernlandkarten-content-structure-uesnsl`, Explainer-Entwürfe).

Übergreifendes Feature über drei Repositories, in dieser Reihenfolge gemergt:
1. **lernapps/app-templates** (dieser Plan führt): Schema, Laufzeit, Seitenliste, Entscheidung im arc42, Release.
2. **lernapps/tooling**: neue Version von app-templates, Einlesen und Regeln von `lernapps check`, Skills für Explainer.
3. **lernapps/apps**: Vertrag, `lib/map.js`, Listing, Karte; Pin von tooling; Skill `map-explainers`.
4. **lernapps/docs**: voraussichtlich keine Änderung (die Plattform-Architektur nennt Recap-Seiten nicht).

## Key Decisions
### KD-01: `recap` nimmt einen Baustein oder eine Liste (Owner, 2026-11-17)
`recap: physik/x` bleibt gültig; neu `recap: [physik/x, physik/y]` (mindestens einer, keiner doppelt). Nur `recap`
wird mehrwertig; `competencies` behält die Regel „in der Regel einer je Seite“. Alle übrigen Regeln der Recap-Seite
bleiben: keine Übung, zählt nicht auf der Karte, nicht in der Selbsteinschätzung; jeder wiederholte Baustein existiert
und wird von der App nicht selbst geübt.

### KD-02: Variante (a): die Laufzeit schreibt nur Links (Owner, 2026-11-17)
Die Laufzeit schreibt oben auf die Recap-Seite den Hinweis mit **je einem Link** zur Karte für jeden Baustein. Den
Inhalt (die kompakte Selbstprüfung „Das brauchst du hier“) schreibt, wer die App baut; die Skills in tooling leiten
dazu an. Keine Abhängigkeit des Builds von der Karte.

### KD-03: Seitenliste bleibt Format 1 (Vorschlag)
`lernapps-pages.json` schreibt `recap` so, wie es in der Seite steht: als Zeichenkette bei einem Baustein, als Liste
bei mehreren. Bestehende Listen bleiben gültig; Leser (tooling, apps) nehmen beides an. Kein Formatwechsel der Liste.

## Notes
- Fundstellen app-templates: `runtime/explainer/explainer.v2.schema.json` (`recap` → `$defs/competency`),
  `schema.ts` (Fehlermeldungen), `content.ts` (`recap?: string`, `mapUrl`), `load.ts` (keine Übung auf Recap-Seiten),
  `render.ts` (`recapNotice`, Markierung im Inhalt), `tutorpage.ts` (Hinweis für den Tutor), `assessment.ts`
  (Recap-Seiten ausgelassen), `page-list.ts`, `messages/{de,en}.json` (`recapText` mit einem `{link}`), Tests
  (`test/explainer-format.test.ts` u. a., 34 Stellen), `explainer/README.md`, Entscheidung `dec-explainer-recap-page`
  in `explainer/docs/arc42/09-explainer-decisions.arc42.md`.
- Release: semantic-release nach Merge auf `main`; `feat:` ergibt eine Minor-Version. tooling hängt an
  `@lernapps/app-templates` 0.8.2 (npm), apps an tooling per Commit.
- tooling: `check/explainer-map.ts` (liest `recap` nur als Zeichenkette), `check/rules/competencies-on-map.ts`,
  `check/rules/prerequisites-in-order.ts`, Skills `lernapps-explainer`, `lernapps-explainer-design`,
  `lernapps-explainer-self-assessment`, `lernapps-map-assignment`, `lernapps-listing`, Review `review/archetypes/explainer.md`.
- apps: `docs/learning-map-contract.md` (Abschnitt „A recap page“), `lib/map.js` (`checkApp`, `checkPages`),
  `scripts/listing.mjs`, `src/_data/map.js`, Tests.
- Der Workflow-Server läuft hier per Shell (mehrere Repositories ausgecheckt, AGENTS.md).

## Explore
### Tasks
- [ ] Owner: Plan und Reihenfolge bestätigen; offene Frage Linktext (siehe Plan)

### Completed
- [x] Created development plan file
- [x] Fundstellen in app-templates, tooling, apps, docs gesucht
- [x] Plattform: KD-18 (Apps sammeln nichts) bleibt unberührt; Recap ohne Speicherung

## Plan
### Entrance Criteria
- Der Owner hat Ziel, KD-01 bis KD-03 und die Reihenfolge bestätigt.

### Tasks
- [ ] app-templates: Schema `recap` = competency | Liste (minItems 1, uniqueItems); Fehlermeldungen in `schema.ts`
- [ ] app-templates: `content.ts` normalisiert auf eine Liste (`recaps()`), `mapUrl` je Baustein
- [ ] app-templates: `load.ts`, `render.ts` (Hinweis mit Liste der Links; Text für einen und für mehrere),
  `tutorpage.ts`, `assessment.ts`, `page-list.ts`; Meldungen de/en
- [ ] app-templates: Tests (einer, mehrere, doppelt, leer, mit Übung), README, Entscheidung im arc42
- [ ] app-templates: PR, grüne Checks, squash, merge, Release abwarten
- [ ] tooling: eigener Branch/Plan; app-templates anheben; `explainer-map.ts`, Regeln, Tests; Skills (Sammel-Wiederholung
  am Kapitelanfang, sehr kompakt, Selbstprüfung von Hand, Bausteine aus der Karte ablesen); PR, merge
- [ ] apps: eigener Branch/Plan; Vertrag, `lib/map.js`, Listing, Karte, Tests; Pin von tooling; PR, merge
- [ ] Branch der Explainer-Entwürfe in apps: Skill `map-explainers` nennt Sammel-Wiederholung; Regel für Sprachen
  (Weg aus Runde 3)

### Completed
*None yet*

## Code
### Entrance Criteria
- Der Plan ist vom Owner bestätigt.

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Commit
### Entrance Criteria
- Alle Prüfungen in den drei Repositories sind grün.

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
