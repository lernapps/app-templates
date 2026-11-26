# Development Plan: app-templates (fix/explainer-feedback-texts-209 branch)

*Generated on 2026-11-26 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Issue #209, zweiter PR: die Wörter der Rückmeldung und der englischen Tutor-Seite. Funde A.2, A.4, A.6 (mit dem Zahlhinweis bei ganzen Zahlen aus den Kommentaren), A.12, A.15. Baut auf #213 auf (dieselben Textdateien).

Der Mensch hat volle Autonomie freigegeben: keine Stopps an den Phasengrenzen; Entscheidungen stehen hier.

## Key Decisions
- **A.2:** „Lies … den Text über der Aufgabe“ → „auf dieser Seite“. Die Meldung kommt nur mit `retry`, also nur im Explainer; dort steht der Lerntext auf der Seite, nicht immer direkt über der Aufgabe. Gilt für alle Apps.
- **A.3 abgelehnt:** Eine unvollständige Mehrfachauswahl ist falsch, und die Rückmeldung sagt schon „Es fehlt noch mindestens eine richtige Antwort.“ Für Komponenten entscheidet die App: Sie sendet `undefined`, solange die Antwort unvollständig ist (#213).
- **A.4:** Ein doppelt vergebener Platz macht eine Ordnung unvollständig („Gib jeden Platz nur einmal.“), auch im Quiz: Zwei Einträge können sich keinen Platz teilen; vorher sperrte das Quiz die Frage mit einer sinnlosen Antwort. Mit `retry` markiert eine falsche Ordnung die Einträge am falschen Platz und zählt die richtigen, wie die Zuordnung seit #151. Den richtigen Platz zeigt sie nicht.
- **Die Zählzeile ist kein Grund:** eigene Klasse `question-count`, nicht in `said` für „Hilfe“. Das ändert auch die Zuordnung (#151): Deren Zählzeile ging bisher mit an den Tutor; der Tutor sieht die Eingabe ohnehin.
- **A.6:** Englische Texte natürlicher („That's not right.“, „Matched correctly“, …). Die Zahlmeldung ist kürzer und für alle Altersstufen klar: „Schreibe nur die Zahl mit Ziffern …, zum Beispiel {example}“. Bei ganzzahliger Antwort ein ganzzahliges Beispiel ohne „Bruchstrich“; das Beispiel ist nie die Antwort selbst (12 → 7, 2,5 → 1,5).
- **A.12:** Kein Doppelpunkt nach einer Option, die mit . ! ? : … endet.
- **A.15:** Die englischen Tutor-Seiten (Seite und Selbsteinschätzung) nennen das Kind „they“, nicht „it“.
- **A.13 abgelehnt:** Werte einer generierten Aufgabe dürfen schon eine Map je Sprache sein (`Localized`, z. B. `{ de: Software, en: software }`); die Runtime kann die Groß-/Kleinschreibung nicht raten (deutsche Substantive).
- **A.19 abgelehnt:** `bedarf=`, `uebung=`, `abschnitt=`, `kurze-schritte` sind die Namen der Parameter in der Adresse, in allen Sprachen gleich; der Tutor muss sie so lesen. Übersetzte Namen bräuchten zwei Namen je Parameter.
- **A.14 → eigenes Issue:** Ziffern ohne Gruppierung betreffen Aufgabentext, Schritte, Lösung und das Fragenmodell (Zahl vs. Ziffernfolge mit führenden Nullen); das ist ein eigener Entwurf.
- **A.18 abgelehnt:** „KI-Tutor“ ist der Name der Funktion, kein Fehler der Runtime; eine App über KI kann ihn in ihrem Text einordnen.

## Notes
- Gefunden: tutorpage.ts (en), assessment-page.ts (en), engine.ts (Meldungen, `markPairs`), question.ts (`isComplete`, `matchedPairs`).

## Explore
### Completed
- [x] Created development plan file
- [x] Jeden Fund im Code geprüft, Entscheidungen oben

## Plan
### Completed
- [x] Änderungen je Fund festgelegt

## Code
### Completed
- [x] question.ts: `placeTwice`, `optionLabel`, `isComplete` für Ordnungen, `matchedPairs` auch für Ordnungen
- [x] engine.ts: Meldungen, Markierung der Plätze, Zählzeile ohne `said`
- [x] Texte de/en, englische Tutor-Seiten
- [x] e2e.ts: Erwartung des Grundes mit `optionLabel`
- [x] Tests in test/questions.test.ts; arc42 `dec-ordering-places`; README des Explainers

## Commit
### Completed
- [x] `vp check`, `vp test run` (686), arc42; e2e lokal: Vorlage, all-blocks, history, franzoesisch grün
