# Development Plan: app-templates (claude/eager-planck-ps9san branch)

*Generated on 2026-11-22 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Sprach-Explainer zeigen Vokabeln heute als einfache `table`. Die Tabelle kennt keine Sprachen und keine Bedeutung der Spalten.
Ein neuer Block `type: vocabulary` macht Vokabeln semantisch: Wort in der Zielsprache, Übersetzung, Aussprache, Beispiel,
Hinweis und auf Wunsch die Formen (Konjugation, Deklination).

Mockup (vom Owner abgestimmt): https://claude.ai/artifact/3msvaRXf86YJ3CYv1qUA6f

## Key Decisions
- Workflow: epcc. Branch: `claude/eager-planck-ps9san` (vom System vorgegeben).
- Kein Pull Request, bis der Owner ihn ausdrücklich verlangt.
- Block `type: vocabulary` mit `caption`, `languages: { source, target }` (wie `language-task`) und `entries`.
- Pflichtfelder je Eintrag: `target`, `source`.
- Optionale Felder: `example: { target, source }`, `note`, `falseFriend`, `forms`, `gender`, `inflection`.
- Owner: Kein Audio in der ersten Version.
- Owner: Der Block steht nicht als `material` einer Aufgabe (erste Version).
- Owner: `gender` wird kurz hinter dem Begriff angezeigt: `(m)`, `(f)`, `(n)`.
- Owner: Keine Änderung am README.
- Block nur im Explainer (`explainer.v1.schema.json`), nicht in `shared/blocks`.
- arc42: neue Entscheidung `dec-vocabulary` (grenzt ab gegen die abgelehnte Wortliste in `dec-language-task`) und ein Glossar-Begriff.
- `target` wird so angezeigt, wie es geschrieben ist. Bei Nomen steht der Artikel im Begriff (`le pain`). Nichts wird aus Regeln erzeugt.
- `gender` (m, f, n) kommt ins Schema. Die Beschreibung im Schema sagt: Bei Nomen trotzdem den Artikel zum Begriff schreiben.
- Keine Farben, keine Legende, keine Wortart (`pos`).
- `forms`: Liste von Formen, angezeigt hinter dem Wort wie im Wörterbuch (`l'œil, les yeux`; `rex, regis`).
- `inflection`: optional schon in der ersten Version. Liste kleiner Tabellen in der Form von `table` (`caption`, `header`, `rows`);
  `**…**` markiert Endungen. Die Beschreibung im Schema sagt: Nur nutzen, wenn die Lernenden die passende Grammatik schon kennen.
- Anzeige: Vokabelheft mit drei Spalten (Zielsprache | Beispiel · Hinweis | Ausgangssprache). Die mittlere Spalte fehlt, wenn kein Eintrag
  ein Beispiel oder einen Hinweis hat. Formen klappen unter dem Eintrag auf (`<details>`, ohne JavaScript). Schmal: Karten.
- Üben: Eine Spalte lässt sich abdecken und je Zelle aufdecken (nur mit JavaScript, ohne Bewertung).
- `lang`-Attribut an jedem Wort der Zielsprache.

## Notes
- Entrance criteria:
  - Plan: Explore abgeschlossen; Einordnung in Plattform-Design und Architektur (arc42) vom Owner bestätigt.
  - Code: Plan vom Owner freigegeben.
  - Commit: Tests, Typprüfung und Build der Beispiele laufen grün.

## Explore
### Befunde (Architektur)
- `dec-explainer-only-content`: Der Creator schreibt nur YAML. Ein eingebauter Block statt Vue-Komponente passt dazu.
- `dec-explainer-complete-without-js`: Alles steht im Build-HTML. Formen als `<details>` passen. Abdecken ist nur Zusatz im Client.
- `dec-language-task` hat „a textbook's word list“ abgelehnt (gemeint: eine Wortliste als Quelle für Aufgaben; stattdessen ein
  Grundwortschatz neben der Lernlandkarte). Der Vokabel-Block ist Inhalt einer Seite, keine Wortliste der App. Das muss eine neue
  Entscheidung klar abgrenzen.
- `dec-audio-marking`, `dec-audio-player`: Audio nur als markierte MP3 in `src/audio/`; die Sprachausgabe des Browsers ist abgelehnt.
  Eine KI-Stimme bekommt das Label „KI“. Der Player ist der des Browsers, damit es ohne JavaScript geht.
- `dec-media-overview`: Jede Audiodatei erscheint in der Medienübersicht mit den Seiten, die sie nutzen.
- Skills pdt und arc42-language liegen nicht lokal (lernapps/docs, doctoolchain/arc42-language; nicht im Zugriff dieser Session).
  Einordnung deshalb mit den arc42-Dokumenten des Explainers.

### Befunde (Code)
- Schema: Block-Typen in `runtime/explainer/explainer.v1.schema.json` (`type`-Enum, `allOf` mit `if/then`). Format 2 verweist darauf.
- `table` kommt aus `runtime/shared/blocks` (`blocks.v1.schema.json`, `render.ts`, `validate.ts`); `language-task` nur im Explainer.
- Ein Block-Typ berührt im Explainer: `content.ts` (Typ), `render.ts` (`renderBlock`), `check-page.ts` (Prüfung, Texte je Sprache),
  `outline.ts`, `tutor.ts` (Markdown der Tutor-Seite), `media.ts` (`audioOf` liest nur `items[].audio`), `explainer.css`,
  Client (`explainer.ts`) fürs Abdecken, `e2e.ts`, Runtime-Texte (`messages`), README, arc42, Beispiel `franzoesisch`.
- `languages: { source, target }` und Texte je Sprache wie bei `language-task` (Felder in der Zielsprache sind einfache Strings,
  Felder in der Sprache der App sind `text`, also bei mehreren App-Sprachen eine Map).
- Audio-Werte sind Dateinamen mit `.mp3` (`audio: le-pain-est-bon.mp3`).

### Vorschlag zur Einordnung (zur Abstimmung)
- Neuer Block nur im Explainer (`explainer.v1.schema.json`), nicht in `shared/blocks`: Quiz und interaktive Apps brauchen ihn nicht.
- Neue Entscheidung `dec-vocabulary` (arc42 Kap. 9), Glossar-Begriff (README nicht, Owner); Hinweis an den Skill `lernapps-explainer` (lernapps/tooling).
- Kein eigener Baustein in Kap. 5: Der Block ist Teil von Seiten-Rendering und Validierung.

### Offene Fragen an den Owner (geklärt)
- Audio: erst einmal weglassen. Damit entfällt die Medienübersicht (`media.ts`).
- Als `material` einer Aufgabe: erst einmal nicht.
- `gender`: Anzeige `(m)`, `(f)`, `(n)` hinter dem Begriff.

### Tasks
- [x] Plattform-Design und Architektur einordnen (arc42 des Explainers; Skills nicht verfügbar)
- [x] Code lesen: Block-Schemas, `table`-Rendering, `language-task`, Audio, Tutor-Seite, Validierung
- [x] Prüfen, ob der Block in `blocks` (gemeinsam) oder nur im Explainer liegt
- [x] Einordnung und offene Punkte mit dem Owner klären
- [ ] Phasenwechsel zu Plan vom Owner bestätigen lassen

### Completed
- [x] Created development plan file
- [x] Anforderungen mit Mockup geklärt (siehe Key Decisions)

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
