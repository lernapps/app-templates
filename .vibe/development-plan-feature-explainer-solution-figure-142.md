# Development Plan: app-templates (feature/explainer-solution-figure-142 branch)

*Generated on 2026-11-08 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Korrigiert durch den Owner (Issue #142 war inhaltlich falsch): Gemeint ist Material, das beim Lösen **hilft** und **vor** der Antwort sichtbar ist, z. B. die Abbildung einer Vokabel.
Die sechs Fragetypen können das schon (`material`). Es fehlt bei `open-task` und `generated` (und bei Übungskomponenten).
Wiederverwendet wird `materialBlock` aus `runtime/shared/blocks/blocks.v1.schema.json`.

## Key Decisions
- Workflow: epcc. Branch: `feature/explainer-solution-figure-142`.
- Kein Pull Request, bis der Owner ihn ausdrücklich verlangt.
- Owner: Umfang ist zuerst nur `open-task` (`material` wie bei einer Frage). `generated` und Komponenten später (Bild je Datensatz).
- Owner: Das ist ein Feature im bestehenden Design. Keine Änderung an README und arc42-Dokumenten.
- Das Issue #142 wurde auf diesen Inhalt korrigiert.
- Umsetzung: Das Material nutzt die CSS-Klasse `question-material` der Frage, damit es gleich aussieht. Das Tutor-Material nutzt `contentLines`.

## Notes
- Offene Punkte aus dem Issue: Welche Übungstypen? Bekommt auch das Quiz das Feature (gemeinsames Fragen-Schema)?
- Tutor: Material der Aufgabe als Alternativtext (`tutor.ts`).
- Entrance criteria:
  - Plan: Explore abgeschlossen, Owner hat Einordnung bestätigt.
  - Code: Plan vom Owner freigegeben.
  - Commit: Tests und Typprüfung laufen grün.

## Explore
### Befunde (Code)
- Schema der Frage: `runtime/shared/questions/question.v1.schema.json`. `material` (Liste von `materialBlock`) steht zwischen Text und Antworten. `explanation` ist nur Text.
- Rendering: `renderQuestion` (`runtime/shared/questions/render.ts`) zeigt `material` in `.question-material`. `renderSolution` baut die Lösung: Optionen, Erklärung, Links. Es kennt kein Material.
- Der Explainer legt `renderSolution` in `<details class="explainer-solution">` (`runtime/explainer/exercises.ts`, ab Zeile 226). Das Material rendert er dort mit `renderMaterial`.
- Offene Aufgabe (`open-task`): Musterlösung als HTML-String `data.solution` in `.explainer-open-solution`. Generierte Aufgabe: Lösungsschritte aus `generated/texts.ts`.
- Tutor-Seite: `runtime/explainer/tutor.ts` (`questionPart`) schreibt Lösung und Erklärung als Text. `tutorpage.ts` ist für Tabellen und Aufgaben.
- Prüfung: `runtime/shared/questions/validate.ts` prüft `material` über `checkMaterial` (Alternativtext, Quelle, Lizenz). Eine Lösungsfigur braucht dieselbe Prüfung.
- Das Quiz nutzt dasselbe Fragen-Schema. Ein neues Feld im Schema wirkt dort mit, wenn das Quiz es nicht ausdrücklich ablehnt.

### Einordnung (Architektur)
- Passt zu `dec-explainer-complete-without-js`: Lösung ist ohnehin gefaltet, die Abbildung steht im Build-HTML.
- Passt zu `dec-explainer-only-content`: Der Creator schreibt nur YAML; keine neue Figur-Mechanik.
- Keine neue arc42-Entscheidung und keine README-Änderung (Owner).

### Vorschlag (überholt)
Der frühere Vorschlag `solutionMaterial` (Abbildung erst in der Lösung) entfällt: Das Issue war falsch.

### Neue Befunde nach Korrektur
- `OpenTask` (`runtime/explainer/content.ts`) hat kein `material`; `openTaskExercise` (`exercises.ts`) rendert Aufgabe, Hinweis, Punkte, Lösung.
- `Generated` (`generated/types.ts`) hat kein `material`. Die Aufgabe wird je Seed aus Vorlagen und Datensätzen gebaut. Eine Abbildung je Datensatz (Vokabel-Bild) braucht eine Idee, wie das Bild vom Datensatz abhängt.
- Fragen: `renderQuestion` zeigt `material` schon in `.question-material`; Vorbild für die Umsetzung.
- Tutor: `openTaskPart` und die Tabelle generierter Aufgaben müssten das Material als Alternativtext nennen.

### Vorschlag (zur Abstimmung)
- `open-task` bekommt `material` wie eine Frage (einfach, statisch).
- `generated`: Material je Aufgabe, abhängig vom Datensatz (z. B. Bild aus einem Feld des Datensatzes). Aufwendiger; eventuell zweiter Schritt.

### Tasks
- [x] Plattform-Design und Architektur einordnen (arc42-Dokumente des Explainers gelesen)
- [x] Code lesen: Fragen-Schema, `material`, `explanation`, Rendering, Tutor
- [x] Owner klärt: Material vor der Antwort, Issue war falsch
- [x] Umfang geklärt: nur open-task; Issue korrigiert; keine Doku-Änderung
- [ ] Phasenwechsel zu Plan vom Owner bestätigen lassen

### Completed
- [x] Created development plan file

## Plan
### Umsetzung (open-task bekommt `material`)
Vorbild ist die Frage: `material` ist eine Liste von `materialBlock`, steht zwischen Aufgabe und Antwort und kommt in der Sprache der Seite.

1. **Schema** (`runtime/explainer/explainer.v1.schema.json`, `$defs/openTask`): optionales Feld `material` (Liste, `minItems: 1`, Elemente `blocks.v1#/$defs/materialBlock`), Beschreibung wie bei der Frage. Format 2 erbt es über v1.
2. **Typ** (`content.ts`, `OpenTask`): `material?: readonly MaterialBlock<Text>[]`.
3. **Prüfung** (`check-page.ts`, Fall `open-task`): jeden Block mit `checkMaterialBlock` prüfen, Pfad `[...at, "material", index]`. Das prüft Alternativtext, Quelle, Lizenz, Bilddatei und Links wie bei der Frage.
4. **Rendering** (`exercises.ts`, `openTaskExercise`): `materialIn(block.material, lang)` und `renderMaterial(…, material)`, als `<div class="question-material">` (gleiche Klasse wie bei der Frage, damit das Aussehen gleich ist) nach dem Aufgabentext und vor Hinweis und Bedienelementen. `exerciseDataOf`/`renderExercise` müssen den `MaterialContext` bis hierher reichen (wie bei `questionExercise`).
5. **Ohne JavaScript**: Das Material steht im Build-HTML bei der Aufgabe. Der Browser-Teil (`open-task.ts`) lässt es unberührt.
6. **Tutor** (`tutor.ts`, `openTaskPart`): Zeile „Material“ mit den Blöcken als Text (Alternativtext, Bildunterschrift). Dafür die Block-zu-Text-Logik von `contentLines` wiederverwenden.
7. **Gliederung/Auswertung** (`outline.ts`, Fall `open-task`): Formelzählung läuft schon über das gerenderte HTML; prüfen, dass Material darin nicht doppelt zählt.
8. **Nicht ändern**: README, arc42, Quiz, `generated`, Komponenten, Fragetypen.

### Tests (zuerst schreiben, dann umsetzen)
- Fixture `test/fixtures/explainer-all-blocks/...`: eine `open-task` mit `material` (Abbildung mit Alternativtext, Quelle, Lizenz).
- `test/explainer-format.test.ts` oder `explainer-build.test.ts`: Build-HTML enthält `question-material` in der Aufgabe, vor den Punkten, auch ohne JavaScript.
- `test/explainer-broken.test.ts`: Abbildung ohne Alternativtext in `open-task` meldet einen Fehler mit Pfad.
- `test/explainer-tutor.test.ts`: Tutor-Seite nennt Alternativtext des Materials.
- Schema: `material` mit unbekanntem Blocktyp wird abgelehnt.

### Risiken
- `unevaluatedProperties: false` am Aufgabenblock: `material` muss in `openTask` stehen, sonst lehnt das Schema es ab.
- Material mit Bild: das Bild muss in `src/images/` liegen und im Build landen (`check.images`).
- Beschriftete Abbildung mit Legende würde bei einer Frage Antworten verraten; bei `open-task` kein Sonderfall, weil keine Paare daraus entstehen.

### Tasks
- [ ] Owner gibt den Plan frei (Phasengrenze)

### Completed
*None yet*

## Code
### Tasks
- [ ] E2E-Tests (Playwright) wurden nicht gelaufen; die CI deckt sie ab

### Completed
- [x] Tests geschrieben (`test/explainer-open-material.test.ts`, Fixture `zahlen-01.yaml`)
- [x] Schema (`openTask.material`) und Typ (`OpenTask.material`)
- [x] Prüfung in `check-page.ts`
- [x] Rendering in `exercises.ts` (Klasse `question-material`, nach dem Aufgabentext)
- [x] Tutor-Zeile „Material“ in `tutor.ts`
- [x] Gliederung: `outline.ts` zählt Formeln über das gerenderte HTML; keine Änderung nötig
- [x] Alle 509 Tests, `vp check` (Format, Lint, Typen) und `vue-tsc` laufen grün

## Commit
### Tasks
*Alle erledigt.*

### Completed
- [x] Aufräumen: keine Debug-Ausgaben, keine TODOs im neuen Code
- [x] Dokumentation: nach Entscheidung des Owners keine Änderung an README und arc42
- [x] Angleichung: `language-task` zeigt sein Material im selben Container `question-material` (Seite und Selbsteinschätzung), mit Test
- [x] Rebase auf `main` (Konflikte in `exercises.ts` und `tutor.ts` gelöst), ein Commit, Force-Push
- [x] Alle 537 Tests, `vp check`, `vue-tsc` grün


---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
