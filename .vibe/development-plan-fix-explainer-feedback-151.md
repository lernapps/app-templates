# Development Plan: app-templates-151 (fix/explainer-feedback-151 branch)

*Generated on 2026-11-11 by Vibe Feature MCP*
*Workflow: [minor](https://codemcp.github.io/workflows/workflows/minor)*

## Goal
Issue #151: drei Lücken in der Rückmeldung des Explainers schließen.
1. `language-task` mit `mode: choice`: Eine gewählte Option, die ein typischer Fehler ist, zeigt dessen Meldung.
2. `matching`: Nach „Prüfen" sieht man, welche Paare falsch sind und wie viele stimmen, ohne die Lösung.
3. `language-task` mit `mode: table`: Die Felder passen bei 360 px in ihre Zelle; nichts scrollt seitlich.

## Key Decisions
- Zu 1: Die Suche nach dem typischen Fehler steht jetzt in `mistakeOf` (language.ts). `check` und die Auswahl nutzen sie beide. Eine Auswahl bleibt richtig oder falsch, wie gewählt; eine Fehlerklasse der Form (z. B. Akzent) gibt es bei ihr nicht.
- Zu 2: Nur mit `retry` (Übung im Explainer). Im Quiz zeigt die Lösung ohnehin sofort alles; dort ändert sich nichts. Falsche Paare bekommen eine Klasse und `aria-invalid`; eine Zeile sagt „Richtig zugeordnet: x von n". Ändert man ein Paar, verschwindet seine Markierung. Die Zeile steht nach dem ersten Grund, damit die bisherigen e2e-Erwartungen gelten.
- Zu 3: Die Tabelle ist keine Block-Box mit Scrollen mehr, sondern 100 % breit; Felder nehmen die Breite der Zelle (`width: 100%`, `min-width: 4ch`), lange Wörter brechen um.

## Notes
- Kein e2e-Fixture hat einen `language-task`. Geprüft mit einem Playwright-Skript außerhalb des Repos (Chromium, 360 px): vorher Tabelle 510 px breit, jetzt 360 px; Auswahl zeigt die Fehlermeldung; Zuordnung markiert 2 von 3 Paaren.

## Explore
### Tasks

### Completed
- [x] Created development plan file
- [x] Ursachen in language.ts, shared/questions/engine.ts und explainer.css gefunden

## Implement
### Tasks

### Completed
- [x] `mistakeOf` und Fehlerprüfung bei Auswahl, Test in test/language.test.ts
- [x] `matchedPairs`, Markierung und Zähl-Zeile im Engine, Meldung de/en, CSS, Tests in test/questions.test.ts
- [x] CSS der Tabelle, Test in test/language.test.ts
- [x] `vp check` und alle Tests grün

## Finalize
### Tasks

### Completed
- [x] Kommentare angepasst; keine Debug-Reste



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
