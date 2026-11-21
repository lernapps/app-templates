# Development Plan: app-templates (claude/eloquent-edison-ua5jys branch)

*Generated on 2026-11-21 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Den Explainer in drei Punkten verbessern:
1. Der Kasten um eine Übung heißt „Aufgabe“ statt „Übung“ (falls das überall passt).
2. Weiterführende Links („Mehr dazu“) sind optional; das Schema bittet, sie nur bei echtem Mehrwert zu füllen. Sie erscheinen dezent, z. B. als kleines (i) in der Zeile „Richtig!“.
3. Lücken im Lückentext fügen sich besser in den Satz; die Auswahl verdeckt weniger.

## Key Decisions
- Begriff: Jeder Text, den Kind oder Tutor lesen (UI, kopierte Texte, Anleitung der Tutor-Seite), sagt „Aufgabe“ statt „Übung“, konsequent. „Aufgabe X, Nr. 12“ bzw. „Aufgabe Nr. 12“ in einer „Aufgabe“ ist gewollt: Im Kasten werden Aufgaben erledigt. Die Architektur (arc42, Code, Kommentare) behält ihre Begriffe: Übung/exercise ist der Kasten, Aufgabe/task die einzelne Nummer. Kein neuer Glossar-Eintrag.
- Links: überall optional (Explainer und Quiz). Das Schema bittet, sie nur bei echtem Mehrwert genau zu dieser Frage zu füllen. Anzeige dezent als Symbol in der Zeile der Rückmeldung.
- Lücken: Variante A (Entwurf am Beispiel Französisch gezeigt). Die Lücke ist ein Unterstrich auf der Grundlinie, so hoch wie die Zeile, ohne Striche an der Seite, mit leichtem Hintergrund; der Fokus färbt Hintergrund und Unterstrich statt eines dicken Rahmens. Felder sind höchstens so breit wie die Zeile (behebt das Überragen auf dem Handy). Die Breite bleibt die der längsten Antwort der Aufgabe. Die Auswahl bleibt ein natives `<select>`; dass Safari seine Liste darüberlegt, nehmen wir hin. Keine Wörter zum Antippen (B).

## Notes
- „Übung“ steht als Etikett in `runtime/explainer/messages/de.json` (`exerciseLabel`), genutzt in `runtime/explainer/exercises.ts` (4 Stellen). Dazu in Texten für den Tutor und in kopierten Texten („Hilf mir bei Übung X, Nr. 27“, `stuckAsk`, `stuckTask`, `assessmentLine`, `tutorpage.ts`, `tutor.ts`, `assessment-page.ts`).
- „Aufgabe“ heißt schon heute die einzelne Nummer in einer Übung: „Neue Aufgabe“, „Aufgabe Nr. {n}“, „Aufgabe {n}“ der Selbsteinschätzung, „setz bei dieser Aufgabe an“. Umbenennen ohne mehr führt zu „Aufgabe“ in „Aufgabe“.
- Links: `links` ist im gemeinsamen Fragen-Schema `runtime/shared/questions/question.v1.schema.json` Pflicht (`required`, `minItems: 1`). Das Schema nutzen Explainer und Quiz; die Beschreibung des Quiz verspricht Links je Frage. Angezeigt in `renderSolution` (`runtime/shared/questions/render.ts`) als „Mehr dazu:“ mit Liste; CSS in `questions.css` (`.question-more`, `.question-links`).
- arc42: Begriffe bleiben. Zu prüfen in `09-*-decisions`: Entscheidungen zu Pflicht-Links und zur Breite der Lücken.
- Lücken: `runtime/explainer/language-task.ts` (`selectHtml`, `gapped`), CSS in `explainer.css` ab `.explainer-language-blank`. Ursachen: Feld höher als die Zeile (`min-height` 1,75 rem/2,75 rem, Rand 0,25 rem), Ecken links und rechts (Klammer-Form), Fokus-Rahmen 3 px. Zusätzlich: Ein Feld zum Schreiben ist über `size` so breit wie die längste Antwort der Aufgabe; auf dem Handy (390 px) ragt es heute über den Rand des Kastens. Das Aufklappen eines nativen `<select>` legt macOS/Safari über das Feld; mit CSS lässt sich das nicht ändern.
- CI-Fehler im Job `question-page` (38 von 52 e2e-Tests): Das „i“ stand in der Rückmeldung, einer Live-Region (`role="status"`). Ihr Text war dadurch „Mehr dazu: … Richtig!“, und ein Screenreader hätte den Link mit angesagt. Lösung: Die Rückmeldung steht in `.question-feedback-row`; das „i“ kommt daneben, außerhalb der Live-Region, und liegt per Grid über dem rechten Ende der ersten Zeile.
- Warum lokal grün: Der Pre-Push-Hook prüft nur die Vorlagen-Ordner (quiz, explainer, interactive); die Fixture-Jobs (question-page, quiz-many-questions, quiz-bilingual, quiz-material, explainer-all-blocks, explainer-history) laufen nur in der CI (`scripts/pre-push.ts`). Lokal nachgestellt: vor der Korrektur 38 fehlgeschlagen und 14 bestanden wie in der CI, danach 52 bestanden. Achtung: `npm install` kopiert die Runtime in die Fixture (keine Verknüpfung); nach jeder Änderung neu installieren.

