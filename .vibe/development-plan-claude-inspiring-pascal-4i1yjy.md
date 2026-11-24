# Development Plan: app-templates (claude/inspiring-pascal-4i1yjy branch)

*Generated on 2026-11-24 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Explainer-Vergleich ("Diff-Modus"): Zwei Versionen eines Explainers (Basis vs. Ziel, z. B. Main vs. PR-Branch) vergleichen.
Die Zielversion läuft als lauffähige App. Darin werden Blöcke inline markiert als **hinzugefügt**, **geändert** oder **gelöscht**.
Zweck: Pull Requests an Explainern deutlich schneller validieren.

## Key Decisions
- Workflow `epcc` (neues Feature, Aufgabe ist klar umrissen).
- Entscheidungen des Nutzers: (1) Geänderte Blöcke: alter Stand einklappbar; auf breitem Bildschirm nebeneinander und standardmäßig ausgeklappt. (2) Zuerst Preview, Prinzip aber weiter verwendbar (lokal, CLI). (3) Umfang gleich komplett: Blöcke, Seiten, Kapitel, app.yaml, damit die Architektur trägt. (4) Erst Runtime in app-templates, CI-Anbindung in lernapps/tooling danach.
- Nächster Schritt auf Wunsch des Nutzers: Mock-up der Darstellung.
- Gewünschte Darstellung (vom Nutzer): Ziel-App lauffähig, Änderungen inline pro Block. Kein reiner Text-Bericht.

- Plan-Entscheidung: Diff beim Build, Schalter per Umgebungsvariable `EXPLAINER_BASE`; Matching per LCS über Block-IDs (robust gegen Einfügungen), Verschiebungen über gleiche ID erkannt.

- Umsetzung: Die Navigation schwebt per `position: sticky` (schmal: Leiste oben, Gliederung als Fläche per Knopf) und `position: fixed` (ab 72rem links Seitenliste, rechts Leiste). Ohne JavaScript bleibt alles lesbar (Liste, Links, Markierungen).
- Umsetzung: Der Test der Runtime braucht `@lernapps/tooling` (Peer), lokal per `npm install --no-save` nachinstalliert, nicht committet.
- Offen für später (Entscheidung 4): Anbindung für echte Apps in `lernapps/tooling` (Action `app-preview` / Generator `pages.yml`), e2e-Test des Diff-Modus im Browser.

## Notes
- Entwurf (zu bestätigen): Build-Zeit-Diff. Neue Umgebungsvariable oder Option, z. B. `EXPLAINER_BASE=<Pfad zur Basis-src>`. Das Plugin lädt Basis und Ziel, vergleicht pro Seite die Blöcke und schreibt im Ziel an jeden Wrapper `data-diff="added|changed"`. Gelöschte Blöcke werden als `data-diff="removed"` an alter Stelle eingefügt. Das Stylesheet markiert sie (Farbe plus Textlabel, nicht nur Farbe). Eine Leiste "Änderungen" (Vorbild: Feedback-Leiste) zählt und springt von Änderung zu Änderung. Geänderte Blöcke zeigen auf Wunsch den alten Text.
- Offene Fragen: (1) Gelöschte Blöcke als Geister-Block im Text (Empfehlung)? (2) Geänderte Blöcke: nur markieren oder zusätzlich alten Stand einklappbar zeigen? (3) Nur Preview der PR oder auch lokal (`vp dev` mit Basis-Branch)? (4) Erst in `app-templates` (Runtime) oder gleich mit der CI-Anbindung in `lernapps/tooling`? (5) Gilt der Diff auch für Seiten, Kapitel und `app.yaml` (neue/gelöschte Seiten), oder nur für Blöcke?
- Offen: Wo läuft der Diff (CLI, PR-Preview in `preview.yml`, beides)? Wie werden gelöschte Blöcke in der Zielversion sichtbar (Geister-Block)?
- Befund: Der Build rendert statisches HTML (`plugin.ts` -> `loadSite` -> `renderSite`). Jeder Nicht-Section-Block steckt in `<div class="explainer-block" data-block=<Position> data-block-id=<Hash> data-block-type data-block-order>` (`render.ts` `renderBlocks`, `block-id.ts`). Position = Section-IDs + Platz; ID = 8-stelliger SHA-256 des kanonischen JSON des Blocks (alle Sprachen, Schlüssel sortiert).
- Befund: Der Feedback-Modus (`feedback-client.ts`, `?feedback`) arbeitet schon pro Block, per Client-Modul. Er markiert Notizen an geänderten Blöcken als "changed". Dieses Muster (Schalter per Query, Overlay am Block-Wrapper) lässt sich für den Diff-Modus wiederverwenden.
- Befund: Ein Block-Matching Basis <-> Ziel ist ohne neue Technik möglich: gleiche Position + gleiche ID = unverändert; gleiche Position, andere ID = geändert; Position nur im Ziel = hinzugefügt; nur in der Basis = gelöscht. Verschobene Blöcke: gleiche ID an anderer Position (Erkennung über ID).
- Befund: Die PR-Preview baut die Ziel-App bereits (`preview.yml` hier; für echte Apps `pages.yml` im Generator von `lernapps/tooling`, Action `actions/app-preview`). Der Diff müsste also zur Build-Zeit der Preview mitgebaut werden: Basisstand (Merge-Base) als zweite Site laden, Diff berechnen, in die Ziel-Seiten schreiben.
- Gelöschte Blöcke existieren nicht in der Zielversion. Sie müssen aus der Basis eingeblendet werden (Geister-Block an der alten Position, durchgestrichen oder rot).
- Der Code liegt in zwei Repos: Runtime hier (`app-templates/runtime/explainer`), Preview-Action/Workflow in `lernapps/tooling`.
- Relevante Stellen (bisher): `runtime/explainer/{render,load,content,islands,outline}.ts`, `explainer.v2.schema.json`, `runtime/shared/blocks/blocks.v1.schema.json`, `.github/workflows/preview.yml`.
- Plattform-Vorgabe laut AGENTS.md: erst Einordnung in Plattformdesign und Architektur (Skills pdt, arc42-language).

