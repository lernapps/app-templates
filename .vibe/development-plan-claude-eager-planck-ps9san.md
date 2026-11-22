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
- [x] Phasenwechsel zu Plan: Owner arbeitet autonom bis zum PR („zieh durch bis zum pr“)

### Completed
- [x] Created development plan file
- [x] Anforderungen mit Mockup geklärt (siehe Key Decisions)

## Plan
### Umsetzungsstrategie
Vorbild ist der Video-Block: ein eigenes Modul `runtime/explainer/vocabulary.ts` mit Rendering (Build), Zeilen für die
Tutor-Seite und dem Client-Teil (Abdecken). Die übrigen Module bekommen je einen `case "vocabulary"`.

**Schema (`explainer.v1.schema.json`, `$defs/vocabulary`)**
- Pflicht: `caption` (text), `languages` (wie `language-task`), `entries` (1 bis 50).
- Eintrag (`vocabularyEntry`, `additionalProperties: false`): Pflicht `target`, `source` (Strings in ihrer Sprache).
  Optional `gender` (m, f, n), `forms` (Strings), `example` ({ target, source }), `note` und `falseFriend` (markdown),
  `inflection` (1 bis 4 Tabellen: `caption` text, `header` Liste von text, `rows` Liste von Zeilen aus Strings mit `**…**`).
- Beschreibungen: Artikel bei Nomen in `target` schreiben, auch mit `gender`; `inflection` nur, wenn die Grammatik bekannt ist.

**HTML (Build, ohne JavaScript vollständig)**
- `<div class="explainer-vocabulary">` mit Werkzeugleiste (`hidden`, Client zeigt sie) und einer Tabelle in einem Scroll-Container.
- `<caption>`; Kopf: Name der Zielsprache, (Beispiel · Hinweis), Name der Ausgangssprache (`languageName`).
- Zeile: `<th scope="row" data-side="target" lang>` Begriff, Formen, `(m)`; Mitte: Beispiel (kursiv, `lang`), Übersetzung,
  Hinweis, „Falscher Freund:“; rechts `<td data-side="source" lang>`.
- Die mittlere Spalte nur, wenn ein Eintrag Beispiel, Hinweis oder falschen Freund hat.
- Formen: eigene Zeile darunter, `<details>` mit `<summary>` „<Überschriften>: <Begriff>“, darin kleine Tabellen; erste Zelle
  jeder Zeile `th scope=row`; `**…**` hervorgehoben (fett, unterstrichen) und ein Satz, was das heißt.
- Schmal (Container-Query): Karten.

**Client (`startVocabulary`)**: Werkzeugleiste zeigen; „<Sprache> abdecken“ (`aria-pressed`) deckt die Zellen einer Seite ab;
jede abgedeckte Zelle bekommt einen Knopf „aufdecken“; beim Abdecken der Zielsprache gehen die Formen zu. Nichts wird gespeichert.

**Prüfung (`check-page.ts`)**: Texte (caption, note, falseFriend, Formen-Überschriften); jede Formen-Zeile so lang wie die
anderen und wie der Kopf.

**Tutor (`tutor.ts`)**: Block als Liste „Begriff (m) – Übersetzung“ mit Beispiel, Hinweis, falschem Freund und Formen.

**Outline und E2E**: `vocabularies` je Seite; ohne JavaScript: Zeilen, Spalten, Formen zu, Werkzeuge versteckt; mit JavaScript:
abdecken, aufdecken.

**Texte**: `de.json`/`en.json` (Spalte Mitte, abdecken, aufdecken, falscher Freund, Formen, Hervorhebung).

**Doku**: arc42 `dec-vocabulary` (Kap. 9), Glossar-Begriff; Kopfkommentar des Moduls. Kein README (Owner).

**Beispiel und Tests**: Französisch-Beispiel bekommt einen Vokabel-Block (mit Formen); Fixture `explainer-all-blocks` einen
Block auf jeder Seite (de/en); Unit-Test `test/explainer-vocabulary.test.ts` (HTML, mittlere Spalte, Formen, Tutor);
Fehlerfälle in `explainer-broken.test.ts` (Zeilenlänge).

### Tasks
- [x] Code der betroffenen Module lesen und Strategie festlegen
- [x] Tasks für die Code-Phase anlegen

### Completed
- [x] Strategie dokumentiert

## Code
### Tasks
- [x] Schema `vocabulary` und Typ in `content.ts`
- [x] `vocabulary.ts`: Rendering, Tutor-Zeilen, Client
- [x] `render.ts`, `check-page.ts`, `tutor.ts`, `outline.ts`, `explainer.ts` anbinden
- [x] Texte `de.json`, `en.json`; CSS in `explainer.css`
- [x] Fixture und Französisch-Beispiel
- [x] Unit-Tests, Fehlerfälle, E2E (`e2e.ts`)
- [x] arc42: Entscheidung und Glossar
- [x] Typprüfung, Lint (`vp check`) und Unit-Tests (`vp test run`, 632) grün
- [x] `lernapps check --pre-push` auf Französisch-Beispiel und Fixture `explainer-all-blocks` (E2E) grün

### Entscheidungen in der Umsetzung
- Kopf der Formentabelle als `text` (Map je App-Sprache), Zellen als Strings; die erste Zelle heißt die Zeile.
- Prüfung der Zeilenlänge gegen den Kopf oder, ohne Kopf, gegen die erste Zeile.
- Beim Abdecken der Zielsprache klappen die Formen zu; „aufdecken“ setzt den Fokus auf die Zelle.
- Französisch-Beispiel: Formen nur bei *être*, das die Seite vorher lehrt (Regel aus dem Schema).
- Screenshot-Prüfung fand einen Fehler: Die Übersetzung war ein Textknoten und blieb beim Abdecken sichtbar. Jetzt in `<span>`;
  der E2E-Test prüft beide Seiten.
- CI-Kommentar des Französisch-Jobs nennt die Vokabel-Blöcke.

### Completed
*None yet*

## Commit
### Tasks
- [x] Aufräumen: keine Debug-Ausgaben, keine TODOs
- [x] Doku geprüft: arc42 (`dec-vocabulary`, Glossar, Seiten-Rendering) beschreibt den Endstand; README unverändert (Owner)
- [x] Tests nach dem Aufräumen grün (632 Unit-Tests, `vp check`, `lernapps check --pre-push` im Hook)
- [x] Pull Request anlegen

### Completed
- [x] Feature committet und gepusht



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
