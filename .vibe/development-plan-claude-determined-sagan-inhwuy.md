# Development Plan: app-templates (claude/determined-sagan-inhwuy branch)

*Generated on 2026-11-22 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Kommentar-Modus für Erklärer (Explainer): Fachleute bringen Verbesserungsvorschläge effizient und nachvollziehbar ein.

- Ein sichtbarer Schalter schaltet den Modus für die ganze App ein; er erzeugt einen URL-Parameter, der den Modus
  ebenfalls einschaltet (Link zum Weitergeben).
- Im Modus erscheint eine Leiste zum Erfassen von Notizen. Eine Notiz bezieht sich auf einen Block, dazu optional
  den markierten Text.
- Notizen bleiben nur im `localStorage`, serverseitig wird nichts gespeichert.
- Export: alle Notizen der App in der Reihenfolge der Blöcke, als Text zum Kopieren.
- Jede App kennt ihr Repository: Ein Link öffnet ein Issue-Template, dort fügt die Fachperson den Export ein.
- Die Leiste zeigt eine Übersicht der Notizen; einzelne oder alle lassen sich löschen.

## Key Decisions
- Workflow: epcc. Branch: `claude/determined-sagan-inhwuy`.
- Kein Eintrag in der README (Abschnitt „Stores nothing but …“): Der Modus ist eine bewusste Interaktion; ein
  Hilfetext beim Einschalten erklärt, dass die Notizen nur im Browser liegen (Owner, 2026-11-22).
- Bezug einer Notiz: Block plus markierter Text; der Export enthält den zitierten Text, damit der Bezug auch nach
  Änderungen am Inhalt nachvollziehbar bleibt.
- Repository: Der Build ermittelt es selbst, denn er läuft im Repo der App: zuerst `GITHUB_REPOSITORY` (CI), sonst
  `git remote get-url origin`, nur Adressen auf github.com. Kein neues Feld in `package.json` oder `app.yaml`. Findet
  der Build keins, zeigt die Leiste keinen Issue-Link; Kopieren geht weiter (Owner, 2026-11-22).
- Kein Issue-Template: Der Link öffnet `https://github.com/<owner>/<repo>/issues/new` mit `title` in der URL; den
  Text fügt die Fachperson per Paste ein (Owner, 2026-11-22).
- Kein Label: Es gibt kein Label, das alle Repos haben (nicht einmal GitHubs Standard-Labels in app-templates), und
  GitHub setzt Labels aus der URL nur bei Schreib-/Triage-Recht. Stattdessen Titel mit festem Präfix:
  `Feedback: <Titel der App>` (Owner, 2026-11-22). Ein einheitliches Label wäre ein späteres Ticket an lernapps/tooling.
- Block-Adresse, beim Build vergeben (Owner, 2026-11-22):
  - Position: Abschnitt-ID + Stelle im Abschnitt (z. B. `regel/3`), für Reihenfolge und Lesbarkeit.
  - Statische ID: kurzer Hash des Blockinhalts (z. B. 8 Hex-Zeichen SHA-256 über den normalisierten Block). Ändert
    sich der Block, ändert sich der Hash: Die Leiste markiert alte Notizen dann als „Stelle geändert“, sie bleiben
    exportierbar. Gleiche Blöcke auf einer Seite unterscheidet die Position.
- Anrede in allen Texten des Modus: „du“, nicht „Sie“ (Owner, 2026-11-22, Kommentar im Mockup).
- Export zeigt den Stand (Commit) nicht an (Owner, 2026-11-22). Er steht unsichtbar als `<!-- Stand: <sha> -->` im
  Text (Annahme nach „go“, Frage im Mockup unbeantwortet).
- Kein sichtbarer Link mit `?feedback`, weder auf der Startseite (Owner, 2026-11-22) noch in der Leiste (Annahme
  nach „go“). Der Parameter schaltet den Modus trotzdem ein.
- Fachleute sind Lehrkräfte und Eltern, also `e-adopters`; der Modus realisiert `t-give-feedback` (Kanal
  `ch-feedback`, über `e-github`). Kein neues Rollenmodell nötig (Owner, 2026-11-22).

## Notes
### Runtime des Erklärers
- Seiten werden zur Build-Zeit gerendert (`runtime/explainer/render.ts`, Blöcke über `runtime/shared/blocks/`);
  jede Seite ist ohne JavaScript vollständig. Das Client-Modul `runtime/explainer/explainer.ts` ergänzt nur.