## Explore
### Phase Entrance Criteria
- Der Nutzer hat ein Ziel genannt (erfüllt).
### Tasks

### Completed
- [x] Created development plan file
- [x] Mock-up vom Nutzer bestätigt (Navigation schwebt: Handy oben fixiert mit Inhalt-Knopf, Desktop links/rechts fixiert). Arbeit läuft autonom bis zum PR; danach kleine Demo-Änderungen im PR sichtbar machen.
- [x] Offene Fragen vom Nutzer beantwortet (siehe Key Decisions)
- [x] Block-Modell verstanden (Block-IDs, Positionen, Verschachtelung)
- [x] Render-Pipeline verstanden (Wrapper pro Block in `render.ts`)
- [x] Matching Basis <-> Ziel über Position und ID als machbar eingeschätzt
- [x] Preview-Ablauf verstanden (`preview.yml`, `app-preview` in tooling)

## Plan
### Phase Entrance Criteria
- Block-Modell, Render-Pipeline und Preview-Ablauf sind verstanden.
- Offene Fragen sind mit dem Nutzer geklärt, Mock-up bestätigt.
### Design
- Einordnung: Der Diff-Modus ist ein Build-Zeit-Feature der Explainer-Runtime (arc42 ch. 5 Bausteine "Explainer", ch. 7 PR-Preview, ch. 8 Konzept "Readable without JavaScript": die Markierung ist statisches HTML, JS nur für Springen/Filtern).
- Eingabe: Umgebungsvariable `EXPLAINER_BASE=<Wurzel der Basis-App>` (Ordner mit `src/`). Ohne sie ändert sich nichts. Wirkt im Build und in `vp dev`.
- `runtime/explainer/diff.ts` (rein, ohne Node): `diffSites(base, target)` liefert `SiteDiff`.
  - Seiten und Kapitel werden über ihre IDs gepaart (`<chapter>/<page>`): hinzugefügt, gelöscht, geändert (Titel, Beschreibung, Kompetenzen, Blöcke), unverändert.
  - Blöcke je Seite: Geschwisterlisten per LCS über den Schlüssel (Block-ID bzw. `section:<id>`). Lücken: gleicher Typ in Reihenfolge = geändert (Container wie Section/Beispiel/Hinweis rekursiv), Rest = hinzugefügt/gelöscht. Danach: gelöschter und hinzugefügter Block mit gleicher ID (auch seitenübergreifend) = verschoben.
  - Ergebnis in Form für das Rendern: `changes: Map<Block, Change>` für Zielblöcke (status, alter Block), `ghosts: Map<Block|list, Block[]>` für gelöschte Blöcke vor einem Zielblock bzw. am Ende einer Liste, `pages`, `chapters`, `app` (geänderte Felder).
  - Wort-Diff (`words.ts`-Funktion in diff.ts) über den sichtbaren Text von alt und neu für den Unterschied.
