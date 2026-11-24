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
- [ ] Mock-up der Darstellung vom Nutzer bestätigen lassen
- [ ] Einordnung in arc42 (ch. 5, 7, 8) bestätigen

### Completed
- [x] Created development plan file
- [x] Offene Fragen vom Nutzer beantwortet (siehe Key Decisions)
- [x] Block-Modell verstanden (Block-IDs, Positionen, Verschachtelung)
- [x] Render-Pipeline verstanden (Wrapper pro Block in `render.ts`)
- [x] Matching Basis <-> Ziel über Position und ID als machbar eingeschätzt
- [x] Preview-Ablauf verstanden (`preview.yml`, `app-preview` in tooling)

## Plan
### Phase Entrance Criteria
- Block-Modell, Render-Pipeline und Preview-Ablauf sind verstanden.
- Offene Fragen sind mit dem Nutzer geklärt.
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Code
### Phase Entrance Criteria
- Der Plan (Diff-Algorithmus, Markierung, Auslieferung, Tests) ist vom Nutzer bestätigt.
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Commit
### Phase Entrance Criteria
- Implementierung fertig, Tests und Checks grün.
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
