# Development Plan: app-templates (feat/explainer-read-aloud branch)

*Generated on 2026-11-27 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Den Explainer in `@lernapps/app-templates` generisch um einen Vorlese-Modus für alle vorlesbaren Textinhalte erweitern, um Kindern mit Leseschwäche (LRS) das Lernen zu erleichtern. Erster Schritt: Test/Prototyp mit Browser-Sprachausgabe (`speechSynthesis`), global schaltbar, mit optionaler Hervorhebung beim Mitlesen. Zusätzlich klären, wie eine spätere Erweiterung um lokale KI-Stimmen (z. B. Piper/WASM über `lernapps.net/assets`) in Plattformdesign und Architektur passt.

## Key Decisions
- **Stimme (erster Schritt):** Browser-Sprachausgabe (`speechSynthesis`) über ein austauschbares `SpeechBackend`-Interface, sodass später ein Piper/WASM-Backend (z. B. über `lernapps.net/assets`) ohne UI-Umbau ergänzt werden kann.
- **Umfang:** Alle Blöcke mit vorlesbarem Text (`text`, `definition`, `quote`, `note`/`example` als ganze Box inkl. Titel ohne doppelte innere Buttons, `figure`/`labelled-figure` Bildunterschrift & Legende, `timeline`, `formula`, `self-test`, `exercise` inkl. dynamischer `generated`-Aufgaben via `SHOWN_EVENT`, sowie Intro/Kapitelzusammenfassung/Glossar). Ausgenommen: `code`, `video`, `vocabulary`, `table`, innere DOMs von `vue-component`.
- **Bedienung:** Globaler Vorlese-Modus (archetypweit gespeichert via `createSettings(storage, "explainer")`, erst bei Aktivierung gespeichert). Wenn aktiv: kompakte Optionen für Tempo (`0,75×`, `1×`, `1,25×`), optionale Mitlese-Hervorhebung (standardmäßig aus) und Stopp (`Escape` stoppt ebenfalls).
- **Formeln:** Beim Build wird `data-speech` via `speakFormula(tex, lang)` auf `<math>`-Elemente geschrieben, sodass Inline- und Display-Formeln sauber vorgelesen werden.
- **Hervorhebung ohne DOM-Bruch:** Satz-/Abschnittshervorhebung nutzt bevorzugt die CSS Custom Highlight API (`CSS.highlights`) mit sicherem Klassen-Fallback auf Absatz-/Element-Ebene (`.explainer-reading-part`), sodass Links, MathML und Event-Listener unangetastet bleiben.
- **Audio-Koordination:** Startendes Vorlesen pausiert `<audio>`-Elemente; startendes `<audio>` stoppt das Vorlesen.

## Notes
### Plattformdesign (PDT) & Architektur (arc42)
- **Browser-Sprachausgabe (`speechSynthesis`):** Erfüllt alle Plattform-Constraints (`con-frontend-only`, `con-apps-collect-nothing`, `con-no-request-before-click`, `dec-explainer-complete-without-js`). Kein Server, kein Tracking, keine Zusatzdateien, keine EU-AI-Act-Kennzeichnung nötig (Systemstimme des Geräts).
- **Piper/WASM über `lernapps.net/assets` (spätere Option):**
  - Technisch ein Einmal-Download pro Sprache (ca. 15–60 MB ONNX + WASM), über Browser-Cache/Cache-Storage für alle Apps auf `lernapps.net` nutzbar (`lernapps/apps` liefert bereits `/assets/` aus).
  - *Architektur-Tradeoffs:* `con-no-request-before-click` bleibt gewahrt, wenn erst nach Klick geladen wird. Es erweitert aber `con-frontend-only` („shares no code with other apps at runtime“), braucht einen Fallback auf `speechSynthesis` für lokale/Preview-Builds, berührt Git/GitHub-Pages-Größenlimits (100 MB/Datei, 1 GB/Repo) und erfordert bei synthetischer KI-Stimme eine kurze KI-Kennzeichnung (EU AI Act Art. 50(2)).
- **Einstellungen & Muster:** `createSettings(storage, "explainer")` (`@lernapps/tooling/storage`, vgl. `dec-tutor-needs` und `needs.ts` mit `wenig-lesen`) existiert bereits für archetypweite Einstellungen auf dem Gerät. `feedback-client.ts` liefert ein bewährtes Muster für einen globalen Modus, der Buttons an `.explainer-block`-Elementen einblendet und erst bei Aktivierung speichert.

### Inventar vorlesbarer Blöcke im Explainer
- Jeder Inhaltsblock besitzt bereits `<div class="explainer-block" data-block-type="...">` (`runtime/explainer/render.ts`).
- **Vorlesbar:** `text`, `definition`, `quote`, `note`/`example` (Titel + enthaltene Blöcke, ohne doppelte Verschachtelungs-Buttons), `figure`/`labelled-figure` (Bildunterschrift/Legende), `timeline`, `formula` (via `speakFormula`), `self-test` (Frage/Optionen/Feedback), Aufgaben/Exercises (Aufgabenstellung, Hinweis, Lösung — inkl. dynamischer `generated`-Aufgaben via `SHOWN_EVENT`).
- **Nicht / eingeschränkt vorlesbar:** `code`, `video`, `vocabulary` (eigene Sprachspalten/Audio), innere DOM-Bäume von `vue-component` (Vue-Hydration nicht stören), `table`.
- **Formeln im Fließtext:** `runtime/shared/text/markdown.ts` rendert `$...$` via `renderFormula` zu MathML; `runtime/shared/text/speech.ts` (`speakFormula`) existiert bereits beim Build für alle Runtime-Sprachen.
- **Audio-Zusammenspiel:** `runtime/explainer/audio-client.ts` pausiert andere `<audio>`-Elemente bei `play` und nutzt Tempo `0,75× / 1× / 1,25×`.