- `render.ts`: `Context` bekommt optional `diff`. `renderBlocks` setzt `data-diff` und Label-Chip, hängt `<details class="explainer-diff-old">` mit Vorher-Darstellung und Textunterschied an und fügt Geister-Blöcke ein. Alter Block wird mit demselben Renderer gerendert (try/catch, Rückfall auf Textzusammenfassung, z. B. für Vue-Komponenten). Navigation markiert Seiten/Kapitel (Chip, gelöschte durchgestrichen). Neue Route `aenderungen/` (kind `diff`) pro Sprache: Übersicht aller Änderungen der App, auch gelöschte Seiten und `app.yaml`-Änderungen.
- Schwebende Leiste "Änderungen" (statisches Markup, `<template>`/Panel wie der Feedback-Modus) und Client `diff-client.ts` (Vorige/Nächste, Filter, Inhalt-Knopf auf schmal, Vorher-Stand breit offen/schmal zu). CSS in `explainer.css`: sticky statt fixed.
- `plugin.ts`: liest `EXPLAINER_BASE`, lädt Basis mit `loadSite`, berechnet den Diff einmal, reicht ihn an `renderSite`. Ohne Basis keine Änderung am Ausgabe-HTML.
- CI: `preview.yml` checkt die Basis des PR aus und baut die Previews mit `EXPLAINER_BASE` (Template und Französisch-Beispiel). Anbindung für echte Apps in `lernapps/tooling` folgt später (Entscheidung 4).
- Demo: kleine inhaltliche Änderungen in `explainer/src/prozent/*.yaml` und `explainer/examples/franzoesisch/src`, damit der PR den Diff zeigt.
- Tests: Unit-Tests der Diff-Logik (hinzugefügt, geändert, gelöscht, verschoben, Einfügung am Anfang, Container, Seiten, Kapitel, app.yaml); Build-Test: Zwei Fixtures, Seite enthält `data-diff`, Geister-Block, Übersichtsseite, ohne Basis identisches HTML wie vorher.
### Tasks
- [x] Design festgelegt (siehe oben)
- [x] Entscheidungen im Abschnitt Key Decisions festgehalten

### Completed
- [x] Entwurf aus dem bestätigten Mock-up abgeleitet

## Code
### Phase Entrance Criteria
- Der Plan (Diff-Algorithmus, Markierung, Auslieferung, Tests) liegt vor; der Nutzer hat autonome Arbeit bis zum PR freigegeben.
### Tasks
- [ ] *Alles erledigt, siehe Completed*

### Completed
- [x] `diff.ts`: Diff-Logik (LCS über Block-IDs, Paarung gleicher Typen, Container rekursiv, Verschiebungen seitenübergreifend, Seiten, Kapitel, App-Felder, Wort-Diff) mit 14 Unit-Tests
- [x] `render.ts`, `routes.ts`, `diff-render.ts`: Markierung der Blöcke, Vorher-Stand (Details), Geister-Blöcke, Seiten-/Kapitel-Chips, Übersichtsseite `aenderungen/`, Leiste, Seitenliste; Ghosts ohne Live-Teile (Zusammenfassung für Aufgaben, Komponenten, Video), Ids entfernt
- [x] Texte de/en, CSS (sticky auf schmal, fixiert links/rechts ab 72rem), Client `diff-client.ts` (Springen, Filter, Menü, Vorher-Stand breit offen/schmal zu, Markierung aus), Einbindung in `explainer.ts`
- [x] `plugin.ts`: `EXPLAINER_BASE` für Build und `vp dev`; Fehlermeldung bei falschem Pfad
- [x] Build-Tests mit der All-Blocks-Fixture (de/en): Markierungen, Ghost, Übersicht, ohne Basis unverändert, falscher Pfad
- [x] `preview.yml`: Basis des PR (erster Elternteil des Merge-Commits) auschecken, beide Explainer-Previews mit `EXPLAINER_BASE` bauen, Links zur Übersicht
- [x] Demo-Änderungen: Prozentwert (neue Tabelle, geänderte Merkhilfe, gelöschter Absatz), Prozentsatz (Beschreibung), Französisch (ergänzter Satz); `lernapps check` ohne neue Befunde
- [x] arc42: Baustein `bb-diff-mode`, Schnittstelle, Szenario, Entscheidung `dec-explainer-diff-mode`, Deployment, README
- [x] Prüfungen: `vp check`, `vue-tsc`, 671 Tests, `node scripts/arc42.ts`, axe in 4 Modi (breit/schmal, hell/dunkel) ohne Verstöße, Screenshots geprüft

## Commit
### Phase Entrance Criteria
- Implementierung fertig, Tests und Checks grün.
### Tasks
- [ ] Commit nach Vorgabe des commit-Skills, Push auf den Feature-Branch
- [ ] Pull Request öffnen (Nutzer hat ihn verlangt)

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