- Speicher: `createStorage`/`createSettings` aus `@lernapps/tooling/storage`, Präfix = Name aus der
  `package.json` der App (`runtime/shared/appname.ts`); `data-storage` am Element übergibt ihn dem Client.
  Bereich einer Einstellung: `SettingScope` „app“ oder „archetype“ (Muster: Tutor-Wahl, `explainer.ts` ab Zeile ~617).
- Kopieren in die Zwischenablage gibt es schon (Tutor: „Zurück zum Tutor“, `result.ts`, `stuck.ts`).
- Blöcke haben **keine IDs**; nur Abschnitte (`type: section`, `id`) und Aufgaben (`id="aufgabe-<key>"`) haben welche.
  Ein Bezug auf einen Block braucht also eine neue, beim Build vergebene Adresse, z. B. Abschnitt-ID + Position.

### Repository einer App
- Jede App hat ein eigenes Repo in der Organisation lernapps; GitHub Pages liefert sie unter `lernapps.net/<repo>/`
  aus (`docs/arc42/07-deployment-view.arc42.md`). Der Build baut mit relativen URLs.
- Die Runtime kennt das Repo heute **nicht**. Neue Apps erzeugt `lernapps create` (`@lernapps/tooling`).
- Ein Issue-Template gibt es bisher nur in `lernapps/mathe-karte` (`.github/ISSUE_TEMPLATE/inhaltsfehler.yml`,
  „Fehler im Inhalt melden“). Die Apps aus diesem Template haben keines; es läge im Repo der App, also eher in
  `lernapps/tooling` (`lernapps create`) als hier.

### Plattform-Design (pdt42, lernapps/docs)
- Es gibt keine Rolle „Fachleute“. Am nächsten: `e-adopters` (Erwachsene, die Apps nutzen) mit der Transaktion
  `t-give-feedback` über den Kanal `ch-feedback`, und `e-github` als Produktionsmittel (Issue-Templates).
- `ch-feedback` sagt „Counted openly: only explicit clicks and totals, no accounts or free text“. Der
  Kommentar-Modus ist Freitext über ein GitHub-Issue (mit Konto). Das widerspricht dem Kanal nicht im Geist
  (nichts verdeckt, nichts automatisch), ist aber ein anderer Weg. Änderungen am Design nur in lernapps/docs.

## Explore
### Entrance Criteria
- Anforderungen mit dem Owner geklärt (siehe Goal).

### Tasks
### Completed
- [x] Offene Fragen dem Owner vorgelegt und beantwortet (Repo, Issue-Link, Rolle)
- [x] Created development plan file
- [x] Architektur des Explainer-Runtimes verstanden: Seiten, Blöcke, IDs, Client-Code
- [x] Bestehende Muster gefunden: Tutor-Schalter, Einstellungen im `localStorage`, Kopieren in die Zwischenablage
- [x] Geklärt, woher eine App ihr Repository kennen kann (heute gar nicht)
- [x] Issue-Templates in der Organisation gesucht
- [x] Einordnung in Plattform-Design (Skill pdt) geprüft

## Plan
### Entrance Criteria
- Relevante Code-Stellen und Muster sind bekannt und im Plan notiert.
- Offene Fragen (Repo-Quelle, Block-IDs, Reihenfolge über Seiten) sind beantwortet oder dem Owner vorgelegt.

### Umsetzungsplan

**Build: Block-Adressen** (`runtime/explainer/render.ts`, neu `runtime/explainer/block-id.ts`)
- `renderBlocks` umhüllt jeden Block außer `section` mit
  `<div class="explainer-block" data-block="<pos>" data-block-id="<hash>" data-block-type="<type>" data-block-order="<n>">`.
  Ein schlichtes `div` ändert das Layout nicht (Ränder kollabieren durch); keine CSS-Regel nutzt direkte Kinder von
  Blöcken (geprüft: nur `.explainer > section`, die Abschnitte bleiben ohne Hülle).
- `<pos>`: Abschnitt-IDs + Stelle (1-basiert) im Abschnitt, in Kästen (note, example) verschachtelt: `regel/3`,
  `regel/4/1`; Blöcke vor dem ersten Abschnitt: `1`, `2`.
- `<hash>`: SHA-256 über das kanonische JSON des Quellblocks (Schlüssel sortiert, alle Sprachen), erste 8 Hex-Zeichen.
  Quelle statt HTML, damit ein Update der Runtime keine Notiz als „geändert“ markiert.
- `data-block-order`: laufende Nummer auf der Seite, für die Reihenfolge im Export.
- Nur Inhaltsseiten (auch Recap-Seiten); Start-, Kapitel-, Glossar-, Medien- und Tutor-Seiten nicht.