## Explore
### Entrance Criteria
- Nutzeranfrage und grobe Richtung (Stimme, Umfang, globaler Modus, optionale Hervorhebung) sind bekannt.

### Tasks
*Alle Aufgaben dieser Phase abgeschlossen.*

### Completed
- [x] Created development plan file
- [x] Plattformdesign (PDT) und Architektur (arc42) auf Passung geprüft (inkl. Bewertung von Piper/WASM über `lernapps.net/assets`).
- [x] Alle vorlesbaren Text-Blöcke und Elemente im Explainer inventarisiert (`runtime/explainer/render.ts`, `runtime/shared/blocks/render.ts`, `runtime/explainer/content.ts`).
- [x] Bestehende Client-Muster (`explainer.ts`, `feedback-client.ts`, `audio-client.ts`, `needs.ts`) und Build-Formelsprache (`speech.ts`, `markdown.ts`) geprüft.
- [x] Test- und Build-Skripte (`package.json`: `vp test`, `check:vue`, `scripts/arc42.ts`) geprüft.

## Plan
### Entrance Criteria
- Plattform- und Architektur-Passung (inkl. Einordnung von Piper/WASM über `lernapps.net/assets`) ist geklärt und mit dem Nutzer abgestimmt.
- Alle vorlesbaren Blöcke und bestehenden Client-/Render-Schnittstellen sind inventarisiert.

### Tasks
*Alle Aufgaben dieser Phase abgeschlossen.*

### Completed
- [x] Architektur-Schnittstelle entworfen: `SpeechBackend` (Start mit `WebSpeechBackend`), getrennt von Text-Extraktion/Segmentierung (`read-aloud.ts`) und DOM-Steuerung (`read-aloud-client.ts`).
- [x] Globalen Modus, Persistenz (`createSettings(storage, "explainer")`), Tempo (`0,75× / 1× / 1,25×`), optionale Hervorhebung (`CSS.highlights` + Element-Fallback) und Audio-Koordination definiert.
- [x] Formel-Vorlesen beim Build geplant (`data-speech` auf `<math>` via `speakFormula`).
- [x] Konkrete Umsetzungs- und Test-Aufgaben für die Code-Phase erstellt.

## Code
### Entrance Criteria
- Ein konkreter, mit dem Nutzer abgestimmter Umsetzungsplan liegt vor (HTML-Markup/Build-Daten, Client-Logik, CSS, i18n, Tests, arc42-Doku).

### Tasks
*Alle Aufgaben dieser Phase abgeschlossen.*

### Completed
- [x] **Formel-Vorlesetext beim Build (`runtime/shared/text/formula.ts`, `speech.ts`, `markdown.ts`, `blocks/render.ts`, `explainer/render.ts`, `explainer/exercises.ts`):** `renderSpokenFormula` ergänzt und `data-speech` auf `<math>`-Elementen beim Build integriert (ohne zyklische Imports).
- [x] **Reine Vorlese-Logik (`runtime/explainer/read-aloud.ts`):** `SpeechBackend`, `WebSpeechBackend`, `ReadAloudSettings`, `isReadableBlockType`, `splitSentences`, `extractNodeText`, `extractSpeechParts`, `findSentenceRange` implementiert.
- [x] **Client-Steuerung (`runtime/explainer/read-aloud-client.ts`, `explainer.ts`):** Globale Leiste („Vorlese-Modus“, Tempo, optionale Hervorhebung via `CSS.highlights` + Element-Fallback, Stopp/`Escape`), archetypweite Speicherung via `createSettings`, Buttons an allen vorlesbaren Blöcken (inkl. `SHOWN_EVENT`), Audio-Koordination.
- [x] **Texte & Styling (`runtime/explainer/messages/de.json`, `en.json`, `runtime/explainer/explainer.css`):** Deutsche/englische UI-Texte und WCAG-2.1-AA-Styling für Hell-/Dunkelmodus ergänzt.
- [x] **Tests & Architektur-Doku (`test/explainer-read-aloud.test.ts`, `explainer/docs/arc42/09-explainer-decisions.arc42.md`):** Unit-Tests und ADR `dec-explainer-read-aloud` hinzugefügt.
- [x] **Verifikation:** `vp check`, `check:vue`, `vp test run` (51 Dateien, 714 Tests), `vp pack` und `node scripts/arc42.ts` vollständig grün.

## Commit
### Entrance Criteria
- Alle Tests, Typechecks, Builds und Checks sind grün und das Feature wurde verifiziert.

### Tasks
*Alle Aufgaben dieser Phase abgeschlossen.*

### Completed
- [x] Alle Änderungen inkl. `.vibe/development-plan-feat-explainer-read-aloud.md` nach `commit`-Skill committet.
- [x] Branch `feat/explainer-read-aloud` gepusht und Pull Request auf GitHub erstellt.



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
