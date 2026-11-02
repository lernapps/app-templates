# Development Plan: app-templates (feat/content-only-app-e2e branch)

*Generated on 2026-11-02 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Die e2e-Tests einer App prüfen nur noch den Inhalt der App. Die Tests der Laufzeit (Abläufe, die in jeder App gleich sind) laufen nur noch in app-templates, an den Vorlagen und den Fixtures. Das gilt für Quiz und Explainer. Ziel: Die App-Prüfung wird viel schneller, und Tests, deren Dauer mit dem Inhalt wächst (z. B. der Durchlauf durch alle Fragen, Issue #125), laufen nicht mehr in Apps.

Erweitert (Nutzer, 2026-11-02): Zuerst die Infrastruktur für gezieltes Templating. `lernapps create` kopiert nur noch das Nötige aus der Vorlage, einschließlich der Testsuite. Die Beispiel-App bleibt nur in `node_modules/@lernapps/app-templates/<archetyp>/` zum Nachschlagen. Grund: Die kopierte Beispiel-App prägt die entstehende App zu stark. Zwei Commits, die zusammenpassen: (1) gezieltes Templating, (2) Aufteilung der Tests darauf aufbauend.

## Key Decisions
- Entscheidungen des Nutzers (2026-11-02):
  - Strenge Grenze: Auch „die richtige Antwort zählt, eine falsche nicht“ läuft nur im Template. Die App prüft Anzeige, Bilder, Links und Sprachen.
  - `quizTests()` und `explainerTests()` prüfen ab sofort nur den Inhalt. Apps ändern nichts; sie bekommen das mit dem nächsten Runtime-Update. Das Template-Repo ruft die Ablauftests zusätzlich auf.
  - Bei 360 px laufen nur die Anzeigetests; alles andere nur auf dem Desktop.
- Übungskomponenten der App (eigene Vue-Komponente mit Logikmodul) behalten ihre Prüfung in der App: Das ist Code der App (Nutzer, 2026-11-02).
- Gezieltes Templating wie im Entwurf (Nutzer, 2026-11-02): Vertrag `lernapps.scaffold` in der `package.json` jeder Vorlage; Beispiel bleibt in `node_modules`; CI prüft den Startinhalt; Ablauftests liegen im Vorlagenordner, außerhalb des Scaffolds.
- Startinhalt: minimaler Platzhalter (eine Frage, eine Seite, ein minimaler Kern).
- Gilt für alle drei Archetypen, auch interactive.
- `lernapps update` zieht nur Bibliotheken nach (Abhängigkeiten, auf die die App verweist). Es ersetzt keine Inhalte und keine Scaffold-Dateien.
- Branch: `feat/content-only-app-e2e`.
- Der Nutzer erlaubt, die voneinander abhängigen Pull Requests selbst zu mergen, und lässt ab der Code-Phase ohne Stopp an den Phasengrenzen arbeiten. CI alle 5 Minuten prüfen.

## Notes
- Apps bekommen `quiz/e2e/quiz.e2e.ts` und `explainer/e2e/explainer.e2e.ts` beim `lernapps create` als Kopie (tooling `generator/create.ts` kopiert den Ordner der Vorlage aus dem Paket). Was in diesen Dateien steht, läuft also auch in jeder App. Die Ablauftests dürfen deshalb nicht einfach dort aufgerufen werden.
- Die Projekte `desktop` und `360px` legt die gemeinsame Playwright-Konfiguration im Tooling fest. Der Explainer überspringt Tests heute schon per `test.skip(({ viewport }) => …)`.

### Einteilung Quiz (`runtime/quiz/e2e.ts`)
Inhalt (bleibt in der App):
- pro Frage: „what it shows is there, and its images load“ (Desktop und 360 px)
- ohne JavaScript: jede Frage und ihre Lösung sind lesbar (mit Hintergrund und Links)
- je Sprache: Seite ohne JavaScript in der Sprache, mit jeder Frage, Lösung und Sprachwechsel; „what a question shows, in <lang>“
Laufzeit (nur Template):
- pro Frage: Deep-Link öffnet sie und die richtige Antwort zählt; eine falsche Antwort zählt nicht
- Seed und Reihenfolge; Durchlauf mit voller Punktzahl und Lösungen; Anzahl der Fragen wählen; was gespeichert wird
- je Sprache: „one question, answered in <lang>“ (Feedback in der Sprache = Texte der Laufzeit)

### Einteilung Explainer (`runtime/explainer/e2e.ts`)
Inhalt (bleibt in der App):
- ohne JavaScript, jede Seite, jede Sprache: Überschriften, Abschnitte, Formeln, Abbildungen, Anker wie im Inhalt; jede „Lösung“ zeigt die Antwort, die der Prüfer annimmt
- andere Seiten (Start usw.): Überschrift, Links, Anker, Sprachen
- Vor/Zurück bilden eine Kette über alle Seiten (Desktop)
- eigene Komponenten der App: hydrieren ohne Konsolenfehler (das ist Code der App, nicht der Vorlage)
Laufzeit (nur Template):
- je Seite eine Übung jedes Typs prüft ihre Antworten
- Videos laden nichts vor dem Klick
- Adresse hält die Aufgaben; Tutor-Wege A, B1, B2, „Zurück“, „Zurück zum Tutor“
- Startseite: Assistent an/aus, Bedürfnisse des Lernenden
- Hilfe-Button der Übungskomponenten; „Zurück zum Tutor“ der Übungskomponenten
- Selbsteinschätzungen (drei Läufe)
- nichts wird auf dem Gerät gespeichert

### Wie create heute arbeitet (tooling `generator/create.ts`)
- `cpSync` kopiert den ganzen Ordner `<archetyp>/` aus dem Paket. Danach entfernt create `package-lock.json`, `README.md`, `docs/arc42/` und gegebenenfalls `.arc42ignore`, benennt `_gitignore` um und passt `package.json` an.
- Die Skills sagen: „`create` writes the example bank "Naturwunder der Welt": replace it with the planned questions“ (quiz); ebenso „Prozent“ (explainer) und „a small example app“ (interactive).
- Nach create folgen `npm install` und der erste Commit; der pre-commit-Hook prüft dabei Format, Lint und Typen. Ohne Inhalt würde z. B. der Import von `src/quiz.json` in `src/main.ts` scheitern. Ein Startinhalt ist also nötig.
- Die Vorlagen bestehen aus Infrastruktur (index.html, src/main.ts, package.json, tsconfig.json, vite.config.ts, playwright.config.ts, e2e/<archetyp>.e2e.ts, _gitignore/.gitignore) und Beispielinhalt (quiz: src/quiz.json und 7 Bilder; explainer: src/app.yaml, src/prozent/, die Komponente ProzentFeld, ein Bild; interactive: src/app.yaml, core, data, messages, playthroughs, App.vue).

### Entwurf (zur Abstimmung)
- Jede Vorlage erklärt in ihrer `package.json` unter `lernapps.scaffold`, was create kopiert: die Pfade der Infrastruktur und einen Ordner mit minimalem Startinhalt (z. B. `quiz/scaffold/src/quiz.json` mit einer Platzhalterfrage). Alles andere im Vorlagenordner ist Beispiel und bleibt in `node_modules`.
- app-templates besitzt diesen Vertrag, weil nur es weiß, was Infrastruktur und was Beispiel ist. tooling liest ihn nur.
- Die Skills sagen danach: create schreibt einen minimalen Startinhalt; das vollständige Beispiel liegt in `node_modules/@lernapps/app-templates/<archetyp>/`.
- Ein CI-Job in app-templates prüft den Startinhalt allein (wie ihn create schreibt), damit eine neue App von Anfang an `lernapps check` besteht.
- Passt zu (2): Die Ablauftests können dann im Vorlagenordner liegen, z. B. `quiz/e2e/runtime.e2e.ts`, und laufen dort in CI, im Hook und in den Fixture-Jobs. create kopiert sie nicht, weil sie nicht im Scaffold stehen. Das Kopieren aus `test/` (Weg b) entfällt.
- Reihenfolge der Auslieferung: tooling hängt von einer exakten Version von app-templates ab. Erst app-templates mergen und veröffentlichen, dann tooling auf die neue Version heben.

### Offene Fragen
- keine

## Explore
Entrance: Branch angelegt, Plan vorhanden, Entscheidungen des Nutzers zur Grenze erfasst.
### Tasks

### Completed
- [x] Created development plan file
- [x] Tests von Quiz und Explainer eingeteilt (siehe Notes)
- [x] Weg der e2e-Dateien in die Apps geklärt (Kopie beim Anlegen)

## Plan
Entrance: Entwurf und Grenze der Tests vom Nutzer bestätigt.

### Vertrag (Entscheidung)
- Die `package.json` im Root von app-templates bekommt `"lernapps": { "scaffold": { "<archetyp>": [ … ] } }` neben `archetypes`: die Pfade, die create aus dem Vorlagenordner kopiert (Infrastruktur), relativ zum Vorlagenordner. Beispiel quiz: `.gitignore`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `src/main.ts`, `e2e/quiz.e2e.ts`. Die `package.json` der Vorlagen bleibt unverändert; create muss nichts entfernen (Nutzer, 2026-11-02).
- Der Startinhalt liegt fest unter `scaffold/<archetyp>/` im Paket-Root, nicht im Vorlagenordner. create kopiert ihn über die Scaffold-Dateien. Grund: Der Vorlagenordner bleibt eine vollständige Beispiel-App, die app-templates selbst prüft; ein zweiter Inhalt darin würde deren Prüfung (Lint, arc42-Abdeckung beim interactive) stören.
- `.gitignore` steht im Paket als `_gitignore` (npm). create nimmt die Datei, die vorhanden ist.
- Deklarativ (JSON) statt Code: tooling liest die Liste, app-templates prüft mit einem kleinen Skript denselben Vertrag. Verworfen: eine exportierte Funktion `scaffold()` aus dem Paket, weil create dann den gebauten Code einer Klon-Vorlage (`--templates`) bräuchte.

### Commit 1 – gezieltes Templating
app-templates:
- [x] `lernapps.scaffold` in der Root-`package.json`
- [x] Startinhalt `scaffold/quiz/src/quiz.json` (eine Platzhalterfrage), `scaffold/explainer/src/app.yaml` und ein Kapitel mit einer Seite, `scaffold/interactive/src/…` (app.yaml, core, ui/App.vue, messages/de.json, ein Playthrough)
- [x] `scripts/scaffold.ts <archetyp> <ordner>`: baut eine App aus Vertrag und Startinhalt, wie create sie schreibt (ohne die Dateien, die tooling ergänzt)
- [x] `check.yml`: Job `scaffold` (Matrix der drei Archetypen): Scaffold bauen, `lernapps check`; in den Job `check` aufnehmen
- [x] Test: jeder Pfad in `scaffold` existiert; der Startinhalt besteht die Schemaprüfung; `package.json` `files` enthält `scaffold`
- [x] `scripts/pre-push.ts`: `scaffold/` in die Listen (TEMPLATE_PATHS bzw. ROOT_ONLY), `.arc42ignore` um `scaffold/`
- [x] arc42: Entscheidung `dec-scaffold` (Kap. 9). Ein eigener Baustein in Kap. 5 entfällt: `scaffold/` ist Inhalt wie die Beispiele und steht in `.arc42ignore`; ein Baustein mit Pfad löste Befunde aus (E011, H021).
tooling:
- [ ] `generator/create.ts`: statt `cpSync` des ganzen Ordners nur die Pfade aus `scaffold`, dann `scaffold/<archetyp>/`; Fehlermeldung, wenn die Vorlage keinen Vertrag hat
- [ ] Hilfe und Kopfkommentar von create; arc42 Kap. 5 (Generator)
- [ ] Skills `lernapps-quiz`, `lernapps-explainer`, `lernapps-interactive`: „create schreibt einen minimalen Startinhalt; das vollständige Beispiel liegt in `node_modules/@lernapps/app-templates/<archetyp>/`“; Verweis auf ProzentFeld in `components.md` anpassen
- [ ] Tests: `test/create.test.ts` (nur Scaffold kopiert, kein Beispielinhalt, keine Ablauftests), `test/create.e2e.test.ts` (prüft den Startinhalt statt „Naturwunder“/„Prozentwert“), `test/app-fixture.ts`
- [ ] `lernapps update` bleibt unverändert: zieht nur Bibliotheken nach, ersetzt keine Inhalte

Notizen zur Umsetzung: Die Startinhalte bestehen `lernapps check` (geprüft lokal mit `scripts/scaffold.ts`). Der Quiz-Platzhalter braucht `explanation` und `links`; der Explainer verlangt eine Übung pro Seite; gleiche `info`-Texte machen die e2e-Locators mehrdeutig, daher verschiedene Texte. `.npmrc` steht nicht im Scaffold (npm liefert es nicht aus); `scripts/scaffold.ts` schreibt es nur für die Prüfung in diesem Repo.

### Commit 2 – Aufteilung der e2e-Tests
app-templates:
- [x] `runtime/quiz/e2e.ts`: `quizTests()` nur Inhalt (Anzeige und Bilder pro Frage; ohne JavaScript lesbar; je Sprache Seite und Anzeige); neu `quizRuntimeTests()` mit den Abläufen
- [x] `runtime/explainer/e2e.ts`: `explainerTests()` nur Inhalt (ohne JavaScript; andere Seiten; Vor/Zurück; eigene Komponenten hydrieren; Übungskomponenten der App prüfen ihre Beispiele); neu `explainerRuntimeTests()`
- [x] 360 px nur für Anzeigetests: alle anderen Tests per `test.skip` nur auf dem Desktop. Ausnahme: Tests, die heute bewusst nur bei 360 px laufen (Übungen, Selbsteinschätzung), bleiben dort
- [x] `quiz/e2e/runtime.e2e.ts`, `explainer/e2e/runtime.e2e.ts`: rufen die Ablauftests auf; nicht im `scaffold`
- [x] Fixture-Jobs in `check.yml` laufen weiter mit beiden Dateien (sie arbeiten im Vorlagenordner); `question-page` prüfen
- [x] Kopfkommentare der e2e-Module und arc42 (Teststrategie) anpassen
- [x] Testzahlen vorher/nachher an der Fixture mit 64 Fragen messen

Messung (4 Kerne): Quiz mit 64 Fragen, App-Tests 130 statt 264, `lernapps check --pre-push` der App 17 s statt 52 s. Explainer-Vorlage: App 16 von 58 Tests, 16 s statt 29 s.
Gefunden unterwegs: Seit #121 installierten die Vorlagen die veröffentlichte Runtime (0.1.0, die exakte Abhängigkeit von tooling) statt `file:..`; CI prüfte die Vorlagen also gegen den alten Stand. Ein Eintrag `overrides["@lernapps/app-templates"] = "file:.."` in den Vorlagen und in `question-page` behebt das (in Commit 1). create in tooling muss ihn aus der App entfernen.

### Auslieferung
- app-templates: Branch mit zwei Commits squashen, mergen, Release abwarten.
- tooling: Branch `feat/scaffold` mit Commit 1 (tooling-Teil); `@lernapps/app-templates` auf das neue Release heben. Commit 2 braucht in tooling nichts.
- Bestehende Apps: `lernapps update` hebt die Runtime; damit prüfen sie nur noch Inhalt. Ihre kopierten Beispieldateien bleiben, update ersetzt keine Inhalte.

### Nachtrag nach dem Merge (#126, Release 0.2.0)
- Die e2e-Tests von create in tooling fanden: Die Architektur einer Interactive-App beansprucht `src/data` (bb-interactive-data), der Scaffold hatte den Ordner nicht. Korrektur: `scaffold/interactive/src/data/count.json` (das Ziel des Zählers) und ein Test, dass der Scaffold jeden beanspruchten Pfad hat.

### Risiken
- tooling-Tests, die den Beispielinhalt einer erzeugten App erwarten, müssen auf den Startinhalt umgestellt werden.
- Bis zum Release von app-templates kann tooling nur gegen einen Klon testen (`--templates`, `LERNAPPS_TEMPLATES`).

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
