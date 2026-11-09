# Development Plan: app-templates (feat/cross-strand-languages branch)

*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc), geführt in lernapps/apps*

## Goal

lernapps/apps#226, Schritt 9 des Plans: Das Explainer-Format 2 kennt Einheiten-Apps. Plan und Entscheidungen (KD-01
bis KD-08) stehen in lernapps/apps, `.vibe/development-plan-feat-cross-strand-languages.md`. Diese Datei hält nur
fest, was dieser Branch tut.

## Key Decisions

- Übernommen aus dem Plan in lernapps/apps, KD-06: `src/app.yaml` nennt `strand` oder `subject`, genau eins
  (`oneOf`). Ob ein Fach Einheiten-Apps erlaubt (`explainerFocus: competency`), prüfen Katalog und `lernapps check`;
  das Schema kennt die Karte nicht.
- KD-16 in `development-plan-claude-pensive-cray-nb2mwh.md` ist damit beantwortet.

## Code

### Tasks

- [x] `explainer.v2.schema.json`: `subject` (Fach-Id), `oneOf` mit `strand`; mit `subject` brauchen Seiten
  `competencies` wie bei einem Strang.
- [x] `schema.ts`: eine Meldung für `oneOf` (beide oder keins), eine für ein `subject`, das keine Fach-Id ist;
  `subject` ist ein Feld von Format 2.
- [x] `load.ts`: `competencies` fehlt auch bei `subject`; `page-list.ts`: `lernapps-pages.json` hat `subject` statt
  `strand`.
- [x] Doku: README des Explainers, arc42 (`if-page-list`, `dec-explainer-format-2`), Kommentar im Scaffold.
- [x] Tests in `test/explainer-format.test.ts`.