## Explore
### Tasks

### Completed
- [x] Created development plan file
- [x] Stellen im Code zu allen drei Punkten gefunden
- [x] Begriff und Links mit dem Nutzer geklärt
- [x] Lücken: Nutzer wählt A
- [x] Begriff präzisiert: „Aufgabe“ in allen Texten für Kind und Tutor, Architektur unverändert
- [x] Entwürfe A und A+B am Beispiel Französisch (CSS/JS nur im Browser eingespielt, außerhalb des Repos), auch mit langen Lücken

## Plan
### Phase Entrance Criteria
- [x] Die offenen Fragen (Begriff, Links, Auswahl) sind mit dem Nutzer geklärt.
- [x] Die betroffenen Dateien sind bekannt.

### Umsetzung

**1. „Aufgabe“ statt „Übung“ (Texte für Kind und Tutor; nur Deutsch, `en` bleibt „Exercise“)**
- `runtime/explainer/messages/de.json`: `exerciseLabel` → „Aufgabe“; `stuckAsk`, `stuckTask`, `assessmentLine` → „Aufgabe {exercise}{number}“; `tutorAboutStart` („jede Aufgabe hat den Knopf …“), `tutorAccount` („Inhalte und Aufgaben“), `tutorPageIntro` („bei den Aufgaben“), `speakNoJs` („diese Aufgabe“).
- `runtime/explainer/tutorpage.ts`: Anleitung und Überschriften („### Aufgabe <id>“, `exercise: "Aufgabe"`, `none`). Wo bisher „Übung“ und „Aufgabe“ unterschieden wurden, unterscheidet jetzt „Aufgabe“ und „Nummer“, z. B. „Schlag Aufgabe und Nummer unten nach und setz bei dieser Nummer an“, „je Aufgabe die Nummer, die das Kind gerade vor sich hat“.
- `runtime/explainer/tutor.ts` (`component: "interaktive Aufgabe"`, `exerciseHere: "Aufgabe `{id}` (unten)"`), `runtime/explainer/assessment-page.ts` (Anleitung, `item`).
- `runtime/explainer/e2e.ts` (Erwartung „### Aufgabe …“), `README.md` (Zitate der kopierten Texte).
- Inhalt: Das Schema `explainer.v1.schema.json` schlägt als letzten Abschnitt „Übung“ vor → „Aufgaben“. Gleich im Gerüst `scaffold/explainer/src/thema/einstieg.yaml` (Titel, Platzhalter-Text) und in den Beispielseiten `explainer/src/prozent/*.yaml`.
- Tests anpassen: `test/stuck.test.ts`, `test/tutorpage.test.ts`, `test/explainer-assessment.test.ts`, `test/explainer-open-material.test.ts`, `test/explainer-speaking.test.ts`, `test/explainer-format.test.ts`; Fixtures nur, wo sie geprüfte Texte enthalten (Abschnittstitel „Übung“ in Fixtures dürfen bleiben).
- Architektur (arc42, Code-Namen, Kommentare) bleibt.

**2. Links optional und dezent**
- Schema `runtime/shared/questions/question.v1.schema.json`: `links` nicht mehr in `required`, kein `minItems`. Beschreibung: „Optional. Nur wenn eine Quelle genau zu dieser Frage etwas Wertvolles bietet, das die Erklärung nicht sagt (z. B. ein Artikel genau zu diesem Begriff). Ein allgemeiner Artikel zum Thema (z. B. ‚Französische Sprache‘) ist kein Mehrwert: dann weglassen.“
- Typ `runtime/shared/questions/question.ts`: Beim Laden fehlt `links` → `[]`, damit Code dahinter (`question.links.map`) gleich bleibt. Prüfen: `validate.ts`, Quiz-Laden, `explainer/generated/question.ts`.
- Quiz-Schema `runtime/quiz/quiz.v1.schema.json`: Beschreibung „each question links to further reading“ → „a question may link to further reading“. `quiz/README.md`, `quiz/docs/arc42/06-quiz-runtime-view.arc42.md` sinngemäß.
- Anzeige `runtime/shared/questions/render.ts` (`renderSolution`): statt „Mehr dazu:“ + Liste eine Zeile `<p class="question-more">` mit je Link einem kleinen Link-Symbol (Inline-SVG „i“), `title` = Titel des Links, Name für Screenreader „Mehr dazu: <Titel>“ (sichtbar versteckt). Ohne JavaScript und auf der Lösungsseite des Quiz steht diese Zeile klein am Ende der Lösung, mit sichtbarem Titel neben dem Symbol.
- Engine `runtime/shared/questions/engine.ts` (`reveal`): Die Zeile `.question-more` wandert in die Rückmeldung (`.question-feedback`), rechts in der ersten Zeile („Richtig!“ bzw. „Leider falsch …“). Dort nur das Symbol, der Titel bleibt als `title` und Name für Screenreader. Ohne Rückmeldung (kein Fall bekannt) bleibt sie in der Lösung.
- CSS `runtime/shared/questions/questions.css`: Rückmeldung als Flex-Zeile, Symbol rechts (`margin-left: auto`), Zielgröße mind. 24 × 24 px (WCAG 2.5.8), Fokus sichtbar.
- Gerüst `scaffold/explainer/src/thema/einstieg.yaml`: Platzhalter-Link entfernen (sonst kopiert ein Autor das Muster). `scaffold/quiz/src/quiz.json` behält ihn als Beispiel für das Format.
- Tests: `test/questions.test.ts` (Erwartung `moreReading`), `test/bank.test.ts` („Mehr dazu:“), neu: Frage ohne `links` ist gültig und zeigt keine Zeile; mit Link: Symbol mit Namen „Mehr dazu: …“. e2e (`runtime/shared/questions/e2e.ts` bzw. explainer/quiz e2e): Nach „Prüfen“ steht der Link in der Rückmeldung.
- Option-Links (`option.link`) bleiben, wie sie sind.

**3. Lücken: Variante A** (`runtime/explainer/explainer.css`, `runtime/explainer/language-task.ts`)
- CSS für `.explainer-language-gapped .explainer-language-field` (Eingabe und Auswahl), wie im Entwurf: keine Striche links/rechts, nur Unterstrich 2 px; `min-height: 0`, `line-height: inherit`, `vertical-align: baseline`, Rand 0 0.15em, Innenabstand 0 0.3em; leichter Hintergrund (`color-mix` 4 %); Pfeil der Auswahl kleiner. Zeilenhöhe des Satzes 1.6.
- Fokus: Hintergrund in Akzentfarbe (14 %), Unterstrich in Akzentfarbe und 3 px dick, damit der Fokus deutlich bleibt (WCAG 2.4.7).
- Richtig/falsch färbt weiterhin den Unterstrich (`--blank`).
- Breite: `fieldHtml` schreibt zusätzlich `style="--chars: N"`; CSS `width: calc(var(--chars) * 1ch + 0.6em)` statt der breiteren `size`-Breite (`size` bleibt als Rückfall). `max-width: calc(100% - 3.5em)`, damit Feld und Wort davor nicht über den Rand ragen.
- Die leere Lücke ohne JavaScript (`.explainer-language-blank`) bekommt dasselbe Aussehen.
- Tabelle und Feld ohne Lücke (`mode: write`, `table`) bleiben unverändert.
- Tests: `test/language.test.ts` (Feld hat `--chars`); Prüfung per Playwright bei 360 px und 700 px am Beispiel Französisch mit langer Lücke: nichts ragt über den Kasten (vorher/nachher-Bilder für den Nutzer). `lernapps check` (u. a. usable-at-360px).

### Risiken
- Tutor-Anleitung: Mit „Aufgabe“ für Kasten und Nummer muss der Text den Bezug klar halten („Aufgabe X, Nr. 27“). Tests in `test/tutorpage.test.ts` prüfen Wortlaute; sie ändern sich mit.
- Ältere Apps auf der neuen Version: Links weiter gültig, Anzeige anders. Keine Migration nötig.
- `color-mix` braucht Safari 16.2+ / Chrome 111+; ohne Unterstützung fehlt nur der Hintergrund.
- `max-width` mit `calc(100% - 3.5em)` hilft nicht, wenn das Wort vor der Lücke sehr lang ist; dann bricht die Zeile wie heute.

### Tasks
- [x] Umsetzung je Punkt mit Dateien, Tests und Risiken geplant

### Completed
- [x] Plan erstellt

## Code
### Phase Entrance Criteria
- [x] Der Plan nennt Änderungen je Datei, Tests und Risiken; der Nutzer hat ihn bestätigt.

### Tasks
- [ ] Ergänzung im Audio-Skill (Namen und letztes Wort eines kurzen Satzes zweisilbig): Der Skill `lernapps-audio` liegt in `lernapps/tooling`; Zugriff auf das Repo wurde in dieser Sitzung abgelehnt. Patch liegt bereit (Scratchpad `tooling-patch/lernapps-audio-syllables.patch`).

### Completed
- [x] 1. „Aufgabe“: Meldungen, Tutor-Texte, Schema-Beispiel, Gerüst, Beispielseiten, README, Tests
- [x] 2. Links: Schema optional + Beschreibung, `links?` mit `?? []`, Anzeige als „i“ in der Rückmeldung, CSS, Gerüst, Quiz-Doku, Tests; e2e sucht den Link in der Rückmeldung
- [x] 3. Lücken A: CSS, `--chars` in `fieldHtml`, Test, Prüfung bei 360/700 px (kein Feld über dem Kasten, kein seitliches Scrollen)
- [x] `vp check`, 606 Tests, e2e Explainer (64 bestanden, 8 übersprungen) und Quiz (56) grün

## Commit
### Phase Entrance Criteria
- [x] Alle drei Punkte sind umgesetzt; `vp check` und Tests sind grün.

### Tasks

### Completed
- [x] Keine Debug-Ausgaben, TODOs oder auskommentierter Code im Diff
- [x] Doku: Quiz-README und Laufzeitsicht des Quiz (arc42) zu optionalen Links; README zu den kopierten Texten; Schema-Beschreibungen
- [x] Ein Commit pro Thema, Plan im ersten Commit; PR erstellt



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