**Build: Repository und Stand** (neu `runtime/shared/repository.ts`, aufgerufen in `load.ts`)
- `repositoryOf(root, env)`: `GITHUB_REPOSITORY`, sonst `git -C <root> remote get-url origin`; nur github.com, HTTPS
  und SSH; Ergebnis `owner/repo` oder `undefined`. Fehler (kein git, kein Remote) → `undefined`, kein Abbruch.
- `revisionOf`: `GITHUB_SHA` (gekürzt) bzw. `git rev-parse --short HEAD`; der Export enthält ihn als HTML-Kommentar. Tests übergeben `env` und Pfade, damit die Ausgabe deterministisch bleibt.
- `Site` bekommt `repository?` und `revision?`.

**Seite: Schalter und Leiste** (`render.ts`, neu `runtime/explainer/feedback.ts` + `feedback-client.ts`)
- Schalter dort, wo er klar zur App gehört, nicht im Fuß (der gehört zur Plattform; Owner, 2026-11-22):
  (a) am Ende des Inhalts jeder Inhaltsseite, in `<main>` vor „zurück/weiter“: „Fehler gefunden oder eine Idee für
  diese App? Feedback zu „<App>“ geben“; (b) auf der Startseite ein Abschnitt „Verbesserungen vorschlagen“ neben dem
  KI-Tutor, mit Erklärung und Knopf. Beide `hidden`, das Client-Modul zeigt sie; ohne JavaScript fehlen sie
  (Owner bestätigt, 2026-11-22).
- Einschalten per Knopf oder `?feedback` in der Adresse; der Zustand wird für diese App gespeichert, bis „Beenden“.
  Vorher speichert die App nichts (bestehende e2e-Tests prüfen das).
- Beim ersten Einschalten zeigt die Leiste den Hilfetext: wozu, dass Notizen nur in diesem Browser liegen, wie sie
  in ein Issue kommen (GitHub-Konto nötig). Alle Texte duzen.
- Leiste: rechts als Spalte, schmal als Fläche unten; einklappbar. Inhalt: Formular (Bezug, zitierte Markierung,
  Textfeld, Speichern/Abbrechen), Übersicht aller Notizen der App nach Seite, je mit Link zur Stelle und „Löschen“,
  „Alle löschen“ (mit Rückfrage), „Kopieren“, „Issue auf GitHub öffnen“ (nur mit Repo), „Beenden“, Statuszeile
  (`aria-live`).
- Im Modus hat jeder Block auf Inhaltsseiten einen kleinen Knopf „Notiz“ (sichtbar bei Hover und Fokus, per Tastatur
  erreichbar). Die zuletzt markierte Textstelle innerhalb dieses Blocks (über `selectionchange` gemerkt) wird
  übernommen.
- Notizen, deren Block-ID auf der Seite nicht mehr vorkommt, zeigt die Übersicht als „Stelle geändert“.

**Datenmodell** (Speicher der App, `createStorage`, Präfix = App-Name)
- `feedback`: `{ on: true }`; `feedback-notes`: Liste von
  `{ id, created, lang, path, pageTitle, pageOrder, section?, position, blockId, blockType, blockOrder, excerpt, selection?, text }`.
- `pageOrder`: Index der Inhaltsseite in der Reihenfolge der App (vom Build), `excerpt`: Anfang des Blocktexts
  (~120 Zeichen).

**Export** (Markdown, reine Funktion in `feedback.ts`)
- Kopf: App-Titel, Adresse, Datum, Anzahl Notizen; Stand unsichtbar als HTML-Kommentar.
- Sortiert nach `pageOrder`, `blockOrder`, `created`; je Seite `## <Seitentitel>` + Adresse; je Notiz
  `### <Abschnitt> · Block <pos> (<Typ>) · \`<blockId>\``, Zitat des Blockanfangs, Markierung, Text; Hinweis
  „Stelle seit der Notiz geändert“, wo das gilt.
- Issue-Link: `https://github.com/<repo>/issues/new?title=Feedback%3A%20<App-Titel>`.

**Texte**: neue Schlüssel in `runtime/explainer/messages/de.json` und `en.json`.

**Doku**: arc42 des Erklärers: Baustein (05), Laufzeitszenario (06), Verteilung (07: Seite und Build), ggf.
Entscheidung (09: Hash statt Position, kein Label). README bleibt unverändert (Owner).

