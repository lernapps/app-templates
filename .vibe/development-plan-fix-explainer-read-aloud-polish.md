# Development Plan: app-templates (fix/explainer-read-aloud-polish branch)

*Generated on 2026-11-27 by Vibe Feature MCP*
*Workflow: [bugfix](https://codemcp.github.io/workflows/workflows/bugfix)*

## Goal
Drei Fehler im generischen Vorlesemodus für Explainer (`dec-explainer-read-aloud`) beheben:
1. **Startseite – Einstellungsbutton bricht um:** Der Zahnrad-Button (`.explainer-read-aloud-config-open`) soll rechts neben dem Dropdown (`.explainer-read-aloud-choose`) in derselben Zeile stehen bleiben.
2. **Unvollständige Wiedergabe / Abbruch nach erstem Satz bzw. mitten im Block:** Auf `prozent/prozentsatz/?prozentsatz-ueben=15` wird vom ersten Absatz nur der erste Satz vorgelesen/markiert, und im Beispiel-Block bricht das Vorlesen mitten im Block ab. Alle Sätze des Textteils müssen vollständig und zuverlässig vorgelesen werden (Browser-Stimme und Piper/WASM-KI-Stimme, auch auf iOS Safari).
3. **Umfang des Vorlesens nicht nachvollziehbar:** Es soll immer der gesamte, **nur textuelle** Teil vorgelesen werden – **keine** Antwortoptionen, **keine** Tabellen, **keine** Bildunterschriften (`figure` / `labelled-figure`).

## Key Decisions
- Nur textuelle Prosa und Aufgabenstellungen werden vorgelesen; Tabellen, Abbildungen/Bildunterschriften, Code-Blöcke, geschlossene `<details>`-Elemente sowie Antwortoptionen und Eingabefelder werden ausgeschlossen.
- `PiperWasmBackend` nutzt ein einziges, synchron im Klick-Handler entsperrtes `HTMLAudioElement` statt pro Satz ein neues `Audio`-Objekt anzulegen (iOS-Safari-Autoplay-Schutz).
- `scripts/piper-runtime.mjs` sammelt alle von `piper_phonemize` ausgegebenen JSON-Zeilen (nicht nur die erste), sodass mehrsätzige Segmente nicht abgeschnitten werden.
- `findSentenceRange()` normalisiert Whitespace (`\n` -> Leerzeichen) beim Abgleich mit DOM-Textknoten, damit mehrzeilige HTML-Absätze korrekt markiert werden.

## Notes
- Gemeldete Beispielseite: `https://lernapps.net/app-templates/explainer/prozent/prozentsatz/?prozentsatz-ueben=15` (`explainer/src/prozent/prozentsatz.yaml`, gebaut unter `explainer/dist/prozent/prozentsatz/index.html`).

## Reproduce
### Entrance Criteria
- Fehlerbeschreibung des Nutzers liegt vor und die betroffene Beispielseite (`prozent/prozentsatz.yaml`) ist identifiziert.

### Tasks
- [x] Startseiten-Markup und CSS für `.explainer-read-aloud-choice` prüfen und Umbruch des Einstellungsbuttons nachvollziehen.
- [x] Text-Extraktion und Satz-Segmentierung auf der gerenderten Seite `prozent/prozentsatz` prüfen (erster Absatz, Beispiel-Box mit Tabelle + Abbildung, Single-Choice- und generierte Aufgabe).
- [x] Ursache für Abbruch nach dem ersten Satz bzw. mitten im Block in `PiperWasmBackend`, `WebSpeechBackend` und `scripts/piper-runtime.mjs` reproduzieren.

### Completed
- [x] Created development plan file
- [x] **Fehler 1 reproduziert (Umbruch Einstellungsbutton):** In `runtime/explainer/render.ts` (Z. 1106) liegen `<label>Stimme: <select>…</select></label>` und `<button class="explainer-read-aloud-config-open">` in `.explainer-read-aloud-choice` mit `flex-wrap: wrap` (`runtime/explainer/explainer.css`, Z. 3771–3785). Durch den langen Optionstext im `<select>` überschreitet `<label>` + `<button>` die Breite und der Button bricht in die nächste Zeile um.
- [x] **Fehler 2 reproduziert (Abbruch nach 1. Satz / Markierung bricht ab):**
  - `PiperWasmBackend.#playBlob()` (`runtime/explainer/read-aloud.ts`, Z. 453) erzeugt nach jedem `await` ein neues `new Audio(url)` außerhalb der User-Geste; Safari/iOS blockiert `.play()` mit `NotAllowedError`, und `read-aloud-client.ts` (Z. 209) verschluckt den Fehler still.
  - `scripts/piper-runtime.mjs` (`phonemize()`, Z. 51–58) bricht nach der ersten JSON-Zeile von `piper_phonemize` ab (`settled = true; resolve(...)`) und verwirft weitere Sätze innerhalb eines Segments (wie Satz 2+3 im ersten Absatz von `prozentsatz.yaml`).
  - `findSentenceRange()` (`runtime/explainer/read-aloud.ts`, Z. 687–695) vergleicht normalisierten Satztext (`"Angaben vergleichbar."`) gegen unnormalisierten DOM-Text mit Zeilenumbruch (`"Angaben\nvergleichbar."` in `explainer/dist/prozent/prozentsatz/index.html`, Z. 51–52), weshalb die Satzmarkierung nach Satz 1 fehlschlägt.
- [x] **Fehler 3 reproduziert (Tabellen, Bildunterschriften, Antwortoptionen werden vorgelesen):**
  - `NON_READABLE_BLOCK_TYPES` (`runtime/explainer/read-aloud.ts`, Z. 124–130) schließt `figure` und `labelled-figure` bisher nicht aus.
  - `IGNORED_SELECTOR` (`runtime/explainer/read-aloud.ts`, Z. 528–548) schließt `table`, `.block-table`, `figure`, `figcaption`, `.block-figure`, `.block-code`, `.question-option`, `.question-number`, `.question-pairs`, `.question-feedback`, `.question-reveal`, `.explainer-selftest-options`, `.explainer-selftest-feedback`, `.explainer-selftest-answer`, sowie Formular-Controls (`input`, `select`, `textarea`, `button`) nicht aus. Zudem werden bei geschlossenen `<details>` (z. B. `Lösung`, `Tipp`) noch die `<summary>`-Labels vorgelesen.

## Analyze
### Entrance Criteria
- Alle drei Fehler sind reproduziert und dokumentiert.

### Tasks
- [x] Gebaute Seite `prozent/prozentsatz/?prozentsatz-ueben=15` in Headless-Chromium (Playwright) mit aktiver Hervorhebung (`highlight: true`) geprüft und alle gesprochenen/markierten Segmente protokolliert.
- [x] Exakte DOM-Klassen und Selektoren für Ausschlüsse und CSS-Fix festgelegt.

### Completed
- [x] **Browser-Befund Block 0 (`warum/1`):** Satz 2+3 fielen bei `findSentenceRange()` wegen `\n` im DOM-Textknoten auf `.explainer-reading-part` zurück; `scripts/piper-runtime.mjs` (`phonemize`) verwarf zusätzlich ab der 2. JSON-Zeile alle weiteren Sätze; `PiperWasmBackend` erzeugte pro Satz ein neues `Audio`-Element außerhalb der Klick-Geste.
- [x] **Browser-Befund Block 4 (`beispiel/1`):** Alle Tabellenzellen (`caption`, `th`, `td`) sowie die Bildunterschrift (`figcaption`) wurden vorgelesen. Nach Ausschluss von Tabellen und Abbildungen bleiben nur Box-Titel und die beiden Textblöcke.
- [x] **Browser-Befund Block 5 (`single-choice`) & Block 6 (`generated`):** Antwortoptionen (`.question-option`), die Einheitenbeschriftung (`%` in `.question-number`) und geschlossene `<details>`-Summaries (`Tipp`, `Lösung`) wurden vorgelesen. Alle Formular-Controls, Antwortoptionen, Feedback-Bereiche und geschlossene `<details>` werden ausgeschlossen.
- [x] **CSS-Fix Startseite:** `.explainer-read-aloud-choice` und `<label>` erhalten `flex-wrap: nowrap; min-width: 0`, `.explainer-read-aloud-choose` erhält `flex: 0 1 auto; min-width: 0; max-width: 100%`, `.explainer-read-aloud-config-open` erhält `flex: 0 0 auto`.

## Fix
### Entrance Criteria
- Grundursachen aller drei Fehler sind identifiziert und der Lösungsweg ist mit dem Nutzer abgestimmt.

### Tasks
- [x] `runtime/explainer/explainer.css`: `.explainer-read-aloud-choice` so anpassen, dass der Einstellungsbutton bei 360px bis Desktop immer rechts neben dem Dropdown in derselben Zeile bleibt.
- [x] `runtime/explainer/read-aloud.ts`: `figure` und `labelled-figure` zu `NON_READABLE_BLOCK_TYPES` hinzufügen; `IGNORED_SELECTOR` um Tabellen, Abbildungen/Bildunterschriften, Code, Antwortoptionen, Formular-Controls und Feedback erweitern; geschlossene `<details>` komplett ignorieren; `findSentenceRange()` whitespace-normalisierend machen; `PiperWasmBackend` auf ein einziges synchron entsperrtes `HTMLAudioElement` umstellen.
- [x] `scripts/piper-runtime.mjs`: in `phonemize()` alle ausgegebenen `phoneme_ids`-Zeilen von `piper_phonemize` sammeln statt nach der ersten abzubrechen.
- [x] `explainer/docs/arc42/09-explainer-decisions.arc42.md`: Entscheidungsdokumentation (`dec-explainer-read-aloud`) an den neuen Umfang (ohne Tabellen, Bildunterschriften, Antwortoptionen) anpassen.
- [x] `test/explainer-read-aloud.test.ts`: Regressionstests für alle drei Fehler ergänzen.

### Completed
- [x] Alle fünf Fix-Aufgaben umgesetzt und im echten Chromium-Browser (Playwright) auf der Startseite (360px, 768px, 1024px) und auf `prozent/prozentsatz/?prozentsatz-ueben=15` verifiziert.

## Verify
### Entrance Criteria
- Alle drei Fehler sind im Code behoben und Regressionstests sind ergänzt.

### Tasks
- [x] `npx vp check --fix && npx vp check && npm run check:vue && npx vp test run && npx vp pack && node scripts/arc42.ts` erfolgreich ausführen.
- [x] Im echten Browser (Playwright) auf der gebauten Seite bestätigen: Button in einer Zeile bei 360px/768px/1024px, Hervorhebung über Zeilenumbrüche hinweg, keine Tabellen/Bildunterschriften/Antwortoptionen.

### Completed
- [x] Alle 51 Testdateien (718 Tests), `vp check`, `check:vue`, `vp pack` und `arc42` (0 Fehler/Warnungen) bestanden.
- [x] Im Browser (Chromium) bestätigt: Startseiten-Button bei 360px/768px/1024px exakt rechts neben dem Dropdown (`sameRow: true`, `overflows: false`); alle 7 Blöcke auf `prozent/prozentsatz/?prozentsatz-ueben=15` lesen ausschließlich den Textteil ohne Tabellen, Bildunterschriften, Antwortoptionen, `%` oder geschlossene `Tipp`/`Lösung`-Summaries.

## Finalize
### Entrance Criteria
- Alle Checks, Tests, Pack-Build und Arc42-Prüfungen laufen grün.

### Tasks
- [x] Änderungen inkl. `.vibe/development-plan-fix-explainer-read-aloud-polish.md` committen (nach `commit`-Skill).
- [x] Branch pushen (`VITEST_MAX_WORKERS=1 git push -u origin fix/explainer-read-aloud-polish`), PR erstellen, auf grüne CI-Checks warten und per Squash-Merge in `main` mergen.

### Completed
- [x] Code, Tests, Arc42-Entscheidung und Entwicklungsplan finalisiert.

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
