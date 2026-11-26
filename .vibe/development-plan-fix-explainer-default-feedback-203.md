# Development Plan: app-templates (fix/explainer-default-feedback-203 branch)

*Generated on 2026-11-26 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Issue #203 (epic lernapps/apps#489): Die Standardmeldung „Deine Fassung kann trotzdem richtig sein“ erscheint bei
falschen Antworten und erklärt nichts. Gewünscht: eine neutrale Standardmeldung („passt noch nicht“, Hinweis auf Satz
oder Tipp), unterschiedlich für Diktat, Lücke und Satz; der bisherige Wortlaut nur, wo die Autor:in ihn bewusst setzt.

Reihenfolge der Gesamtaufgabe (je Issue oder Gruppe ein Branch und PR, nichts mergen):
#203, #204, #193, #205, #206, #207, #208.

## Key Decisions
- Ein Branch und ein PR je Issue; dies ist der Branch für #203.

## Notes
Prüfung der Behauptungen von #203 im Code (Stand `main` 4fd192a):
- Die Meldung kommt von `languageOwnVersion` (`runtime/explainer/language-task.ts:296-302`, Texte in
  `runtime/explainer/messages/{de,en}.json:242`).
- Bestätigt: Sie erscheint bei jeder falschen Antwort ohne `mistakes`-Treffer und ohne Formklasse, ohne zu sagen, was
  fehlt. Sie gilt für `mode: write` mit mehr als zwei Wörtern in der ersten erlaubten Antwort (also Sätze und Diktat).
- Nicht bestätigt: „bei Tippfehlern“ und „bei Lücken“. Fehler der Form (Groß-/Kleinschreibung, Akzent, Bindestrich,
  Apostroph, Satzzeichen) bekommen eine eigene Klassenmeldung; `gap`, `choice` und `table` zeigen die Meldung nie.
  Für Tippfehler in einem Wort ohne Klasse (zum Beispiel ein Buchstabe fehlt) gibt es dagegen keine Meldung bei
  Wörtern und Sätzen ≤ 2 Wörtern; das ist die Lücke.
- Es gibt keinen Weg, die Meldung bewusst zu setzen (kein Feld im Schema), der Satz „nur wo die Autor:in es setzt“
  braucht also ein neues Feld oder die Nutzung von `mistakes`. Das ist zu klären.

## Explore
### Tasks
- [x] Issue #203 lesen, Code der Meldung finden
- [x] Behauptungen im Code prüfen (siehe Notes)
- [ ] Offene Frage klären: Wie setzt eine Autor:in die Meldung bewusst (Schema-Feld)?
- [x] Zusammenspiel mit #194, #196, #192 geprüft: Keine offene Pull Request-Liste ausgewertet (Antwort zu groß), nur die
  offenen Issues. #203 berührt nur `language-task.ts` und die Meldungstexte. Überschneidungen später: #194 (Bruch als
  Antwort) und #206 (Zahlenfeld) betreffen beide die `number`-Prüfung; #196 (Antworten speichern) betrifft alle
  Übungen, also auch `ordering`/`matching` in #204. Mit denen abstimmen, bevor #204 und #206 beginnen.
- [x] Offene Pull Requests geprüft: #202 (interactive), #198 (Formeln in Rückmeldungen von `generated`), #167 (Texte für
  Figurenmarken), dazu drei Renovate-PRs. #198 und #167 ändern Meldungstexte beziehungsweise `mistakes` anderer
  Aufgabentypen; keine Datei von #203 (`language-task.ts`) betroffen, aber `messages/de.json` und `en.json` können
  Merge-Konflikte geben. Vor dem Commit gegen `main` abgleichen.
- [ ] Offene Frage an die Nutzer:in: Wie setzt die Autor:in die alte Meldung bewusst? (siehe Notes)

### Completed
- [x] Created development plan file

## Plan
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Code
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