### Risiken
- Die Hülle um jeden Block könnte e2e-Tests oder Selektoren treffen, die direkte Kinder erwarten → Tests laufen lassen.
- `git` im Build: in CI mit `actions/checkout` vorhanden; ohne `git` nur kein Link.
- Die `architecture.test.ts` prüft Modulregeln; neue Module müssen hineinpassen.

### Tasks
- [x] Umsetzungsplan erstellt
- [x] Mockups (privates Artifact des Owners): Notiz zu einem Block, Einschalten mit Hilfetext, Übersicht und Export,
      schmaler Bildschirm, Export im Issue — https://claude.ai/artifact/EQHFfMHUJ3d5RDdjnFVkEw
- [x] Owner bestätigt den Plan und die Mockups („go!“, 2026-11-22)

### Completed
*None yet*

## Code
### Entrance Criteria
- Umsetzungsplan mit Komponenten, Datenmodell, Exportformat und Tests liegt vor und ist vom Owner bestätigt.

### Tasks
- [x] `block-id.ts`: Position und Hash; Unit-Test (Stabilität, Änderung, Verschachtelung)
- [x] `render.ts`: Hülle um Blöcke auf Inhaltsseiten; Build-Test der Attribute
- [x] `repository.ts`: Repo und Stand aus Umgebung bzw. git; Unit-Test (HTTPS, SSH, fremder Host, kein git)
- [x] `load.ts`/`content.ts`: `repository`, `revision` in `Site`
- [x] `feedback.ts`: Datenmodell, Prüfung gespeicherter Daten, Sortierung, Markdown-Export, Issue-Link; Unit-Tests
- [x] `render.ts`: Zeile am Ende des Inhalts, Abschnitt auf der Startseite, Leiste (Markup, Daten als JSON), Texte de/en
- [x] `feedback-client.ts`: Ein-/Ausschalten, `?feedback`, Notiz-Knöpfe, Markierung, Speichern, Übersicht, Löschen,
      Kopieren, Issue-Link; eingebunden in `explainer.ts`
- [x] `explainer.css`: Leiste, Notiz-Knöpfe, Hervorhebung im Modus, schmale Bildschirme, Dark Mode
- [x] e2e (`runtime/explainer/e2e.ts`): nichts gespeichert ohne Einschalten; Einschalten per Knopf und `?feedback`;
      Notiz mit Markierung; Neuladen; Export-Reihenfolge über zwei Seiten; einzeln/alle löschen; Beenden
- [x] arc42 des Erklärers aktualisieren (05 bb-feedback-mode + if-feedback-mode, 06 scenario-explainer-feedback,
      07 dn-explainer-page, 09 dec-explainer-feedback-issue)

### Notes (Code)
- Leiste mit einer Ansicht statt zwei (Formular oben, darunter alle Notizen der App nach Seiten); einfacher als die
  Mockups mit getrennter Übersicht.
- Speicher: höchstens 100 kB je App (STORAGE_QUOTA); deshalb Blockanfang auf 100, Markierung auf 300 Zeichen gekürzt;
  ein abgelehntes Speichern meldet „Der Speicher ist voll …“.
- Leiste und Startseiten-Abschnitt stehen in `<template>`: die Regel explainer-readable-without-js verbietet
  Überschriften, die ohne JavaScript versteckt sind (Muster wie der Tutor-Dialog).
- Auf schmalen Bildschirmen scrollt der Block beim Öffnen des Formulars über die Leiste.
- Lokal: `vp preview` liefert `dist/` aus; e2e mit `LERNAPPS_CHROMIUM=/opt/pw-browsers/chromium`. Nach Änderungen an
  der Runtime `vp pack` und `explainer/node_modules/@lernapps/app-templates` neu installieren (Kopie, kein Link).
- „Zur Stelle“ verlinkt `<seite>#feedback-<position>`; das Client-Modul scrollt dorthin (keine neuen ids im HTML).

### Completed
*None yet*

## Commit
### Entrance Criteria
- Umsetzung fertig, Tests (Unit, e2e) grün, Doku (arc42) aktualisiert.

### Tasks
- [x] Docs des Plattform-Designs ergänzt: lernapps/docs#128 (`t-suggest-improvements`, `ch-content-notes`,
      `if-feedback-mode`)

### Completed
- [x] Aufräumen: keine Debug-Ausgaben, keine TODOs
- [x] Branch zu einem Commit zusammengefasst, auf main rebased, PR eröffnet
- [x] Review PR #180 (Owner): „Issue auf GitHub öffnen“ kopiert sofort und setzt als Beschreibung einen Kommentar,
      der zum Einfügen auffordert (`feedbackIssueBody`)



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
